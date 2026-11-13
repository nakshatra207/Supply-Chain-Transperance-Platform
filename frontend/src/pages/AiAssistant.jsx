import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../LanguageContext.jsx";
import AssistantMessageContent from "../components/AssistantMessageContent.jsx";
import { askAssistantStream } from "../utils/assistantStream.js";

export default function AiAssistant() {
  const { lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("organic_trace_llm_model") || "ollama:llama3.2:latest";
  });
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [starterCategories, setStarterCategories] = useState({ en: [], hi: [] });
  const [showModelSettings, setShowModelSettings] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMicListening, setIsMicListening] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [canScrollTop, setCanScrollTop] = useState(false);

  const chatContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const latestAiMsgIdRef = useRef(null);
  const recognitionRef = useRef(null);
  const initialQueryHandledRef = useRef(false);

  // Load available LLM models and starter questions from backend
  useEffect(() => {
    let active = true;
    api
      .get("/api/assistant/models")
      .then((res) => {
        if (!active) return;
        setModels(res.data.models || []);
        setOllamaOnline(Boolean(res.data.ollamaOnline));
        const savedModel = localStorage.getItem("organic_trace_llm_model");
        const nextModel = (res.data.models || []).some((m) => m.id === savedModel)
          ? savedModel
          : res.data.defaultModel;
        if (nextModel) setSelectedModel(nextModel);
        if (res.data.starterCategories) {
          setStarterCategories(res.data.starterCategories);
        }
      })
      .catch(() => {
        // Fallback model list if backend is still starting
        if (!active) return;
        setModels([
          {
            id: "ollama:llama3.2:latest",
            name: "Ollama Local — llama3.2:latest",
            provider: "Ollama (Local)",
            badge: "Local LLM",
            status: "online",
          },
        ]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("organic_trace_llm_model", selectedModel);
  }, [selectedModel]);

  // Set welcome message when language changes and no user query has been sent yet
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            lang === "hi"
              ? "### नमस्ते! मैं **ऑर्गेनिक ट्रेस एआई सहायक (Organic Trace AI Assistant)** हूँ।\nआप मुझसे **केंद्रीय और राज्य सरकार की कृषि योजनाओं (PKVY, PM-KISAN, AIF, PMKSY, FPO, कोल्ड स्टोरेज सब्सिडी, पात्रता, आवश्यक दस्तावेज़)** या **इस ऐप की कार्यप्रणाली (किसान बैच निर्माण, ब्लॉकचेन SHA-256 सत्यापन, QR कोड ट्रैसेबिलिटी, पार्टनर इवेंट्स)** से जुड़ा कोई भी प्रश्न पूछ सकते हैं!"
          : "### Hello! I am the **Organic Trace Ollama Assistant**.\nAsk me about **Indian Government Agricultural Schemes** (PKVY, PM-KISAN, AIF, PMKSY, FPOs, subsidies, eligibility, required documents, official `.gov.in` portals) or **any doubt about this app's functionality** (creating batches, uploading organic certificates, blockchain SHA-256 verification, QR code tracing, or recording supply-chain partner events)!",
          modelUsed: {
            id: selectedModel,
            name:
              lang === "hi"
                ? "ऑर्गेनिक ट्रेस मल्टी-मॉडल एआई"
                : "Organic Trace Ollama Assistant",
            ragGrounded: true,
          },
          relatedSchemes: [],
          suggestedActions: [
            {
              label: lang === "hi" ? "सरकारी योजनाएं देखें" : "Browse 17+ Government Schemes",
              route: "/schemes",
            },
            {
              label: lang === "hi" ? "डेमो बैच ORG-BAS-001 ट्रैक करें" : "Trace Demo Batch ORG-BAS-001",
              route: "/trace/ORG-BAS-001",
            },
          ],
          followUpQuestions:
            lang === "hi"
              ? [
                  "परम्परागत कृषि विकास योजना (PKVY) के तहत कितनी सब्सिडी मिलती है?",
                  "इस ऐप में किसान अपना नया बैच और जैविक प्रमाण पत्र कैसे दर्ज करें?",
                  "कोल्ड स्टोरेज और वेयरहाउस के लिए कौन सी सरकारी योजनाएं हैं?",
                ]
              : [
                  "What is PKVY (Paramparagat Krishi Vikas Yojana) and how much subsidy do farmers get?",
                  "How do I register a crop batch and upload an organic certificate on the blockchain?",
                  "Which government schemes provide subsidies for cold storage and farm equipment?",
                ],
        },
      ]);
    }
  }, [lang]);

  // Auto-run query if navigated with ?q=...
  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam && !initialQueryHandledRef.current) {
      initialQueryHandledRef.current = true;
      handleSendQuestion(qParam);
      // Clear ?q from URL so refreshing doesn't re-submit
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("q");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);

  const syncScrollIndicators = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setCanScrollTop(el.scrollTop > 100);
    setIsScrolledUp(distFromBottom > 45);
  };

  const scrollChatToBottom = (smooth = false) => {
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
    setCanScrollTop(el.scrollTop > 100);
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      syncScrollIndicators();
    }, 80);
  };

  const scrollChatToTop = (smooth = true) => {
    const el = chatContainerRef.current;
    if (!el) return;
    userScrolledUpRef.current = true;
    isProgrammaticScrollRef.current = true;
    if (smooth && typeof el.scrollTo === "function") {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      el.scrollTop = 0;
    }
    lastScrollTopRef.current = 0;
    setCanScrollTop(false);
    setIsScrolledUp(el.scrollHeight - el.clientHeight > 45);
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      syncScrollIndicators();
    }, 80);
  };

  const scrollToMessageStart = (msgId, smooth = false) => {
    const el = chatContainerRef.current;
    if (!el || !msgId) return;
    const target = el.querySelector(`[data-msg-id="${msgId}"]`);
    if (!target) return;
    isProgrammaticScrollRef.current = true;
    const nextTop = Math.max(0, target.offsetTop - 16);
    if (smooth && typeof el.scrollTo === "function") {
      el.scrollTo({ top: nextTop, behavior: "smooth" });
    } else {
      el.scrollTop = nextTop;
    }
    lastScrollTopRef.current = el.scrollTop;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUpNow = distFromBottom > 45;
    userScrolledUpRef.current = scrolledUpNow;
    setIsScrolledUp(scrolledUpNow);
    setCanScrollTop(el.scrollTop > 100);
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      syncScrollIndicators();
    }, 80);
  };

  const handleChatWheel = (e) => {
    if (e.deltaY < 0) {
      // User rolled mouse wheel / trackpad upward to read above — pause auto-scroll immediately
      userScrolledUpRef.current = true;
      setIsScrolledUp(true);
    }
  };

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const currentTop = el.scrollTop;
    const distFromBottom = el.scrollHeight - currentTop - el.clientHeight;
    setCanScrollTop(currentTop > 100);

    if (!isProgrammaticScrollRef.current) {
      if (currentTop < lastScrollTopRef.current - 3 && distFromBottom > 20) {
        userScrolledUpRef.current = true;
        setIsScrolledUp(true);
      } else if (distFromBottom <= 35) {
        userScrolledUpRef.current = false;
        setIsScrolledUp(false);
      } else if (distFromBottom > 55) {
        setIsScrolledUp(true);
      }
    }
    lastScrollTopRef.current = currentTop;
  };

  const handleSendQuestion = async (questionText) => {
    const trimmed = String(questionText ?? input).trim();
    if (!trimmed || loading) return;

    setError("");
    setInput("");

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const aiMsgId = `ai-${Date.now()}`;
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
        name: `Ollama (${selectedModel.replace(/^ollama:/, "")})`,
        ragGrounded: true,
      },
      relatedSchemes: [],
      relatedBatch: null,
      suggestedActions: [],
      followUpQuestions: [],
    };

    const historyPayload = messages
      .filter((m) => m.id !== "welcome" && m.content)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    setMessages((prev) => [...prev, userMsg, placeholderAiMsg]);
    setLoading(true);

    requestAnimationFrame(() => {
      scrollChatToBottom(false);
    });

    try {
      const schemeParam = searchParams.get("scheme") || "";
      const batchParam = searchParams.get("batch") || "";

      await askAssistantStream({
        question: trimmed,
        model: selectedModel,
        lang,
        history: historyPayload,
        currentContext: {
          pathname: location.pathname,
          schemeCode: schemeParam,
          batchId: batchParam,
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
          const isSingleLargeChunk = String(tokenChunk || "").length > 180;
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
              syncScrollIndicators();
              return;
            }
            if (isSingleLargeChunk) {
              scrollToMessageStart(aiMsgId, false);
            } else {
              scrollChatToBottom(false);
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
            syncScrollIndicators();
          });
        },
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
      setError(
        err.response?.data?.error ||
          err.message ||
          (lang === "hi"
            ? "उत्तर प्राप्त करने में समस्या आई। कृपया पुनः प्रयास करें।"
            : "Could not reach the AI Assistant service. Please try again.")
      );
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        syncScrollIndicators();
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendQuestion(input);
  };

  // Built-in Microphone Speech-to-Text for asking questions by voice
  const handleToggleVoiceDictation = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setError(
        lang === "hi"
          ? "आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है। कृपया टाइप करके प्रश्न पूछें।"
          : "Speech recognition is not supported in this browser. Please type your question."
      );
      return;
    }

    if (isMicListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsMicListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsMicListening(true);
      recognition.onend = () => setIsMicListening(false);
      recognition.onerror = () => setIsMicListening(false);
      recognition.onresult = (event) => {
        const spoken = event.results?.[0]?.[0]?.transcript || "";
        if (spoken.trim()) {
          setInput(spoken.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (_err) {
      setIsMicListening(false);
    }
  };

  const activeModelObj = models.find((m) => m.id === selectedModel) || models[0];
  const activeStarters = starterCategories[lang] || starterCategories.en || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Hero & Model Selector Banner */}
      <div className="bg-gradient-to-r from-leaf-900 via-leaf-800 to-emerald-900 text-white rounded-2xl p-6 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold mb-2">
              <span>🤖</span>
              <span>
                {lang === "hi"
                  ? "मल्टी-मॉडल एआई सहायक · सरकारी योजनाएं और ऐप समाधान"
                  : "Ollama Assistant · Government Schemes & App Doubt Solver"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {lang === "hi"
                ? "सरकारी योजनाएं और ऑर्गेनिक ट्रेस एआई सहायक"
                : "Government Schemes & Platform AI Assistant"}
            </h1>
            <p className="text-leaf-100 text-sm mt-1 max-w-2xl">
              {lang === "hi"
                ? "किसी भी सरकारी कृषि योजना (सब्सिडी, पात्रता, दस्तावेज़, आवेदन प्रक्रिया) या इस ऐप के सभी फीचर्स (बैच पंजीकरण, ब्लॉकचेन हैश, QR कोड) के बारे में हिंदी या अंग्रेजी में पूछें।"
                : "Ask questions about Central & State Government agricultural schemes (subsidies, eligibility, documents, official portals) or clarify any doubt about how this blockchain traceability platform works."}
            </p>
          </div>

          {/* LLM Model Selector Control */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3.5 min-w-[290px]">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="llm-model-select"
                className="text-xs font-semibold uppercase tracking-wider text-leaf-100"
              >
                {lang === "hi" ? "🧠 एआई मॉडल चुनें (LLM Model)" : "🧠 Active LLM Model"}
              </label>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  ollamaOnline
                    ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40"
                    : "bg-amber-400/20 text-amber-200 border border-amber-400/40"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {ollamaOnline
                  ? lang === "hi"
                    ? "लोकल Ollama सक्रिय"
                    : "Local Ollama Online"
                  : lang === "hi"
                  ? "स्मार्ट RAG सक्रिय"
                  : "Ollama unavailable · start the local service"}
              </span>
            </div>

            <select
              id="llm-model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg bg-stone-900/90 text-white border border-white/25 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-leaf-400"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {lang === "hi" && m.nameHi ? m.nameHi : m.name} [{m.badge}]
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between mt-2 text-[11px] text-leaf-100">
              <span>
                {activeModelObj?.provider || "Ollama (Local)"}
              </span>
              <button
                type="button"
                onClick={() => setShowModelSettings((prev) => !prev)}
                className="underline hover:text-white font-medium"
              >
                {showModelSettings
                  ? lang === "hi"
                    ? "सेटिंग्स छुपाएं"
                    : "Hide Model Info"
                  : lang === "hi"
                  ? "मॉडल और API Key सेटिंग्स"
                  : "Model & API Key Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Ollama model information */}
        {showModelSettings && (
          <div className="mt-4 pt-4 border-t border-white/15 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {models.map((m) => {
                const isSelected = m.id === selectedModel;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? "bg-white text-stone-900 border-white shadow-sm"
                        : "bg-white/5 text-white border-white/15 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">
                        {lang === "hi" && m.nameHi ? m.nameHi : m.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          isSelected
                            ? "bg-leaf-100 text-leaf-800"
                            : "bg-white/15 text-leaf-100"
                        }`}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] mt-1 line-clamp-2 ${
                        isSelected ? "text-stone-600" : "text-leaf-100/80"
                      }`}
                    >
                      {lang === "hi" && m.descriptionHi ? m.descriptionHi : m.description}
                    </p>
                  </button>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* Main 2-Column Layout: Left Starter Prompts Sidebar + Right Interactive Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Quick-Ask Categories & Topic Shortcuts */}
        <aside className="lg:col-span-4 space-y-4">
          {activeStarters.map((group, gIdx) => (
            <div
              key={gIdx}
              className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs"
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-leaf-800 mb-2.5 flex items-center gap-1.5">
                <span>{gIdx === 0 ? "🏛️" : "⚙️"}</span>
                <span>{group.category}</span>
              </h2>
              <div className="space-y-2">
                {group.questions.map((qText, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSendQuestion(qText)}
                    className="w-full text-left text-xs p-2.5 rounded-xl bg-stone-50 hover:bg-leaf-50 text-stone-700 hover:text-leaf-900 border border-stone-200/80 hover:border-leaf-300 transition leading-snug"
                  >
                    {qText}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quick Scheme Pills */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2.5">
              {lang === "hi"
                ? "⚡ प्रमुख योजनाओं के बारे में तुरंत पूछें"
                : "⚡ Instant Scheme Deep-Dives"}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {[
                { code: "PKVY", label: "PKVY Organic" },
                { code: "PM-KISAN", label: "PM-KISAN ₹6000" },
                { code: "AIF", label: "AIF Infra Loan" },
                { code: "PMKSY", label: "PMKSY Irrigation" },
                { code: "PMFBY", label: "PMFBY Crop Bima" },
                { code: "ENAM", label: "e-NAM Mandi" },
                { code: "FPO-10K", label: "10,000 FPO" },
                { code: "NPOP-APEDA", label: "NPOP Export" },
                { code: "AMI-NABARD", label: "AMI Storage" },
                { code: "SMAM", label: "SMAM Machinery" },
                { code: "HARYANA-ORGANIC-PROTSAHAN", label: "Haryana Organic" },
                { code: "MIDH-COLDCHAIN", label: "MIDH Cold Chain" },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleSendQuestion(
                      lang === "hi"
                        ? `${item.code} योजना के लाभ, पात्रता, आवश्यक दस्तावेज़ और आवेदन प्रक्रिया बताएं`
                        : `Explain ${item.code} scheme benefits, eligibility criteria, required documents, and how to apply`
                    )
                  }
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-leaf-50 text-leaf-800 border border-leaf-200 hover:bg-leaf-600 hover:text-white transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Chat Conversation Thread & Input Bar */}
        <section className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl shadow-2xs flex flex-col min-h-[600px] max-h-[780px] relative">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2 bg-stone-50/70 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-leaf-500 animate-pulse" />
              <span className="text-xs font-bold text-stone-800">
                {lang === "hi"
                  ? "लाइव एआई चैट (सरकारी योजनाएं + ऐप सहायता)"
                  : "Live AI Conversation (Government Schemes + App Functionality)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {canScrollTop && (
                <button
                  type="button"
                  onClick={() => scrollChatToTop(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-600 hover:border-leaf-400 hover:text-leaf-800 transition cursor-pointer"
                  title={lang === "hi" ? "चैट के सबसे ऊपर जाएं" : "Scroll to top of chat"}
                >
                  ↑ {lang === "hi" ? "ऊपर" : "Top"}
                </button>
              )}
              {latestAiMsgIdRef.current && messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => scrollToMessageStart(latestAiMsgIdRef.current, true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-stone-200 text-stone-600 hover:border-leaf-400 hover:text-leaf-800 transition cursor-pointer"
                  title={
                    lang === "hi"
                      ? "एआई के नवीनतम उत्तर की शुरुआत पर जाएं"
                      : "Jump to the beginning of the AI's latest response"
                  }
                >
                  ⇤ {lang === "hi" ? "उत्तर की शुरुआत" : "Start of Answer"}
                </button>
              )}
              {isScrolledUp && (
                <button
                  type="button"
                  onClick={() => scrollChatToBottom(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-leaf-50 border border-leaf-300 text-leaf-800 hover:bg-leaf-100 transition cursor-pointer"
                  title={lang === "hi" ? "चैट के सबसे नीचे जाएं" : "Scroll to bottom of chat"}
                >
                  ↓ {lang === "hi" ? "नीचे" : "Bottom"}
                </button>
              )}
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages((prev) => prev.slice(0, 1));
                    userScrolledUpRef.current = false;
                    setIsScrolledUp(false);
                    setCanScrollTop(false);
                  }}
                  className="text-xs text-stone-500 hover:text-red-600 font-medium cursor-pointer ml-1"
                >
                  {lang === "hi" ? "चैट साफ़ करें" : "Clear Chat"}
                </button>
              )}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            onWheel={handleChatWheel}
            style={{ scrollBehavior: "auto" }}
            className="flex-1 overflow-y-auto p-4 space-y-4 relative select-text"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-leaf-600 text-white px-4 py-3 text-sm shadow-2xs select-text cursor-text">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full rounded-2xl rounded-tl-xs bg-white border border-stone-200 p-4 shadow-2xs">
                    <AssistantMessageContent
                      message={msg}
                      lang={lang}
                      onAskFollowUp={(fq) => handleSendQuestion(fq)}
                    />
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Floating Scroll Control Pill when user scrolls up to check earlier lines while AI is writing or in long chats */}
          {isScrolledUp && (
            <div className="px-4 py-2 bg-stone-900/90 text-white text-xs flex items-center justify-between gap-3 border-t border-stone-700">
              <span className="flex items-center gap-2 text-[11px] text-stone-200">
                {loading ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>
                      {lang === "hi"
                        ? "ऑटो-स्क्रॉल रुका है — आप ऊपर आसानी से पढ़ सकते हैं जबकि एआई नीचे लिख रहा है"
                        : "Auto-scroll paused so you can read above while AI writes"}
                    </span>
                  </>
                ) : (
                  <span>
                    {lang === "hi"
                      ? "आप ऊपर का उत्तर पढ़ रहे हैं"
                      : "Viewing upper section of the conversation"}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {latestAiMsgIdRef.current && (
                  <button
                    type="button"
                    onClick={() => scrollToMessageStart(latestAiMsgIdRef.current, true)}
                    className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] transition cursor-pointer"
                  >
                    ↑ {lang === "hi" ? "उत्तर की शुरुआत" : "Start of Answer"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => scrollChatToBottom(true)}
                  className="px-3 py-1 rounded-full bg-leaf-500 hover:bg-leaf-400 text-stone-950 font-bold text-[11px] transition cursor-pointer"
                >
                  ↓{" "}
                  {loading
                    ? lang === "hi"
                      ? "लाइव उत्तर देखें"
                      : "Follow AI Writing"
                    : lang === "hi"
                    ? "नीचे जाएं"
                    : "Scroll to Bottom"}
                </button>
              </div>
            </div>
          )}

          {/* Bottom Question Input Bar */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 sm:p-4 border-t border-stone-200 bg-stone-50/60 rounded-b-2xl"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleVoiceDictation}
                title={
                  lang === "hi"
                    ? "बोलकर प्रश्न पूछें (माइक्रोफ़ोन)"
                    : "Speak your question (Microphone)"
                }
                className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition shrink-0 ${
                  isMicListening
                    ? "bg-red-600 text-white border-red-600 animate-pulse"
                    : "bg-white text-stone-700 border-stone-300 hover:border-leaf-400"
                }`}
              >
                🎙️
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  lang === "hi"
                    ? "किसी भी सरकारी योजना (PKVY, PM-KISAN, सब्सिडी) या ऐप के फीचर के बारे में पूछें..."
                    : "Ask about any Government Scheme (PKVY, PM-KISAN, subsidies) or how this app works..."
                }
                className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-5 py-2.5 rounded-xl bg-leaf-600 text-white font-semibold text-sm hover:bg-leaf-700 disabled:opacity-50 transition shrink-0"
              >
                {lang === "hi" ? "पूछें →" : "Ask AI →"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
