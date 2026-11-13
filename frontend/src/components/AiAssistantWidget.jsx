import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../LanguageContext.jsx";
import AssistantMessageContent from "./AssistantMessageContent.jsx";
import { askAssistantStream } from "../utils/assistantStream.js";

export default function AiAssistantWidget() {
  const { lang } = useLanguage();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("organic_trace_llm_model") || "ollama:llama3.2:latest";
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const chatContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const latestAiMsgIdRef = useRef(null);

  // Extract page-specific context (e.g., if user is viewing /schemes/PKVY or /trace/ORG-BAS-001)
  const schemeMatch = location.pathname.match(/^\/schemes\/([^/]+)/);
  const batchMatch = location.pathname.match(/^\/(?:trace|batches)\/([^/]+)/);
  const activeSchemeCode = schemeMatch ? decodeURIComponent(schemeMatch[1]) : "";
  const activeBatchId = batchMatch ? decodeURIComponent(batchMatch[1]) : "";

  useEffect(() => {
    if (!isOpen || models.length > 0) return;
    api
      .get("/api/assistant/models")
      .then((res) => {
        const available = res.data.models || [];
        setModels(available);
        const saved = localStorage.getItem("organic_trace_llm_model");
        const preferred = available.some((m) => m.id === saved) ? saved : res.data.defaultModel;
        if (preferred) setSelectedModel(preferred);
      })
      .catch(() => {
        setModels([
          { id: "ollama:llama3.2:latest", name: "Ollama Local (llama3.2)", badge: "Local · Check connection" },
        ]);
      });
  }, [isOpen, models.length]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "widget-welcome",
          role: "assistant",
          content:
            lang === "hi"
              ? "नमस्ते! मैं **ऑर्गेनिक ट्रेस एआई सहायक** हूँ। आप मुझसे किसी भी **सरकारी योजना (PKVY, PM-KISAN, सब्सिडी, पात्रता)** या **इस ऐप के फीचर्स** के बारे में पूछ सकते हैं।"
              : "Hi! I'm your **Organic Trace AI Assistant**. Ask me any question about **Government Schemes (PKVY, PM-KISAN, subsidies, eligibility)** or **how to use any feature in this app**!",
          modelUsed: {
            id: selectedModel,
            name: "OrganicTrace Ollama Assistant",
            ragGrounded: true,
          },
          followUpQuestions:
            lang === "hi"
              ? [
                  activeSchemeCode
                    ? `${activeSchemeCode} योजना की पात्रता और दस्तावेज़ क्या हैं?`
                    : "जैविक खेती (PKVY) और PM-KISAN के लाभ बताएं",
                  activeBatchId
                    ? `बैच ${activeBatchId} का ब्लॉकचेन विवरण क्या है?`
                    : "किसान नया बैच और प्रमाण पत्र ब्लॉकचेन पर कैसे जोड़ें?",
                ]
              : [
                  activeSchemeCode
                    ? `What are the eligibility criteria and documents for ${activeSchemeCode}?`
                    : "Which schemes give subsidy for organic farming and cold storage?",
                  activeBatchId
                    ? `Explain the blockchain status and timeline of batch ${activeBatchId}`
                    : "How do I create a batch and verify QR codes on the blockchain?",
                ],
        },
      ]);
    }
  }, [isOpen, lang, activeSchemeCode, activeBatchId]);

  const syncWidgetScrollState = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distFromBottom > 40);
  };

  const scrollWidgetToBottom = (smooth = false) => {
    const el = chatContainerRef.current;
    if (!el) return;
    userScrolledUpRef.current = false;
    setIsScrolledUp(false);
    isProgrammaticScrollRef.current = true;
    if (smooth && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    lastScrollTopRef.current = el.scrollTop;
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      syncWidgetScrollState();
    }, 80);
  };

  const scrollToWidgetMessageStart = (msgId, smooth = false) => {
    const el = chatContainerRef.current;
    if (!el || !msgId) return;
    const target = el.querySelector(`[data-msg-id="${msgId}"]`);
    if (!target) return;
    isProgrammaticScrollRef.current = true;
    const nextTop = Math.max(0, target.offsetTop - 12);
    if (smooth && typeof el.scrollTo === "function") {
      el.scrollTo({ top: nextTop, behavior: "smooth" });
    } else {
      el.scrollTop = nextTop;
    }
    lastScrollTopRef.current = el.scrollTop;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUpNow = distFromBottom > 40;
    userScrolledUpRef.current = scrolledUpNow;
    setIsScrolledUp(scrolledUpNow);
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      syncWidgetScrollState();
    }, 80);
  };

  const handleWidgetWheel = (e) => {
    if (e.deltaY < 0) {
      userScrolledUpRef.current = true;
      setIsScrolledUp(true);
    }
  };

  const handleWidgetScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const currentTop = el.scrollTop;
    const distFromBottom = el.scrollHeight - currentTop - el.clientHeight;

    if (!isProgrammaticScrollRef.current) {
      if (currentTop < lastScrollTopRef.current - 3 && distFromBottom > 18) {
        userScrolledUpRef.current = true;
        setIsScrolledUp(true);
      } else if (distFromBottom <= 30) {
        userScrolledUpRef.current = false;
        setIsScrolledUp(false);
      } else if (distFromBottom > 45) {
        setIsScrolledUp(true);
      }
    }
    lastScrollTopRef.current = currentTop;
  };

  // Hide floating widget on the dedicated /assistant page
  if (location.pathname === "/assistant") {
    return null;
  }

  const handleAsk = async (questionText) => {
    const trimmed = String(questionText ?? input).trim();
    if (!trimmed || loading) return;

    setInput("");
    const userMsg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const aiMsgId = `a-${Date.now()}`;
    latestAiMsgIdRef.current = aiMsgId;
    userScrolledUpRef.current = false;
    setIsScrolledUp(false);

    const placeholderAiMsg = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
      modelUsed: {
        id: selectedModel,
        name: "Ollama Local LLM (llama3.2:latest)",
        ragGrounded: true,
      },
      relatedSchemes: [],
      relatedBatch: null,
      suggestedActions: [],
      followUpQuestions: [],
    };

    const historyPayload = messages
      .filter((m) => m.id !== "widget-welcome" && m.content)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, placeholderAiMsg]);
    setLoading(true);

    requestAnimationFrame(() => {
      scrollWidgetToBottom(false);
    });

    try {
      await askAssistantStream({
        question: trimmed,
        model: selectedModel,
        lang,
        history: historyPayload,
        currentContext: {
          pathname: location.pathname,
          schemeCode: activeSchemeCode,
          batchId: activeBatchId,
        },
        onMeta: (meta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    modelUsed: meta.modelUsed || m.modelUsed,
                    relatedSchemes: meta.relatedSchemes || [],
                    relatedBatch: meta.relatedBatch || null,
                    suggestedActions: meta.suggestedActions || [],
                    followUpQuestions: meta.followUpQuestions || [],
                  }
                : m
            )
          );
        },
        onToken: (tokenChunk) => {
          const isSingleLargeChunk = String(tokenChunk || "").length > 160;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content: (m.content || "") + tokenChunk,
                  }
                : m
            )
          );

          requestAnimationFrame(() => {
            if (userScrolledUpRef.current) {
              syncWidgetScrollState();
              return;
            }
            if (isSingleLargeChunk) {
              scrollToWidgetMessageStart(aiMsgId, false);
            } else {
              scrollWidgetToBottom(false);
            }
          });
        },
        onDone: (doneInfo) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    content: doneInfo.answer || m.content,
                    modelUsed: doneInfo.modelUsed || m.modelUsed,
                  }
                : m
            )
          );
          requestAnimationFrame(() => {
            syncWidgetScrollState();
          });
        },
      });
    } catch (_err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                isStreaming: false,
                content:
                  lang === "hi"
                    ? "क्षमा करें, अभी उत्तर प्राप्त करने में समस्या हुई। कृपया दोबारा प्रयास करें।"
                    : `Ollama assistant error: ${_err.message || "Could not reach Ollama."}`,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        syncWidgetScrollState();
      });
    }
  };

  return (
    <>
      {/* Floating launcher button above Voice Assistant */}
      <div className="fixed bottom-20 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={
            lang === "hi"
              ? "एआई सहायक से सरकारी योजनाओं और ऐप के बारे में पूछें"
              : "Ask AI Assistant about Government Schemes & App Functionality"
          }
          className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-semibold text-sm bg-stone-900 text-white hover:bg-leaf-800 border border-leaf-400/40 transition focus:outline-none focus:ring-4 focus:ring-leaf-300"
        >
          <span className="text-base" aria-hidden="true">
            🤖
          </span>
          <span>{lang === "hi" ? "एआई सहायता (Ask AI)" : "Ask AI Assistant"}</span>
        </button>
      </div>

      {/* Slide-up Chat Drawer */}
      {isOpen && (
        <div
          className="fixed bottom-36 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[430px] max-h-[75vh] bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Organic Trace AI Assistant"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-leaf-900 to-emerald-900 text-white px-4 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span>🤖</span>
                <h3 className="text-sm font-bold truncate">
                  {lang === "hi" ? "ऑर्गेनिक ट्रेस एआई सहायक" : "Organic Trace AI Assistant"}
                </h3>
              </div>
              <p className="text-[11px] text-leaf-100 truncate">
                {activeSchemeCode
                  ? lang === "hi"
                    ? `योजना संदर्भ: ${activeSchemeCode}`
                    : `Context: Scheme ${activeSchemeCode}`
                  : activeBatchId
                  ? lang === "hi"
                    ? `बैच संदर्भ: ${activeBatchId}`
                    : `Context: Batch ${activeBatchId}`
                  : lang === "hi"
                  ? "सरकारी योजनाएं और ऐप सहायता"
                  : "Government Schemes & App Doubt Solver"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/assistant"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-[11px] font-semibold"
                title={lang === "hi" ? "पूरे पेज पर खोलें" : "Open Full Page View"}
              >
                {lang === "hi" ? "बड़ा करें ↗" : "Full Page ↗"}
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
                aria-label="Close AI Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Model Picker Bar */}
          <div className="px-3 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-stone-600 shrink-0">
              {lang === "hi" ? "🧠 मॉडल:" : "🧠 LLM:"}
            </span>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                localStorage.setItem("organic_trace_llm_model", e.target.value);
              }}
              className="flex-1 rounded bg-white border border-stone-300 px-2 py-1 text-xs text-stone-800 font-medium focus:outline-none"
            >
              {(models.length > 0
                ? models
                : [
                    { id: "ollama:llama3.2:latest", name: "Ollama Local (llama3.2)", badge: "Local" },
                  ]
              ).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Body */}
          <div
            ref={chatContainerRef}
            onScroll={handleWidgetScroll}
            onWheel={handleWidgetWheel}
            style={{ scrollBehavior: "auto" }}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-stone-50/50 select-text"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-leaf-600 text-white px-3.5 py-2 text-xs leading-relaxed select-text cursor-text">
                    {msg.content}
                  </div>
                ) : (
                  <div className="w-full rounded-2xl rounded-tl-xs bg-white border border-stone-200 p-3 shadow-2xs">
                    <AssistantMessageContent
                      message={msg}
                      lang={lang}
                      compact={true}
                      onAskFollowUp={(fq) => handleAsk(fq)}
                      onNavigate={() => setIsOpen(false)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Floating Scroll Helper Bar when scrolled up */}
          {isScrolledUp && (
            <div className="px-3 py-1.5 bg-stone-900/90 text-white text-[11px] flex items-center justify-between gap-2 border-t border-stone-700">
              <span className="truncate text-stone-200">
                {loading
                  ? lang === "hi"
                    ? "ऑटो-स्क्रॉल रुका है"
                    : "Reading above (auto-scroll paused)"
                  : lang === "hi"
                  ? "ऊपर का भाग देख रहे हैं"
                  : "Viewing earlier lines"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {latestAiMsgIdRef.current && (
                  <button
                    type="button"
                    onClick={() => scrollToWidgetMessageStart(latestAiMsgIdRef.current, true)}
                    className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold cursor-pointer"
                  >
                    ↑ {lang === "hi" ? "शुरुआत" : "Start"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => scrollWidgetToBottom(true)}
                  className="px-2.5 py-0.5 rounded-full bg-leaf-500 hover:bg-leaf-400 text-stone-950 font-bold cursor-pointer"
                >
                  ↓ {loading ? (lang === "hi" ? "लाइव" : "Follow AI") : lang === "hi" ? "नीचे" : "Bottom"}
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
            className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "योजना या ऐप से जुड़ा प्रश्न लिखें..."
                  : "Ask about schemes, subsidies, or app features..."
              }
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-leaf-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 py-2 rounded-xl bg-leaf-600 text-white font-semibold text-xs hover:bg-leaf-700 disabled:opacity-50 transition cursor-pointer"
            >
              {lang === "hi" ? "पूछें" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
