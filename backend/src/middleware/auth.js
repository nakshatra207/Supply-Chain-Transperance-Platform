const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

const getJwtSecret = () => process.env.JWT_SECRET || "change_this_dev_secret";

// O(1) in-memory cache of confirmed active user UUIDs so valid tokens avoid redundant DB queries
const verifiedUserIds = new Set();

async function requireAuth(req, res, next) {
  const secret = getJwtSecret();
  const header = req.headers.authorization;
  const rawToken =
    header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!rawToken || rawToken === "null" || rawToken === "undefined") {
    return res.status(401).json({ error: "Authentication token required" });
  }

  // 1. Standard valid JWT verification
  try {
    const payload = jwt.verify(rawToken, secret);
    if (payload && payload.id) {
      if (verifiedUserIds.has(payload.id)) {
        req.user = payload;
        return next();
      }
      const existingUser = await prisma.user.findUnique({
        where: { id: String(payload.id) },
        select: { id: true, email: true, role: true, name: true },
      });
      if (existingUser) {
        verifiedUserIds.add(existingUser.id);
        req.user = existingUser;
        return next();
      }
    }
  } catch (_err) {
    // Only allow seamless session recovery if the token was genuinely signed with our secret
    // (e.g., expired token or user UUID changed after a database re-seed).
    // Never accept unsigned/forged tokens or unauthenticated header spoofing.
  }

  try {
    const verifiedPayload = jwt.verify(rawToken, secret, { ignoreExpiration: true });
    if (!verifiedPayload || typeof verifiedPayload !== "object") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    let user = null;
    if (verifiedPayload.id) {
      user = await prisma.user.findUnique({ where: { id: String(verifiedPayload.id) } });
    }
    if (!user && verifiedPayload.email) {
      user = await prisma.user.findUnique({ where: { email: String(verifiedPayload.email) } });
    }

    if (user) {
      verifiedUserIds.add(user.id);
      const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
      const refreshedToken = jwt.sign(userPayload, secret, { expiresIn: "365d" });
      res.setHeader("Access-Control-Expose-Headers", "x-refreshed-token, x-refreshed-user");
      res.setHeader("x-refreshed-token", refreshedToken);
      res.setHeader("x-refreshed-user", JSON.stringify(userPayload));
      req.user = userPayload;
      return next();
    }
  } catch (_recoveryErr) {
    // Cryptographic signature invalid -> reject with 401
  }

  return res.status(401).json({ error: "Invalid or expired token" });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, getJwtSecret };
