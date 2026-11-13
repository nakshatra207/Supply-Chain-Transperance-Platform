/**
 * Natural-Language Voice Command Parser for Organic Trace.
 *
 * Converts spoken or edited English, Hindi (including Haryanvi-compatible Hindi),
 * and Punjabi transcripts into structured, safe, validated UI actions.
 *
 * Security guarantee:
 * - Never executes arbitrary SQL, shell commands, or unapproved external URLs.
 * - Maps strictly to allowlisted frontend routes, search queries, filters, TTS actions,
 *   and user-confirmed official portal navigation.
 */

export const SUPPORTED_VOICE_LANGUAGES = [
  { code: "en-IN", label: "English (India)", short: "EN", appLang: "en" },
  { code: "hi-IN", label: "हिन्दी (Hindi)", short: "HI", appLang: "hi" },
  { code: "bn-IN", label: "বাংলা (Bengali)", short: "BN", appLang: "bn" },
  { code: "te-IN", label: "తెలుగు (Telugu)", short: "TE", appLang: "te" },
  { code: "mr-IN", label: "मराठी (Marathi)", short: "MR", appLang: "mr" },
  { code: "ta-IN", label: "தமிழ் (Tamil)", short: "TA", appLang: "ta" },
  { code: "ur-IN", label: "اردو (Urdu)", short: "UR", appLang: "ur" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)", short: "GU", appLang: "gu" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", short: "KN", appLang: "kn" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)", short: "ML", appLang: "ml" },
  { code: "or-IN", label: "ଓଡ଼ିଆ (Odia)", short: "OR", appLang: "or" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)", short: "PA", appLang: "pa" },
  { code: "as-IN", label: "অসমীয়া (Assamese)", short: "AS", appLang: "as" },
  { code: "mai-IN", label: "मैथिली (Maithili)", short: "MAI", appLang: "mai" },
  { code: "sat-IN", label: "ᱥᱟᱱᱛᱟᱲᱤ (Santali)", short: "SAT", appLang: "sat" },
  { code: "ks-IN", label: "कॉशुर / کٲشُر (Kashmiri)", short: "KS", appLang: "ks" },
  { code: "ne-NP", label: "नेपाली (Nepali)", short: "NE", appLang: "ne" },
  { code: "kok-IN", label: "कोंकणी (Konkani)", short: "KOK", appLang: "kok" },
  { code: "sd-IN", label: "सिंधी / سنڌي (Sindhi)", short: "SD", appLang: "sd" },
  { code: "doi-IN", label: "डोगरी (Dogri)", short: "DOI", appLang: "doi" },
  { code: "mni-IN", label: "মৈতৈলোন্ (Manipuri)", short: "MNI", appLang: "mni" },
  { code: "brx-IN", label: "बड़ो (Bodo)", short: "BRX", appLang: "brx" },
  { code: "sa-IN", label: "संस्कृतम् (Sanskrit)", short: "SA", appLang: "sa" },
  { code: "bho-IN", label: "भोजपुरी (Bhojpuri)", short: "BHO", appLang: "bho" },
  { code: "bgc-IN", label: "हरियाणवी (Haryanvi)", short: "BGC", appLang: "bgc" },
  { code: "raj-IN", label: "राजस्थानी (Rajasthani)", short: "RAJ", appLang: "raj" },
  { code: "hne-IN", label: "छत्तीसगढ़ी (Chhattisgarhi)", short: "HNE", appLang: "hne" },
];

