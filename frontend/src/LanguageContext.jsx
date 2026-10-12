import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

export const translations = {
  en: {
    // Navigation
    "nav.title": "Organic Trace",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.farmerDashboard": "Farmer Dashboard",
    "nav.partnerDashboard": "Partner Dashboard",
    "nav.logout": "Logout",

    // Footer
    "footer.disclaimer":
      "Blockchain provides tamper-evident traceability of submitted and verified records. It does not independently verify the physical authenticity of agricultural practices.",

    // Landing Page
    "landing.badge": "B.Tech Major Project · Blockchain Traceability",
    "landing.heroTitle": "From Farm to Consumer —",
    "landing.heroHighlight": "Verified Traceability",
    "landing.heroDesc":
      "Track every organic product batch from the farmer's field through processing, distribution, and retail — with a tamper-evident record backed by blockchain.",
    "landing.inputPlaceholder": "Enter Batch ID e.g. ORG-BAS-001",
    "landing.traceBtn": "Trace Product",
    "landing.step1Title": "1. Farmer Registers Batch",
    "landing.step1Desc":
      "Product details are stored in the database and an immutable creation record is written on-chain.",
    "landing.step2Title": "2. Supply Chain Events",
    "landing.step2Desc":
      "Processors, distributors, and retailers add tamper-evident event records as the product moves.",
    "landing.step3Title": "3. Customer Scans QR",
    "landing.step3Desc":
      "Anyone can scan the batch QR code to see the full verified history — no login required.",
    "landing.whyTitle": "Why Blockchain Here",
    "landing.whyDesc":
      "The blockchain stores batch IDs, event metadata, timestamps, and cryptographic hashes — never heavy documents or private personal data. This creates a tamper-evident audit trail while keeping operational data in PostgreSQL.",
    "landing.importantTitle": "Important:",
    "landing.importantDesc":
      "Blockchain provides a tamper-evident and auditable record of submitted and verified supply-chain information. Physical product authenticity still depends on trusted participants, certification authorities, and inspections.",

    // Login & Register
    "auth.loginTitle": "Log in",
    "auth.demoPassHint": "Demo password for seeded accounts:",
    "auth.emailLabel": "Email",
    "auth.passwordLabel": "Password",
    "auth.loginBtn": "Log in",
    "auth.loggingIn": "Logging in...",
    "auth.noAccount": "No account?",
    "auth.registerLink": "Register",
    "auth.registerTitle": "Create an account",
    "auth.fullNameLabel": "Full name",
    "auth.roleLabel": "I am a",
    "auth.roleFarmer": "Farmer (किसान)",
    "auth.rolePartner": "Supply Chain Partner (Processor / Distributor / Retailer)",
    "auth.registerBtn": "Register",
    "auth.creatingAccount": "Creating account...",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.loginLink": "Log in",

    // Farmer Dashboard
    "farmer.title": "My Batches",
    "farmer.createBtn": "+ Create Batch",
    "farmer.loading": "Loading batches...",
    "farmer.empty": "No batches yet. Create your first organic product batch.",
    "farmer.onChain": "On-chain",
    "farmer.chainPending": "Chain pending",
    "farmer.eventsCount": "supply-chain event(s)",

    // Create Batch
    "create.title": "Create Product Batch",
    "create.batchId": "Batch ID",
    "create.productName": "Product Name",
    "create.cropType": "Crop Type",
    "create.farmLocation": "Farm Location",
    "create.harvestDate": "Harvest Date",
    "create.certId": "Organic Certification ID (optional)",
    "create.quantity": "Quantity",
    "create.unit": "Unit",
    "create.description": "Description",
    "create.submitting": "Submitting to blockchain...",
    "create.submitBtn": "Create Batch & Record on Blockchain",

    // Partner Dashboard
    "partner.title": "All Batches",
    "partner.desc": "Open a batch to record a processing, shipment, or retail event.",
    "partner.loading": "Loading batches...",
    "partner.eventsRecorded": "event(s) recorded",

    // Batch Details
    "batch.downloadQr": "Download QR (PNG)",
    "batch.batchId": "Batch ID",
    "batch.crop": "Crop",
    "batch.location": "Farm Location",
    "batch.harvestDate": "Harvest Date",
    "batch.quantity": "Quantity",
    "batch.farmer": "Farmer",
    "batch.onChainStatus": "Blockchain Status",
    "batch.txHash": "Transaction Hash",
    "batch.certSection": "Organic Certificate",
    "batch.certHashVerified": "Certificate hash is recorded on-chain:",
    "batch.uploadCertTitle": "Upload Certificate (Farmer only)",
    "batch.certIdInput": "Certificate ID (optional)",
    "batch.uploadBtn": "Upload & Hash on Blockchain",
    "batch.addEventTitle": "Record Supply Chain Event",
    "batch.eventType": "Event Type",
    "batch.eventLocation": "Location (optional)",
    "batch.eventNotes": "Notes / Temperature / Observations (optional)",
    "batch.recordEventBtn": "Record Event to Blockchain",
    "batch.recordingEvent": "Recording to blockchain...",
    "batch.timelineTitle": "Supply Chain Timeline",

    // Public Trace Page
    "trace.badge": "Public Product Traceability",
    "trace.loading": "Loading traceability record...",
    "trace.notFound": "Product batch not found",
    "trace.certStatus": "Certification Status",
    "trace.certVerified": "✓ Certificate hash verified on-chain",
    "trace.certPending": "Pending certificate submission",
    "trace.timelineTitle": "Supply Chain Timeline",

    // Timeline & Event Labels
    "timeline.batchCreated": "Batch Created",
    "timeline.farmer": "Farmer",
    "timeline.participant": "Participant",
    "timeline.onChainVerified": "✓ Recorded on blockchain",
    "timeline.pendingChain": "⚠ Not yet confirmed on-chain",

    "event.RECEIVED_BY_PROCESSOR": "Received by Processor",
    "event.PROCESSING_STARTED": "Processing Started",
    "event.PROCESSING_COMPLETED": "Processing Completed",
    "event.PACKAGED": "Packaged & Quality Inspected",
    "event.RECEIVED_BY_DISTRIBUTOR": "Received by Distributor",
    "event.DISPATCHED": "Shipment Dispatched",
    "event.IN_TRANSIT": "In Transit",
    "event.DELIVERED_TO_RETAILER": "Delivered to Retailer",
    "event.RECEIVED_BY_RETAILER": "Received by Retailer",
    "event.AVAILABLE_FOR_SALE": "Available on Retail Shelf",
  },

  hi: {
    // Navigation
    "nav.title": "ऑर्गेनिक ट्रेस (Organic Trace)",
    "nav.login": "लॉग इन",
    "nav.register": "रजिस्टर करें",
    "nav.farmerDashboard": "किसान डैशबोर्ड",
    "nav.partnerDashboard": "पार्टनर डैशबोर्ड",
    "nav.logout": "लॉगआउट",

    // Footer
    "footer.disclaimer":
      "ब्लॉकचेन केवल दर्ज और सत्यापित रिकॉर्ड की अपरिवर्तनीय ट्रैसेबिलिटी प्रदान करता है। यह स्वतंत्र रूप से भौतिक कृषि पद्धतियों की जांच नहीं करता है।",

    // Landing Page
    "landing.badge": "बी.टेक मेजर प्रोजेक्ट · ब्लॉकचेन ट्रैसेबिलिटी",
    "landing.heroTitle": "खेत से उपभोक्ता तक — ",
    "landing.heroHighlight": "सत्यापित ट्रैसेबिलिटी",
    "landing.heroDesc":
      "किसान के खेत से लेकर प्रोसेसिंग, वितरण और रिटेल तक प्रत्येक जैविक उत्पाद बैच को ट्रैक करें — ब्लॉकचेन पर सुरक्षित और पारदर्शी रिकॉर्ड के साथ।",
    "landing.inputPlaceholder": "बैच आईडी दर्ज करें जैसे ORG-BAS-001",
    "landing.traceBtn": "उत्पाद ट्रैक करें",
    "landing.step1Title": "1. किसान बैच दर्ज करता है",
    "landing.step1Desc":
      "उत्पाद का विवरण डेटाबेस में सुरक्षित होता है और ब्लॉकचेन पर एक स्थायी निर्माण रिकॉर्ड लिखा जाता है।",
    "landing.step2Title": "2. सप्लाई चेन इवेंट्स",
    "landing.step2Desc":
      "जैसे-जैसे उत्पाद आगे बढ़ता है, प्रोसेसर, वितरक और खुदरा विक्रेता नए इवेंट्स ब्लॉकचेन पर जोड़ते हैं।",
    "landing.step3Title": "3. ग्राहक क्यूआर स्कैन करता है",
    "landing.step3Desc":
      "कोई भी व्यक्ति उत्पाद का क्यूआर कोड स्कैन करके पूरी प्रामाणिक समयरेखा देख सकता है — लॉगिन की आवश्यकता नहीं।",
    "landing.whyTitle": "यहाँ ब्लॉकचेन क्यों जरूरी है?",
    "landing.whyDesc":
      "ब्लॉकचेन केवल बैच आईडी, इवेंट विवरण, टाइमस्टैम्प और क्रिप्टोग्राफ़िक हैश स्टोर करता है — कभी भी भारी दस्तावेज़ या निजी डेटा नहीं। इससे एक छेड़छाड़-रहित ऑडिट ट्रेल बनता है।",
    "landing.importantTitle": "महत्वपूर्ण नोट:",
    "landing.importantDesc":
      "ब्लॉकचेन दर्ज की गई जानकारी का सुरक्षित व पारदर्शी रिकॉर्ड प्रदान करता है। भौतिक उत्पाद की गुणवत्ता प्रमाणित भागीदारों, प्रमाणन एजेंसियों और निरीक्षणों पर निर्भर करती है।",

    // Login & Register
    "auth.loginTitle": "लॉग इन करें",
    "auth.demoPassHint": "डेमो खातों के लिए पासवर्ड:",
    "auth.emailLabel": "ईमेल आईडी",
    "auth.passwordLabel": "पासवर्ड",
    "auth.loginBtn": "लॉग इन करें",
    "auth.loggingIn": "लॉग इन हो रहा है...",
    "auth.noAccount": "खाता नहीं है?",
    "auth.registerLink": "रजिस्टर करें",
    "auth.registerTitle": "नया खाता बनाएं",
    "auth.fullNameLabel": "पूरा नाम",
    "auth.roleLabel": "मेरी भूमिका",
    "auth.roleFarmer": "किसान (Farmer)",
    "auth.rolePartner": "सप्लाई चेन पार्टनर (प्रोसेसर / वितरक / विक्रेता)",
    "auth.registerBtn": "खाता बनाएं",
    "auth.creatingAccount": "खाता बनाया जा रहा है...",
    "auth.alreadyHaveAccount": "पहले से खाता है?",
    "auth.loginLink": "लॉग इन करें",

    // Farmer Dashboard
    "farmer.title": "मेरी फसल के बैच",
    "farmer.createBtn": "+ नया बैच बनाएं",
    "farmer.loading": "बैच लोड हो रहे हैं...",
    "farmer.empty": "अभी कोई बैच दर्ज नहीं है। अपना पहला जैविक फसल बैच बनाएं।",
    "farmer.onChain": "ब्लॉकचेन पर दर्ज ✓",
    "farmer.chainPending": "ब्लॉकचेन प्रतीक्षारत",
    "farmer.eventsCount": "सप्लाई चेन गतिविधि(याँ)",

    // Create Batch
    "create.title": "नया उत्पाद बैच दर्ज करें",
    "create.batchId": "बैच आईडी (Batch ID)",
    "create.productName": "उत्पाद का नाम",
    "create.cropType": "फसल का प्रकार",
    "create.farmLocation": "खेत का स्थान / पता",
    "create.harvestDate": "फसल कटाई की तारीख",
    "create.certId": "जैविक प्रमाणन आईडी (वैकल्पिक)",
    "create.quantity": "कुल मात्रा",
    "create.unit": "मात्रा इकाई",
    "create.description": "उत्पाद का विवरण",
    "create.submitting": "ब्लॉकचेन पर दर्ज हो रहा है...",
    "create.submitBtn": "बैच बनाएं और ब्लॉकचेन पर सुरक्षित करें",

    // Partner Dashboard
    "partner.title": "सभी उपलब्ध बैच",
    "partner.desc": "प्रोसेसिंग, शिपमेंट या बिक्री की गतिविधि दर्ज करने के लिए बैच खोलें।",
    "partner.loading": "बैच लोड हो रहे हैं...",
    "partner.eventsRecorded": "इवेंट दर्ज",

    // Batch Details
    "batch.downloadQr": "क्यूआर कोड डाउनलोड करें (PNG)",
    "batch.batchId": "बैच आईडी",
    "batch.crop": "फसल",
    "batch.location": "खेत का स्थान",
    "batch.harvestDate": "कटाई की तारीख",
    "batch.quantity": "मात्रा",
    "batch.farmer": "किसान",
    "batch.onChainStatus": "ब्लॉकचेन स्थिति",
    "batch.txHash": "लेनदेन हैश (Tx Hash)",
    "batch.certSection": "जैविक प्रमाण पत्र (Organic Certificate)",
    "batch.certHashVerified": "प्रमाण पत्र का हैश ब्लॉकचेन पर दर्ज है:",
    "batch.uploadCertTitle": "प्रमाण पत्र अपलोड करें (केवल किसान के लिए)",
    "batch.certIdInput": "प्रमाण पत्र संख्या (वैकल्पिक)",
    "batch.uploadBtn": "अपलोड करें और ब्लॉकचेन पर हैश दर्ज करें",
    "batch.addEventTitle": "सप्लाई चेन गतिविधि दर्ज करें",
    "batch.eventType": "गतिविधि का प्रकार",
    "batch.eventLocation": "स्थान (वैकल्पिक)",
    "batch.eventNotes": "अतिरिक्त विवरण / तापमान / निरीक्षण (वैकल्पिक)",
    "batch.recordEventBtn": "ब्लॉकचेन पर इवेंट दर्ज करें",
    "batch.recordingEvent": "ब्लॉकचेन पर दर्ज हो रहा है...",
    "batch.timelineTitle": "सप्लाई चेन समयरेखा",

    // Public Trace Page
    "trace.badge": "सार्वजनिक उत्पाद ट्रैसेबिलिटी (Public Trace)",
    "trace.loading": "ट्रैसेबिलिटी रिकॉर्ड लोड हो रहा है...",
    "trace.notFound": "उत्पाद बैच नहीं मिला",
    "trace.certStatus": "प्रमाणन स्थिति",
    "trace.certVerified": "✓ जैविक प्रमाण पत्र हैश ब्लॉकचेन पर सत्यापित",
    "trace.certPending": "प्रमाण पत्र जमा होना शेष",
    "trace.timelineTitle": "सप्लाई चेन समयरेखा",

    // Timeline & Event Labels
    "timeline.batchCreated": "बैच निर्मित (Batch Created)",
    "timeline.farmer": "किसान",
    "timeline.participant": "भागीदार",
    "timeline.onChainVerified": "✓ ब्लॉकचेन पर सत्यापित",
    "timeline.pendingChain": "⚠ ब्लॉकचेन पर पुष्टिकरण प्रतीक्षारत",

    "event.RECEIVED_BY_PROCESSOR": "प्रोसेसर द्वारा प्राप्त",
    "event.PROCESSING_STARTED": "प्रोसेसिंग शुरू हुई",
    "event.PROCESSING_COMPLETED": "प्रोसेसिंग पूर्ण",
    "event.PACKAGED": "पैकिंग और गुणवत्ता जांच पूर्ण",
    "event.RECEIVED_BY_DISTRIBUTOR": "वितरक द्वारा प्राप्त",
    "event.DISPATCHED": "माल रवाना किया गया (Dispatched)",
    "event.IN_TRANSIT": "मार्ग में (In Transit)",
    "event.DELIVERED_TO_RETAILER": "विक्रेता को डिलीवर किया गया",
    "event.RECEIVED_BY_RETAILER": "विक्रेता द्वारा प्राप्त",
    "event.AVAILABLE_FOR_SALE": "दुकान / रिटेल रैक पर उपलब्ध",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("organic_trace_lang") || "en";
  });

  useEffect(() => {
    localStorage.setItem("organic_trace_lang", lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "hi" : "en"));
  };

  const t = (key, fallback = "") => {
    const langDict = translations[lang] || translations.en;
    if (langDict[key]) return langDict[key];
    if (translations.en[key]) return translations.en[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLanguage: setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
