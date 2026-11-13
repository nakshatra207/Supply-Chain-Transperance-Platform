const prisma = require("../prismaClient");
const { INITIAL_GOVERNMENT_SCHEMES } = require("../data/governmentSchemesData");
const { ensureSchemesSeeded, getSchemeSearchIndex } = require("./schemeSyncService");
const { isConfigured } = require("../blockchain");
const { getNativeStatus } = require("../hash");
const { MinHeap } = require("../utils/dsaEngine");

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");

/**
 * Comprehensive knowledge base covering all Organic Trace app functionality,
 * roles, blockchain architecture, QR verification, voice commands, and troubleshooting.
 */
const APP_FUNCTIONALITY_TOPICS = [
  {
    id: "overview",
    keywords: [
      "what is organic trace",
      "about app",
      "how does this app work",
      "platform overview",
      "purpose",
      "architecture",
      "features",
      "app functionality",
      "doubt",
      "help",
      "guide",
      "यह ऐप क्या है",
      "कैसे काम करता है",
      "विशेषताएं",
    ],
    title: "Organic Trace Platform Overview & Architecture",
    titleHi: "ऑर्गेनिक ट्रेस प्लेटफॉर्म का परिचय और कार्यप्रणाली",
    summary:
      "Organic Trace is a Blockchain Supply Chain Transparency & Government Schemes platform. Farmers register crop batches (/farmer/batches/new) and upload organic certificates hashed with SHA-256 onto an Ethereum/Hardhat smart contract (SupplyChain.sol). Supply Chain Partners (Processors, Distributors, Retailers) log custody events (/partner). Consumers trace batches via QR code (/trace/:batchId) with live tamper detection. Farmers also discover 17+ Government Schemes (/schemes) with eligibility matching and voice navigation.",
    content: `**Organic Trace** is a full-stack Blockchain Supply Chain Transparency & Government Schemes Discovery Platform for organic agriculture:
- **1. Farmer Batch Registration & On-Chain Anchoring**: Farmers register crop batches (e.g., \`ORG-BAS-001\`) with harvest date, quantity, farm location, and organic certificate. The backend computes a cryptographic **SHA-256 hash** (accelerated via native C/C++20/ASM SHA-NI) and records an immutable batch creation record on the **Ethereum/Hardhat Smart Contract (\`SupplyChain.sol\`)**.
- **2. Supply Chain Partner Events**: Processors, Distributors, and Retailers log tamper-evident custody events (\`RECEIVED_BY_PROCESSOR\`, \`PACKAGED\`, \`DISPATCHED\`, \`IN_TRANSIT\`, \`DELIVERED_TO_RETAILER\`, \`AVAILABLE_FOR_SALE\`) both in PostgreSQL and on-chain.
- **3. Public QR Code Consumer Traceability**: Anyone can scan a batch QR code or visit \`/trace/:batchId\` without logging in to verify the full farm-to-fork timeline, certificate SHA-256 hash, and live blockchain tamper-check status.
- **4. Government Schemes Hub & Eligibility Matcher**: Curated directory of **17+ Central & State Government Schemes** (\`/schemes\`) with personalized eligibility scoring, bookmarking, batch-to-scheme linking, and verified \`.gov.in\` links.
- **5. Voice Assistant & Bilingual UI**: Full **English & Hindi (हिन्दी)** support with hands-free speech recognition (\`🎙️ Voice\`) and Text-to-Speech (\`🔊 Read Aloud\`).`,
    contentHi: `**ऑर्गेनिक ट्रेस (Organic Trace)** जैविक कृषि के लिए एक ब्लॉकचेन सप्लाई चेन ट्रैसेबिलिटी और सरकारी योजना सहायता प्लेटफॉर्म है:
- **1. किसान बैच पंजीकरण और ब्लॉकचेन रिकॉर्ड**: किसान अपनी फसल का बैच (जैसे \`ORG-BAS-001\`), कटाई तिथि, मात्रा और जैविक प्रमाण पत्र दर्ज करते हैं। इसका क्रिप्टोग्राफ़िक **SHA-256 हैश** स्मार्ट कॉन्ट्रैक्ट (\`SupplyChain.sol\`) पर सुरक्षित किया जाता है।
- **2. सप्लाई चेन पार्टनर इवेंट्स**: प्रोसेसर, वितरक और रिटेलर प्रत्येक चरण (\`RECEIVED_BY_PROCESSOR\`, \`PACKAGED\`, \`DISPATCHED\`, \`AVAILABLE_FOR_SALE\`) को ब्लॉकचेन पर दर्ज करते हैं।
- **3. सार्वजनिक QR कोड ट्रैसेबिलिटी**: ग्राहक बिना लॉगिन किए QR कोड स्कैन करके या \`/trace/:batchId\` पर जाकर खेत से दुकान तक का पूरा सत्यापित इतिहास देख सकते हैं।
- **4. सरकारी योजनाएं और पात्रता मिलान (\`/schemes\`)**: 17+ केंद्रीय और राज्य सरकार की योजनाओं की जानकारी, सब्सिडी, आवश्यक दस्तावेज़ और व्यक्तिगत पात्रता मिलान।
- **5. वॉइस असिस्टेंट और द्विभाषी समर्थन**: हिंदी और अंग्रेजी दोनों भाषाओं में बोलकर खोजने (\`🎙️ Voice\`) और सुनने (\`🔊 सुनें\`) की सुविधा।`,
    routes: [
      { label: "Explore Government Schemes", labelHi: "सरकारी योजनाएं देखें", route: "/schemes" },
      { label: "Trace Demo Batch ORG-BAS-001", labelHi: "डेमो बैच ORG-BAS-001 ट्रैक करें", route: "/trace/ORG-BAS-001" },
    ],
  },
  {
    id: "farmer_workflow",
    keywords: [
      "farmer",
      "create batch",
      "new batch",
      "upload certificate",
      "organic certificate",
      "qr code",
      "download qr",
      "link scheme",
      "farmer dashboard",
      "how to register batch",
      "किसान",
      "बैच कैसे बनाएं",
      "नया बैच",
      "प्रमाण पत्र अपलोड",
      "क्यूआर कोड",
    ],
    title: "Farmer Guide: Creating Batches, Uploading Certificates & Linking Schemes",
    titleHi: "किसान गाइड: नया बैच बनाना, प्रमाण पत्र अपलोड करना और योजना जोड़ना",
    summary:
      "Farmers log in at /login (demo: farmer@example.com / Demo@1234), open Farmer Dashboard (/farmer), click '+ Create Batch' (/farmer/batches/new), enter Batch ID, Product Name, Crop Type, Farm Location, Harvest Date, Quantity, and submit to record on PostgreSQL + Blockchain. On /batches/:batchId, farmers upload their Organic Certificate PDF/image (hashed with SHA-256 on-chain), download the QR code PNG, and link Government Schemes.",
    content: `**How Farmers Use Organic Trace:**
1. **Register / Log In as a Farmer**: Go to \`/register\` and choose **Farmer (किसान)**, or use the demo account (\`farmer@example.com\` / \`Demo@1234\`) at \`/login\`.
2. **Create a Product Batch (\`/farmer/batches/new\`)**:
   - Enter a unique **Batch ID** (e.g., \`ORG-WHEAT-005\`), **Product Name**, **Crop Type**, **Farm Location**, **Harvest Date**, **Quantity**, and optional **Organic Certification ID**.
   - Click **"Create Batch & Record on Blockchain"** — the backend writes the record to PostgreSQL and anchors the metadata hash on the Ethereum smart contract.
3. **Upload Organic Certificate (\`/batches/:batchId\`)**:
   - Open your batch from the **Farmer Dashboard (\`/farmer\`)**.
   - Upload your PGS-India or NPOP certificate file. The platform computes a **SHA-256 cryptographic digest** of the file and stores the hash permanently on-chain via \`recordCertificateHash\`.
4. **Download QR Code & Link Government Schemes**:
   - Click **"Download QR (PNG)"** to print the traceability QR code on packaging.
   - Use the **Contextual Government Schemes Panel** on the batch page to link schemes (like **PKVY**, **PMKSY**, or **Haryana Organic Protsahan**) utilized for that crop.`,
    contentHi: `**किसान इस ऐप का उपयोग कैसे करें:**
1. **किसान के रूप में लॉग इन / रजिस्टर करें**: \`/register\` पर जाकर **किसान (Farmer)** चुनें, या डेमो खाते (\`farmer@example.com\` / पासवर्ड: \`Demo@1234\`) से \`/login\` करें।
2. **नया फसल बैच बनाएं (\`/farmer/batches/new\`)**:
   - **बैच आईडी** (जैसे \`ORG-WHEAT-005\`), उत्पाद का नाम, फसल का प्रकार, खेत का स्थान, कटाई की तारीख और मात्रा भरें।
   - **"बैच बनाएं और ब्लॉकचेन पर सुरक्षित करें"** पर क्लिक करें।
3. **जैविक प्रमाण पत्र अपलोड करें (\`/batches/:batchId\`)**:
   - अपने बैच पेज पर जाकर PGS-India या NPOP प्रमाण पत्र अपलोड करें। इसका **SHA-256 हैश** ब्लॉकचेन पर स्थायी रूप से दर्ज हो जाता है।
4. **QR कोड डाउनलोड करें और सरकारी योजना जोड़ें**:
   - पैकेजिंग पर लगाने के लिए **"क्यूआर कोड डाउनलोड करें (PNG)"** पर क्लिक करें और बैच से संबंधित सरकारी योजनाएं लिंक करें।`,
    routes: [
      { label: "Open Farmer Dashboard", labelHi: "किसान डैशबोर्ड खोलें", route: "/farmer" },
      { label: "Create New Batch", labelHi: "नया बैच बनाएं", route: "/farmer/batches/new" },
    ],
  },
  {
    id: "partner_workflow",
    keywords: [
      "partner",
      "processor",
      "distributor",
      "retailer",
      "supply chain event",
      "record event",
      "add event",
      "shipment",
      "transit",
      "quality check",
      "पार्टनर",
      "प्रोसेसर",
      "वितरक",
      "रिटेलर",
      "इवेंट दर्ज",
    ],
    title: "Supply Chain Partner Guide: Recording Processing, Transport & Retail Events",
    titleHi: "सप्लाई चेन पार्टनर गाइड: प्रोसेसिंग, ट्रांसपोर्ट और रिटेल इवेंट्स दर्ज करना",
    summary:
      "Supply Chain Partners (Processors, Distributors, Retailers) log in at /login (demo: processor@example.com, distributor@example.com, retailer@example.com / Demo@1234), open /partner, select a batch (/batches/:batchId), choose an eventType (RECEIVED_BY_PROCESSOR, PROCESSING_STARTED, PACKAGED, DISPATCHED, IN_TRANSIT, DELIVERED_TO_RETAILER, AVAILABLE_FOR_SALE), enter location & temperature/quality notes, and submit to record on-chain.",
    content: `**How Supply Chain Partners (Processors, Distributors, Retailers) Use Organic Trace:**
1. **Log In as a Partner**: Register with the **Supply Chain Partner** role at \`/register\` or log in with demo credentials (\`processor@example.com\`, \`distributor@example.com\`, or \`retailer@example.com\` / password: \`Demo@1234\`).
2. **Select a Batch (\`/partner\`)**: Open the **Partner Dashboard** to view all registered organic batches and their current event count.
3. **Record a Supply Chain Event (\`/batches/:batchId\`)**:
   - Choose the **Event Type**:
     - \`RECEIVED_BY_PROCESSOR\`, \`PROCESSING_STARTED\`, \`PROCESSING_COMPLETED\`, \`PACKAGED\`
     - \`RECEIVED_BY_DISTRIBUTOR\`, \`DISPATCHED\`, \`IN_TRANSIT\`
     - \`DELIVERED_TO_RETAILER\`, \`RECEIVED_BY_RETAILER\`, \`AVAILABLE_FOR_SALE\`
   - Add **Location** and **Notes / Temperature / Quality Observations** (e.g., *"Cold storage maintained at 4°C, moisture 11.5%"*).
   - Click **"Record Event to Blockchain"** — the event hash is appended to the on-chain audit trail.`,
    contentHi: `**सप्लाई चेन पार्टनर (प्रोसेसर, वितरक, विक्रेता) के लिए गाइड:**
1. **पार्टनर लॉग इन**: \`/login\` पर डेमो खाते (\`processor@example.com\`, \`distributor@example.com\`, या \`retailer@example.com\` / पासवर्ड: \`Demo@1234\`) का उपयोग करें।
2. **बैच चुनें (\`/partner\`)**: पार्टनर डैशबोर्ड पर जाकर किसी भी बैच को खोलें।
3. **सप्लाई चेन गतिविधि (Event) दर्ज करें (\`/batches/:batchId\`)**:
   - गतिविधि का प्रकार चुनें (जैसे \`RECEIVED_BY_PROCESSOR\`, \`PACKAGED\`, \`DISPATCHED\`, \`IN_TRANSIT\`, \`AVAILABLE_FOR_SALE\`)।
   - स्थान और तापमान/गुणवत्ता विवरण लिखें और **"ब्लॉकचेन पर इवेंट दर्ज करें"** पर क्लिक करें।`,
    routes: [
      { label: "Open Partner Dashboard", labelHi: "पार्टनर डैशबोर्ड खोलें", route: "/partner" },
    ],
  },
  {
    id: "blockchain_verification",
    keywords: [
      "blockchain",
      "smart contract",
      "hash",
      "sha-256",
      "sha256",
      "tamper",
      "tampered",
      "verify",
      "verification",
      "on-chain",
      "hardhat",
      "ethereum",
      "native",
      "c++",
      "assembly",
      "ब्लॉकचेन",
      "हैश",
      "सत्यापन",
      "छेड़छाड़",
    ],
    title: "How Blockchain Verification, SHA-256 Hashing & Tamper Detection Work",
    titleHi: "ब्लॉकचेन सत्यापन, SHA-256 हैशिंग और छेड़छाड़ की जांच कैसे काम करती है",
    summary:
      "SupplyChain.sol on Ethereum/Hardhat stores immutable batchId, metadataHash, certificateHash, and event hashes. The backend hashes batch fields with SHA-256 (accelerated via C17/C++20/x86_64 SHA-NI assembly). On /trace/:batchId, the backend recomputes the current DB SHA-256 hash and compares it with the on-chain metadataHash to detect any database tampering immediately.",
    content: `**How Blockchain & Cryptographic Verification Work in Organic Trace:**
- **Smart Contract (\`SupplyChain.sol\`)**: Stores immutable records per batch: \`batchId\`, \`metadataHash\`, \`certificateHash\`, creator address, timestamps, and an ordered array of supply chain events (\`eventType\`, \`dataHash\`, \`actor\`, \`timestamp\`).
- **SHA-256 Canonical Hashing**: When a batch or event is created, the backend serializes key fields into canonical JSON and computes a **SHA-256 digest** using the native C17/C++20/x86_64 SHA-NI hardware accelerator (with automatic Node.js \`crypto\` fallback).
- **Live Tamper Detection on \`/trace/:batchId\`**:
  - When a consumer views a batch on \`/trace/:batchId\`, the backend re-computes the current database hash and compares it against the immutable \`metadataHash\` stored on the blockchain.
  - If anyone modifies the PostgreSQL database directly (e.g., changing harvest date, location, or quantity), the hashes will mismatch and the UI immediately warns that **data tampering was detected**.`,
    contentHi: `**ब्लॉकचेन और क्रिप्टोग्राफ़िक सत्यापन कैसे काम करता है:**
- **स्मार्ट कॉन्ट्रैक्ट (\`SupplyChain.sol\`)**: प्रत्येक बैच की आईडी, \`metadataHash\`, \`certificateHash\`, समय और सप्लाई चेन इवेंट्स को ब्लॉकचेन पर अपरिवर्तनीय (immutable) रूप में सुरक्षित रखता है।
- **SHA-256 हैशिंग**: जब भी कोई बैच या प्रमाण पत्र जोड़ा जाता है, उसका क्रिप्टोग्राफ़िक SHA-256 हैश निकाला जाता है।
- **लाइव छेड़छाड़ जांच (\`/trace/:batchId\`)**: जब कोई ग्राहक किसी बैच को ट्रैक करता है, तो सिस्टम डेटाबेस के वर्तमान डेटा के हैश की तुलना ब्लॉकचेन पर दर्ज हैश से करता है। यदि डेटाबेस में कोई बदलाव किया गया हो, तो तुरंत चेतावनी दिखाई जाती है।`,
    routes: [
      { label: "Verify Demo Batch ORG-BAS-001", labelHi: "बैच ORG-BAS-001 सत्यापित करें", route: "/trace/ORG-BAS-001" },
    ],
  },
  {
    id: "voice_and_accessibility",
    keywords: [
      "voice",
      "microphone",
      "speak",
      "speech",
      "read aloud",
      "tts",
      "hindi",
      "language",
      "bilingual",
      "translate",
      "आवाज",
      "बोलकर",
      "माइक्रोफोन",
      "हिंदी",
      "भाषा",
    ],
    title: "Voice Assistant, Speech-to-Text & Bilingual (English/Hindi) Support",
    titleHi: "वॉइस असिस्टेंट, बोलकर खोजें और द्विभाषी (अंग्रेजी/हिंदी) सुविधा",
    summary:
      "Users can toggle between English and Hindi in the navbar, use the Voice Assistant (🎙️) to speak commands in English, Hindi, Punjabi, Marathi, Gujarati, Tamil, Telugu, or Bengali, and click Read Aloud (🔊) on any scheme or AI response.",
    content: `**Using Voice & Language Features in Organic Trace:**
- **Language Toggle (\`EN / हिन्दी\`)**: Click the language toggle in the top navigation bar to switch the entire interface and scheme details between **English** and **Hindi**.
- **Voice Assistant (\`🎙️ Voice\`)**: Click the microphone button in the navbar or bottom-right corner to speak in **English, Hindi, Haryanvi-Hindi, Punjabi, Marathi, Gujarati, Tamil, Telugu, or Bengali**.
- **Read Aloud (\`🔊 Read Aloud / सुनें\`)**: Every scheme card, scheme detail section, traceability page, and AI Assistant answer includes a one-click Read Aloud button.`,
    contentHi: `**वॉइस असिस्टेंट और भाषा सुविधाओं का उपयोग:**
- **भाषा बदलें (\`EN / हिन्दी\`)**: ऊपर नेविगेशन बार में दिए गए बटन से पूरे ऐप को हिंदी या अंग्रेजी में बदलें।
- **वॉइस असिस्टेंट (\`🎙️ बोलकर खोजें\`)**: माइक बटन दबाकर हिंदी, अंग्रेजी या क्षेत्रीय भाषाओं में बोलकर योजनाएं खोजें या बैच ट्रैक करें।
- **बोलकर सुनें (\`🔊 सुनें\`)**: किसी भी सरकारी योजना या एआई सहायक के उत्तर को ऑडियो में सुनने के लिए \`🔊 सुनें\` बटन दबाएं।`,
    routes: [
      { label: "Browse Government Schemes", labelHi: "सरकारी योजनाएं देखें", route: "/schemes" },
    ],
  },
  {
    id: "demo_accounts",
    keywords: [
      "login",
      "demo account",
      "password",
      "credentials",
      "test user",
      "email",
      "sign in",
      "how to login",
      "लॉगिन",
      "डेमो खाता",
      "पासवर्ड",
      "आईडी",
    ],
    title: "Demo Accounts & Login Credentials",
    titleHi: "डेमो खाते और लॉगिन विवरण",
    summary:
      "Demo accounts (password for all: Demo@1234): Farmer: farmer@example.com, Processor: processor@example.com, Distributor: distributor@example.com, Retailer: retailer@example.com. Demo batches: ORG-BAS-001 (Organic Basmati Rice, Karnal Haryana) and ORG-TUR-002 (Lakadong Turmeric, Meghalaya).",
    content: `**Seeded Demo Accounts (Password for all demo accounts: \`Demo@1234\`):**
- **Farmer Account**: \`farmer@example.com\` (Ramesh Kumar — manages \`ORG-BAS-001\` Organic Basmati Rice & \`ORG-TUR-002\` Organic Turmeric)
- **Processor Account**: \`processor@example.com\` (GreenMill Organic Processing)
- **Distributor Account**: \`distributor@example.com\` (EcoTransit Cold-Chain Logistics)
- **Retailer Account**: \`retailer@example.com\` (NatureBasket Organic Mart)
- **Seeded Demo Batches**: \`ORG-BAS-001\` (Karnal, Haryana) & \`ORG-TUR-002\` (Meghalaya)`,
    contentHi: `**डेमो लॉगिन खाते (सभी खातों का पासवर्ड: \`Demo@1234\`):**
- **किसान खाता (Farmer)**: \`farmer@example.com\` (रमेश कुमार — बैच \`ORG-BAS-001\` और \`ORG-TUR-002\`)
- **प्रोसेसर खाता (Processor)**: \`processor@example.com\`
- **वितरक खाता (Distributor)**: \`distributor@example.com\`
- **रिटेलर खाता (Retailer)**: \`retailer@example.com\``,
    routes: [
      { label: "Go to Login Page", labelHi: "लॉगिन पेज पर जाएं", route: "/login" },
      { label: "Trace ORG-BAS-001", labelHi: "बैच ORG-BAS-001 देखें", route: "/trace/ORG-BAS-001" },
    ],
  },
];

