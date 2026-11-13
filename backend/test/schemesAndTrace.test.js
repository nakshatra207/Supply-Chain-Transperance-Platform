const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const app = require("../src/index");
const prisma = require("../src/prismaClient");
const { isSafeOfficialUrl } = require("../src/services/schemeSyncService");
const {
  sha256Hex,
  sha256Base64Hex,
  constantTimeHashEquals,
  computeBatchMetadataHash,
  computeEventDataHash,
  computeMerkleRootHex,
  simdDotProductI16,
  simdXorFold32Hex,
  runNativeBenchmark,
  cacheGetJson,
  cacheSetJson,
  cacheInvalidatePrefix,
  getNativeStatus,
} = require("../src/hash");
const {
  MinHeap,
  PrefixTrie,
  InvertedIndex,
  MerkleTree,
  SupplyChainStageDAG,
  LruTtlCache,
} = require("../src/utils/dsaEngine");

let server;
let baseUrl;
let farmerToken = "";
let partnerToken = "";

function requestJson(method, path, body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload =
      body === null || body === undefined
        ? null
        : typeof body === "string"
        ? body
        : JSON.stringify(body);
    const headers = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            const data = raw ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode, data, headers: res.headers });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

test("URL validator permits only HTTPS official government domains and blocks unsafe URLs", () => {
  assert.equal(isSafeOfficialUrl("https://pmkisan.gov.in/"), true);
  assert.equal(isSafeOfficialUrl("https://www.myscheme.gov.in/"), true);
  assert.equal(isSafeOfficialUrl("https://agriinfra.dac.gov.in/"), true);
  assert.equal(isSafeOfficialUrl("https://agriharyana.gov.in/"), true);

  // Reject non-https, javascript:, and untrusted domains
  assert.equal(isSafeOfficialUrl("http://pmkisan.gov.in/"), false);
  assert.equal(isSafeOfficialUrl("javascript:alert(1)"), false);
  assert.equal(isSafeOfficialUrl("https://phishing-kisan-subsidy.example.com"), false);
});

test("GET /api/schemes lists verified government schemes with metadata and pagination", async () => {
  const { status, data } = await requestJson("GET", "/api/schemes?limit=25");
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.schemes));
  assert.ok(data.schemes.length >= 12);

  const codes = new Set(data.schemes.map((s) => s.schemeCode));
  for (const expected of [
    "PM-KISAN",
    "PKVY",
    "PMKSY",
    "MOVCDNER",
    "NMNF",
    "AIF",
    "PMFBY",
    "ENAM",
    "RKVY",
    "PMFME",
    "FPO-10K",
  ]) {
    assert.ok(codes.has(expected), `Expected scheme ${expected} to be present`);
  }
});

test("GET /api/schemes filters by category, state, governmentLevel, and search query", async () => {
  // Filter by STORAGE category
  const storageRes = await requestJson("GET", "/api/schemes?category=STORAGE");
  assert.equal(storageRes.status, 200);
  assert.ok(storageRes.data.schemes.length >= 2);
  assert.ok(storageRes.data.schemes.every((s) => s.categories.includes("STORAGE")));

  // Filter by Haryana state schemes
  const haryanaStateRes = await requestJson(
    "GET",
    "/api/schemes?governmentLevel=STATE&state=Haryana"
  );
  assert.equal(haryanaStateRes.status, 200);
  assert.ok(haryanaStateRes.data.schemes.length >= 1);
  assert.equal(haryanaStateRes.data.schemes[0].state, "Haryana");

  // Search query for organic fertilizer / PKVY
  const searchRes = await requestJson("GET", "/api/schemes?q=PKVY");
  assert.equal(searchRes.status, 200);
  assert.ok(searchRes.data.schemes.some((s) => s.schemeCode === "PKVY"));
});

test("GET /api/schemes/:codeOrId returns full scheme details, Hindi translations, and safe URL confirmation", async () => {
  const { status, data } = await requestJson("GET", "/api/schemes/PKVY");
  assert.equal(status, 200);
  assert.equal(data.scheme.schemeCode, "PKVY");
  assert.equal(data.safeOfficialUrl, true);
  assert.ok(data.scheme.nameHi.length > 0);
  assert.ok(data.scheme.eligibilityCriteria.length > 0);
  assert.ok(data.scheme.requiredDocuments.length > 0);
  assert.ok(data.scheme.applicationSteps.length > 0);
  assert.ok(data.disclaimer.length > 0);
});

