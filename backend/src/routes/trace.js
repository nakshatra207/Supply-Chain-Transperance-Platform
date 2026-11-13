const express = require("express");
const prisma = require("../prismaClient");
const { getBatchOnChainData, syncDatabaseWithBlockchain } = require("../blockchain");
const { cacheInvalidateBatch } = require("../hash");

const router = express.Router();

// GET /api/trace/:batchId - public, no auth. Used by the QR-scanning customer flow.
router.get("/:batchId", async (req, res) => {
  let batch = await prisma.batch.findUnique({
    where: { batchId: req.params.batchId },
    include: {
      farmer: { select: { id: true, name: true } },
      events: {
        orderBy: { createdAt: "asc" },
        include: { participant: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!batch) {
    return res.status(404).json({ error: "No product found for this batch ID" });
  }

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
        farmer: { select: { id: true, name: true } },
        events: {
          orderBy: { createdAt: "asc" },
          include: { participant: { select: { id: true, name: true, role: true } } },
        },
      },
    });
  }

  const onChainVerification = await getBatchOnChainData(batch.batchId, batch);

  const payload = {
    batch,
    onChainVerification,
    disclaimer:
      "Blockchain provides a tamper-evident and auditable record of submitted and verified supply-chain information. Physical product authenticity still depends on trusted participants, certification authorities, inspections, and other verification mechanisms.",
  };

  res.json(payload);
});

module.exports = router;
