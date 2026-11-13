const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const {
  getAvailableModels,
  answerAssistantQuery,
  streamAssistantQuery,
} = require("../services/llmAssistantService");

const router = express.Router();

const assistantLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 80,
  message: { error: "Too many AI Assistant queries. Please wait a moment and try again." },
});

const askSchema = z.object({
  question: z.string().trim().min(1, "Please enter a question").max(1500, "Question is too long"),
  model: z.string().trim().max(120).optional().default("ollama:llama3.2:latest"),
  lang: z.string().trim().min(2).max(10).optional().default("en"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(12)
    .optional()
    .default([]),
  currentContext: z
    .object({
      pathname: z.string().max(200).optional(),
      schemeCode: z.string().max(80).optional(),
      batchId: z.string().max(80).optional(),
    })
    .optional()
    .default({}),
});

// GET /api/assistant/models — List locally available Ollama models.
router.get("/models", async (req, res, next) => {
  try {
    const modelCatalog = await getAvailableModels();
    res.json({
      ...modelCatalog,
      starterCategories: {
        en: [
          {
            category: "Government Schemes & Subsidies",
            questions: [
              "Tell me about PKVY (Paramparagat Krishi Vikas Yojana) benefits and eligibility",
              "Which government schemes give subsidy for cold storage, warehouses, or packhouses?",
              "How do I apply for PM-KISAN ₹6,000/year support and what documents are needed?",
              "What schemes are available for organic farmers in Haryana and Punjab?",
            ],
          },
          {
            category: "App Functionality & Blockchain Doubt Solving",
            questions: [
              "How do I register as a Farmer, create a batch, and upload an organic certificate?",
              "How does blockchain verification and SHA-256 tamper detection work in this app?",
              "Tell me the live status and supply chain events of batch ORG-BAS-001",
              "What are the demo login accounts and how do Supply Chain Partners record events?",
            ],
          },
        ],
        hi: [
          {
            category: "सरकारी योजनाएं और सब्सिडी",
            questions: [
              "परम्परागत कृषि विकास योजना (PKVY) के लाभ, पात्रता और दस्तावेज़ क्या हैं?",
              "कोल्ड स्टोरेज और गोदाम बनाने के लिए कौन सी सरकारी योजनाएं सब्सिडी देती हैं?",
              "पीएम-किसान (PM-KISAN) ₹6,000 सहायता के लिए आवेदन कैसे करें?",
              "हरियाणा और पंजाब के जैविक किसानों के लिए कौन सी योजनाएं हैं?",
            ],
          },
          {
            category: "ऐप की कार्यप्रणाली और ब्लॉकचेन सहायता",
            questions: [
              "किसान के रूप में नया बैच कैसे बनाएं और जैविक प्रमाण पत्र कैसे अपलोड करें?",
              "इस ऐप में ब्लॉकचेन सत्यापन और SHA-256 हैशिंग कैसे काम करती है?",
              "बैच ORG-BAS-001 का वर्तमान ब्लॉकचेन और सप्लाई चेन विवरण बताएं",
              "डेमो लॉगिन खाते क्या हैं और पार्टनर इवेंट्स कैसे दर्ज करते हैं?",
            ],
          },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/assistant/ask — Ask any question and get full JSON response
router.post("/ask", assistantLimiter, async (req, res, next) => {
  try {
    const parsed = askSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid request payload",
      });
    }

    const result = await answerAssistantQuery(parsed.data);
    res.json(result);
  } catch (err) {
    console.error("[assistant] Ollama request failed:", err?.message || err);
    res.status(err?.name === "AbortError" ? 504 : 503).json({
      error: err?.name === "AbortError"
        ? "Ollama took too long to respond. Check that the model is loaded and try again."
        : "Could not reach Ollama. Start Ollama, check OLLAMA_BASE_URL, and make sure the selected model is pulled.",
    });
  }
});

// POST /api/assistant/stream — Stream LLM tokens in real-time via Server-Sent Events (SSE)
router.post("/stream", assistantLimiter, async (req, res) => {
  const parsed = askSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || "Invalid request payload",
    });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const sendSse = (event, payload) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    }
  };

  try {
    await streamAssistantQuery({
      ...parsed.data,
      onMeta: (meta) => sendSse("meta", meta),
      onToken: (token) => sendSse("token", { token }),
      onDone: (doneInfo) => sendSse("done", doneInfo),
    });
  } catch (err) {
    sendSse("error", { error: err.message || "Streaming error" });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

module.exports = router;
