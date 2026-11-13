require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
require("dotenv").config(); // also allow backend/.env to override

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const batchRoutes = require("./routes/batches");
const eventRoutes = require("./routes/events");
const traceRoutes = require("./routes/trace");
const schemesRoutes = require("./routes/schemes");
const preferencesRoutes = require("./routes/preferences");
const assistantRoutes = require("./routes/assistant");
const { ensureSchemesSeeded, syncGovernmentSchemes } = require("./services/schemeSyncService");
const { isConfigured, syncDatabaseWithBlockchain } = require("./blockchain");
const { getNativeStatus, runNativeBenchmark } = require("./hash");
const prisma = require("./prismaClient");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" })); // certificates are base64-encoded in the body

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use("/api", limiter);

app.get("/api/health", (req, res) => {
  const includeBenchmark = req.query.benchmark === "1" || req.query.benchmark === "true";
  res.json({
    status: "ok",
    blockchainConfigured: isConfigured(),
    nativeAccelerator: getNativeStatus(),
    ...(includeBenchmark ? { benchmark: runNativeBenchmark() } : {}),
  });
});

app.get("/api/health/benchmark", (req, res) => {
  res.json({
    status: "ok",
    nativeAccelerator: getNativeStatus(),
    benchmark: runNativeBenchmark(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/batches", eventRoutes); // adds /:batchId/events under /api/batches
app.use("/api/trace", traceRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/assistant", assistantRoutes);

// central error handler - handle malformed JSON 400s cleanly and never leak internals on 500s
app.use((err, req, res, next) => {
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({ error: "Malformed JSON payload" });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload exceeds maximum allowed size (5MB)" });
  }
  console.error("[error]", err?.message || err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    const nativeInfo = getNativeStatus();
    console.log(
      `Organic Trace backend running on http://localhost:${PORT} [Native C/C++/ASM: ${
        nativeInfo.loaded ? "ACTIVE (SHA-NI + SSSE3 ASM + C++20 Cache)" : "JS Fallback"
      }]`
    );
    if (!isConfigured()) {
      console.warn(
        "[warning] Blockchain not configured yet (missing CONTRACT_ADDRESS or contract artifact). Batches will save to Postgres and auto-bind once CONTRACT_ADDRESS is written to .env."
      );
    }

    ensureSchemesSeeded().catch((err) => {
      console.warn("[schemes] Initial scheme seed warning:", err.message);
    });

    syncDatabaseWithBlockchain(prisma)
      .then((res) => {
        if (res.batchesSynced > 0 || res.eventsSynced > 0) {
          console.log(
            `[blockchain] Synced ${res.batchesSynced} batch(es) and ${res.eventsSynced} event(s) on-chain.`
          );
        }
      })
      .catch((err) => {
        console.warn("[blockchain] Startup sync warning:", err.message);
      });

    // Follow-up sync after 2.5s in case Hardhat RPC node booted concurrently via start.sh
    setTimeout(() => {
      syncDatabaseWithBlockchain(prisma).catch(() => {});
    }, 2500).unref();

    const syncIntervalMs = parseInt(process.env.SCHEME_SYNC_INTERVAL_MS || "0", 10);
    if (syncIntervalMs >= 60000) {
      setInterval(() => {
        syncGovernmentSchemes({ performLiveNetworkCheck: true }).catch((err) => {
          console.warn("[schemes] Scheduled sync warning:", err.message);
        });
      }, syncIntervalMs).unref();
    }
  });
}

module.exports = app;