/**
 * Checks which Ollama models are installed and available through /api/tags.
 */
async function fetchLocalOllamaModels(timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { online: false, models: [] };
    const data = await res.json();
    const models = Array.isArray(data.models)
      ? data.models.map((m) => ({
          name: m.name || m.model,
          sizeBytes: m.size || 0,
          parameterSize: m.details?.parameter_size || "3.2B",
          family: m.details?.family || "llama",
        }))
      : [];
    return { online: true, models };
  } catch (_err) {
    clearTimeout(timer);
    return { online: false, models: [] };
  }
}

/**
 * Returns the catalog of selectable LLM models and their live availability status.
 */
async function getAvailableModels() {
  const ollamaInfo = await fetchLocalOllamaModels();
  const primaryOllamaModel = ollamaInfo.models[0]?.name || "llama3.2:latest";
  const models = ollamaInfo.models.length
    ? ollamaInfo.models.map((om) => ({
        id: `ollama:${om.name}`,
        name: `Ollama — ${om.name} (${om.parameterSize})`,
        nameHi: `ओलामा — ${om.name} (${om.parameterSize})`,
        provider: "Ollama (Local)",
        badge: "Ollama · Online",
        status: "online",
        description: `Runs ${om.name} locally with Organic Trace context.`,
        descriptionHi: `Organic Trace संदर्भ के साथ स्थानीय ${om.name} मॉडल।`,
      }))
    : [{
        id: `ollama:${process.env.OLLAMA_MODEL || "llama3.2:latest"}`,
        name: `Ollama — ${process.env.OLLAMA_MODEL || "llama3.2:latest"}`,
        nameHi: `ओलामा — ${process.env.OLLAMA_MODEL || "llama3.2:latest"}`,
        provider: "Ollama (Local)",
        badge: "Ollama · Offline",
        status: "offline",
        description: "Start Ollama and pull the configured model to answer queries.",
        descriptionHi: "प्रश्नों के उत्तर के लिए Ollama शुरू करें और मॉडल डाउनलोड करें।",
      }];

  return {
    defaultModel: `ollama:${primaryOllamaModel}`,
    ollamaOnline: ollamaInfo.online && ollamaInfo.models.length > 0,
    primaryOllamaModel,
    models,
  };
}

