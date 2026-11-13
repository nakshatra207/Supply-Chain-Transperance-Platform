const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const prisma = require("../prismaClient");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  isSafeOfficialUrl,
  ensureSchemesSeeded,
  syncGovernmentSchemes,
  scoreSchemesForProfile,
  getContextualSchemesForBatch,
} = require("../services/schemeSyncService");
const { cacheGetJson, cacheSetJson } = require("../hash");

const router = express.Router();

const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: "Too many synchronization requests. Please wait a few minutes." },
});

const SCHEME_CATEGORIES = [
  "ORGANIC_FARMING",
  "IRRIGATION",
  "CERTIFICATION",
  "EQUIPMENT",
  "INFRASTRUCTURE",
  "STORAGE",
  "TRANSPORTATION",
  "FPO",
  "FOOD_PROCESSING",
  "FINANCIAL_ASSISTANCE",
  "INSURANCE",
  "MARKET_ACCESS",
];

const BENEFICIARY_TYPES = [
  "INDIVIDUAL_FARMER",
  "SMALL_MARGINAL_FARMER",
  "ORGANIC_FARMER",
  "FPO",
  "COOPERATIVE",
  "AGRI_ENTREPRENEUR",
  "MSME",
  "SHG",
  "STARTUP",
];

// GET /api/schemes/meta — Filter metadata, official sources, and latest synchronization info
router.get("/meta", async (req, res, next) => {
  try {
    const cachedMeta = cacheGetJson("schemes:meta");
    if (cachedMeta) {
      return res.json(cachedMeta);
    }

    await ensureSchemesSeeded();

    const [latestSync, allSchemes] = await Promise.all([
      prisma.schemeSyncLog.findFirst({ orderBy: { syncedAt: "desc" } }),
      prisma.governmentScheme.findMany({
        select: {
          governmentLevel: true,
          state: true,
          categories: true,
          applicationStatus: true,
          fundingType: true,
        },
      }),
    ]);

    const states = Array.from(new Set(allSchemes.map((s) => s.state))).sort();
    const fundingTypes = Array.from(new Set(allSchemes.map((s) => s.fundingType))).sort();

    const payload = {
      categories: SCHEME_CATEGORIES,
      beneficiaryTypes: BENEFICIARY_TYPES,
      states,
      fundingTypes,
      totalSchemes: allSchemes.length,
      latestSync: latestSync || null,
      officialSources: [
        { name: "myScheme National Portal", url: "https://www.myscheme.gov.in/" },
        { name: "Ministry of Agriculture & Farmers Welfare", url: "https://agriwelfare.gov.in/" },
        { name: "PM-KISAN Samman Nidhi Portal", url: "https://pmkisan.gov.in/" },
        { name: "National Agriculture Market (e-NAM)", url: "https://enam.gov.in/" },
        { name: "Agriculture Infrastructure Fund (AIF)", url: "https://agriinfra.dac.gov.in/" },
        { name: "PGS-India Organic Certification Portal", url: "https://pgsindia-ncof.gov.in/" },
        { name: "National Portal of India", url: "https://www.india.gov.in/" },
      ],
    };
    cacheSetJson("schemes:meta", payload, 30000);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/schemes — List, search, filter, sort, and paginate schemes
router.get("/", async (req, res, next) => {
  try {
    const cacheKey = `schemes:list:${JSON.stringify(req.query || {})}`;
    const cachedList = cacheGetJson(cacheKey);
    if (cachedList) {
      return res.json(cachedList);
    }

    await ensureSchemesSeeded();

    const {
      q = "",
      governmentLevel = "",
      state = "",
      category = "",
      beneficiaryType = "",
      applicationStatus = "",
      fundingType = "",
      supportsOrganic = "",
      sortBy = "verified",
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));

    const where = {};

    if (governmentLevel && ["CENTRAL", "STATE"].includes(String(governmentLevel).toUpperCase())) {
      where.governmentLevel = String(governmentLevel).toUpperCase();
    }

    if (state && state !== "ALL") {
      where.OR = [
        { state: { equals: String(state), mode: "insensitive" } },
        { state: "ALL" },
      ];
    }

    if (category) {
      where.categories = { has: String(category).toUpperCase() };
    }

    if (beneficiaryType) {
      where.beneficiaryTypes = { has: String(beneficiaryType).toUpperCase() };
    }

    if (
      applicationStatus &&
      ["OPEN", "UPCOMING", "CLOSED", "STATUS_UNVERIFIED"].includes(String(applicationStatus).toUpperCase())
    ) {
      where.applicationStatus = String(applicationStatus).toUpperCase();
    }

    if (fundingType) {
      where.fundingType = String(fundingType).toUpperCase();
    }

    if (supportsOrganic === "true") {
      where.supportsOrganic = true;
    }

    const searchStr = String(q || "").trim();
    if (searchStr) {
      const searchClauses = [
        { name: { contains: searchStr, mode: "insensitive" } },
        { nameHi: { contains: searchStr, mode: "insensitive" } },
        { schemeCode: { contains: searchStr, mode: "insensitive" } },
        { shortName: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
        { descriptionHi: { contains: searchStr, mode: "insensitive" } },
        { ministry: { contains: searchStr, mode: "insensitive" } },
        { state: { contains: searchStr, mode: "insensitive" } },
        { benefitSummary: { contains: searchStr, mode: "insensitive" } },
        { tags: { has: searchStr.toLowerCase() } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchClauses }];
        delete where.OR;
      } else {
        where.OR = searchClauses;
      }
    }

    let orderBy = { lastVerifiedAt: "desc" };
    if (sortBy === "name") {
      orderBy = { name: "asc" };
    } else if (sortBy === "newest") {
      orderBy = { lastUpdatedDate: "desc" };
    } else if (sortBy === "subsidy") {
      orderBy = { maxSubsidyPercent: "desc" };
    }

    const [total, schemes, latestSync] = await Promise.all([
      prisma.governmentScheme.count({ where }),
      prisma.governmentScheme.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.schemeSyncLog.findFirst({ orderBy: { syncedAt: "desc" } }),
    ]);

    const responsePayload = {
      schemes,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
      latestSync: latestSync || null,
      disclaimer:
        "Scheme details are compiled from official Government of India and State Agriculture portals. Eligibility, subsidy percentages, and application deadlines are subject to official scheme guidelines and verification by the respective department.",
    };
    cacheSetJson(cacheKey, responsePayload, 20000);
    res.json(responsePayload);
  } catch (err) {
    next(err);
  }
});

// POST /api/schemes/recommend — Personalized scheme recommendations (No sensitive PII collected)
const recommendSchema = z.object({
  state: z.string().max(80).optional().default(""),
  district: z.string().max(80).optional().default(""),
  farmerCategory: z.string().max(60).optional().default("INDIVIDUAL_FARMER"),
  landholdingCategory: z.string().max(60).optional().default("SMALL_MARGINAL"),
  organicCertStatus: z.string().max(60).optional().default("TRANSITIONING"),
  isFpoMember: z.boolean().optional().default(false),
  farmingInterests: z.array(z.string().max(60)).optional().default([]),
  lang: z.string().trim().min(2).max(10).optional().default("en"),
});

router.post("/recommend", async (req, res, next) => {
  try {
    const parsed = recommendSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid profile parameters", details: parsed.error.flatten() });
    }

    await ensureSchemesSeeded();
    const allSchemes = await prisma.governmentScheme.findMany({
      where: { applicationStatus: { in: ["OPEN", "UPCOMING"] } },
    });

    const recommendations = scoreSchemesForProfile(allSchemes, parsed.data, parsed.data.lang);

    res.json({
      profile: parsed.data,
      recommendations,
      disclaimer:
        "Recommendations are indicative based on your selected profile. They do NOT guarantee eligibility, approval, or subsidy disbursement. Always verify final eligibility on the official government portal before applying.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/schemes/contextual/batch/:batchId — Public educational scheme matches for a product batch
router.get("/contextual/batch/:batchId", async (req, res, next) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { batchId: req.params.batchId },
      include: { events: true },
    });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const result = await getContextualSchemesForBatch(batch);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/schemes/saved — Get authenticated user's saved schemes
router.get("/saved", requireAuth, async (req, res, next) => {
  try {
    const saved = await prisma.savedScheme.findMany({
      where: { userId: req.user.id },
      include: { scheme: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      savedSchemes: saved.map((s) => ({
        id: s.id,
        savedAt: s.createdAt,
        notes: s.notes,
        scheme: s.scheme,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/schemes/sync — Trigger synchronization with official sources
router.post("/sync", syncLimiter, async (req, res, next) => {
  try {
    await ensureSchemesSeeded();
    const live = req.body?.performLiveNetworkCheck !== false;
    const result = await syncGovernmentSchemes({ performLiveNetworkCheck: live });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/schemes/:codeOrId — Get single scheme details by schemeCode or UUID
router.get("/:codeOrId", async (req, res, next) => {
  try {
    await ensureSchemesSeeded();
    const codeOrId = String(req.params.codeOrId).trim();

    let scheme = await prisma.governmentScheme.findUnique({
      where: { schemeCode: codeOrId.toUpperCase() },
    });
    if (!scheme) {
      scheme = await prisma.governmentScheme.findUnique({
        where: { id: codeOrId },
      });
    }
    if (!scheme) {
      return res.status(404).json({ error: "Government scheme not found" });
    }

    const safePortal = isSafeOfficialUrl(scheme.officialPortalUrl);

    res.json({
      scheme,
      safeOfficialUrl: safePortal,
      disclaimer:
        "This information is sourced from official government notifications for farmer awareness. Organic Trace does not process subsidy applications directly; applications must be submitted on the official government portal.",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/schemes/:codeOrId/save — Save scheme for authenticated user
router.post("/:codeOrId/save", requireAuth, async (req, res, next) => {
  try {
    const codeOrId = String(req.params.codeOrId).trim();
    const scheme =
      (await prisma.governmentScheme.findUnique({ where: { schemeCode: codeOrId.toUpperCase() } })) ||
      (await prisma.governmentScheme.findUnique({ where: { id: codeOrId } }));

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const saved = await prisma.savedScheme.upsert({
      where: {
        userId_schemeId: {
          userId: req.user.id,
          schemeId: scheme.id,
        },
      },
      update: { notes: req.body?.notes ? String(req.body.notes).slice(0, 300) : undefined },
      create: {
        userId: req.user.id,
        schemeId: scheme.id,
        notes: req.body?.notes ? String(req.body.notes).slice(0, 300) : null,
      },
      include: { scheme: true },
    });

    res.status(201).json({ saved });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schemes/:codeOrId/save — Remove saved scheme for authenticated user
router.delete("/:codeOrId/save", requireAuth, async (req, res, next) => {
  try {
    const codeOrId = String(req.params.codeOrId).trim();
    const scheme =
      (await prisma.governmentScheme.findUnique({ where: { schemeCode: codeOrId.toUpperCase() } })) ||
      (await prisma.governmentScheme.findUnique({ where: { id: codeOrId } }));

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    await prisma.savedScheme.deleteMany({
      where: {
        userId: req.user.id,
        schemeId: scheme.id,
      },
    });

    res.json({ removed: true, schemeCode: scheme.schemeCode });
  } catch (err) {
    next(err);
  }
});

// POST /api/schemes/:codeOrId/link-batch — Optional link between scheme and batch (without altering ownership or blockchain data)
const linkBatchSchema = z.object({
  batchId: z.string().min(2),
  utilizationNote: z.string().max(250).optional(),
});

router.post("/:codeOrId/link-batch", requireAuth, requireRole("FARMER", "ADMIN"), async (req, res, next) => {
  try {
    const parsed = linkBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const codeOrId = String(req.params.codeOrId).trim();
    const scheme =
      (await prisma.governmentScheme.findUnique({ where: { schemeCode: codeOrId.toUpperCase() } })) ||
      (await prisma.governmentScheme.findUnique({ where: { id: codeOrId } }));

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const batch = await prisma.batch.findUnique({ where: { batchId: parsed.data.batchId } });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    if (req.user.role === "FARMER" && batch.farmerId !== req.user.id) {
      return res.status(403).json({ error: "You can only link schemes to your own product batches" });
    }

    const link = await prisma.batchSchemeLink.upsert({
      where: {
        batchId_schemeId: {
          batchId: batch.batchId,
          schemeId: scheme.id,
        },
      },
      update: {
        utilizationNote: parsed.data.utilizationNote || null,
      },
      create: {
        batchId: batch.batchId,
        schemeId: scheme.id,
        linkedByUserId: req.user.id,
        utilizationNote: parsed.data.utilizationNote || null,
      },
      include: { scheme: true },
    });

    res.status(201).json({
      link,
      notice:
        "Scheme link recorded in PostgreSQL as informational farmer metadata. Existing product ownership and on-chain traceability records remain untouched.",
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:codeOrId/link-batch/:batchId", requireAuth, requireRole("FARMER", "ADMIN"), async (req, res, next) => {
  try {
    const codeOrId = String(req.params.codeOrId).trim();
    const scheme =
      (await prisma.governmentScheme.findUnique({ where: { schemeCode: codeOrId.toUpperCase() } })) ||
      (await prisma.governmentScheme.findUnique({ where: { id: codeOrId } }));

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const batch = await prisma.batch.findUnique({ where: { batchId: req.params.batchId } });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    if (req.user.role === "FARMER" && batch.farmerId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.batchSchemeLink.deleteMany({
      where: { batchId: batch.batchId, schemeId: scheme.id },
    });

    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
