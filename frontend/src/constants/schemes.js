export const INDIAN_GOV_SCHEMES = [
  {
    id: "pkvy",
    schemeCode: "PKVY",
    name: "Paramparagat Krishi Vikas Yojana (PKVY)",
    description:
      "Promotes organic farming through a cluster-based approach (20 Ha) with ₹31,500/ha DBT support and PGS-India certification.",
  },
  {
    id: "nmnf",
    schemeCode: "NMNF",
    name: "National Mission on Natural Farming (NMNF)",
    description:
      "A natural farming mission focusing on chemical-free agriculture, Bio-Input Resource Centres, and ₹4,000/acre/year input incentives.",
  },
  {
    id: "pmksy",
    schemeCode: "PMKSY",
    name: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
    description:
      'Enhances farm productivity through improved water management and "Per Drop More Crop" micro-irrigation subsidies (45%–55%).',
  },
  {
    id: "aif",
    schemeCode: "AIF",
    name: "Agriculture Infrastructure Fund (AIF)",
    description:
      "Provides 3% interest subvention and credit guarantee on loans up to ₹2 Crore for warehouses, cold stores, and organic post-harvest units.",
  },
  {
    id: "pmkisan",
    schemeCode: "PM-KISAN",
    name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    description:
      "Direct income support of ₹6,000/year in three installments via DBT for all landholding farmer families.",
  },
  {
    id: "fpo10k",
    schemeCode: "FPO-10K",
    name: "Formation & Promotion of 10,000 FPOs",
    description:
      "Supports farmer collectives with up to ₹18 Lakh management grant, ₹15 Lakh matching equity grant, and credit guarantees.",
  },
];

export const SCHEME_CATEGORY_META = {
  ORGANIC_FARMING: {
    label: "Organic Farming",
    labelHi: "जैविक एवं प्राकृतिक खेती",
    icon: "🌱",
  },
  IRRIGATION: {
    label: "Irrigation",
    labelHi: "सिंचाई एवं जल प्रबंधन",
    icon: "💧",
  },
  CERTIFICATION: {
    label: "Certification",
    labelHi: "जैविक प्रमाणन (PGS/NPOP)",
    icon: "📜",
  },
  EQUIPMENT: {
    label: "Equipment",
    labelHi: "कृषि यंत्र एवं उपकरण",
    icon: "🚜",
  },
  INFRASTRUCTURE: {
    label: "Infrastructure",
    labelHi: "कृषि अवसंरचना",
    icon: "🏗️",
  },
  STORAGE: {
    label: "Storage & Cold Chain",
    labelHi: "भंडारण एवं कोल्ड स्टोरेज",
    icon: "🏬",
  },
  TRANSPORTATION: {
    label: "Transportation",
    labelHi: "परिवहन एवं लॉजिस्टिक्स",
    icon: "🚚",
  },
  FPO: {
    label: "FPOs & Cooperatives",
    labelHi: "एफपीओ एवं सहकारी समितियां",
    icon: "🤝",
  },
  FOOD_PROCESSING: {
    label: "Food Processing",
    labelHi: "खाद्य प्रसंस्करण",
    icon: "🏭",
  },
  FINANCIAL_ASSISTANCE: {
    label: "Financial Assistance",
    labelHi: "वित्तीय सहायता एवं ऋण",
    icon: "₹",
  },
  INSURANCE: {
    label: "Crop Insurance",
    labelHi: "फसल बीमा",
    icon: "🛡️",
  },
  MARKET_ACCESS: {
    label: "Market Access",
    labelHi: "बाजार पहुंच एवं मंडी",
    icon: "📈",
  },
};

export const BENEFICIARY_TYPE_META = {
  INDIVIDUAL_FARMER: { label: "Individual Farmer", labelHi: "व्यक्तिगत किसान" },
  SMALL_MARGINAL_FARMER: { label: "Small & Marginal Farmer", labelHi: "लघु एवं सीमांत किसान" },
  ORGANIC_FARMER: { label: "Organic / Natural Farmer", labelHi: "जैविक / प्राकृतिक किसान" },
  FPO: { label: "FPO / FPC", labelHi: "एफपीओ (किसान उत्पादक संगठन)" },
  COOPERATIVE: { label: "Cooperative / PACS", labelHi: "सहकारी समिति / पैक्स" },
  AGRI_ENTREPRENEUR: { label: "Agri-Entrepreneur", labelHi: "कृषि उद्यमी" },
  MSME: { label: "Food Processing MSME", labelHi: "सूक्ष्म एवं लघु उद्यम (MSME)" },
  SHG: { label: "Self-Help Group (SHG)", labelHi: "स्वयं सहायता समूह (SHG)" },
  STARTUP: { label: "Agri-Startup", labelHi: "कृषि स्टार्टअप" },
};

export const STATUS_BADGE_META = {
  OPEN: {
    label: "Open",
    labelHi: "आवेदन चालू (Open)",
    className: "bg-leaf-100 text-leaf-800 border-leaf-300",
  },
  UPCOMING: {
    label: "Upcoming",
    labelHi: "आगामी (Upcoming)",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  CLOSED: {
    label: "Closed",
    labelHi: "बंद (Closed)",
    className: "bg-stone-200 text-stone-700 border-stone-300",
  },
  STATUS_UNVERIFIED: {
    label: "Status Unverified",
    labelHi: "स्थिति असत्यापित",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
};

export const INDIAN_STATES_LIST = [
  "ALL",
  "Haryana",
  "Punjab",
  "North East",
  "Uttar Pradesh",
  "Maharashtra",
  "Rajasthan",
  "Madhya Pradesh",
  "Gujarat",
  "Himachal Pradesh",
  "Uttarakhand",
  "Bihar",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Andhra Pradesh",
  "West Bengal",
  "Odisha",
  "Assam",
  "Sikkim",
];