test("POST /api/schemes/recommend produces ranked personalized recommendations with reasons & checklist", async () => {
  const { status, data } = await requestJson("POST", "/api/schemes/recommend", {
    state: "Haryana",
    district: "Karnal",
    farmerCategory: "ORGANIC_FARMER",
    landholdingCategory: "SMALL_MARGINAL",
    organicCertStatus: "PGS_CERTIFIED",
    isFpoMember: true,
    farmingInterests: ["ORGANIC_FARMING", "CERTIFICATION", "STORAGE"],
    lang: "en",
  });

  assert.equal(status, 200);
  assert.ok(Array.isArray(data.recommendations));
  assert.ok(data.recommendations.length >= 5);
  const top = data.recommendations[0];
  assert.ok(top.matchScore >= 50);
  assert.ok(Array.isArray(top.matchReasons) && top.matchReasons.length > 0);
  assert.ok(Array.isArray(top.verificationChecklist) && top.verificationChecklist.length > 0);
  assert.ok(data.disclaimer.includes("do NOT guarantee eligibility"));
});

test("POST /api/schemes/sync refreshes dataset and records SchemeSyncLog entry", async () => {
  const { status, data } = await requestJson("POST", "/api/schemes/sync", {
    performLiveNetworkCheck: false,
  });
  assert.equal(status, 200);
  assert.equal(data.status, "SUCCESS");
  assert.ok(data.schemesUpdated >= 12);
});

test("Existing traceability & batch workflows + contextual scheme integration work without regression", async () => {
  // 1. Public trace endpoint + blockchain verification check
  const traceRes = await requestJson("GET", "/api/trace/ORG-BAS-001");
  assert.equal(traceRes.status, 200);
  assert.equal(traceRes.data.batch.batchId, "ORG-BAS-001");
  assert.equal(traceRes.data.batch.chainStatus, "CONFIRMED");
  assert.ok(traceRes.data.onChainVerification);
  assert.equal(traceRes.data.onChainVerification.verified, true);
  assert.equal(traceRes.data.onChainVerification.tamperDetected, false);
  assert.equal(traceRes.data.onChainVerification.metadataVerified, true);
  assert.ok(traceRes.data.onChainVerification.metadataHash?.startsWith("0x"));
  assert.ok(traceRes.data.onChainVerification.txHash?.startsWith("0x"));
  assert.ok(traceRes.data.onChainVerification.onChainEventsCount >= 2);

  // 2. Contextual schemes for ORG-BAS-001 (Karnal, Haryana Organic Basmati Rice)
  const ctxRes = await requestJson("GET", "/api/schemes/contextual/batch/ORG-BAS-001");
  assert.equal(ctxRes.status, 200);
  assert.equal(ctxRes.data.batchId, "ORG-BAS-001");
  assert.ok(ctxRes.data.recommendedEducationalSchemes.length > 0);
  assert.ok(
    ctxRes.data.recommendedEducationalSchemes.some(
      (item) => item.scheme.schemeCode === "HARYANA-ORGANIC-PROTSAHAN" || item.scheme.schemeCode === "PKVY"
    )
  );
  assert.ok(ctxRes.data.separationNotice.includes("does NOT constitute blockchain verification"));

  // 3. Authenticate as seeded farmer and test saving schemes, linking batch, and saving voice preferences
  const loginRes = await requestJson("POST", "/api/auth/login", {
    email: "farmer@example.com",
    password: "Demo@1234",
  });
  assert.equal(loginRes.status, 200);
  farmerToken = loginRes.data.token;

  const saveRes = await requestJson("POST", "/api/schemes/PKVY/save", { notes: "Cluster application" }, farmerToken);
  assert.equal(saveRes.status, 201);

  const savedListRes = await requestJson("GET", "/api/schemes/saved", null, farmerToken);
  assert.equal(savedListRes.status, 200);
  assert.ok(savedListRes.data.savedSchemes.some((s) => s.scheme.schemeCode === "PKVY"));

  const linkRes = await requestJson(
    "POST",
    "/api/schemes/PKVY/link-batch",
    { batchId: "ORG-BAS-001", utilizationNote: "PGS-India Organic Cluster Karnal" },
    farmerToken
  );
  assert.equal(linkRes.status, 201);

  const prefRes = await requestJson(
    "PUT",
    "/api/preferences",
    {
      preferredLanguage: "hi",
      voiceLanguage: "hi-IN",
      ttsEnabled: true,
      state: "Haryana",
      district: "Karnal",
      farmerCategory: "ORGANIC_FARMER",
      isFpoMember: true,
      farmingInterests: ["ORGANIC_FARMING"],
    },
    farmerToken
  );
  assert.equal(prefRes.status, 200);
  assert.equal(prefRes.data.preference.voiceLanguage, "hi-IN");
  assert.equal(prefRes.data.preference.state, "Haryana");
});

