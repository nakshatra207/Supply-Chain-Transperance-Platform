const express = require("express");
const { z } = require("zod");
const prisma = require("../prismaClient");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  recordBatchOnChain,
  recordCertificateOnChain,
  getBatchOnChainData,
  syncDatabaseWithBlockchain,
  getSignerAddress,
  readLocalLedger,
} = require("../blockchain");
const {
  sha256Base64Hex,
  constantTimeHashEquals,
  cacheInvalidateBatch,
} = require("../hash");

const router = express.Router();

const createBatchSchema = z.object({
  batchId: z.string().trim().min(2).max(100),
  productName: z.string().trim().min(2).max(200),
  cropType: z.string().trim().min(2).max(120),
  farmLocation: z.string().trim().min(2).max(250),
  harvestDate: z
    .string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid harvestDate ISO format" }),
  quantity: z.coerce.number().positive().max(100000000),
  unit: z.string().trim().min(1).max(40),
  organicCertId: z.string().trim().max(120).optional(),
  description: z.string().max(2000).optional(),
  certificateContentBase64: z.string().optional(),
});

// FARMER creates a batch -> stored in DB + recorded on blockchain
router.post("/", requireAuth, requireRole("FARMER", "ADMIN"), async (req, res) => {
  const parsed = createBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const data = parsed.data;

  const existing = await prisma.batch.findUnique({ where: { batchId: data.batchId } });
  if (existing) {
    return res.status(409).json({ error: `Batch ID '${data.batchId}' already exists` });
  }

  const batch = await prisma.batch.create({
    data: {
      batchId: data.batchId,
      productName: data.productName,
      cropType: data.cropType,
      farmLocation: data.farmLocation,
      harvestDate: new Date(data.harvestDate),
      quantity: data.quantity,
      unit: data.unit,
      organicCertId: data.organicCertId || null,
      description: data.description || null,
      farmerId: req.user.id,
    },
  });

  // Record creation event + canonical metadata hash on blockchain (EVM + cryptographic ledger)
  const chainResult = await recordBatchOnChain({
    batchId: batch.batchId,
    farmerId: req.user.id,
    batch,
  });

  const updateData = {
    chainTxHash: chainResult.txHash,
    chainStatus: chainResult.status,
  };

  let certChainResult = null;
  if (data.certificateContentBase64 && data.certificateContentBase64.trim().length > 0) {
    const certificateHash = sha256Base64Hex(data.certificateContentBase64);
    const certId = data.organicCertId || `CERT-${batch.batchId}`;
    certChainResult = await recordCertificateOnChain({
      batchId: batch.batchId,
      certificateId: certId,
      certificateHash,
      verifier: getSignerAddress() || req.user.id,
      batch,
    });
    updateData.certificateHash = certChainResult.certificateHash;
    updateData.organicCertId = certId;
  }

  const updated = await prisma.batch.update({
    where: { id: batch.id },
    data: updateData,
  });

  cacheInvalidateBatch(batch.batchId);

  res.status(201).json({
    batch: updated,
    blockchain: chainResult,
    certificateBlockchain: certChainResult,
  });
});

// POST /api/batches/sync-chain — Force-sync all batches, certificates & events onto the blockchain
router.post("/sync-chain", requireAuth, async (req, res) => {
  const syncResult = await syncDatabaseWithBlockchain(prisma);
  cacheInvalidateBatch();
  res.json({
    status: "CONFIRMED",
    ...syncResult,
  });
});

