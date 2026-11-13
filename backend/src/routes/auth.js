const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../prismaClient");
const { requireAuth, getJwtSecret } = require("../middleware/auth");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["FARMER", "PARTNER", "ADMIN"]),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: "365d" }
  );

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: "365d" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/refresh — Refresh session token for a user with a valid/expired signed JWT
router.post("/refresh", async (req, res) => {
  try {
    const secret = getJwtSecret();
    const header = req.headers.authorization;
    const rawToken =
      (header && header.startsWith("Bearer ") ? header.slice(7).trim() : null) ||
      (req.body && typeof req.body.token === "string" ? req.body.token.trim() : null);

    if (!rawToken) {
      return res.status(401).json({ error: "Signed token required to refresh session" });
    }

    let verified;
    try {
      verified = jwt.verify(rawToken, secret, { ignoreExpiration: true });
    } catch {
      return res.status(401).json({ error: "Invalid token signature" });
    }

    let user = null;
    if (verified.id) {
      user = await prisma.user.findUnique({ where: { id: String(verified.id) } });
    }
    if (!user && verified.email) {
      user = await prisma.user.findUnique({ where: { email: String(verified.email) } });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(userData, secret, { expiresIn: "365d" });
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: "Could not refresh session" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

module.exports = router;