test("GET /api/assistant/models lists Ollama models and starter categories", async () => {
  const { status, data } = await requestJson("GET", "/api/assistant/models");
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.models));
  assert.ok(data.models.length >= 1);
  assert.ok(data.models.every((m) => m.id.startsWith("ollama:")));
  assert.ok(data.defaultModel.startsWith("ollama:"));
  assert.ok(data.starterCategories && Array.isArray(data.starterCategories.en));
});

test("POST /api/assistant/ask rejects empty questions before contacting Ollama", async () => {
  const invalid = await requestJson("POST", "/api/assistant/ask", { question: " " });
  assert.equal(invalid.status, 400);
  assert.match(invalid.data.error, /question/i);
});

test("DSA Engine Unit Tests: MinHeap Top-K, PrefixTrie, InvertedIndex, MerkleTree Proofs, DAG & LruTtlCache", () => {
  // 1. MinHeap O(N log K) Top-K selection
  const items = [
    { id: "a", score: 12 },
    { id: "b", score: 95 },
    { id: "c", score: 44 },
    { id: "d", score: 88 },
    { id: "e", score: 71 },
    { id: "f", score: 3 },
  ];
  const top3 = MinHeap.selectTopK(items, 3, (x) => x.score);
  assert.deepEqual(
    top3.map((x) => x.id),
    ["b", "d", "e"]
  );
  assert.deepEqual(MinHeap.selectTopK([], 3), []);
  assert.deepEqual(MinHeap.selectTopK(items, 0), []);

  // 2. PrefixTrie O(L) prefix autocomplete
  const trie = new PrefixTrie();
  trie.insert("organic");
  trie.insert("orchard");
  trie.insert("organization");
  trie.insert("fertilizer");
  const orgMatches = trie.findWordsWithPrefix("org");
  assert.ok(orgMatches.includes("organic"));
  assert.ok(orgMatches.includes("organization"));
  assert.equal(trie.findWordsWithPrefix("xyz").length, 0);

  // 3. InvertedIndex O(1) token + O(L) prefix full-text search
  const idx = new InvertedIndex();
  idx.addDocument("PKVY", { code: "PKVY" }, [
    { text: "Paramparagat Krishi Vikas Yojana organic cluster", weight: 5 },
  ]);
  idx.addDocument("AIF", { code: "AIF" }, [
    { text: "Agriculture Infrastructure Fund cold storage warehouse", weight: 5 },
  ]);
  const hits = idx.search("organic cluster", 5);
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].docId, "PKVY");

  // 4. MerkleTree O(N) build, O(log N) proof generation & O(log N) verification
  const leaves = [
    sha256Hex(Buffer.from("leaf-0")),
    sha256Hex(Buffer.from("leaf-1")),
    sha256Hex(Buffer.from("leaf-2")),
    sha256Hex(Buffer.from("leaf-3")),
    sha256Hex(Buffer.from("leaf-4")),
  ];
  for (let i = 0; i < leaves.length; i++) {
    const proof = MerkleTree.generateProof(leaves, i);
    assert.equal(proof.valid, true);
    assert.equal(MerkleTree.verifyProof(proof.leaf, proof.siblings, proof.root), true);
    // Tampering with leaf must fail verification
    const tamperedLeaf = sha256Hex(Buffer.from("tampered-leaf"));
    assert.equal(MerkleTree.verifyProof(tamperedLeaf, proof.siblings, proof.root), false);
  }

  // 5. SupplyChainStageDAG Kahn's topological sort & sequence analysis
  const topo = SupplyChainStageDAG.topologicalSort();
  assert.equal(topo.isDAG, true);
  assert.equal(topo.order[0], "BATCH_CREATED");

  const validSeq = SupplyChainStageDAG.analyzeEventSequence(
    [
      { eventType: "RECEIVED_BY_PROCESSOR" },
      { eventType: "PACKAGED" },
      { eventType: "DISPATCHED" },
      { eventType: "AVAILABLE_FOR_SALE" },
    ],
    true
  );
  assert.equal(validSeq.validProgression, true);
  assert.equal(validSeq.completionPercent, 100);

  const regressedSeq = SupplyChainStageDAG.analyzeEventSequence(
    [{ eventType: "AVAILABLE_FOR_SALE" }, { eventType: "RECEIVED_BY_PROCESSOR" }],
    false
  );
  assert.equal(regressedSeq.validProgression, false);
  assert.ok(regressedSeq.anomalies.length > 0);

  // 6. LruTtlCache O(1) eviction & prefix invalidation
  const lru = new LruTtlCache(3);
  lru.set("k1", "v1", 10000);
  lru.set("k2", "v2", 10000);
  lru.set("k3", "v3", 10000);
  assert.equal(lru.get("k1"), "v1"); // refreshes k1, making k2 oldest
  lru.set("k4", "v4", 10000); // evicts k2
  assert.equal(lru.get("k2"), null);
  assert.equal(lru.get("k1"), "v1");
  assert.equal(lru.invalidatePrefix("k"), 3);
});