// List batches — returns farmer's batches first + platform batches, ensuring all are anchored on-chain
router.get("/", requireAuth, async (req, res) => {
  const [unconfirmedBatches, unconfirmedEvents] = await Promise.all([
    prisma.batch.count({
      where: { OR: [{ chainStatus: { not: "CONFIRMED" } }, { chainTxHash: null }] },
    }),
    prisma.supplyChainEvent.count({
      where: { OR: [{ chainStatus: { not: "CONFIRMED" } }, { chainTxHash: null }] },
    }),
  ]);

  if (unconfirmedBatches > 0 || unconfirmedEvents > 0) {
    await syncDatabaseWithBlockchain(prisma);
    cacheInvalidateBatch();
  }

  let allBatches = await prisma.batch.findMany({
    include: {
      events: { orderBy: { createdAt: "asc" } },
      farmer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Ensure every batch in DB is also present in the local cryptographic ledger
  const ledger = readLocalLedger();
  const missingInLedger = allBatches.some(
    (b) => !ledger.batches[b.batchId] || !ledger.batches[b.batchId].metadataHash
  );
  if (missingInLedger) {
    await syncDatabaseWithBlockchain(prisma);
    cacheInvalidateBatch();
    allBatches = await prisma.batch.findMany({
      include: {
        events: { orderBy: { createdAt: "asc" } },
        farmer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Sort so the current farmer's own batches appear first, followed by other verified platform batches
  const sortedBatches =
    req.user.role === "FARMER"
      ? [
          ...allBatches.filter((b) => b.farmerId === req.user.id),
          ...allBatches.filter((b) => b.farmerId !== req.user.id),
        ]
      : allBatches;

  const pageNum = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limitNum = req.query.limit
    ? Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 50))
    : Math.max(1, sortedBatches.length);
  const startIdx = (pageNum - 1) * limitNum;
  const paginatedBatches = req.query.limit
    ? sortedBatches.slice(startIdx, startIdx + limitNum)
    : sortedBatches;

  res.json({
    batches: paginatedBatches,
    pagination: {
      total: sortedBatches.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(sortedBatches.length / limitNum)),
    },
  });
});

const SAFE_USER_SELECT = { id: true, name: true, email: true, role: true, createdAt: true };

router.get("/:batchId", requireAuth, async (req, res) => {
  let batch = await prisma.batch.findUnique({
    where: { batchId: req.params.batchId },
    include: {
      events: {
        orderBy: { createdAt: "asc" },
        include: { participant: { select: SAFE_USER_SELECT } },
      },
      farmer: { select: SAFE_USER_SELECT },
    },
  });
  if (!batch) return res.status(404).json({ error: "Batch not found" });

  // Self-heal if batch or any event is not yet CONFIRMED on-chain
  const needsSync =
    batch.chainStatus !== "CONFIRMED" ||
    !batch.chainTxHash ||
    (batch.events || []).some((e) => e.chainStatus !== "CONFIRMED" || !e.chainTxHash);

  if (needsSync) {
    await syncDatabaseWithBlockchain(prisma);
    cacheInvalidateBatch(batch.batchId);
    batch = await prisma.batch.findUnique({
      where: { batchId: req.params.batchId },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
          include: { participant: { select: SAFE_USER_SELECT } },
        },
        farmer: { select: SAFE_USER_SELECT },
      },
    });
  }

  const onChainVerification = await getBatchOnChainData(batch.batchId, batch);
  res.json({ batch, onChainVerification });
});

// Certificate hash: upload raw certificate text/bytes, we hash it in C11 SHA-NI + ASM and store on-chain
const certSchema = z.object({
  certificateId: z.string().trim().min(1).max(120),
  certificateContentBase64: z.string().min(1), // base64 of the document
});

router.post("/:batchId/certificate", requireAuth, requireRole("FARMER", "ADMIN"), async (req, res) => {
  const parsed = certSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const batch = await prisma.batch.findUnique({
    where: { batchId: req.params.batchId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!batch) return res.status(404).json({ error: "Batch not found" });

  // Object-level authorization (BOLA / IDOR protection): Farmers can only modify their own batches
  if (req.user.role === "FARMER" && batch.farmerId !== req.user.id) {
    return res
      .status(403)
      .json({ error: "You can only upload certificates for your own product batches" });
  }

  // Zero-copy C11 Base64 streaming -> SHA-NI -> x86_64 SSSE3 Assembly Hex
  const certificateHash = sha256Base64Hex(parsed.data.certificateContentBase64);

  const chainResult = await recordCertificateOnChain({
    batchId: batch.batchId,
    certificateId: parsed.data.certificateId,
    certificateHash,
    verifier: getSignerAddress() || req.user.id,
    batch,
  });

  const updated = await prisma.batch.update({
    where: { id: batch.id },
    data: {
      certificateHash: chainResult.certificateHash || certificateHash,
      organicCertId: parsed.data.certificateId,
      chainStatus: "CONFIRMED",
      chainTxHash: batch.chainTxHash || chainResult.txHash,
    },
  });

  cacheInvalidateBatch(batch.batchId);

  res.json({
    batch: updated,
    certificateHash: updated.certificateHash,
    blockchain: chainResult,
  });
});

// Verify: client sends a document again, we hash in C/ASM and compare in constant-time x86_64 Assembly
const verifySchema = z.object({
  certificateContentBase64: z.string().min(1),
});

router.post("/:batchId/certificate/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const batch = await prisma.batch.findUnique({
    where: { batchId: req.params.batchId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!batch) return res.status(404).json({ error: "Batch not found" });

  const onChainData = await getBatchOnChainData(batch.batchId, batch);
  const storedHash = onChainData.onChainCertificateHash || batch.certificateHash;

  if (!storedHash) {
    return res.status(400).json({ error: "No certificate hash recorded for this batch yet" });
  }

  const computedHash = sha256Base64Hex(parsed.data.certificateContentBase64);
  const dbMatch = batch.certificateHash
    ? constantTimeHashEquals(computedHash, batch.certificateHash)
    : true;
  const onChainMatch = onChainData.onChainCertificateHash
    ? constantTimeHashEquals(computedHash, onChainData.onChainCertificateHash)
    : dbMatch;
  const match = dbMatch && onChainMatch;

  res.json({
    match,
    dbMatch,
    onChainMatch,
    computedHash,
    storedHash,
    onChainCertificateHash: onChainData.onChainCertificateHash,
  });
});

module.exports = router;
