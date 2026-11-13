const https = require("https");
const prisma = require("../prismaClient");
const { OFFICIAL_ALLOWED_DOMAINS, INITIAL_GOVERNMENT_SCHEMES } = require("../data/governmentSchemesData");
const { simdDotProductI16, cacheInvalidatePrefix } = require("../hash");
const { MinHeap, InvertedIndex } = require("../utils/dsaEngine");

let schemesSeededVerified = false;
let cachedSchemesCount = 0;
let cachedSchemeIndex = null;
let cachedSchemeIndexSize = 0;

function getSchemeSearchIndex(schemes = []) {
  if (cachedSchemeIndex && cachedSchemeIndexSize === schemes.length) {
    return cachedSchemeIndex;
  }
  const index = new InvertedIndex();
  for (const s of schemes) {
    index.addDocument(s.schemeCode, s, [
      { text: s.schemeCode, weight: 8 },
      { text: s.shortName || "", weight: 6 },
      { text: s.name || "", weight: 5 },
      { text: s.nameHi || "", weight: 5 },
      { text: s.state || "", weight: 4 },
      { text: (s.categories || []).join(" "), weight: 4 },
      { text: (s.tags || []).join(" "), weight: 4 },
      { text: s.ministry || "", weight: 2 },
      { text: s.benefitSummary || "", weight: 2 },
      { text: s.description || "", weight: 1 },
      { text: s.descriptionHi || "", weight: 1 },
    ]);
  }
  cachedSchemeIndex = index;
  cachedSchemeIndexSize = schemes.length;
  return index;
}

/**
 * Validates that a URL is HTTPS and belongs to an approved official Indian Government
 * or public-sector portal domain. Prevents SSRF, open redirects, and unsafe URLs.
 */
function isSafeOfficialUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith(".gov.in") ||
      host.endsWith(".nic.in") ||
      OFFICIAL_ALLOWED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
    );
  } catch {
    return false;
  }
}

/**
 * Performs a lightweight HEAD/GET reachability check against an official portal with timeout.
 * Does not scrape disallowed pages; only verifies portal availability and HTTP headers.
 */
function verifyPortalReachability(urlString, timeoutMs = 3500) {
  return new Promise((resolve) => {
    if (!isSafeOfficialUrl(urlString)) {
      return resolve({ reachable: false, reason: "unapproved_domain" });
    }
    try {
      const req = https.request(
        urlString,
        {
          method: "HEAD",
          timeout: timeoutMs,
          headers: {
            "User-Agent": "OrganicTrace-GovSchemeVerifier/1.0 (Compliance Check)",
          },
        },
        (res) => {
          const ok = res.statusCode >= 200 && res.statusCode < 500;
          resolve({
            reachable: ok,
            statusCode: res.statusCode,
            lastModified: res.headers["last-modified"] || null,
          });
        }
      );
      req.on("timeout", () => {
        req.destroy();
        resolve({ reachable: false, reason: "timeout" });
      });
      req.on("error", (err) => {
        resolve({ reachable: false, reason: err.code || err.message });
      });
      req.end();
    } catch (err) {
      resolve({ reachable: false, reason: err.message });
    }
  });
}

/**
 * Ensures the PostgreSQL database has the curated Indian Government Schemes seeded.
 * Memoized in-memory after initial verification to eliminate redundant COUNT(*) queries.
 */
