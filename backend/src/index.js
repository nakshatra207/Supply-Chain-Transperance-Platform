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
const { isConfigured } = require("./blockchain");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" })); // certificates are base64-encoded in the body

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use("/api", limiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", blockchainConfigured: isConfigured() });
});

app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/batches", eventRoutes); // adds /:batchId/events under /api/batches
app.use("/api/trace", traceRoutes);

// central error handler - never leak internals
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Organic Trace backend running on http://localhost:${PORT}`);
  if (!isConfigured()) {
    console.warn(
      "[warning] Blockchain not configured yet (missing CONTRACT_ADDRESS or contract artifact). Batches will save to Postgres but on-chain recording will report FAILED until you deploy the contract and set CONTRACT_ADDRESS in .env."
    );
  }
});