test("Native C11 / C++20 / x86_64 Assembly Engine Unit Tests & Large (>128 leaf) Merkle Tree", () => {
  const status = getNativeStatus();
  assert.equal(status.loaded, true);

  // 1. Hardware SHA-NI SHA-256 + SSSE3 Hex
  const digest = sha256Hex(Buffer.from("OrganicTrace-Native-Test"));
  assert.match(digest, /^0x[0-9a-f]{64}$/);

  // 2. Streaming Base64 SHA-256 (with and without data URI prefix)
  const rawPayload = Buffer.from("PGS-India Organic Certificate #99182").toString("base64");
  const h1 = sha256Base64Hex(rawPayload);
  const h2 = sha256Base64Hex(`data:application/pdf;base64,${rawPayload}`);
  assert.equal(h1, h2);
  assert.equal(constantTimeHashEquals(h1, h2), true);
  assert.equal(constantTimeHashEquals(h1, digest), false);

  // 3. Batch & Event canonical hashing
  const batchHash = computeBatchMetadataHash({
    batchId: "ORG-TEST-100",
    productName: "Organic Wheat",
    cropType: "Wheat",
    farmLocation: "Hisar, Haryana",
    harvestDate: "2026-03-15",
    quantity: 500,
    unit: "kg",
  });
  assert.match(batchHash, /^0x[0-9a-f]{64}$/);

  const evHash = computeEventDataHash({
    batchId: "ORG-TEST-100",
    eventType: "PACKAGED",
    participant: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    location: "Hisar",
    notes: "Sealed",
  });
  assert.match(evHash, /^0x[0-9a-f]{64}$/);

  // 4. Merkle Tree with 200 leaves (> 128 stack threshold)
  const manyLeaves = Array.from({ length: 200 }, (_, i) => sha256Hex(Buffer.from(`leaf-${i}`)));
  const root200 = computeMerkleRootHex(manyLeaves);
  const root200Changed = computeMerkleRootHex([
    ...manyLeaves.slice(0, 199),
    sha256Hex(Buffer.from("leaf-modified")),
  ]);
  assert.match(root200, /^0x[0-9a-f]{64}$/);
  assert.notEqual(root200, root200Changed);

  // 5. x86_64 SIMD pmaddwd 16-bit dot product & XMM XOR fold
  const dot = simdDotProductI16([10, 20, 30, 40], [1, 2, 3, 4]);
  assert.equal(dot, 10 * 1 + 20 * 2 + 30 * 3 + 40 * 4);
  const xorHex = simdXorFold32Hex(batchHash, evHash);
  assert.match(xorHex, /^0x[0-9a-f]{64}$/);

  // 6. C++20 Off-heap LRU + TTL cache
  cacheSetJson("test:native:key", { ok: true, count: 42 }, 15000);
  const cachedVal = cacheGetJson("test:native:key");
  assert.deepEqual(cachedVal, { ok: true, count: 42 });
  cacheInvalidatePrefix("test:native:");
  assert.equal(cacheGetJson("test:native:key"), null);

  // 7. Live native benchmark
  const bench = runNativeBenchmark();
  assert.ok(bench.sha256ThroughputMBps > 100);
  assert.ok(bench.simdDotThroughputMOps > 100);
});