async function ensureSchemesSeeded() {
  if (schemesSeededVerified && cachedSchemesCount >= INITIAL_GOVERNMENT_SCHEMES.length) {
    return { seeded: false, total: cachedSchemesCount, cached: true };
  }
  const count = await prisma.governmentScheme.count();
  if (count >= INITIAL_GOVERNMENT_SCHEMES.length) {
    schemesSeededVerified = true;
    cachedSchemesCount = count;
    return { seeded: false, total: count };
  }

  let upserted = 0;
  for (const scheme of INITIAL_GOVERNMENT_SCHEMES) {
    if (!isSafeOfficialUrl(scheme.officialPortalUrl) || !isSafeOfficialUrl(scheme.sourceUrl)) {
      console.warn(`[schemes] Skipping scheme ${scheme.schemeCode} due to unsafe URL`);
      continue;
    }
    await prisma.governmentScheme.upsert({
      where: { schemeCode: scheme.schemeCode },
      update: {
        name: scheme.name,
        nameHi: scheme.nameHi,
        shortName: scheme.shortName,
        description: scheme.description,
        descriptionHi: scheme.descriptionHi,
        ministry: scheme.ministry,
        department: scheme.department,
        governmentLevel: scheme.governmentLevel,
        state: scheme.state,
        categories: scheme.categories,
        beneficiaryTypes: scheme.beneficiaryTypes,
        eligibilityCriteria: scheme.eligibilityCriteria,
        eligibilityCriteriaHi: scheme.eligibilityCriteriaHi,
        fundingType: scheme.fundingType,
        benefitSummary: scheme.benefitSummary,
        benefitSummaryHi: scheme.benefitSummaryHi,
        maxSubsidyPercent: scheme.maxSubsidyPercent,
        maxBenefitAmount: scheme.maxBenefitAmount,
        applicationStatus: scheme.applicationStatus,
        applicationStartDate: scheme.applicationStartDate,
        applicationEndDate: scheme.applicationEndDate,
        isRollingApplication: scheme.isRollingApplication,
        requiredDocuments: scheme.requiredDocuments,
        requiredDocumentsHi: scheme.requiredDocumentsHi,
        applicationSteps: scheme.applicationSteps,
        applicationStepsHi: scheme.applicationStepsHi,
        officialPortalUrl: scheme.officialPortalUrl,
        guidelinesUrl: scheme.guidelinesUrl,
        sourceUrl: scheme.sourceUrl,
        verificationStatus: scheme.verificationStatus,
        launchYear: scheme.launchYear,
        supportsOrganic: scheme.supportsOrganic,
        landholdingRequirement: scheme.landholdingRequirement,
        tags: scheme.tags,
      },
      create: {
        ...scheme,
        lastSyncedAt: new Date(),
      },
    });
    upserted++;
  }

  await prisma.schemeSyncLog.create({
    data: {
      sourceName: "INITIAL_CURATED_OFFICIAL_DATASET",
      status: "SUCCESS",
      schemesChecked: INITIAL_GOVERNMENT_SCHEMES.length,
      schemesUpdated: upserted,
    },
  });

  schemesSeededVerified = true;
  cachedSchemesCount = upserted;
  cachedSchemeIndex = null;
  cacheInvalidatePrefix("schemes:");

  return { seeded: true, total: upserted };
}

/**
 * Synchronizes and verifies government schemes against official portals and curated dataset.
 * If live network verification fails or is offline, preserves the last known valid dataset
 * and logs the sync attempt.
 */
