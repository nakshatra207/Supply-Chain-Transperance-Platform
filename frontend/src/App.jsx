import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { LanguageProvider, useLanguage } from "./LanguageContext.jsx";
import { VoiceProvider, useVoice } from "./VoiceContext.jsx";
import LanguageToggle from "./components/LanguageToggle.jsx";
import VoiceAssistantModal from "./components/VoiceAssistantModal.jsx";
import AiAssistantWidget from "./components/AiAssistantWidget.jsx";
import api from "./api.js";

import Landing from "./pages/Landing.jsx";
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const FarmerDashboard = lazy(() => import("./pages/FarmerDashboard.jsx"));
const CreateBatch = lazy(() => import("./pages/CreateBatch.jsx"));
const BatchDetails = lazy(() => import("./pages/BatchDetails.jsx"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard.jsx"));
const Trace = lazy(() => import("./pages/Trace.jsx"));
const GovernmentSchemes = lazy(() => import("./pages/GovernmentSchemes.jsx"));
const SchemeDetails = lazy(() => import("./pages/SchemeDetails.jsx"));
const AiAssistant = lazy(() => import("./pages/AiAssistant.jsx"));

function NavBar({ darkMode, onToggleTheme }) {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();
  const { openVoiceModal, isListening } = useVoice();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSchemesActive = location.pathname.startsWith("/schemes");
  const isAssistantActive = location.pathname.startsWith("/assistant");

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/85 dark:bg-stone-900/90 backdrop-blur sticky top-0 z-20 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-leaf-700 dark:text-leaf-400 text-lg tracking-tight"
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-leaf-500 shadow-xs" />
            {t("nav.title")}
          </Link>
          <Link
            to="/schemes"
            className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              isSchemesActive
                ? "bg-leaf-600 text-white shadow-2xs"
                : "bg-leaf-50 dark:bg-leaf-900/40 text-leaf-800 dark:text-leaf-300 hover:bg-leaf-100 border border-leaf-200 dark:border-leaf-800"
            }`}
          >
            <span aria-hidden="true">🏛️</span>
            <span>{t("nav.schemes", "Government Schemes")}</span>
          </Link>
          <Link
            to="/assistant"
            className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${
              isAssistantActive
                ? "bg-stone-900 dark:bg-leaf-700 text-white shadow-2xs"
                : "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-leaf-50 hover:text-leaf-800 border border-stone-200 dark:border-stone-700"
            }`}
          >
            <span aria-hidden="true">🤖</span>
            <span>{t("nav.assistant", "AI Assistant")}</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => openVoiceModal({ autoStart: false })}
            aria-label={
              lang === "hi"
                ? "बोलकर नेविगेट करें (माइक्रोफ़ोन)"
                : "Voice Recognition & Navigation (Microphone)"
            }
            title={
              lang === "hi"
                ? "बोलकर सरकारी योजनाएं खोजें या उत्पाद ट्रैक करें"
                : "Speak to search schemes or trace organic products"
            }
            className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-1 ${
              isListening
                ? "bg-red-600 text-white border-red-600 animate-pulse"
                : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:border-leaf-400 hover:text-leaf-800"
            }`}
          >
            <span aria-hidden="true">🎙️</span>
            <span className="hidden sm:inline">{t("nav.voice", "Voice")}</span>
          </button>

          <LanguageToggle />

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={
              darkMode
                ? "Switch to Light Mode (Alt+T)"
                : "Switch to Dark Mode (Alt+T)"
            }
            className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:border-leaf-400 transition flex items-center gap-1"
          >
            <span aria-hidden="true">{darkMode ? "☀️" : "🌙"}</span>
            <span className="hidden md:inline">{darkMode ? "Light" : "Dark"}</span>
          </button>

          {/* Desktop Auth Nav */}
          <nav className="hidden sm:flex items-center gap-3 text-sm">
            {!user && (
              <>
                <Link
                  to="/login"
                  className="text-stone-600 dark:text-stone-300 hover:text-leaf-700 font-medium"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-md bg-leaf-600 text-white hover:bg-leaf-700 font-medium transition shadow-2xs"
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
            {user && user.role === "FARMER" && (
              <Link
                to="/farmer"
                className="px-3 py-1.5 rounded-md bg-leaf-50 dark:bg-leaf-900/40 text-leaf-800 dark:text-leaf-300 border border-leaf-200 dark:border-leaf-800 hover:bg-leaf-100 font-medium text-xs transition"
              >
                🌾 {t("nav.farmerDashboard")}
              </Link>
            )}
            {user && (user.role === "PARTNER" || user.role === "ADMIN") && (
              <Link
                to="/partner"
                className="px-3 py-1.5 rounded-md bg-leaf-50 dark:bg-leaf-900/40 text-leaf-800 dark:text-leaf-300 border border-leaf-200 dark:border-leaf-800 hover:bg-leaf-100 font-medium text-xs transition"
              >
                🏭 {t("nav.partnerDashboard")}
              </Link>
            )}
            {user && (
              <button
                onClick={logout}
                className="text-stone-500 dark:text-stone-400 hover:text-red-600 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              >
                {t("nav.logout")} ({user.name})
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle Navigation Menu"
            className="sm:hidden p-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 space-y-2 animate-fade-in">
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/" className="py-1.5 font-medium text-stone-700 dark:text-stone-200">
              🏠 {t("nav.title")}
            </Link>
            <Link to="/schemes" className="py-1.5 font-medium text-stone-700 dark:text-stone-200">
              🏛️ {t("nav.schemes", "Government Schemes")}
            </Link>
            <Link to="/assistant" className="py-1.5 font-medium text-stone-700 dark:text-stone-200">
              🤖 {t("nav.assistant", "AI Assistant")}
            </Link>
            {!user ? (
              <div className="flex gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 rounded-md border border-stone-300 dark:border-stone-700 font-medium"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2 rounded-md bg-leaf-600 text-white font-medium"
                >
                  {t("nav.register")}
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
                {user.role === "FARMER" ? (
                  <Link to="/farmer" className="font-semibold text-leaf-700 dark:text-leaf-400">
                    🌾 {t("nav.farmerDashboard")}
                  </Link>
                ) : (
                  <Link to="/partner" className="font-semibold text-leaf-700 dark:text-leaf-400">
                    🏭 {t("nav.partnerDashboard")}
                  </Link>
                )}
                <button onClick={logout} className="text-red-600 text-xs font-medium">
                  {t("nav.logout")} ({user.name})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

function Footer() {
  const { t } = useLanguage();
  const [telemetry, setTelemetry] = useState(null);
  const [benchOpen, setBenchOpen] = useState(false);
  const [benchRunning, setBenchRunning] = useState(false);

  const fetchBenchmark = async () => {
    setBenchRunning(true);
    try {
      const { data } = await api.get("/api/health/benchmark");
      setTelemetry(data);
    } catch {
      // ignore offline
    } finally {
      setBenchRunning(false);
    }
  };

  useEffect(() => {
    api
      .get("/api/health")
      .then(({ data }) => setTelemetry(data))
      .catch(() => {});
  }, []);

  const native = telemetry?.nativeAccelerator;
  const bench = telemetry?.benchmark;

  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/60 text-xs text-stone-500 dark:text-stone-400 py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-center sm:text-left">{t("footer.disclaimer")}</p>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => {
              setBenchOpen((v) => !v);
              if (!bench) fetchBenchmark();
            }}
            className="px-3 py-1 rounded-full bg-stone-900 text-stone-100 hover:bg-leaf-700 font-mono text-[11px] flex items-center gap-1.5 transition shadow-2xs"
            title="Inspect C11 + C++20 + x86_64 SIMD Assembly Engine Telemetry"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-leaf-400 animate-pulse" />
            <span>
              {native?.loaded
                ? "⚡ C11 + C++20 + x86_64 SIMD ASM Active"
                : "⚡ Native Engine Telemetry"}
            </span>
          </button>
        </div>
      </div>

      {benchOpen && (
        <div className="max-w-4xl mx-auto mt-4 p-4 rounded-lg bg-stone-900 text-stone-100 border border-stone-700 text-left animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-800">
            <div>
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <span>⚡ Low-Level C11 · C++20 · x86-64 SIMD Assembly Accelerator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-leaf-800 text-leaf-200 font-mono">
                  {native?.shaNiHardware ? "SHA-NI + SSSE3 + SSE4.2 + SIMD pmaddwd" : "Active"}
                </span>
              </h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Hardware-accelerated SHA-256, zero-copy Base64 streaming, C11 Merkle Tree root, x86-64 SIMD vector dot-product, and C++20 off-heap LRU cache.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchBenchmark}
                disabled={benchRunning}
                className="px-3 py-1 rounded bg-leaf-600 hover:bg-leaf-700 text-white text-xs font-medium disabled:opacity-50 transition"
              >
                {benchRunning ? "Running SIMD Benchmark..." : "↻ Re-Run Live Benchmark"}
              </button>
              <button
                type="button"
                onClick={() => setBenchOpen(false)}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 mt-3 font-mono text-xs">
            <div className="bg-stone-800/90 p-3 rounded border border-stone-700">
              <p className="text-stone-400 text-[10px]">C11 SHA-NI + SSSE3 Hex</p>
              <p className="text-leaf-400 font-bold text-base mt-0.5">
                {bench ? `${bench.sha256ThroughputMBps.toFixed(0)} MB/s` : "—"}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">Hardware SHA-256 + CRC32C</p>
            </div>
            <div className="bg-stone-800/90 p-3 rounded border border-stone-700">
              <p className="text-stone-400 text-[10px]">x86-64 SIMD pmaddwd</p>
              <p className="text-leaf-400 font-bold text-base mt-0.5">
                {bench ? `${bench.simdDotThroughputMOps.toFixed(0)} MOps/s` : "—"}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">Vectorized 16-bit Dot Product</p>
            </div>
            <div className="bg-stone-800/90 p-3 rounded border border-stone-700">
              <p className="text-stone-400 text-[10px]">C11 Merkle Tree Root</p>
              <p className="text-leaf-400 font-bold text-base mt-0.5">
                {bench ? `${bench.merkleRoot16LeavesUs.toFixed(2)} µs` : "—"}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">16-Leaf Binary SHA-256 Tree</p>
            </div>
            <div className="bg-stone-800/90 p-3 rounded border border-stone-700">
              <p className="text-stone-400 text-[10px]">C++20 Off-Heap LRU Cache</p>
              <p className="text-leaf-400 font-bold text-base mt-0.5">
                {native ? `${native.cacheHits} Hits` : "Active"}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {native ? `${native.cacheEntries} active entries` : "Shared-Mutex TTL"}
              </p>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("organic_trace_theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("organic_trace_theme", darkMode ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        setDarkMode((d) => !d);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <VoiceProvider>
          <div className="min-h-screen flex flex-col bg-stone-50/50 dark:bg-stone-950 transition-colors">
            <NavBar darkMode={darkMode} onToggleTheme={() => setDarkMode((d) => !d)} />
            <main className="flex-1">
              <Suspense
                fallback={
                  <div className="max-w-6xl mx-auto px-4 py-12 text-center text-sm text-stone-500 dark:text-stone-400">
                    Loading Organic Trace view...
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/schemes" element={<GovernmentSchemes />} />
                  <Route path="/schemes/:schemeCode" element={<SchemeDetails />} />
                  <Route path="/assistant" element={<AiAssistant />} />
                  <Route path="/trace/:batchId" element={<Trace />} />
                  <Route
                    path="/farmer"
                    element={
                      <Protected role="FARMER">
                        <FarmerDashboard />
                      </Protected>
                    }
                  />
                  <Route
                    path="/farmer/batches/new"
                    element={
                      <Protected role="FARMER">
                        <CreateBatch />
                      </Protected>
                    }
                  />
                  <Route
                    path="/batches/:batchId"
                    element={
                      <Protected>
                        <BatchDetails />
                      </Protected>
                    }
                  />
                  <Route
                    path="/partner"
                    element={
                      <Protected role="PARTNER">
                        <PartnerDashboard />
                      </Protected>
                    }
                  />
                </Routes>
              </Suspense>
            </main>
            <AiAssistantWidget />
            <VoiceAssistantModal />
            <Footer />
          </div>
        </VoiceProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