const KNOWN_SCHEME_CODES = [
  { code: "PM-KISAN", patterns: ["pm kisan", "pm-kisan", "kisan samman", "पीएम किसान", "किसान सम्मान"] },
  { code: "PKVY", patterns: ["pkvy", "paramparagat", "परम्परागत", "परंपरागत कृषि", "पीकेवीवाई"] },
  { code: "PMKSY", patterns: ["pmksy", "sinchayee", "per drop more crop", "सिंचाई योजना", "पीएमकेएसवाई"] },
  { code: "MOVCDNER", patterns: ["movcdner", "north east organic", "पूर्वोत्तर जैविक"] },
  { code: "NMNF", patterns: ["nmnf", "natural farming mission", "prakritik kheti", "प्राकृतिक खेती मिशन"] },
  { code: "AIF", patterns: ["aif", "agriculture infrastructure fund", "एआईएफ", "कृषि अवसंरचना कोष"] },
  { code: "PMFBY", patterns: ["pmfby", "fasal bima", "फसल बीमा", "पीएमएफबीवाई"] },
  { code: "ENAM", patterns: ["e-nam", "enam", "national agriculture market", "ई-नाम", "ई नाम"] },
  { code: "RKVY", patterns: ["rkvy", "rashtriya krishi vikas", "आरकेवीवाई", "राष्ट्रीय कृषि विकास"] },
  { code: "PMFME", patterns: ["pmfme", "micro food processing", "पीएमएफएमई", "सूक्ष्म खाद्य प्रसंस्करण"] },
  { code: "FPO-10K", patterns: ["10000 fpo", "10,000 fpo", "fpo scheme", "एफपीओ योजना"] },
  { code: "NPOP-APEDA", patterns: ["npop", "apeda", "एपीडा", "एनपीओपी"] },
  { code: "AMI-NABARD", patterns: ["nabard storage", "ami scheme", "grameen bhandaran", "नाबार्ड भंडारण", "ग्रामीण भंडारण"] },
  { code: "SMAM", patterns: ["smam", "mechanization", "कृषि यंत्र अनुदान", "मशीनीकरण"] },
  { code: "HARYANA-ORGANIC-PROTSAHAN", patterns: ["meri fasal mera byora", "haryana organic", "मेरी फसल मेरा ब्यौरा", "हरियाणा जैविक"] },
  { code: "MIDH-COLDCHAIN", patterns: ["midh", "cold chain scheme", "reefer van", "कोल्ड चेन", "बागवानी मिशन"] },
];

const STATE_KEYWORDS = [
  { state: "Haryana", patterns: ["haryana", "karnal", "hisar", "kurukshetra", "हरियाणा", "करनाल", "हिसार", "हरयाणा"] },
  { state: "Punjab", patterns: ["punjab", "ludhiana", "amritsar", "पंजाब", "ਪੰਜਾਬ"] },
  { state: "North East", patterns: ["north east", "assam", "sikkim", "meghalaya", "पूर्वोत्तर", "असम", "सिक्किम"] },
  { state: "Uttar Pradesh", patterns: ["uttar pradesh", "उत्तर प्रदेश", "यूपी"] },
  { state: "Maharashtra", patterns: ["maharashtra", "महाराष्ट्र"] },
  { state: "Rajasthan", patterns: ["rajasthan", "राजस्थान"] },
  { state: "Madhya Pradesh", patterns: ["madhya pradesh", "मध्य प्रदेश"] },
  { state: "Gujarat", patterns: ["gujarat", "गुजरात"] },
];

const UNSAFE_PATTERNS = [
  /\b(drop\s+table|delete\s+from|insert\s+into|update\s+users|union\s+select|--|;)\b/i,
  /<script\b/i,
  /\b(rm\s+-rf|sudo\s+|chmod\s+|curl\s+|wget\s+)\b/i,
  /javascript:/i,
];

/**
 * Sanitizes raw spoken or typed command input.
 */