async function syncGovernmentSchemes({ performLiveNetworkCheck = true } = {}) {
  const now = new Date();
  let schemesChecked = 0;
  let schemesUpdated = 0;
  let reachableCount = 0;
  const errors = [];

  try {
    for (const item of INITIAL_GOVERNMENT_SCHEMES) {
      schemesChecked++;
      if (!isSafeOfficialUrl(item.officialPortalUrl) || !isSafeOfficialUrl(item.sourceUrl)) {
        errors.push(`Invalid URL for ${item.schemeCode}`);
        continue;
      }

      let verificationStatus = item.verificationStatus || "OFFICIAL_VERIFIED";
      let verifiedTimestamp = item.lastVerifiedAt || now;

      if (performLiveNetworkCheck) {
        const check = await verifyPortalReachability(item.officialPortalUrl, 2500);
        if (check.reachable) {
          reachableCount++;
          verificationStatus = "OFFICIAL_VERIFIED";
          verifiedTimestamp = now;
        } else {
          // Preserve dataset; mark as CURATED_VERIFIED (cached from verified official records)
          verificationStatus = "CURATED_VERIFIED";
        }
      }

      await prisma.governmentScheme.upsert({
        where: { schemeCode: item.schemeCode },
        update: {
          name: item.name,
          nameHi: item.nameHi,
          shortName: item.shortName,
          description: item.description,
          descriptionHi: item.descriptionHi,
          ministry: item.ministry,
          department: item.department,
          governmentLevel: item.governmentLevel,
          state: item.state,
          categories: item.categories,
          beneficiaryTypes: item.beneficiaryTypes,
          eligibilityCriteria: item.eligibilityCriteria,
          eligibilityCriteriaHi: item.eligibilityCriteriaHi,
          fundingType: item.fundingType,
          benefitSummary: item.benefitSummary,
          benefitSummaryHi: item.benefitSummaryHi,
          maxSubsidyPercent: item.maxSubsidyPercent,
          maxBenefitAmount: item.maxBenefitAmount,
          applicationStatus: item.applicationStatus,
          applicationStartDate: item.applicationStartDate,
          applicationEndDate: item.applicationEndDate,
          isRollingApplication: item.isRollingApplication,
          requiredDocuments: item.requiredDocuments,
          requiredDocumentsHi: item.requiredDocumentsHi,
          applicationSteps: item.applicationSteps,
          applicationStepsHi: item.applicationStepsHi,
          officialPortalUrl: item.officialPortalUrl,
          guidelinesUrl: item.guidelinesUrl,
          sourceUrl: item.sourceUrl,
          verificationStatus,
          lastVerifiedAt: verifiedTimestamp,
          lastSyncedAt: now,
          tags: item.tags,
          supportsOrganic: item.supportsOrganic,
          landholdingRequirement: item.landholdingRequirement,
        },
        create: {
          ...item,
          verificationStatus,
          lastVerifiedAt: verifiedTimestamp,
          lastSyncedAt: now,
        },
      });
      schemesUpdated++;
    }

    const syncStatus =
      errors.length === 0
        ? performLiveNetworkCheck && reachableCount === 0
          ? "PARTIAL"
          : "SUCCESS"
        : "PARTIAL";

    const logEntry = await prisma.schemeSyncLog.create({
      data: {
        sourceName: performLiveNetworkCheck
          ? "OFFICIAL_PORTALS_AND_MYSCHEME_CATALOG"
          : "CURATED_OFFICIAL_CATALOG",
        status: syncStatus,
        schemesChecked,
        schemesUpdated,
        errorMessage:
          performLiveNetworkCheck && reachableCount === 0
            ? "Live portal ping unreachable in current environment; preserved verified curated dataset."
            : errors.length > 0
            ? errors.join("; ")
            : null,
      },
    });

    cachedSchemeIndex = null;
    cacheInvalidatePrefix("schemes:");

    return {
      status: syncStatus,
      schemesChecked,
      schemesUpdated,
      livePortalsReachable: reachableCount,
      syncedAt: logEntry.syncedAt,
      logId: logEntry.id,
    };
  } catch (err) {
    console.error("[schemeSyncService] Sync failed, preserving existing dataset:", err.message);
    await prisma.schemeSyncLog.create({
      data: {
        sourceName: "OFFICIAL_PORTALS_AND_MYSCHEME_CATALOG",
        status: "FAILED",
        schemesChecked,
        schemesUpdated,
        errorMessage: err.message,
      },
    });
    return {
      status: "FAILED",
      schemesChecked,
      schemesUpdated,
      error: "Sync encountered an error; existing verified dataset was preserved.",
    };
  }
}

const NORTH_EAST_STATES = [
  "assam",
  "sikkim",
  "arunachal pradesh",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "tripura",
  "north east",
];

/**
 * Generates personalized scheme recommendations based on non-sensitive farmer/business profile.
 * Explains why each scheme matches, its eligibility criteria, and what to verify before applying.
 */
