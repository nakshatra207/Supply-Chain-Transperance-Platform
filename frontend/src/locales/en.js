export default {
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
  "auth.roleFarmer": "Farmer",
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
  "farmer.onChain": "On-chain ✓",
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
  "event.AVAILABLE_FOR_SALE": "Available on Retail Shelf"
};