test("Security Audit Tests: Auth Bypass Prevention, Forged JWT Rejection, Header Spoofing & BOLA Protection", async () => {
  // 1. Unauthenticated request to protected endpoint must return 401
  const noAuthRes = await requestJson("GET", "/api/batches");
  assert.equal(noAuthRes.status, 401);

  // 2. Garbage / random Bearer token must return 401 (no fallback to default farmer!)
  const garbageTokenRes = await requestJson("GET", "/api/batches", null, "invalid_garbage_token");
  assert.equal(garbageTokenRes.status, 401);

  // 3. Forged JWT signed with attacker's wrong secret must be rejected with 401
  const forgedToken = jwt.sign(
    { id: "attacker-id", email: "farmer@example.com", role: "ADMIN", name: "Attacker" },
    "attacker_wrong_secret_key",
    { expiresIn: "1h" }
  );
  const forgedRes = await requestJson("GET", "/api/batches", null, forgedToken);
  assert.equal(forgedRes.status, 401);

  // 4. Unauthenticated X-User-Email / X-User-Id header spoofing must be rejected with 401
  const spoofedHeaderRes = await requestJson("GET", "/api/batches", null, null, {
    "X-User-Email": "farmer@example.com",
    "X-User-Id": "00000000-0000-0000-0000-000000000000",
  });
  assert.equal(spoofedHeaderRes.status, 401);

  // 5. Unauthenticated POST /api/auth/refresh without signed token must be rejected with 401
  const unauthRefreshRes = await requestJson("POST", "/api/auth/refresh", {
    email: "farmer@example.com",
  });
  assert.equal(unauthRefreshRes.status, 401);

  // 6. Role-Based Access Control (RBAC): PARTNER cannot create a batch
  const partnerLogin = await requestJson("POST", "/api/auth/login", {
    email: "partner@example.com",
    password: "Demo@1234",
  });
  assert.equal(partnerLogin.status, 200);
  partnerToken = partnerLogin.data.token;

  const partnerCreateBatch = await requestJson(
    "POST",
    "/api/batches",
    {
      batchId: "ORG-UNAUTH-999",
      productName: "Unauthorized Batch",
      cropType: "Rice",
      farmLocation: "Karnal",
      harvestDate: "2026-03-10",
      quantity: 100,
      unit: "kg",
    },
    partnerToken
  );
  assert.equal(partnerCreateBatch.status, 403);

  // 7. Broken Object-Level Authorization (BOLA / IDOR): Farmer B cannot overwrite Farmer A's batch certificate
  const secondFarmerEmail = `farmer2_${Date.now()}@example.com`;
  const regFarmer2 = await requestJson("POST", "/api/auth/register", {
    name: "Second Farmer",
    email: secondFarmerEmail,
    password: "Password@123",
    role: "FARMER",
  });
  assert.equal(regFarmer2.status, 201);
  const farmer2Token = regFarmer2.data.token;

  const bolaCertRes = await requestJson(
    "POST",
    "/api/batches/ORG-BAS-001/certificate",
    {
      certificateId: "CERT-HIJACK-001",
      certificateContentBase64: Buffer.from("Hijacked certificate").toString("base64"),
    },
    farmer2Token
  );
  assert.equal(bolaCertRes.status, 403);

  // Clean up temporary second farmer
  await prisma.user.delete({ where: { email: secondFarmerEmail } });

  // 8. Sensitive Data Exposure Check: passwordHash must never appear in batch or event responses
  const batchDetailRes = await requestJson("GET", "/api/batches/ORG-BAS-001", null, farmerToken);
  assert.equal(batchDetailRes.status, 200);
  assert.equal(batchDetailRes.data.batch.farmer.passwordHash, undefined);
  for (const ev of batchDetailRes.data.batch.events || []) {
    if (ev.participant) {
      assert.equal(ev.participant.passwordHash, undefined);
    }
  }
});