function scoreSchemesForProfile(schemes, profile = {}, lang = "en") {
  const {
    state = "",
    district = "",
    farmerCategory = "INDIVIDUAL_FARMER",
    landholdingCategory = "SMALL_MARGINAL",
    organicCertStatus = "TRANSITIONING",
    isFpoMember = false,
    farmingInterests = [],
  } = profile;

  const normState = String(state || "").trim().toLowerCase();
  const isNorthEast = NORTH_EAST_STATES.includes(normState);
  const interestsSet = new Set(
    (Array.isArray(farmingInterests) ? farmingInterests : []).map((i) => String(i).toUpperCase())
  );

  const scored = schemes.map((scheme) => {
    let score = 0;
    const matchReasons = [];
    const matchReasonsHi = [];
    const verificationChecklist = [
      lang === "hi"
        ? `आधिकारिक पोर्टल (${scheme.officialPortalUrl}) पर वर्तमान वित्तीय वर्ष के आवेदन दिशा-निर्देशों की पुष्टि करें।`
        : `Verify current financial-year guidelines and district quota on the official portal (${scheme.officialPortalUrl}).`,
    ];

    const schemeState = (scheme.state || "ALL").toLowerCase();

    // 1. State / Geographic eligibility check
    if (scheme.governmentLevel === "STATE") {
      if (normState && schemeState === normState) {
        score += 35;
        matchReasons.push(`Dedicated State Government scheme for ${scheme.state}${district ? ` (${district})` : ""}`);
        matchReasonsHi.push(`${scheme.state} राज्य के किसानों के लिए विशेष राज्य सरकार योजना`);
      } else if (normState && schemeState !== normState) {
        // State scheme for another state -> exclude or low score
        return null;
      } else {
        score += 10;
      }
    } else if (schemeState === "north east") {
      if (isNorthEast) {
        score += 35;
        matchReasons.push("Specifically designed for North Eastern Region organic value chains");
        matchReasonsHi.push("पूर्वोत्तर क्षेत्र के जैविक किसानों के लिए विशेष योजना");
      } else if (normState) {
        return null;
      }
    } else {
      // Central pan-India scheme
      score += 15;
      matchReasons.push(
        state
          ? `Pan-India Central Government scheme applicable in ${state}`
          : "Pan-India Central Government scheme"
      );
      matchReasonsHi.push(
        state ? `${state} सहित पूरे भारत में लागू केंद्रीय योजना` : "अखिल भारतीय केंद्रीय सरकारी योजना"
      );
    }

    // 2. Beneficiary / Farmer Category match
    if (farmerCategory && scheme.beneficiaryTypes.includes(farmerCategory)) {
      score += 20;
      const friendlyCat = farmerCategory.replace(/_/g, " ").toLowerCase();
      matchReasons.push(`Eligible beneficiary category: ${friendlyCat}`);
      matchReasonsHi.push(`पात्र लाभार्थी श्रेणी से मेल खाता है`);
    }

    // 3. Small/Marginal landholding preference
    if (
      (landholdingCategory === "SMALL_MARGINAL" || landholdingCategory === "UNDER_2_HA") &&
      scheme.beneficiaryTypes.includes("SMALL_MARGINAL_FARMER")
    ) {
      score += 15;
      matchReasons.push("Provides priority or higher subsidy rates for Small & Marginal Farmers (up to 2 Ha)");
      matchReasonsHi.push("लघु एवं सीमांत किसानों (2 हेक्टेयर तक) को प्राथमिकता / उच्च सब्सिडी");
    }

    // 4. Organic Certification Status alignment
    if (
      (organicCertStatus === "CERTIFIED" ||
        organicCertStatus === "PGS_CERTIFIED" ||
        organicCertStatus === "NPOP_CERTIFIED" ||
        organicCertStatus === "TRANSITIONING") &&
      scheme.supportsOrganic
    ) {
      score += 20;
      if (scheme.categories.includes("CERTIFICATION")) {
        score += 10;
        matchReasons.push("Supports organic certification (PGS-India / NPOP) and organic input subsidies");
        matchReasonsHi.push("जैविक प्रमाणन (PGS-India / NPOP) और जैविक आदानों के लिए सहायता");
      } else {
        matchReasons.push("Applicable to organic and chemical-free farming operations");
        matchReasonsHi.push("जैविक और रसायन-मुक्त कृषि के लिए उपयुक्त");
      }
    }

    // 5. FPO Membership bonus
    if (isFpoMember && (scheme.categories.includes("FPO") || scheme.beneficiaryTypes.includes("FPO"))) {
      score += 20;
      matchReasons.push("Includes dedicated grants, cluster benefits, or credit guarantees for FPO members");
      matchReasonsHi.push("FPO सदस्यों और किसान समूहों के लिए विशेष अनुदान/लाभ उपलब्ध");
    }

    // 6. Farming Interests match
    const matchedCategories = scheme.categories.filter((c) => interestsSet.has(c));
    if (matchedCategories.length > 0) {
      score += matchedCategories.length * 15;
      matchReasons.push(
        `Matches your selected interests: ${matchedCategories.map((c) => c.replace(/_/g, " ")).join(", ")}`
      );
      matchReasonsHi.push(
        `आपकी चयनित कृषि रुचियों (${matchedCategories.map((c) => c.replace(/_/g, " ")).join(", ")}) से मेल खाता है`
      );
    }

    // Add scheme-specific verification checklist items
    if (scheme.landholdingRequirement) {
      verificationChecklist.push(
        lang === "hi"
          ? `भूमि पात्रता आवश्यकता की जांच करें: ${scheme.landholdingRequirement}`
          : `Confirm landholding requirement: ${scheme.landholdingRequirement}`
      );
    }
    if (scheme.fundingType === "CREDIT_SUBVENTION" || scheme.schemeCode === "AIF" || scheme.schemeCode === "PMFME") {
      verificationChecklist.push(
        lang === "hi"
          ? "यह बैंक ऋण आधारित योजना है — आवेदन से पहले अपने नजदीकी बैंक शाखा और DPR आवश्यकताओं की जांच करें।"
          : "This scheme involves bank credit linkage — verify Detailed Project Report (DPR) and lending bank eligibility before applying."
      );
    }

    // Compute final score via x86_64 SIMD pmaddwd 16-bit dot product (asm_simd_dot_i16)
    const stateScoreComponent =
      scheme.governmentLevel === "STATE" && normState && schemeState === normState
        ? 35
        : scheme.governmentLevel === "STATE"
        ? 10
        : schemeState === "north east" && isNorthEast
        ? 35
        : 15;
    const catMatch = farmerCategory && scheme.beneficiaryTypes.includes(farmerCategory) ? 1 : 0;
    const smallMarginalMatch =
      (landholdingCategory === "SMALL_MARGINAL" || landholdingCategory === "UNDER_2_HA") &&
      scheme.beneficiaryTypes.includes("SMALL_MARGINAL_FARMER")
        ? 1
        : 0;
    const organicMatch =
      (organicCertStatus === "CERTIFIED" ||
        organicCertStatus === "PGS_CERTIFIED" ||
        organicCertStatus === "NPOP_CERTIFIED" ||
        organicCertStatus === "TRANSITIONING") &&
      scheme.supportsOrganic
        ? 1
        : 0;
    const certCatBonus = organicMatch && scheme.categories.includes("CERTIFICATION") ? 1 : 0;
    const fpoMatch =
      isFpoMember && (scheme.categories.includes("FPO") || scheme.beneficiaryTypes.includes("FPO"))
        ? 1
        : 0;
    const interestCount = matchedCategories.length;

    const simdFeatures = [
      stateScoreComponent,
      catMatch,
      smallMarginalMatch,
      organicMatch,
      certCatBonus,
      fpoMatch,
      interestCount,
      0,
    ];
    const simdWeights = [1, 20, 15, 20, 10, 20, 15, 0];
    const simdScore = simdDotProductI16(simdFeatures, simdWeights);

    return {
      scheme,
      matchScore: Math.min(100, simdScore > 0 ? simdScore : score),
      simdAccelerated: true,
      matchReasons: lang === "hi" ? matchReasonsHi : matchReasons,
      matchReasonsEn: matchReasons,
      matchReasonsHi,
      verificationChecklist,
    };
  });

  const validScored = scored.filter(Boolean);
  return MinHeap.selectTopK(validScored, validScored.length, (x) => x.matchScore);
}

