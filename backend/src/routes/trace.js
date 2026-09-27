const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

// GET /api/trace/:batchId - public, no auth. Used by the QR-scanning customer flow.
router.get("/:batchId", async (req, res) => {
  const batch = await prisma.batch.findUnique({
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

  res.json({
    batch,
    disclaimer:
      "Blockchain provides a tamper-evident and auditable record of submitted and verified supply-chain information. Physical product authenticity still depends on trusted participants, certification authorities, inspections, and other verification mechanisms.",
  });
});

module.exports = router;