test("Boundary, Invalid, Empty, Null & Malformed Input Validation Tests", async () => {
  // 1. Malformed JSON payload returns 400 instead of 500
  const malformedRes = await requestJson("POST", "/api/auth/login", "{ invalid json ");
  assert.equal(malformedRes.status, 400);
  assert.ok(malformedRes.data.error.includes("Malformed JSON"));

  // 2. Invalid harvestDate returns 400 Bad Request
  const badDateRes = await requestJson(
    "POST",
    "/api/batches",
    {
      batchId: "ORG-BAD-DATE",
      productName: "Organic Millet",
      cropType: "Millet",
      farmLocation: "Haryana",
      harvestDate: "not-a-valid-date",
      quantity: 100,
      unit: "kg",
    },
    farmerToken
  );
  assert.equal(badDateRes.status, 400);

  // 3. Negative or zero quantity returns 400 Bad Request
  const negQtyRes = await requestJson(
    "POST",
    "/api/batches",
    {
      batchId: "ORG-NEG-QTY",
      productName: "Organic Millet",
      cropType: "Millet",
      farmLocation: "Haryana",
      harvestDate: "2026-03-01",
      quantity: -50,
      unit: "kg",
    },
    farmerToken
  );
  assert.equal(negQtyRes.status, 400);

  // 4. Empty question to AI Assistant returns 400
  const emptyAskRes = await requestJson("POST", "/api/assistant/ask", {
    question: "   ",
  });
  assert.equal(emptyAskRes.status, 400);

  // 5. SQL Injection & XSS search strings in /api/schemes are safely parameterized and return 200 with 0 matches
  const sqliRes = await requestJson(
    "GET",
    `/api/schemes?q=${encodeURIComponent("'; DROP TABLE \"GovernmentScheme\"; --")}`
  );
  assert.equal(sqliRes.status, 200);
  assert.equal(sqliRes.data.schemes.length, 0);
});