/**
 * Finds educational government schemes relevant to a specific organic product batch
 * based on its farmLocation, cropType, organicCertId, and recorded supply chain events.
 * Strictly separates informational scheme data from on-chain verification.
 */
async function getContextualSchemesForBatch(batch) {
  await ensureSchemesSeeded();
  const allSchemes = await prisma.governmentScheme.findMany({
    where: { applicationStatus: "OPEN" },
    orderBy: { lastVerifiedAt: "desc" },
  });

  const locLower = String(batch.farmLocation || "").toLowerCase();
  const cropLower = String(batch.cropType || batch.productName || "").toLowerCase();
  const hasEvents = Array.isArray(batch.events) && batch.events.length > 0;
  const hasProcessingOrStorage = (batch.events || []).some((e) =>
    ["RECEIVED_BY_PROCESSOR", "PROCESSING_STARTED", "PROCESSING_COMPLETED", "PACKAGED", "IN_TRANSIT"].includes(
      e.eventType
    )
  );

  const matched = [];
  for (const scheme of allSchemes) {
    const reasons = [];
    const reasonsHi = [];
    let relevance = 0;

    // State match from farmLocation
    if (scheme.governmentLevel === "STATE") {
      if (locLower.includes(scheme.state.toLowerCase())) {
        relevance += 40;
        reasons.push(`Farm location (${batch.farmLocation}) is in ${scheme.state}`);
        reasonsHi.push(`खेत का स्थान (${batch.farmLocation}) ${scheme.state} राज्य में है`);
      } else {
        continue;
      }
    } else if (scheme.state === "North East") {
      if (NORTH_EAST_STATES.some((st) => locLower.includes(st))) {
        relevance += 40;
        reasons.push(`Farm location (${batch.farmLocation}) qualifies for North East Organic Mission`);
        reasonsHi.push(`पूर्वोत्तर क्षेत्र के जैविक उत्पाद के लिए प्रासंगिक`);
      } else {
        continue;
      }
    }

    // Organic & Certification match
    if (scheme.categories.includes("ORGANIC_FARMING") || scheme.categories.includes("CERTIFICATION")) {
      relevance += 25;
      if (batch.organicCertId) {
        reasons.push(`Relevant to certified organic production (${batch.organicCertId}) & certification renewal`);
        reasonsHi.push(`प्रमाणित जैविक उत्पादन (${batch.organicCertId}) और प्रमाणन सहायता से संबंधित`);
      } else {
        reasons.push("Supports organic conversion and PGS-India / NPOP organic certification");
        reasonsHi.push("जैविक खेती और PGS-India / NPOP जैविक प्रमाणन प्राप्त करने में सहायक");
      }
    }

    // Crop-specific or supply chain stage match
    if (
      hasProcessingOrStorage &&
      (scheme.categories.includes("STORAGE") ||
        scheme.categories.includes("FOOD_PROCESSING") ||
        scheme.categories.includes("INFRASTRUCTURE"))
    ) {
      relevance += 20;
      reasons.push("Supports post-harvest processing, packaging, storage, and supply-chain infrastructure");
      reasonsHi.push("फसल कटाई के बाद प्रसंस्करण, पैकेजिंग और भंडारण अवसंरचना के लिए उपयोगी");
    }

    if (scheme.categories.includes("MARKET_ACCESS")) {
      relevance += 15;
      reasons.push(`Enables national market access and price discovery for ${batch.cropType}`);
      reasonsHi.push(`${batch.cropType} की बिक्री और राष्ट्रीय बाजार पहुंच के लिए उपयोगी`);
    }

    if (cropLower.includes("basmati") || cropLower.includes("rice") || cropLower.includes("wheat")) {
      if (scheme.tags.some((t) => ["basmati", "pkvy", "pmkisan", "enam"].includes(t))) {
        relevance += 10;
      }
    }

    if (relevance >= 25) {
      matched.push({
        scheme,
        relevance,
        relevanceReasons: reasons,
        relevanceReasonsHi: reasonsHi,
      });
    }
  }

  const topEducationalSchemes = MinHeap.selectTopK(matched, 6, (x) => x.relevance);

  // Also fetch any explicitly linked schemes for this batch
  const explicitLinks = await prisma.batchSchemeLink.findMany({
    where: { batchId: batch.batchId },
    include: {
      scheme: true,
      linkedBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    batchId: batch.batchId,
    cropType: batch.cropType,
    farmLocation: batch.farmLocation,
    linkedSchemes: explicitLinks,
    recommendedEducationalSchemes: topEducationalSchemes,
    separationNotice:
      "Government scheme listings are provided for informational and farmer-support purposes only. Inclusion of a scheme here does NOT constitute blockchain verification of subsidy approval or product certification.",
    separationNoticeHi:
      "सरकारी योजनाओं की जानकारी केवल किसानों की जागरूकता और सहायता के लिए है। यहाँ किसी योजना का दिखना सब्सिडी की स्वीकृति या ब्लॉकचेन सत्यापन का प्रमाण नहीं है।",
  };
}

module.exports = {
  isSafeOfficialUrl,
  verifyPortalReachability,
  ensureSchemesSeeded,
  syncGovernmentSchemes,
  scoreSchemesForProfile,
  getContextualSchemesForBatch,
  getSchemeSearchIndex,
};