/**
 * Retrieves relevant government schemes, live batch data, and app functionality docs for a user query.
 */
async function retrieveRelevantContext(question, lang = "en", currentContext = {}) {
  const qLower = String(question || "").toLowerCase().trim();

  // 1. Load schemes from DB (or fallback to INITIAL_GOVERNMENT_SCHEMES)
  let allSchemes = [];
  try {
    await ensureSchemesSeeded();
    allSchemes = await prisma.governmentScheme.findMany({
      orderBy: { schemeCode: "asc" },
    });
  } catch (_err) {
    allSchemes = INITIAL_GOVERNMENT_SCHEMES;
  }
  if (!allSchemes || allSchemes.length === 0) {
    allSchemes = INITIAL_GOVERNMENT_SCHEMES;
  }

  const CATEGORY_KEYWORDS = {
    ORGANIC_FARMING: ["organic", "bio", "natural", "chemical-free", "compost", "vermicompost", "pkvy", "nmnf", "जैविक", "प्राकृतिक", "खाद"],
    IRRIGATION: ["irrigation", "drip", "sprinkler", "water", "micro-irrigation", "sinchayee", "pmksy", "सिंचाई", "ड्रिप", "पानी"],
    CERTIFICATION: ["certification", "certify", "pgs", "npop", "apeda", "export", "certificate", "प्रमाणन", "सर्टिफिकेट", "पीजीएस"],
    EQUIPMENT: ["equipment", "tractor", "machinery", "implement", "drone", "smam", "machine", "happy seeder", "यंत्र", "ट्रैक्टर", "मशीन"],
    STORAGE: ["storage", "cold storage", "warehouse", "godown", "packhouse", "cold chain", "ami", "nabard", "midh", "भंडारण", "कोल्ड स्टोरेज", "गोदाम"],
    TRANSPORTATION: ["transport", "reefer", "van", "logistics", "truck", "परिवहन", "ट्रांसपोर्ट"],
    FPO: ["fpo", "farmer producer", "cooperative", "cluster", "group", "shg", "एफपीओ", "समूह", "क्लस्टर"],
    FOOD_PROCESSING: ["processing", "milling", "packaging", "value addition", "pmfme", "unit", "प्रसंस्करण", "प्रोसेसिंग", "पैकेजिंग"],
    FINANCIAL_ASSISTANCE: ["income", "6000", "pm-kisan", "pm kisan", "direct benefit", "dbt", "loan", "credit", "subsidy", "money", "किस्त", "सब्सिडी", "आर्थिक", "पैसा", "ऋण"],
    INSURANCE: ["insurance", "crop loss", "weather", "flood", "drought", "pmfby", "bima", "बीमा", "फसल नुकसान"],
    MARKET_ACCESS: ["market", "mandi", "sell", "enam", "e-nam", "trading", "price", "मंडी", "बाजार", "बिक्री", "ई-नाम"],
    INFRASTRUCTURE: ["infrastructure", "aif", "rkvy", "post-harvest", "interest subvention", "अवसंरचना"],
  };

  const STATE_MATCHERS = [
    { state: "Haryana", terms: ["haryana", "karnal", "hisar", "kurukshetra", "meri fasal", "हरियाणा", "करनाल"] },
    { state: "Punjab", terms: ["punjab", "ludhiana", "amritsar", "pagrexco", "पंजाब"] },
    { state: "North East", terms: ["north east", "assam", "sikkim", "meghalaya", "movcdner", "पूर्वोत्तर", "मेघालय", "असम", "सिक्किम"] },
  ];

  const scoredSchemes = allSchemes.map((scheme) => {
    let score = 0;
    const codeLower = (scheme.schemeCode || "").toLowerCase();
    const shortLower = (scheme.shortName || "").toLowerCase();
    const nameLower = (scheme.name || "").toLowerCase();
    const nameHiLower = (scheme.nameHi || "").toLowerCase();
    const descLower = (scheme.description || "").toLowerCase();

    if (
      currentContext.schemeCode &&
      scheme.schemeCode.toUpperCase() === String(currentContext.schemeCode).toUpperCase()
    ) {
      score += 45;
    }

    if (codeLower && qLower.includes(codeLower)) score += 60;
    if (shortLower && shortLower.length >= 3 && qLower.includes(shortLower)) score += 50;
    if (codeLower === "pm-kisan" && (qLower.includes("pm kisan") || qLower.includes("kisan samman") || qLower.includes("पीएम किसान") || qLower.includes("6000"))) {
      score += 65;
    }
    if (codeLower === "enam" && (qLower.includes("e-nam") || qLower.includes("ई-नाम") || qLower.includes("mandi"))) {
      score += 60;
    }
    if (codeLower === "fpo-10k" && (qLower.includes("10000 fpo") || qLower.includes("10,000 fpo") || qLower.includes("fpo scheme"))) {
      score += 60;
    }

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if ((scheme.categories || []).includes(cat)) {
        for (const kw of keywords) {
          if (qLower.includes(kw)) {
            score += 12;
          }
        }
      }
    }

    for (const sm of STATE_MATCHERS) {
      if (sm.terms.some((t) => qLower.includes(t))) {
        if (scheme.state === sm.state) {
          score += 45;
        } else if (scheme.state === "ALL") {
          score += 5;
        }
      }
    }

    const queryWords = qLower
      .replace(/[?.,!]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["what", "how", "the", "for", "and", "can", "you", "tell", "about", "please", "scheme", "schemes", "योजना", "क्या", "कैसे", "लिए"].includes(w));

    for (const w of queryWords) {
      if (nameLower.includes(w) || nameHiLower.includes(w)) score += 15;
      if (descLower.includes(w) || (scheme.descriptionHi || "").includes(w)) score += 6;
      if ((scheme.tags || []).some((t) => t.toLowerCase().includes(w))) score += 10;
    }

    return { scheme, score };
  });

  // Boost scores using InvertedIndex + PrefixTrie matches in O(Q * P)
  const searchIndex = getSchemeSearchIndex(allSchemes);
  const indexHits = searchIndex.search(qLower, 10);
  const indexScoreByCode = new Map(indexHits.map((h) => [h.docId, h.score]));
  for (const item of scoredSchemes) {
    const idxBonus = indexScoreByCode.get(item.scheme.schemeCode) || 0;
    if (idxBonus > 0) {
      item.score += Math.min(30, idxBonus);
    }
  }

  const isGeneralSchemeQuery =
    /scheme|subsidy|yojana|government|govt|grant|loan|kisan|farmer|farming|organic|benefit|eligibility|document|apply|सरकारी|योजना|सब्सिडी|किसान|पात्रता|दस्तावेज|आवेदन/i.test(
      qLower
    );

  // O(N log K) Top-3 selection using MinHeap instead of full O(N log N) sort
  let matchedSchemes = MinHeap.selectTopK(
    scoredSchemes.filter((s) => s.score >= 12),
    3,
    (s) => s.score
  ).map((s) => s.scheme);
  if (matchedSchemes.length === 0 && isGeneralSchemeQuery) {
    matchedSchemes = allSchemes
      .filter((s) => ["PKVY", "PM-KISAN", "AIF", "PMKSY"].includes(s.schemeCode))
      .slice(0, 3);
  }

  // 2. Check if user is asking about a specific Batch or general batches
  let matchedBatch = null;
  let allBatchesSummary = [];
  const batchIdMatch = qLower.match(/\b(org-[a-z0-9-]+)\b/i);
  const targetBatchId = batchIdMatch
    ? batchIdMatch[1].toUpperCase()
    : currentContext.batchId
    ? String(currentContext.batchId).toUpperCase()
    : null;

  try {
    if (targetBatchId) {
      matchedBatch = await prisma.batch.findUnique({
        where: { batchId: targetBatchId },
        include: {
          farmer: { select: { name: true, email: true } },
          events: {
            include: { participant: { select: { name: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
          schemeLinks: {
            include: { scheme: { select: { schemeCode: true, name: true, shortName: true } } },
          },
        },
      });
    }
    if (/batch|trace|qr|product|rice|turmeric|basmati|org-|बैच|ट्रैक|चावल|हल्दी/i.test(qLower)) {
      const batches = await prisma.batch.findMany({
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
          farmer: { select: { name: true } },
          _count: { select: { events: true } },
        },
      });
      allBatchesSummary = batches.map((b) => ({
        batchId: b.batchId,
        productName: b.productName,
        cropType: b.cropType,
        farmLocation: b.farmLocation,
        quantity: `${b.quantity} ${b.unit}`,
        farmerName: b.farmer?.name || "Farmer",
        chainStatus: b.chainStatus,
        hasCertificateHash: Boolean(b.certificateHash),
        eventsCount: b._count?.events || 0,
      }));
      if (!matchedBatch && batches.length > 0 && /org-bas-001|basmati|बासमती/i.test(qLower)) {
        matchedBatch = await prisma.batch.findUnique({
          where: { batchId: "ORG-BAS-001" },
          include: {
            farmer: { select: { name: true, email: true } },
            events: {
              include: { participant: { select: { name: true, role: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      }
    }
  } catch (_err) {
    // Degrade gracefully
  }

  // 3. Match App Functionality topics
  const scoredTopics = APP_FUNCTIONALITY_TOPICS.map((topic) => {
    let score = 0;
    for (const kw of topic.keywords) {
      if (qLower.includes(kw)) score += 20;
    }
    const words = qLower.split(/\s+/).filter((w) => w.length >= 4);
    for (const w of words) {
      if (topic.title.toLowerCase().includes(w) || topic.content.toLowerCase().includes(w)) {
        score += 4;
      }
    }
    return { topic, score };
  }).sort((a, b) => b.score - a.score);

  const matchedTopics = scoredTopics.filter((t) => t.score >= 12).slice(0, 2).map((t) => t.topic);

  return {
    matchedSchemes,
    allSchemesCount: allSchemes.length,
    matchedBatch,
    allBatchesSummary,
    matchedTopics,
    isGeneralSchemeQuery,
  };
}

/**
 * Builds a high-speed, compact RAG system prompt (~180-260 tokens) so local CPU LLMs
 * evaluate the prompt in ~2 seconds and focus 100% on answering the user's exact question.
 */
function buildCompactRagPrompt(lang, retrieved, currentContext = {}) {
  const isHi = lang === "hi";
  const parts = [
    `You are the Organic Trace AI Assistant. Answer the user's question directly, naturally, and helpfully using Markdown (bullet points and **bold** key terms).`,
    `Language: Respond in ${isHi ? "Hindi (हिन्दी)" : "English"}.`,
  ];

  if (retrieved.matchedSchemes.length > 0) {
    const schemeLines = retrieved.matchedSchemes.map((s) => {
      const elig = (s.eligibilityCriteria || []).slice(0, 2).join("; ");
      const docs = (s.requiredDocuments || []).slice(0, 4).join(", ");
      const steps = (s.applicationSteps || []).slice(0, 2).join(" -> ");
      return `- ${s.schemeCode} (${s.name}, ${s.governmentLevel === "CENTRAL" ? "Central" : s.state}): ${s.benefitSummary} Max: ${s.maxBenefitAmount || "As per norms"}. Eligibility: ${elig}. Docs: ${docs}. Apply: ${steps} (${s.officialPortalUrl})`;
    });
    parts.push(`VERIFIED GOVERNMENT SCHEMES:\n${schemeLines.join("\n")}`);
  } else {
    parts.push(
      `KEY SCHEMES IN PLATFORM (17 total at /schemes): PKVY (₹31,500/ha organic farming DBT, pgsindia-ncof.gov.in), PM-KISAN (₹6,000/yr income support, pmkisan.gov.in), AIF (3% interest subvention on ₹2Cr cold storage/infra loans, agriinfra.dac.gov.in), PMKSY (45-55% drip/sprinkler irrigation subsidy), PMFBY (crop insurance), e-NAM (online mandi), FPO-10K (₹18L FPO grant + ₹15L equity), NPOP-APEDA (organic export certification), AMI-NABARD (25-33.33% storage subsidy), SMAM (40-80% farm machinery subsidy), Haryana & Punjab Organic Mission.`
    );
  }

  if (retrieved.matchedBatch) {
    const b = retrieved.matchedBatch;
    parts.push(
      `LIVE BATCH ${b.batchId}: ${b.productName} (${b.cropType}), ${b.quantity} ${b.unit}, Location: ${b.farmLocation}, Farmer: ${b.farmer?.name || "Verified"}, Blockchain: ${b.chainStatus}, Cert SHA-256 On-Chain: ${b.certificateHash ? "Verified" : "Pending"}, Events (${b.events?.length || 0}): ${(b.events || []).map((e) => e.eventType).join(" -> ")}. Trace at /trace/${b.batchId}.`
    );
  } else if (retrieved.allBatchesSummary.length > 0) {
    parts.push(
      `SEEDED BATCHES: ${retrieved.allBatchesSummary.map((b) => `${b.batchId} (${b.productName}, ${b.farmLocation})`).join(", ")}.`
    );
  }

  if (retrieved.matchedTopics.length > 0) {
    parts.push(
      `APP FUNCTIONALITY:\n${retrieved.matchedTopics.map((t) => `- ${t.title}: ${t.summary}`).join("\n")}`
    );
  } else {
    parts.push(
      `ORGANIC TRACE APP GUIDE: Farmers log in (/login, demo: farmer@example.com / Demo@1234), create batches (/farmer/batches/new), upload organic certificates hashed with SHA-256 onto Ethereum smart contract SupplyChain.sol (/batches/:batchId), and download QR codes. Partners (processor@example.com, distributor@example.com, retailer@example.com) log events at /partner. Consumers verify QR codes & tamper detection at /trace/ORG-BAS-001. Schemes & eligibility matcher at /schemes. Voice Assistant (🎙️) & Hindi/English toggle in navbar.`
    );
  }

  if (currentContext.pathname) {
    parts.push(`User is currently viewing page: ${currentContext.pathname}`);
  }

  return parts.join("\n\n");
}

/**
 * Calls local Ollama chat endpoint (/api/chat) with generous timeout and CPU optimization.
 */
async function callOllamaChat({ modelName, systemPrompt, history, question, timeoutMs = 90000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history)
      ? history.slice(-4).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 500),
        }))
      : []),
    { role: "user", content: question },
  ];

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName || "llama3.2:latest",
        keep_alive: "60m",
        messages,
        stream: false,
        options: {
          temperature: 0.3,
          num_ctx: 2048,
          num_predict: 380,
          num_thread: 6,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`Ollama returned HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
    }
    const data = await res.json();
    const content = data?.message?.content?.trim();
    if (!content) throw new Error("Empty response from Ollama");
    return content;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Streams tokens from local Ollama chat endpoint (/api/chat) via async callback.
 */
async function streamOllamaChat({
  modelName,
  systemPrompt,
  history,
  question,
  onToken,
  timeoutMs = 90000,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [
    { role: "system", content: systemPrompt },
    ...(Array.isArray(history)
      ? history.slice(-4).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 500),
        }))
      : []),
    { role: "user", content: question },
  ];

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName || "llama3.2:latest",
        keep_alive: "60m",
        messages,
        stream: true,
        options: {
          temperature: 0.3,
          num_ctx: 2048,
          num_predict: 420,
          num_thread: 6,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream returned HTTP ${res.status}`);
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";

    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const piece = parsed?.message?.content || "";
          if (piece) {
            fullText += piece;
            onToken(piece);
          }
        } catch (_e) {
          // Ignore partial line
        }
      }
    }

    clearTimeout(timer);
    if (!fullText.trim()) {
      throw new Error("Empty stream from Ollama");
    }
    return fullText.trim();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Builds metadata payload (relatedSchemes, relatedBatch, suggestedActions, followUpQuestions).
 */
function buildResponseMetadata(retrieved, effectiveLang) {
  const relatedSchemes = retrieved.matchedSchemes.map((s) => ({
    schemeCode: s.schemeCode,
    name: s.name,
    nameHi: s.nameHi,
    shortName: s.shortName || s.schemeCode,
    governmentLevel: s.governmentLevel,
    state: s.state,
    fundingType: s.fundingType,
    maxBenefitAmount: s.maxBenefitAmount,
    maxSubsidyPercent: s.maxSubsidyPercent,
    officialPortalUrl: s.officialPortalUrl,
    categories: s.categories || [],
  }));

  const suggestedActions = [];
  for (const s of relatedSchemes.slice(0, 2)) {
    suggestedActions.push({
      label: effectiveLang === "hi" ? `${s.shortName} योजना देखें` : `View ${s.shortName} Details`,
      route: `/schemes/${s.schemeCode}`,
      type: "internal",
    });
  }
  if (retrieved.matchedBatch) {
    suggestedActions.push({
      label:
        effectiveLang === "hi"
          ? `बैच ${retrieved.matchedBatch.batchId} ट्रैक करें`
          : `Trace Batch ${retrieved.matchedBatch.batchId}`,
      route: `/trace/${retrieved.matchedBatch.batchId}`,
      type: "internal",
    });
  }
  for (const t of retrieved.matchedTopics) {
    for (const r of t.routes || []) {
      if (!suggestedActions.some((a) => a.route === r.route)) {
        suggestedActions.push({
          label: effectiveLang === "hi" ? r.labelHi : r.label,
          route: r.route,
          type: "internal",
        });
      }
    }
  }
  if (suggestedActions.length === 0) {
    suggestedActions.push(
      {
        label: effectiveLang === "hi" ? "सभी सरकारी योजनाएं देखें" : "Explore Government Schemes",
        route: "/schemes",
        type: "internal",
      },
      {
        label: effectiveLang === "hi" ? "डेमो बैच ORG-BAS-001 ट्रैक करें" : "Trace Batch ORG-BAS-001",
        route: "/trace/ORG-BAS-001",
        type: "internal",
      }
    );
  }

  const followUpQuestions =
    effectiveLang === "hi"
      ? [
          relatedSchemes[0]
            ? `${relatedSchemes[0].shortName} योजना के लिए कौन-कौन से दस्तावेज़ चाहिए?`
            : "जैविक खेती (PKVY) के लिए कितनी सब्सिडी मिलती है?",
          "किसान के रूप में नया फसल बैच और प्रमाण पत्र ब्लॉकचेन पर कैसे दर्ज करें?",
          "हरियाणा और पंजाब के किसानों के लिए कौन सी योजनाएं उपलब्ध हैं?",
        ]
      : [
          relatedSchemes[0]
            ? `What documents and steps are required to apply for ${relatedSchemes[0].shortName}?`
            : "Which schemes offer subsidies for organic farming and cold storage?",
          "How do I register a batch and upload an organic certificate on the blockchain?",
          "How does QR code traceability detect database tampering on /trace/ORG-BAS-001?",
        ];

  return {
    relatedSchemes,
    relatedBatch: retrieved.matchedBatch
      ? {
          batchId: retrieved.matchedBatch.batchId,
          productName: retrieved.matchedBatch.productName,
          cropType: retrieved.matchedBatch.cropType,
          farmLocation: retrieved.matchedBatch.farmLocation,
          chainStatus: retrieved.matchedBatch.chainStatus,
          eventsCount: retrieved.matchedBatch.events?.length || 0,
        }
      : null,
    suggestedActions: suggestedActions.slice(0, 4),
    followUpQuestions,
  };
}

/**
 * Main entry point to answer any question using the selected LLM model + RAG context.
 */
async function answerAssistantQuery({
  question,
  model = `ollama:${process.env.OLLAMA_MODEL || "llama3.2:latest"}`,
  lang = "en",
  history = [],
  currentContext = {},
}) {
  const startTime = Date.now();
  const effectiveLang =
    lang === "hi" || /[\u0900-\u097F]/.test(String(question || "")) ? "hi" : "en";

  const retrieved = await retrieveRelevantContext(question, effectiveLang, currentContext);
  const systemPrompt = buildCompactRagPrompt(effectiveLang, retrieved, currentContext);

  const requestedModel = String(model || `ollama:${process.env.OLLAMA_MODEL || "llama3.2:latest"}`).trim();
  const ollamaModelName = requestedModel.startsWith("ollama:")
    ? requestedModel.slice("ollama:".length)
    : process.env.OLLAMA_MODEL || "llama3.2:latest";
  const answerText = await callOllamaChat({ modelName: ollamaModelName, systemPrompt, history, question });
  const modelUsed = {
    id: `ollama:${ollamaModelName}`,
    name: `Ollama (${ollamaModelName})`,
    provider: "Ollama (Local)",
    ragGrounded: true,
    fallbackUsed: false,
  };

  const metadata = buildResponseMetadata(retrieved, effectiveLang);

  return {
    answer: answerText,
    lang: effectiveLang,
    modelUsed: {
      ...modelUsed,
      latencyMs: Date.now() - startTime,
    },
    ...metadata,
  };
}

/**
 * Streams an LLM response token-by-token (SSE) while immediately sending RAG metadata.
 */
async function streamAssistantQuery({
  question,
  model = `ollama:${process.env.OLLAMA_MODEL || "llama3.2:latest"}`,
  lang = "en",
  history = [],
  currentContext = {},
  onMeta,
  onToken,
  onDone,
}) {
  const startTime = Date.now();
  const effectiveLang =
    lang === "hi" || /[\u0900-\u097F]/.test(String(question || "")) ? "hi" : "en";

  const retrieved = await retrieveRelevantContext(question, effectiveLang, currentContext);
  const systemPrompt = buildCompactRagPrompt(effectiveLang, retrieved, currentContext);
  const metadata = buildResponseMetadata(retrieved, effectiveLang);

  const requestedModel = String(model || `ollama:${process.env.OLLAMA_MODEL || "llama3.2:latest"}`).trim();
  const ollamaModelName = requestedModel.startsWith("ollama:")
    ? requestedModel.slice("ollama:".length)
    : process.env.OLLAMA_MODEL || "llama3.2:latest";
  let modelUsed = {
    id: `ollama:${ollamaModelName}`,
    name: `Ollama (${ollamaModelName})`,
    provider: "Ollama (Local)",
    ragGrounded: true,
  };

  // Emit metadata immediately so scheme cards & batch cards appear right away
  onMeta({
    lang: effectiveLang,
    modelUsed,
    ...metadata,
  });

  let fullAnswer = "";

  try {
    fullAnswer = await streamOllamaChat({ modelName: ollamaModelName, systemPrompt, history, question, onToken });
  } catch (err) {
    throw new Error(err.name === "AbortError"
      ? "Ollama timed out. Check that Ollama is running and the model is available."
      : `Could not get a response from Ollama (${ollamaModelName}). Check OLLAMA_BASE_URL and run 'ollama pull ${ollamaModelName}'.`);
  }

  onDone({
    answer: fullAnswer,
    modelUsed: {
      ...modelUsed,
      latencyMs: Date.now() - startTime,
    },
  });
}

module.exports = {
  getAvailableModels,
  answerAssistantQuery,
  streamAssistantQuery,
  retrieveRelevantContext,
};
