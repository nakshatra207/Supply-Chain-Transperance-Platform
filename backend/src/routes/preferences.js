const express = require("express");
const { z } = require("zod");
const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const preferenceSchema = z.object({
  preferredLanguage: z.string().min(2).max(10).optional(),
  voiceLanguage: z.string().min(2).max(15).optional(),
  ttsEnabled: z.boolean().optional(),
  state: z.string().max(80).nullable().optional(),
  district: z.string().max(80).nullable().optional(),
  farmerCategory: z.string().max(60).nullable().optional(),
  landholdingCategory: z.string().max(60).nullable().optional(),
  organicCertStatus: z.string().max(60).nullable().optional(),
  isFpoMember: z.boolean().optional(),
  farmingInterests: z.array(z.string().max(60)).optional(),
});

// GET /api/preferences — Retrieve authenticated user's preferences
router.get("/", requireAuth, async (req, res, next) => {
  try {
    let pref = await prisma.userPreference.findUnique({
      where: { userId: req.user.id },
    });
    if (!pref) {
      pref = await prisma.userPreference.create({
        data: {
          userId: req.user.id,
          preferredLanguage: "en",
          voiceLanguage: "en-IN",
          ttsEnabled: true,
          farmingInterests: [],
        },
      });
    }
    res.json({ preference: pref });
  } catch (err) {
    next(err);
  }
});

// PUT /api/preferences — Update authenticated user's preferences
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = preferenceSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid preference data", details: parsed.error.flatten() });
    }
    const data = parsed.data;

    const updated = await prisma.userPreference.upsert({
      where: { userId: req.user.id },
      update: data,
      create: {
        userId: req.user.id,
        preferredLanguage: data.preferredLanguage || "en",
        voiceLanguage: data.voiceLanguage || "en-IN",
        ttsEnabled: data.ttsEnabled !== undefined ? data.ttsEnabled : true,
        state: data.state || null,
        district: data.district || null,
        farmerCategory: data.farmerCategory || null,
        landholdingCategory: data.landholdingCategory || null,
        organicCertStatus: data.organicCertStatus || null,
        isFpoMember: Boolean(data.isFpoMember),
        farmingInterests: data.farmingInterests || [],
      },
    });

    res.json({ preference: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
