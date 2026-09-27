const express = require("express");
const { z } = require("zod");
const prisma = require("../prismaClient");
const { requireAuth, requireRole } = require("../middleware/auth");
const { recordEventOnChain, getSignerAddress } = require("../blockchain");

const router = express.Router({ mergeParams: true });

const EVENT_TYPES = [
  "RECEIVED_BY_PROCESSOR",
  "PROCESSING_STARTED",
  "PROCESSING_COMPLETED",
  "PACKAGED",
  "RECEIVED_BY_DISTRIBUTOR",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED_TO_RETAILER",
  "RECEIVED_BY_RETAILER",
  "AVAILABLE_FOR_SALE",
];

const createEventSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// POST /api/batches/:batchId/events
router.post("/:batchId/events", requireAuth, requireRole("PARTNER", "FARMER", "ADMIN"), async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const batch = await prisma.batch.findUnique({ where: { batchId: req.params.batchId } });
  if (!batch) return res.status(404).json({ error: "Batch not found" });

  const event = await prisma.supplyChainEvent.create({
    data: {
      batchId: batch.batchId,
      eventType: parsed.data.eventType,
      location: parsed.data.location,
      notes: parsed.data.notes,
      participantId: req.user.id,
    },
  });

  const chainResult = await recordEventOnChain({
    batchId: batch.batchId,
    eventType: event.eventType,
    participant: getSignerAddress(),
    location: event.location,
  });

  const updated = await prisma.supplyChainEvent.update({
    where: { id: event.id },
    data: { chainTxHash: chainResult.txHash, chainStatus: chainResult.status },
  });

  res.status(201).json({ event: updated, blockchain: chainResult });
});

router.get("/:batchId/events", requireAuth, async (req, res) => {
  const events = await prisma.supplyChainEvent.findMany({
    where: { batchId: req.params.batchId },
    include: { participant: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ events });
});

module.exports = router;
