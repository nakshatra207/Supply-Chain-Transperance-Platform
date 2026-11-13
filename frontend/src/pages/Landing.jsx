import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../LanguageContext.jsx";
import { useVoice } from "../VoiceContext.jsx";
import { INDIAN_GOV_SCHEMES } from "../constants/schemes";

const SAMPLE_BATCHES = [
  { id: "ORG-BAS-001", label: "ORG-BAS-001 · Basmati Rice" },
  { id: "ORG-BAS-002", label: "ORG-BAS-002 · Alphonso Mangoes" },
  { id: "Suman", label: "Suman · Wheat Batch" },
];

export default function Landing() {
  const [batchId, setBatchId] = useState("");
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { openVoiceModal } = useVoice();

  const goToTrace = (e) => {
    e.preventDefault();
    if (batchId.trim()) navigate(`/trace/${batchId.trim()}`);
  };

  return (
    <div className="animate-fade-in">
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20 text-center">
        <span className="inline-block px-3.5 py-1 rounded-full bg-leaf-100 dark:bg-leaf-900/50 text-leaf-700 dark:text-leaf-300 text-xs font-semibold mb-4 border border-leaf-200 dark:border-leaf-800">
          {t("landing.badge")}
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          {t("landing.heroTitle")} <span className="text-leaf-600 dark:text-leaf-400">{t("landing.heroHighlight")}</span>
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-300 max-w-2xl mx-auto text-base">
          {t("landing.heroDesc")}
        </p>

        <form onSubmit={goToTrace} className="mt-8 max-w-xl mx-auto flex flex-wrap sm:flex-nowrap gap-2">
          <input
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder={t("landing.inputPlaceholder")}
            aria-label={t("landing.inputPlaceholder")}
            className="flex-1 border border-stone-300 dark:border-stone-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400 bg-white dark:bg-stone-900 shadow-2xs"
          />
          <button className="px-5 py-2.5 rounded-lg bg-leaf-600 text-white text-sm font-semibold hover:bg-leaf-700 transition shadow-2xs">
            {t("landing.traceBtn")}
          </button>
          <button
            type="button"
            onClick={() => openVoiceModal({ autoStart: false })}
            className="px-4 py-2.5 rounded-lg border border-leaf-300 dark:border-leaf-700 bg-leaf-50 dark:bg-leaf-900/40 text-leaf-800 dark:text-leaf-300 text-sm font-medium hover:bg-leaf-100 transition flex items-center gap-1.5"
            title={lang === "hi" ? "बोलकर ट्रैक करें या योजना खोजें" : "Voice Search & Trace"}
          >
            <span>🎙️</span>
            <span>{lang === "hi" ? "बोलकर खोजें" : "Speak"}</span>
          </button>
        </form>

        {/* 1-Click Quick Demo Trace Chips */}
        <div className="mt-4 flex items-center justify-center flex-wrap gap-2 text-xs">
          <span className="text-stone-500 dark:text-stone-400 font-medium">
            {lang === "hi" ? "तुरंत डेमो बैच जांचें:" : "Try 1-click verified batches:"}
          </span>
          {SAMPLE_BATCHES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => navigate(`/trace/${sample.id}`)}
              className="px-3 py-1 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-leaf-500 hover:text-leaf-700 font-mono transition shadow-2xs"
            >
              🔍 {sample.label}
            </button>
          ))}
        </div>

        {/* Platform Capabilities & Performance Highlights */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 shadow-2xs">
            <p className="text-xs font-semibold text-leaf-700 dark:text-leaf-400">⛓ SHA-256 + Merkle Root</p>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Dual EVM & Cryptographic Hash-Chain Ledger with constant-time tamper detection.
            </p>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 shadow-2xs">
            <p className="text-xs font-semibold text-leaf-700 dark:text-leaf-400">🇮🇳 27 Indian Languages</p>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              All 22 Eighth Schedule + 4 regional languages with Voice STT & TTS narration.
            </p>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 shadow-2xs">
            <p className="text-xs font-semibold text-leaf-700 dark:text-leaf-400">⚡ C11 · C++20 · x86-64 SIMD</p>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Hardware SHA-NI (~1.6 GB/s), SSSE3 hex, SIMD pmaddwd scoring & off-heap LRU cache.
            </p>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 shadow-2xs">
            <p className="text-xs font-semibold text-leaf-700 dark:text-leaf-400">🏛️ Official Gov Schemes</p>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Verified Central & State subsidies with personalized SIMD eligibility matching.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-stone-900 border-y border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 py-14 grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: "🌱",
              title: t("landing.step1Title"),
              desc: t("landing.step1Desc"),
            },
            {
              icon: "🚚",
              title: t("landing.step2Title"),
              desc: t("landing.step2Desc"),
            },
            {
              icon: "🛡️",
              title: t("landing.step3Title"),
              desc: t("landing.step3Desc"),
            },
          ].map((s) => (
            <div
              key={s.title}
              className="p-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 hover:border-leaf-400 transition"
            >
              <span className="text-2xl" aria-hidden="true">
                {s.icon}
              </span>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 mt-2">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {lang === "hi"
                ? "नवीनतम भारतीय सरकारी कृषि एवं जैविक योजनाएं"
                : "Latest Indian Government Schemes & Subsidies"}
            </h2>
            <p className="mt-2 text-stone-600 dark:text-stone-400 max-w-2xl text-sm">
              {lang === "hi"
                ? "जैविक खेती, प्रमाणन, सिंचाई, भंडारण और एफपीओ के लिए केंद्र व राज्य सरकार की सत्यापित योजनाओं का अन्वेषण करें।"
                : "Explore verified Central and State initiatives supporting organic farming, certification, storage, and FPOs across India."}
            </p>
          </div>
          <Link
            to="/schemes"
            className="px-4 py-2 rounded-lg bg-leaf-600 text-white text-sm font-semibold hover:bg-leaf-700 transition shrink-0 self-start sm:self-auto"
          >
            {lang === "hi"
              ? "सभी सरकारी योजनाएं और पात्रता देखें →"
              : "Open Full Schemes Dashboard →"}
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INDIAN_GOV_SCHEMES.map((scheme) => (
            <Link
              key={scheme.id}
              to={`/schemes/${scheme.schemeCode || scheme.id.toUpperCase()}`}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-leaf-400 transition border-t-4 border-t-leaf-500 block"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-leaf-50 dark:bg-leaf-900/40 text-leaf-800 dark:text-leaf-300 font-mono text-xs font-semibold border border-leaf-200 dark:border-leaf-800">
                  {scheme.schemeCode || scheme.id.toUpperCase()}
                </span>
                <span className="text-xs text-leaf-700 dark:text-leaf-400 font-medium">
                  {lang === "hi" ? "विवरण देखें →" : "Details →"}
                </span>
              </div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">{scheme.name}</h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                {scheme.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 text-center">
          {t("landing.whyTitle")}
        </h2>
        <p className="mt-3 text-center text-stone-600 dark:text-stone-400 max-w-2xl mx-auto text-sm">
          {t("landing.whyDesc")}
        </p>
        <div className="mt-6 text-xs text-stone-600 dark:text-amber-200 max-w-2xl mx-auto bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <strong>{t("landing.importantTitle")}</strong> {t("landing.importantDesc")}
        </div>
      </section>
    </div>
  );
}