export function sanitizeVoiceInput(rawText) {
  if (!rawText || typeof rawText !== "string") return "";
  return rawText
    .replace(/[<>`$\\{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250);
}

/**
 * Parses a natural-language voice transcript into an actionable intent object.
 *
 * Returns:
 * {
 *   type: "FILTER_SCHEMES" | "OPEN_SCHEME" | "TRACE_BATCH" | "VERIFY_BLOCKCHAIN" |
 *         "READ_ALOUD" | "OPEN_OFFICIAL_PORTAL" | "NAVIGATE" | "REJECTED_UNSAFE" | "EMPTY",
 *   route: string | null,
 *   params: object,
 *   summary: string,
 *   summaryHi: string,
 *   requiresConfirmation: boolean
 * }
 */
export function parseVoiceCommand(rawInput) {
  const rawString = String(rawInput || "").trim();
  if (!rawString) {
    return {
      type: "EMPTY",
      route: null,
      params: {},
      summary: "No speech detected. Please speak or type your request.",
      summaryHi: "कोई आवाज़ नहीं मिली। कृपया दोबारा बोलें या लिखें।",
      requiresConfirmation: false,
    };
  }

  for (const unsafeRegex of UNSAFE_PATTERNS) {
    if (unsafeRegex.test(rawString)) {
      return {
        type: "REJECTED_UNSAFE",
        route: null,
        params: {},
        summary: "Command rejected for security reasons. Only safe navigation and search actions are permitted.",
        summaryHi: "सुरक्षा कारणों से यह कमांड अस्वीकार कर दिया गया है।",
        requiresConfirmation: false,
      };
    }
  }

  const cleaned = sanitizeVoiceInput(rawString);
  if (!cleaned) {
    return {
      type: "EMPTY",
      route: null,
      params: {},
      summary: "No speech detected. Please speak or type your request.",
      summaryHi: "कोई आवाज़ नहीं मिली। कृपया दोबारा बोलें या लिखें।",
      requiresConfirmation: false,
    };
  }

  const lower = cleaned.toLowerCase();

  // 1. Check for Batch ID pattern (e.g., ORG-BAS-001 or "batch 001")
  const batchMatch = cleaned.match(/\b(ORG-[A-Z0-9-]+|[A-Z]{2,5}-[A-Z]{2,5}-\d{2,5})\b/i);
  const hasTraceKeyword =
    /\b(track|trace|qr|scan|product|batch|journey|origin)\b/i.test(lower) ||
    /(ट्रैक|ट्रेस|क्यूआर|उत्पाद|बैच|खोजें|जांचें|ਪ੍ਰੋਡਕਟ)/i.test(lower);
  const hasVerifyKeyword =
    /\b(verify|blockchain|hash|certificate|authentic)\b/i.test(lower) ||
    /(ब्लॉकचेन|सत्यापित|सत्यापन|प्रमाण पत्र|हैश)/i.test(lower);
  const hasSchemeKeyword =
    /\b(scheme|schemes|subsidy|subsidies|yojana|grant|support|assistance)\b/i.test(lower) ||
    /(योजना|योजनाएं|सब्सिडी|अनुदान|सहायता)/i.test(lower);

  // "Verify the blockchain record for this product"
  if (hasVerifyKeyword && !hasSchemeKeyword) {
    const targetBatchId = batchMatch ? batchMatch[1].toUpperCase() : "ORG-BAS-001";
    return {
      type: "VERIFY_BLOCKCHAIN",
      route: `/trace/${targetBatchId}`,
      params: { batchId: targetBatchId, highlightVerification: true, autoReadVerification: true },
      summary: `Verify blockchain record and certificate hash for batch ${targetBatchId}`,
      summaryHi: `बैच ${targetBatchId} के ब्लॉकचेन रिकॉर्ड और प्रमाण पत्र हैश का सत्यापन करें`,
      requiresConfirmation: false,
    };
  }

  // "Read out product journey and verification status"
  if (/\b(read|speak|aloud|listen)\b/i.test(lower) || /(सुनाओ|सुनाएं|पढ़कर|पढ़ो|बोलकर)/i.test(lower)) {
    return {
      type: "READ_ALOUD",
      route: batchMatch ? `/trace/${batchMatch[1].toUpperCase()}` : null,
      params: { batchId: batchMatch ? batchMatch[1].toUpperCase() : null },
      summary: "Read current page summary, product journey, or scheme details aloud",
      summaryHi: "वर्तमान पृष्ठ का सारांश, उत्पाद यात्रा या योजना विवरण पढ़कर सुनाएं",
      requiresConfirmation: false,
    };
  }

  // "Track my organic product using its QR code"
  if (hasTraceKeyword && !hasSchemeKeyword) {
    const targetBatchId = batchMatch ? batchMatch[1].toUpperCase() : "ORG-BAS-001";
    return {
      type: "TRACE_BATCH",
      route: `/trace/${targetBatchId}`,
      params: {
        batchId: targetBatchId,
        openQrScanner: /\b(qr|scan)\b/i.test(lower) || /(क्यूआर|स्कैन)/i.test(lower),
      },
      summary: `Open product traceability & QR lookup for batch ${targetBatchId}`,
      summaryHi: `बैच ${targetBatchId} की उत्पाद ट्रैसेबिलिटी और क्यूआर जानकारी खोलें`,
      requiresConfirmation: false,
    };
  }

  // 2. Check for Official Website Opening request ("apply online for PM-KISAN", "open official portal")
  const wantsExternalPortal =
    /\b(open website|official website|official portal|apply online)\b/i.test(lower) ||
    /(आधिकारिक वेबसाइट|पोर्टल खोलें|ऑनलाइन आवेदन)/i.test(lower);

  // 3. Check for a specific named scheme (e.g., "Open PKVY", "Tell me about PM-KISAN")
  for (const item of KNOWN_SCHEME_CODES) {
    if (item.patterns.some((p) => lower.includes(p))) {
      if (wantsExternalPortal) {
        return {
          type: "OPEN_OFFICIAL_PORTAL",
          route: `/schemes/${item.code}`,
          params: { schemeCode: item.code, promptExternalPortal: true },
          summary: `Open scheme ${item.code} and confirm visiting its official government portal`,
          summaryHi: `योजना ${item.code} खोलें और आधिकारिक सरकारी पोर्टल पर जाने की पुष्टि करें`,
          requiresConfirmation: true,
        };
      }
      return {
        type: "OPEN_SCHEME",
        route: `/schemes/${item.code}`,
        params: { schemeCode: item.code },
        summary: `Open details for government scheme: ${item.code}`,
        summaryHi: `सरकारी योजना ${item.code} का पूरा विवरण खोलें`,
        requiresConfirmation: false,
      };
    }
  }

  // 4. General Navigation commands (Farmer Dashboard, Partner Dashboard, Create Batch, Login, Home)
  if (/\b(create batch|new batch|register batch)\b/i.test(lower) || /(नया बैच|बैच बनाएं)/i.test(lower)) {
    return {
      type: "NAVIGATE",
      route: "/farmer/batches/new",
      params: {},
      summary: "Navigate to Create New Organic Batch page",
      summaryHi: "नया जैविक उत्पाद बैच बनाने के पृष्ठ पर जाएं",
      requiresConfirmation: false,
    };
  }
  if (/\b(farmer dashboard|my batches)\b/i.test(lower) || /(किसान डैशबोर्ड|मेरे बैच)/i.test(lower)) {
    return {
      type: "NAVIGATE",
      route: "/farmer",
      params: {},
      summary: "Navigate to Farmer Dashboard",
      summaryHi: "किसान डैशबोर्ड पर जाएं",
      requiresConfirmation: false,
    };
  }
  if (/\b(partner dashboard)\b/i.test(lower) || /(पार्टनर डैशबोर्ड)/i.test(lower)) {
    return {
      type: "NAVIGATE",
      route: "/partner",
      params: {},
      summary: "Navigate to Supply Chain Partner Dashboard",
      summaryHi: "सप्लाई चेन पार्टनर डैशबोर्ड पर जाएं",
      requiresConfirmation: false,
    };
  }
  if (/\b(go home|home page|landing page)\b/i.test(lower) || /(मुख्य पृष्ठ|होम पेज)/i.test(lower)) {
    return {
      type: "NAVIGATE",
      route: "/",
      params: {},
      summary: "Navigate to Home page",
      summaryHi: "मुख्य पृष्ठ (Home) पर जाएं",
      requiresConfirmation: false,
    };
  }

  // 5. Government Schemes Filtering & Search intents
  const filters = {};
  const descParts = [];
  const descPartsHi = [];

  // Detect State filter (e.g., "Which schemes are available for farmers in Haryana?")
  for (const st of STATE_KEYWORDS) {
    if (st.patterns.some((p) => lower.includes(p))) {
      filters.state = st.state;
      descParts.push(`State: ${st.state}`);
      descPartsHi.push(`राज्य: ${st.state}`);
      break;
    }
  }

  // Detect Government Level
  if (/\b(state government|state scheme)\b/i.test(lower) || /(राज्य सरकार|राज्य योजना)/i.test(lower)) {
    filters.governmentLevel = "STATE";
  } else if (/\b(central government|central scheme)\b/i.test(lower) || /(केंद्र सरकार|केंद्रीय योजना)/i.test(lower)) {
    filters.governmentLevel = "CENTRAL";
  }

  // Detect Beneficiary Type ("Show financial assistance for FPOs", "farming business", "startup")
  if (
    /\b(fpo|fpos|farmer producer|cooperative)\b/i.test(lower) ||
    /(एफपीओ|किसान उत्पादक संगठन|सहकारी)/i.test(lower)
  ) {
    filters.beneficiaryType = "FPO";
    descParts.push("Beneficiary: FPOs & Cooperatives");
    descPartsHi.push("लाभार्थी: एफपीओ (FPO)");
  } else if (
    /\b(business|entrepreneur|startup|msme|enterprise)\b/i.test(lower) ||
    /(व्यवसाय|व्यापार|उद्यम|स्टार्टअप|बिजनेस)/i.test(lower)
  ) {
    filters.beneficiaryType = "AGRI_ENTREPRENEUR";
    descParts.push("Beneficiary: Farming Business / Agri-Entrepreneur");
    descPartsHi.push("लाभार्थी: कृषि व्यवसाय / उद्यमी");
  } else if (
    /\b(small farmer|marginal farmer)\b/i.test(lower) ||
    /(लघु किसान|सीमांत किसान|छोटे किसान)/i.test(lower)
  ) {
    filters.beneficiaryType = "SMALL_MARGINAL_FARMER";
    descParts.push("Beneficiary: Small & Marginal Farmers");
    descPartsHi.push("लाभार्थी: लघु एवं सीमांत किसान");
  }

  // Detect Category filters
  if (
    /\b(storage|warehouse|godown|cold storage|cold chain)\b/i.test(lower) ||
    /(भंडारण|गोदाम|कोल्ड स्टोरेज)/i.test(lower)
  ) {
    filters.category = "STORAGE";
    descParts.push("Category: Agricultural Storage & Warehousing");
    descPartsHi.push("श्रेणी: कृषि भंडारण एवं गोदाम");
  } else if (/\b(irrigation|drip|sprinkler|water)\b/i.test(lower) || /(सिंचाई|ड्रिप|पानी)/i.test(lower)) {
    filters.category = "IRRIGATION";
    descParts.push("Category: Irrigation & Water Management");
    descPartsHi.push("श्रेणी: सिंचाई एवं जल प्रबंधन");
  } else if (
    /\b(certification|certify|npop|pgs)\b/i.test(lower) ||
    /(प्रमाणन|सर्टिफिकेट)/i.test(lower)
  ) {
    filters.category = "CERTIFICATION";
    descParts.push("Category: Organic Certification");
    descPartsHi.push("श्रेणी: जैविक प्रमाणन");
  } else if (
    /\b(equipment|machinery|tractor|drone|implement)\b/i.test(lower) ||
    /(यंत्र|मशीन|उपकरण|ट्रैक्टर|ड्रोन)/i.test(lower)
  ) {
    filters.category = "EQUIPMENT";
    descParts.push("Category: Farm Equipment & Mechanization");
    descPartsHi.push("श्रेणी: कृषि उपकरण एवं मशीनीकरण");
  } else if (
    /\b(transport|transportation|reefer|logistics)\b/i.test(lower) ||
    /(परिवहन|ट्रांसपोर्ट)/i.test(lower)
  ) {
    filters.category = "TRANSPORTATION";
    descParts.push("Category: Agricultural Transportation & Cold Chain");
    descPartsHi.push("श्रेणी: कृषि परिवहन");
  } else if (
    /\b(processing|food processing|milling|packaging)\b/i.test(lower) ||
    /(प्रसंस्करण|फूड प्रोसेसिंग|पैकेजिंग)/i.test(lower)
  ) {
    filters.category = "FOOD_PROCESSING";
    descParts.push("Category: Food Processing & Value Addition");
    descPartsHi.push("श्रेणी: खाद्य प्रसंस्करण");
  } else if (/\b(infrastructure)\b/i.test(lower) || /(अवसंरचना|इंफ्रास्ट्रक्चर)/i.test(lower)) {
    filters.category = "INFRASTRUCTURE";
    descParts.push("Category: Agriculture Infrastructure");
    descPartsHi.push("श्रेणी: कृषि अवसंरचना");
  } else if (/\b(insurance|bima)\b/i.test(lower) || /(बीमा)/i.test(lower)) {
    filters.category = "INSURANCE";
    descParts.push("Category: Crop Insurance");
    descPartsHi.push("श्रेणी: फसल बीमा");
  } else if (/\b(market|mandi|trading|export)\b/i.test(lower) || /(बाजार|मंडी|व्यापार)/i.test(lower)) {
    filters.category = "MARKET_ACCESS";
    descParts.push("Category: Market Access");
    descPartsHi.push("श्रेणी: बाजार पहुंच");
  } else if (
    /\b(fertilizer|fertilizers|vermicompost|bio-input|compost|organic|natural farming)\b/i.test(lower) ||
    /(जैविक|खाद|उर्वरक|वर्मीकम्पोस्ट|प्राकृतिक खेती|ऑर्गेनिक)/i.test(lower)
  ) {
    filters.category = "ORGANIC_FARMING";
    descParts.push("Category: Organic Farming & Bio-Inputs");
    descPartsHi.push("श्रेणी: जैविक खेती एवं जैविक खाद");
    if (
      /\b(fertilizer|fertilizers|vermicompost|compost)\b/i.test(lower) ||
      /(खाद|उर्वरक|वर्मीकम्पोस्ट)/i.test(lower)
    ) {
      filters.q = "fertilizer";
    }
  } else if (
    (/\b(financial assistance|loan|grant|subsidy)\b/i.test(lower) ||
      /(वित्तीय सहायता|ऋण|अनुदान|सब्सिडी)/i.test(lower)) &&
    !filters.beneficiaryType
  ) {
    filters.category = "FINANCIAL_ASSISTANCE";
    descParts.push("Category: Financial Assistance & Subsidies");
    descPartsHi.push("श्रेणी: वित्तीय सहायता एवं सब्सिडी");
  }

  // If no specific category/state/beneficiary matched, use cleaned keywords as search query
  if (Object.keys(filters).length === 0) {
    const stripped = cleaned
      .replace(
        /\b(show|find|the|latest|schemes|scheme|for|in|available|which|are|government|support|subsidies|subsidy|my|me|tell|about)\b/gi,
        ""
      )
      .trim();
    if (stripped) {
      filters.q = stripped;
      descParts.push(`Search: "${stripped}"`);
      descPartsHi.push(`खोज: "${stripped}"`);
    }
  }

  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) searchParams.set(k, v);
  });
  const queryString = searchParams.toString();

  return {
    type: "FILTER_SCHEMES",
    route: `/schemes${queryString ? `?${queryString}` : ""}`,
    params: filters,
    summary:
      descParts.length > 0
        ? `Show Government Schemes (${descParts.join(" · ")})`
        : "Open Latest Indian Government Schemes Dashboard",
    summaryHi:
      descPartsHi.length > 0
        ? `सरकारी योजनाएं दिखाएं (${descPartsHi.join(" · ")})`
        : "नवीनतम भारतीय सरकारी योजना डैशबोर्ड खोलें",
    requiresConfirmation: false,
  };
}

export const VOICE_SAMPLE_COMMANDS = [
  {
    en: "Show the latest organic farming schemes.",
    hi: "नवीनतम जैविक खेती योजनाएं दिखाएं।",
  },
  {
    en: "Find subsidies for organic fertilizers.",
    hi: "जैविक खाद और उर्वरकों के लिए सब्सिडी खोजें।",
  },
  {
    en: "Which schemes are available for farmers in Haryana?",
    hi: "हरियाणा के किसानों के लिए कौन सी योजनाएं उपलब्ध हैं?",
  },
  {
    en: "Show financial assistance for FPOs.",
    hi: "एफपीओ (FPO) के लिए वित्तीय सहायता दिखाएं।",
  },
  {
    en: "Track my organic product using its QR code.",
    hi: "क्यूआर कोड से मेरे जैविक उत्पाद को ट्रैक करें।",
  },
  {
    en: "Verify the blockchain record for this product.",
    hi: "इस उत्पाद का ब्लॉकचेन रिकॉर्ड सत्यापित करें।",
  },
  {
    en: "Show schemes for agricultural storage facilities.",
    hi: "कृषि भंडारण और गोदाम सुविधाओं के लिए योजनाएं दिखाएं।",
  },
  {
    en: "Find government support for my farming business.",
    hi: "मेरे कृषि व्यवसाय के लिए सरकारी सहायता खोजें।",
  },
];
