const express = require("express");
const { z } = require("zod");
const prisma = require("../prismaClient");
const { requireAuth, requireRole } = require("../middleware/auth");
const { recordBatchOnChain, recordCertificateOnChain } = require("../blockchain");
const { sha256Hex } = require("../hash");

const router = express.Router();

const createBatchSchema = z.object({
  batchId: z.string().min(3),
  productName: z.string().min(2),
  cropType: z.string().min(2),
  farmLocation: z.string().min(2),
  harvestDate: z.string(), // ISO date
  quantity: z.number().positive(),
  unit: z.string().min(1),
  organicCertId: z.string().optional(),
  description: z.string().optional(),
});

// FARMER creates a batch -> stored in DB + recorded on blockchain
router.post("/", requireAuth, requireRole("FARMER"), async (req, res) => {
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
      organicCertId: data.organicCertId,
      description: data.description,
      farmerId: req.user.id,
    },
  });

  // Record creation event on blockchain (non-blocking failures are tolerated)
  const chainResult = await recordBatchOnChain({ batchId: batch.batchId, farmerId: req.user.id });

  const updated = await prisma.batch.update({
    where: { id: batch.id },
    data: { chainTxHash: chainResult.txHash, chainStatus: chainResult.status },
  });

  res.status(201).json({ batch: updated, blockchain: chainResult });
});

// List batches - farmers see their own, partners/admin see all
router.get("/", requireAuth, async (req, res) => {
  const where = req.user.role === "FARMER" ? { farmerId: req.user.id } : {};
  const batches = await prisma.batch.findMany({
    where,
    include: { events: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ batches });
});

router.get("/:batchId", requireAuth, async (req, res) => {
  const batch = await prisma.batch.findUnique({
    where: { batchId: req.params.batchId },
    include: { events: { orderBy: { createdAt: "asc" }, include: { participant: true } }, farmer: true },
  });
  if (!batch) return res.status(404).json({ error: "Batch not found" });
  res.json({ batch });
});

// Certificate hash: upload raw certificate text/bytes, we hash it and store on-chain
const certSchema = z.object({
  certificateId: z.string().min(1),
  certificateContentBase64: z.string().min(1), // base64 of the document
});

router.post("/:batchId/certificate", requireAuth, requireRole("FARMER", "ADMIN"), async (req, res) => {
  const parsed = certSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const batch = await prisma.batch.findUnique({ where: { batchId: req.params.batchId } });
  if (!batch) return res.status(404).json({ error: "Batch not found" });

  const buffer = Buffer.from(parsed.data.certificateContentBase64, "base64");
  const certificateHash = sha256Hex(buffer);

  const chainResult = await recordCertificateOnChain({
    batchId: batch.batchId,
    certificateId: parsed.data.certificateId,
    certificateHash,
    verifier: req.user.id,
  });

  const updated = await prisma.batch.update({
    where: { id: batch.id },
    data: { certificateHash, organicCertId: parsed.data.certificateId },
  });

  res.json({ batch: updated, certificateHash, blockchain: chainResult });
});

// Verify: client sends a document again, we hash and compare to stored hash
const verifySchema = z.object({
  certificateContentBase64: z.string().min(1),
});

router.post("/:batchId/certificate/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const batch = await prisma.batch.findUnique({ where: { batchId: req.params.batchId } });
  if (!batch) return res.status(404).json({ error: "Batch not found" });
  if (!batch.certificateHash) {
    return res.status(400).json({ error: "No certificate hash recorded for this batch yet" });
  }

  const buffer = Buffer.from(parsed.data.certificateContentBase64, "base64");
  const computedHash = sha256Hex(buffer);
  const match = computedHash === batch.certificateHash;

  res.json({ match, computedHash, storedHash: batch.certificateHash });
});

module.exports = router;