test("Full End-to-End Batch Lifecycle: Create -> Upload Certificate -> Verify -> Partner Event -> Trace & Merkle Proof", async () => {
  const testBatchId = `ORG-E2E-${Date.now()}`;
  const certBase64 = Buffer.from(
    `NPOP Organic Certificate for ${testBatchId} issued at Karnal`
  ).toString("base64");

  try {
    // 1. Farmer creates batch with inline certificate
    const createRes = await requestJson(
      "POST",
      "/api/batches",
      {
        batchId: testBatchId,
        productName: "Organic Heirloom Wheat",
        cropType: "Wheat",
        farmLocation: "Karnal, Haryana",
        harvestDate: "2026-02-20",
        quantity: 750,
        unit: "kg",
        organicCertId: `CERT-${testBatchId}`,
        description: "Zero-pesticide certified heirloom wheat",
        certificateContentBase64: certBase64,
      },
      farmerToken
    );
    assert.equal(createRes.status, 201);
    assert.equal(createRes.data.batch.batchId, testBatchId);
    assert.equal(createRes.data.batch.chainStatus, "CONFIRMED");
    assert.match(createRes.data.batch.certificateHash, /^0x[0-9a-f]{64}$/);

    // 2. Verify authentic certificate matches on-chain & DB hash
    const verifyOkRes = await requestJson("POST", `/api/batches/${testBatchId}/certificate/verify`, {
      certificateContentBase64: certBase64,
    });
    assert.equal(verifyOkRes.status, 200);
    assert.equal(verifyOkRes.data.match, true);

    // 3. Verify tampered certificate fails verification
    const verifyBadRes = await requestJson("POST", `/api/batches/${testBatchId}/certificate/verify`, {
      certificateContentBase64: Buffer.from("Tampered fake certificate").toString("base64"),
    });
    assert.equal(verifyBadRes.status, 200);
    assert.equal(verifyBadRes.data.match, false);

    // 4. Partner logs a supply chain event
    const eventRes = await requestJson(
      "POST",
      `/api/batches/${testBatchId}/events`,
      {
        eventType: "RECEIVED_BY_PROCESSOR",
        location: "Sonipat Organic Mill, Haryana",
        notes: "Moisture 11.2%, passed purity screening",
      },
      partnerToken
    );
    assert.equal(eventRes.status, 201);
    assert.equal(eventRes.data.event.chainStatus, "CONFIRMED");

    // 5. Public QR trace verifies Merkle Root, Merkle Proof, and Supply Chain DAG
    const traceRes = await requestJson("GET", `/api/trace/${testBatchId}`);
    assert.equal(traceRes.status, 200);
    const v = traceRes.data.onChainVerification;
    assert.equal(v.verified, true);
    assert.equal(v.tamperDetected, false);
    assert.equal(v.merkleProofVerified, true);
    assert.ok(v.merkleProof && Array.isArray(v.merkleProof.siblings));
    assert.equal(v.supplyChainDAG.validProgression, true);
    assert.equal(v.supplyChainDAG.currentStage, "RECEIVED_BY_PROCESSOR");

    // 6. Test GET /api/batches (with pagination), GET /api/batches/:batchId/events, GET /api/schemes/meta, GET /api/preferences, GET /api/auth/me, POST /api/auth/refresh
    const listBatchesRes = await requestJson("GET", "/api/batches?page=1&limit=5", null, farmerToken);
    assert.equal(listBatchesRes.status, 200);
    assert.ok(Array.isArray(listBatchesRes.data.batches));
    assert.ok(listBatchesRes.data.pagination);

    const listEventsRes = await requestJson("GET", `/api/batches/${testBatchId}/events`, null, farmerToken);
    assert.equal(listEventsRes.status, 200);
    assert.equal(listEventsRes.data.events.length, 1);

    const metaRes = await requestJson("GET", "/api/schemes/meta");
    assert.equal(metaRes.status, 200);
    assert.ok(metaRes.data.totalSchemes >= 12);

    const getPrefRes = await requestJson("GET", "/api/preferences", null, farmerToken);
    assert.equal(getPrefRes.status, 200);
    assert.ok(getPrefRes.data.preference);

    const meRes = await requestJson("GET", "/api/auth/me", null, farmerToken);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.email, "farmer@example.com");

    const refreshRes = await requestJson("POST", "/api/auth/refresh", { token: farmerToken });
    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.data.token);

    const benchEndpointRes = await requestJson("GET", "/api/health/benchmark");
    assert.equal(benchEndpointRes.status, 200);
    assert.ok(benchEndpointRes.data.benchmark.sha256ThroughputMBps > 50);

    const unsaveRes = await requestJson("DELETE", "/api/schemes/PKVY/save", null, farmerToken);
    assert.equal(unsaveRes.status, 200);
    assert.equal(unsaveRes.data.removed, true);

    const notFoundTrace = await requestJson("GET", "/api/trace/NON-EXISTENT-BATCH-999");
    assert.equal(notFoundTrace.status, 404);
  } finally {
    await prisma.supplyChainEvent.deleteMany({ where: { batchId: testBatchId } });
    await prisma.batch.deleteMany({ where: { batchId: testBatchId } });
  }
});

test("Performance & Concurrent Load Test: 40 parallel requests across Trace, Schemes & Health Telemetry", async () => {
  const concurrency = 40;
  const start = performance.now();

  const tasks = Array.from({ length: concurrency }, (_, i) => {
    if (i % 3 === 0) return requestJson("GET", "/api/trace/ORG-BAS-001");
    if (i % 3 === 1) return requestJson("GET", "/api/schemes?category=ORGANIC_FARMING");
    return requestJson("GET", "/api/health");
  });

  const results = await Promise.all(tasks);
  const elapsedMs = performance.now() - start;

  assert.ok(results.every((r) => r.status === 200));
  // 40 concurrent requests should complete well under 2500ms
  assert.ok(elapsedMs < 2500, `Expected 40 concurrent requests < 2500ms, took ${elapsedMs.toFixed(1)}ms`);
});

