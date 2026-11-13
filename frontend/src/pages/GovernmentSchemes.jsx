import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";
import { useVoice } from "../VoiceContext.jsx";
import SpeakButton from "../components/SpeakButton.jsx";
import {
  SCHEME_CATEGORY_META,
  BENEFICIARY_TYPE_META,
  STATUS_BADGE_META,
  INDIAN_STATES_LIST,
} from "../constants/schemes.js";

export default function GovernmentSchemes() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { openVoiceModal, speak } = useVoice();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states synchronized with URL search params (so voice navigation works seamlessly)
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [governmentLevel, setGovernmentLevel] = useState(searchParams.get("governmentLevel") || "");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "ALL");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [beneficiaryType, setBeneficiaryType] = useState(searchParams.get("beneficiaryType") || "");
  const [applicationStatus, setApplicationStatus] = useState(searchParams.get("applicationStatus") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "verified");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [activeTab, setActiveTab] = useState("all"); // "all" | "saved" | "recommender"

  // Data states
  const [schemes, setSchemes] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 9, totalPages: 1 });
  const [latestSync, setLatestSync] = useState(null);
  const [officialSources, setOfficialSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState("");

  // Saved schemes state (supports both authenticated DB storage and localStorage for guests)
  const [savedSchemeCodes, setSavedSchemeCodes] = useState(() => {
    try {
      const local = JSON.parse(localStorage.getItem("organic_trace_saved_schemes") || "[]");
      return new Set(Array.isArray(local) ? local : []);
    } catch {
      return new Set();
    }
  });
  const [savedSchemeObjects, setSavedSchemeObjects] = useState([]);

  // External link confirmation modal
  const [confirmExternalPortal, setConfirmExternalPortal] = useState(null);

  // Personalized Recommender Profile state
  const [profile, setProfile] = useState({
    state: "Haryana",
    district: "Karnal",
    farmerCategory: "ORGANIC_FARMER",
    landholdingCategory: "SMALL_MARGINAL",
    organicCertStatus: "PGS_CERTIFIED",
    isFpoMember: true,
    farmingInterests: ["ORGANIC_FARMING", "CERTIFICATION", "STORAGE"],
  });
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recDisclaimer, setRecDisclaimer] = useState("");
  const [prefSavedMsg, setPrefSavedMsg] = useState("");

  // Sync local filter states whenever URL query parameters change (e.g., via Voice Navigation)
  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setGovernmentLevel(searchParams.get("governmentLevel") || "");
    setStateFilter(searchParams.get("state") || "ALL");
    setCategory(searchParams.get("category") || "");
    setBeneficiaryType(searchParams.get("beneficiaryType") || "");
    setApplicationStatus(searchParams.get("applicationStatus") || "");
    setSortBy(searchParams.get("sortBy") || "verified");
    setPage(parseInt(searchParams.get("page") || "1", 10) || 1);
  }, [searchParams]);

  // Load metadata & official sources
  useEffect(() => {
    api
      .get("/api/schemes/meta")
      .then(({ data }) => {
        if (data.latestSync) setLatestSync(data.latestSync);
        if (data.officialSources) setOfficialSources(data.officialSources);
      })
      .catch(() => {});
  }, []);

  // Load saved schemes & user profile if logged in
  useEffect(() => {
    if (!user) return;
    api
      .get("/api/schemes/saved")
      .then(({ data }) => {
        const list = data.savedSchemes || [];
        setSavedSchemeObjects(list.map((item) => item.scheme));
        setSavedSchemeCodes((prev) => {
          const next = new Set(prev);
          list.forEach((item) => next.add(item.scheme.schemeCode));
          return next;
        });
      })
      .catch(() => {});

    api
      .get("/api/preferences")
      .then(({ data }) => {
        const p = data.preference;
        if (p && (p.state || p.farmerCategory)) {
          setProfile((prev) => ({
            ...prev,
            state: p.state || prev.state,
            district: p.district || prev.district,
            farmerCategory: p.farmerCategory || prev.farmerCategory,
            landholdingCategory: p.landholdingCategory || prev.landholdingCategory,
            organicCertStatus: p.organicCertStatus || prev.organicCertStatus,
            isFpoMember: Boolean(p.isFpoMember),
            farmingInterests:
              Array.isArray(p.farmingInterests) && p.farmingInterests.length > 0
                ? p.farmingInterests
                : prev.farmingInterests,
          }));
        }
      })
      .catch(() => {});
  }, [user]);

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        q,
        governmentLevel,
        state: stateFilter === "ALL" ? "" : stateFilter,
        category,
        beneficiaryType,
        applicationStatus,
        sortBy,
        page,
        limit: 9,
      };
      const { data } = await api.get("/api/schemes", { params });
      setSchemes(data.schemes || []);
      setPagination(data.pagination || { total: 0, page: 1, limit: 9, totalPages: 1 });
      if (data.latestSync) setLatestSync(data.latestSync);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load government schemes.");
    } finally {
      setLoading(false);
    }
  }, [q, governmentLevel, stateFilter, category, beneficiaryType, applicationStatus, sortBy, page]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  // Listen for voice "read page aloud" event
  useEffect(() => {
    const handleVoiceRead = () => {
      const count = schemes.length;
      const text =
        lang === "hi"
          ? `सरकारी योजना डैशबोर्ड। वर्तमान में ${pagination.total} योजनाएं उपलब्ध हैं। प्रमुख योजनाओं में ${schemes
              .slice(0, 3)
              .map((s) => s.nameHi || s.name)
              .join(", ")} शामिल हैं।`
          : `Government Schemes Dashboard. Showing ${count} of ${pagination.total} verified schemes. Top schemes include ${schemes
              .slice(0, 3)
              .map((s) => s.name)
              .join(", ")}.`;
      speak(text, { id: "dashboard-overview" });
    };
    window.addEventListener("organic-trace:voice-read-page", handleVoiceRead);
    return () => window.removeEventListener("organic-trace:voice-read-page", handleVoiceRead);
  }, [schemes, pagination.total, lang, speak]);

  const updateUrlParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "ALL") {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    if (!("page" in updates)) {
      next.set("page", "1");
    }
    setSearchParams(next);
  };

  const resetAllFilters = () => {
    setSearchParams({});
    setActiveTab("all");
  };

  const handleSyncSources = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const { data } = await api.post("/api/schemes/sync", { performLiveNetworkCheck: true });
      setSyncMessage(
        lang === "hi"
          ? `✓ सिंक पूर्ण (${data.schemesUpdated} योजनाएं जांची गईं · लाइव पोर्टल: ${data.livePortalsReachable || 0})`
          : `✓ Sync complete (${data.schemesUpdated} schemes verified · Live portals reachable: ${
              data.livePortalsReachable || 0
            })`
      );
      fetchSchemes();
    } catch (err) {
      setSyncMessage(
        err.response?.data?.error ||
          (lang === "hi"
            ? "सिंक विफल रहा; अंतिम सत्यापित डेटा सुरक्षित रखा गया है।"
            : "Sync unavailable; preserved last known verified dataset.")
      );
    } finally {
      setSyncing(false);
    }
  };

  const toggleSaveScheme = async (scheme) => {
    const code = scheme.schemeCode;
    const isCurrentlySaved = savedSchemeCodes.has(code);

    const nextSet = new Set(savedSchemeCodes);
    if (isCurrentlySaved) {
      nextSet.delete(code);
    } else {
      nextSet.add(code);
    }
    setSavedSchemeCodes(nextSet);
    localStorage.setItem("organic_trace_saved_schemes", JSON.stringify(Array.from(nextSet)));

    if (user) {
      try {
        if (isCurrentlySaved) {
          await api.delete(`/api/schemes/${code}/save`);
          setSavedSchemeObjects((prev) => prev.filter((s) => s.schemeCode !== code));
        } else {
          await api.post(`/api/schemes/${code}/save`);
          setSavedSchemeObjects((prev) => [scheme, ...prev.filter((s) => s.schemeCode !== code)]);
        }
      } catch {
        // local state still preserved
      }
    }
  };

  const runRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const { data } = await api.post("/api/schemes/recommend", {
        ...profile,
        lang: lang === "hi" ? "hi" : "en",
      });
      setRecommendations(data.recommendations || []);
      setRecDisclaimer(data.disclaimer || "");
    } catch {
      // ignore
    } finally {
      setRecLoading(false);
    }
  }, [profile, lang]);

  useEffect(() => {
    if (activeTab === "recommender") {
      runRecommendations();
    }
  }, [activeTab, runRecommendations]);

  const handleSaveProfilePreferences = async () => {
    if (!user) return;
    setPrefSavedMsg("");
    try {
      await api.put("/api/preferences", {
        state: profile.state,
        district: profile.district,
        farmerCategory: profile.farmerCategory,
        landholdingCategory: profile.landholdingCategory,
        organicCertStatus: profile.organicCertStatus,
        isFpoMember: profile.isFpoMember,
        farmingInterests: profile.farmingInterests,
      });
      setPrefSavedMsg(
        lang === "hi"
          ? "✓ आपकी प्रोफ़ाइल प्राथमिकताएं सहेजी गईं"
          : "✓ Profile preferences saved to your account"
      );
    } catch {
      setPrefSavedMsg(lang === "hi" ? "प्रोफ़ाइल सहेजने में त्रुटि" : "Could not save preferences");
    }
  };

  const toggleInterest = (catKey) => {
    setProfile((prev) => {
      const exists = prev.farmingInterests.includes(catKey);
      return {
        ...prev,
        farmingInterests: exists
          ? prev.farmingInterests.filter((c) => c !== catKey)
          : [...prev.farmingInterests, catKey],
      };
    });
  };

  const displayedSchemes =
    activeTab === "saved"
      ? savedSchemeObjects.length > 0
        ? savedSchemeObjects
        : schemes.filter((s) => savedSchemeCodes.has(s.schemeCode))
      : schemes;

  const overviewTtsText =
    lang === "hi"
      ? `भारतीय सरकारी कृषि एवं जैविक खेती योजना डैशबोर्ड। यहाँ ${pagination.total} सत्यापित केंद्रीय और राज्य योजनाएं उपलब्ध हैं, जिनमें पीएम-किसान, परम्परागत कृषि विकास योजना (PKVY), राष्ट्रीय प्राकृतिक खेती मिशन, कृषि अवसंरचना कोष (AIF) और ई-नाम शामिल हैं।`
      : `Indian Government Agriculture and Organic Farming Schemes Dashboard. Currently displaying ${pagination.total} verified Central and State schemes including PM-KISAN, Paramparagat Krishi Vikas Yojana, National Mission on Natural Farming, Agriculture Infrastructure Fund, and e-NAM.`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner & Voice / Freshness Controls */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-leaf-100 text-leaf-800 text-xs font-semibold">
                🇮🇳 {lang === "hi" ? "आधिकारिक सरकारी योजनाएं एवं सब्सिडी" : "Official Indian Government Schemes & Subsidies"}
              </span>
              {latestSync && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs border border-stone-200">
                  <span className="w-2 h-2 rounded-full bg-leaf-500" />
                  {lang === "hi" ? "अंतिम सत्यापन:" : "Last Verified:"}{" "}
                  {new Date(latestSync.syncedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
              {lang === "hi"
                ? "नवीनतम कृषि, जैविक खेती एवं सप्लाई चेन सरकारी योजनाएं"
                : "Latest Government Schemes & Subsidies Dashboard"}
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-3xl">
              {lang === "hi"
                ? "केंद्र और राज्य सरकार की जैविक खेती, प्रमाणन, सिंचाई, भंडारण, एफपीओ (FPO) और खाद्य प्रसंस्करण योजनाओं की सत्यापित जानकारी, पात्रता और आधिकारिक आवेदन लिंक।"
                : "Verified Central & State programs supporting organic farming, PGS/NPOP certification, micro-irrigation, cold-chain storage, FPOs, and agricultural startups."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              to="/assistant"
              className="px-3.5 py-2 rounded-lg bg-stone-900 text-white text-xs sm:text-sm font-semibold hover:bg-leaf-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span aria-hidden="true">🤖</span>
              <span>{lang === "hi" ? "एआई से योजना पूछें" : "Ask AI About Schemes"}</span>
            </Link>
            <SpeakButton
              id="schemes-dashboard-intro"
              text={overviewTtsText}
              label="Read Overview"
              labelHi="सारांश सुनें"
              size="md"
            />
            <button
              type="button"
              onClick={() => openVoiceModal({ autoStart: false })}
              className="px-3.5 py-2 rounded-lg bg-leaf-600 text-white text-xs sm:text-sm font-semibold hover:bg-leaf-700 transition flex items-center gap-1.5 shadow-xs"
            >
              <span>🎙️</span>
              <span>{lang === "hi" ? "बोलकर योजना खोजें" : "Voice Search"}</span>
            </button>
            <button
              type="button"
              onClick={handleSyncSources}
              disabled={syncing}
              className="px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 text-stone-700 text-xs font-medium hover:bg-stone-100 disabled:opacity-50 transition"
              title="Verify and refresh official source status"
            >
              {syncing
                ? lang === "hi"
                  ? "सत्यापित हो रहा है..."
                  : "Verifying..."
                : lang === "hi"
                ? "🔄 स्रोत रिफ्रेश करें"
                : "🔄 Refresh Sources"}
            </button>
          </div>
        </div>

        {syncMessage && (
          <p className="mt-3 text-xs text-leaf-800 bg-leaf-50 border border-leaf-200 rounded-lg px-3 py-2">
            {syncMessage}
          </p>
        )}

        {/* Mode Tabs: All Schemes | Personalized Recommender | Saved Schemes */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeTab === "all"
                  ? "bg-leaf-600 text-white shadow-xs"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              📋 {lang === "hi" ? `सभी योजनाएं (${pagination.total})` : `All Schemes (${pagination.total})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "recommender"}
              onClick={() => setActiveTab("recommender")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeTab === "recommender"
                  ? "bg-leaf-600 text-white shadow-xs"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              ✨ {lang === "hi" ? "मेरे लिए उपयुक्त योजनाएं (पात्रता मिलान)" : "Personalized Recommendations"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "saved"}
              onClick={() => setActiveTab("saved")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeTab === "saved"
                  ? "bg-leaf-600 text-white shadow-xs"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              🔖 {lang === "hi" ? `सहेजी गई योजनाएं (${savedSchemeCodes.size})` : `Saved Schemes (${savedSchemeCodes.size})`}
            </button>
          </div>

          {/* Central vs State Quick Filter Pills */}
          {activeTab === "all" && (
            <div className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 p-1 text-xs font-medium">
              {[
                { key: "", label: lang === "hi" ? "सभी (केंद्र + राज्य)" : "All Levels" },
                { key: "CENTRAL", label: lang === "hi" ? "केंद्र सरकार" : "Central Govt" },
                { key: "STATE", label: lang === "hi" ? "राज्य सरकार" : "State Govt" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updateUrlParams({ governmentLevel: item.key })}
                  className={`px-3 py-1.5 rounded-md transition ${
                    governmentLevel === item.key
                      ? "bg-white text-leaf-700 shadow-xs font-semibold"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TAB 2: PERSONALIZED SCHEME RECOMMENDER */}
      {activeTab === "recommender" && (
        <div className="mt-6 bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                ✨ {lang === "hi" ? "व्यक्तिगत सरकारी योजना अनुशंसा (Personalized Matcher)" : "Personalized Scheme Recommendation Engine"}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                {lang === "hi"
                  ? "अपना राज्य, किसान श्रेणी, भूमि श्रेणी और जैविक प्रमाणन स्थिति चुनें। हम किसी भी संवेदनशील व्यक्तिगत जानकारी (जैसे आधार या बैंक खाता नंबर) की मांग नहीं करते हैं।"
                  : "Select your state, farmer/business category, landholding size, and organic status to find matching subsidies. No sensitive personal data (Aadhaar/bank numbers) is requested."}
              </p>
            </div>
            {user && (
              <button
                type="button"
                onClick={handleSaveProfilePreferences}
                className="px-3.5 py-2 rounded-lg border border-leaf-300 bg-leaf-50 text-leaf-800 text-xs font-semibold hover:bg-leaf-100 transition"
              >
                💾 {lang === "hi" ? "प्रोफ़ाइल प्राथमिकताएं सहेजें" : "Save Profile to Account"}
              </button>
            )}
          </div>
          {prefSavedMsg && <p className="mt-2 text-xs text-leaf-700 font-medium">{prefSavedMsg}</p>}

          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700">
                {lang === "hi" ? "राज्य (State)" : "State / Region"}
              </label>
              <select
                value={profile.state}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {INDIAN_STATES_LIST.filter((s) => s !== "ALL").map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700">
                {lang === "hi" ? "जिला (District - वैकल्पिक)" : "District (Optional)"}
              </label>
              <input
                type="text"
                value={profile.district}
                onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                placeholder="e.g., Karnal, Hisar, Ludhiana"
                className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700">
                {lang === "hi" ? "किसान / व्यवसाय श्रेणी" : "Farmer / Business Category"}
              </label>
              <select
                value={profile.farmerCategory}
                onChange={(e) => setProfile({ ...profile, farmerCategory: e.target.value })}
                className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {Object.entries(BENEFICIARY_TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {lang === "hi" ? v.labelHi : v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700">
                {lang === "hi" ? "भूमि धारिता श्रेणी (Landholding)" : "Landholding Category"}
              </label>
              <select
                value={profile.landholdingCategory}
                onChange={(e) => setProfile({ ...profile, landholdingCategory: e.target.value })}
                className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="SMALL_MARGINAL">
                  {lang === "hi" ? "लघु एवं सीमांत किसान (2 हेक्टेयर तक)" : "Small & Marginal Farmer (Up to 2 Hectares)"}
                </option>
                <option value="MEDIUM_LARGE">
                  {lang === "hi" ? "मध्यम / बड़े किसान (2 हेक्टेयर से अधिक)" : "Medium / Large Farmer (> 2 Hectares)"}
                </option>
                <option value="TENANT_LANDLESS">
                  {lang === "hi" ? "बटाईदार / पट्टेदार किसान (Tenant Farmer)" : "Tenant / Sharecropper / Non-landholding Enterprise"}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700">
                {lang === "hi" ? "जैविक प्रमाणन स्थिति" : "Organic Certification Status"}
              </label>
              <select
                value={profile.organicCertStatus}
                onChange={(e) => setProfile({ ...profile, organicCertStatus: e.target.value })}
                className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="PGS_CERTIFIED">
                  {lang === "hi" ? "PGS-India जैविक प्रमाणित" : "PGS-India Organic Certified"}
                </option>
                <option value="NPOP_CERTIFIED">
                  {lang === "hi" ? "NPOP (APEDA) तृतीय-पक्ष प्रमाणित" : "NPOP (APEDA) Third-Party Certified"}
                </option>
                <option value="TRANSITIONING">
                  {lang === "hi" ? "जैविक खेती में परिवर्तनशील (Transitioning)" : "Transitioning to Organic / Natural Farming"}
                </option>
                <option value="NONE">
                  {lang === "hi" ? "अभी प्रमाणित नहीं (पारंपरिक)" : "Not Yet Certified"}
                </option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm text-stone-800 font-medium">
                <input
                  type="checkbox"
                  checked={profile.isFpoMember}
                  onChange={(e) => setProfile({ ...profile, isFpoMember: e.target.checked })}
                  className="w-4 h-4 rounded text-leaf-600 focus:ring-leaf-500"
                />
                <span>
                  {lang === "hi"
                    ? "मैं एक FPO / किसान समूह का सदस्य हूँ"
                    : "Member of an FPO / Farmer Cooperative"}
                </span>
              </label>
            </div>
          </div>

          {/* Farming Interests Multi-Select */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              {lang === "hi"
                ? "आपकी कृषि आवश्यकताएं / रुचियां चुनें:"
                : "Select Your Farming & Supply Chain Interests:"}
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SCHEME_CATEGORY_META).map(([catKey, meta]) => {
                const selected = profile.farmingInterests.includes(catKey);
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => toggleInterest(catKey)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
                      selected
                        ? "bg-leaf-600 text-white border-leaf-600"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:border-leaf-300"
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span>{lang === "hi" ? meta.labelHi : meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>{lang === "hi" ? "अस्वीकरण (Disclaimer): " : "Eligibility Disclaimer: "}</strong>
            {lang === "hi"
              ? "ये अनुशंसाएं आपकी चयनित प्रोफ़ाइल के आधार पर केवल मार्गदर्शन के लिए हैं। ये पात्रता, स्वीकृति या सब्सिडी राशि की गारंटी नहीं देती हैं। आवेदन करने से पहले हमेशा संबंधित आधिकारिक सरकारी पोर्टल पर पात्रता की पुष्टि करें।"
              : recDisclaimer ||
                "Recommendations are indicative based on your selected profile. They do NOT guarantee eligibility, approval, or subsidy amounts."}
          </div>

          {/* Recommended Schemes Results */}
          <div className="mt-6 space-y-4">
            {recLoading ? (
              <p className="text-sm text-stone-500 py-6 text-center">
                {lang === "hi" ? "उपयुक्त योजनाओं का मिलान किया जा रहा है..." : "Matching schemes to your profile..."}
              </p>
            ) : (
              recommendations.map(({ scheme, matchScore, matchReasons, verificationChecklist }) => (
                <div
                  key={scheme.id}
                  className="border border-stone-200 rounded-xl p-5 bg-stone-50/60 hover:border-leaf-400 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-leaf-600 text-white text-xs font-bold">
                          {matchScore}% {lang === "hi" ? "प्रोफ़ाइल मिलान" : "Profile Match"}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 text-xs font-mono font-semibold">
                          {scheme.schemeCode}
                        </span>
                        <span className="text-xs text-stone-500">{scheme.ministry}</span>
                      </div>
                      <h3 className="text-lg font-bold text-stone-900 mt-1.5">
                        {lang === "hi" && scheme.nameHi ? scheme.nameHi : scheme.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <SpeakButton
                        id={`rec-tts-${scheme.schemeCode}`}
                        text={`${
                          lang === "hi" && scheme.nameHi ? scheme.nameHi : scheme.name
                        }. ${
                          lang === "hi" && scheme.benefitSummaryHi
                            ? scheme.benefitSummaryHi
                            : scheme.benefitSummary
                        }`}
                      />
                      <Link
                        to={`/schemes/${scheme.schemeCode}`}
                        className="px-3.5 py-1.5 rounded-lg bg-leaf-600 text-white text-xs font-semibold hover:bg-leaf-700 transition"
                      >
                        {lang === "hi" ? "पूरा विवरण देखें →" : "View Details →"}
                      </Link>
                    </div>
                  </div>

                  <p className="mt-2 text-xs sm:text-sm text-stone-700">
                    <strong>{lang === "hi" ? "लाभ / सब्सिडी: " : "Subsidy / Benefit: "}</strong>
                    {lang === "hi" && scheme.benefitSummaryHi
                      ? scheme.benefitSummaryHi
                      : scheme.benefitSummary}
                  </p>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white border border-leaf-200 rounded-lg p-3">
                      <p className="font-semibold text-leaf-900">
                        ✓ {lang === "hi" ? "यह आपकी प्रोफ़ाइल से क्यों मेल खाता है:" : "Why this matches your profile:"}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-stone-700 list-disc list-inside">
                        {(matchReasons || []).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-amber-200 rounded-lg p-3">
                      <p className="font-semibold text-amber-900">
                        🔍 {lang === "hi" ? "आवेदन से पहले क्या जांचें:" : "What to verify before applying:"}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-stone-700 list-disc list-inside">
                        {(verificationChecklist || []).map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 1 & 3: SEARCH, CATEGORY FILTERS & SCHEME CARDS */}
      {activeTab !== "recommender" && (
        <>
          {/* Search & Filter Controls Bar */}
          <div className="mt-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Box */}
              <div className="sm:col-span-2 relative">
                <label htmlFor="scheme-search-input" className="sr-only">
                  Search schemes
                </label>
                <input
                  id="scheme-search-input"
                  type="text"
                  value={q}
                  onChange={(e) => updateUrlParams({ q: e.target.value })}
                  placeholder={
                    lang === "hi"
                      ? "योजना का नाम, खाद, सिंचाई, भंडारण, FPO या राज्य खोजें..."
                      : "Search schemes (e.g., PKVY, organic fertilizer, storage, Haryana, FPO)..."
                  }
                  className="w-full border border-stone-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
                />
                <button
                  type="button"
                  onClick={() => openVoiceModal({ autoStart: false })}
                  title={lang === "hi" ? "बोलकर खोजें" : "Search by voice"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-leaf-700 px-1.5 py-1"
                >
                  🎙️
                </button>
              </div>

              {/* State Filter */}
              <div>
                <select
                  aria-label="Filter by State"
                  value={stateFilter}
                  onChange={(e) => updateUrlParams({ state: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="ALL">
                    {lang === "hi" ? "सभी राज्य (अखिल भारतीय)" : "All States (Pan-India)"}
                  </option>
                  {INDIAN_STATES_LIST.filter((s) => s !== "ALL").map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Beneficiary Filter */}
              <div>
                <select
                  aria-label="Filter by Beneficiary Category"
                  value={beneficiaryType}
                  onChange={(e) => updateUrlParams({ beneficiaryType: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">
                    {lang === "hi" ? "सभी लाभार्थी श्रेणियां" : "All Beneficiary Types"}
                  </option>
                  {Object.entries(BENEFICIARY_TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>
                      {lang === "hi" ? v.labelHi : v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort & Status Filter */}
              <div className="flex gap-2">
                <select
                  aria-label="Filter by Application Status"
                  value={applicationStatus}
                  onChange={(e) => updateUrlParams({ applicationStatus: e.target.value })}
                  className="w-1/2 border border-stone-300 rounded-lg px-2 py-2 text-xs bg-white"
                >
                  <option value="">{lang === "hi" ? "सभी स्थिति" : "All Status"}</option>
                  <option value="OPEN">{lang === "hi" ? "चालू (Open)" : "Open"}</option>
                  <option value="UPCOMING">{lang === "hi" ? "आगामी" : "Upcoming"}</option>
                  <option value="CLOSED">{lang === "hi" ? "बंद" : "Closed"}</option>
                </select>

                <select
                  aria-label="Sort Schemes"
                  value={sortBy}
                  onChange={(e) => updateUrlParams({ sortBy: e.target.value })}
                  className="w-1/2 border border-stone-300 rounded-lg px-2 py-2 text-xs bg-white"
                >
                  <option value="verified">{lang === "hi" ? "नवीनतम सत्यापित" : "Recently Verified"}</option>
                  <option value="newest">{lang === "hi" ? "नवीनतम अपडेट" : "Latest Updated"}</option>
                  <option value="subsidy">{lang === "hi" ? "उच्चतम सब्सिडी %" : "Highest Subsidy %"}</option>
                  <option value="name">{lang === "hi" ? "नाम (A–Z)" : "Name (A–Z)"}</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => updateUrlParams({ category: "" })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition ${
                  !category
                    ? "bg-leaf-600 text-white border-leaf-600"
                    : "bg-stone-50 text-stone-700 border-stone-200 hover:border-leaf-300"
                }`}
              >
                {lang === "hi" ? "सभी श्रेणियां" : "All Categories"}
              </button>
              {Object.entries(SCHEME_CATEGORY_META).map(([catKey, meta]) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => updateUrlParams({ category: category === catKey ? "" : catKey })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition flex items-center gap-1.5 ${
                    category === catKey
                      ? "bg-leaf-600 text-white border-leaf-600 shadow-2xs"
                      : "bg-stone-50 text-stone-700 border-stone-200 hover:border-leaf-300"
                  }`}
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  <span>{lang === "hi" ? meta.labelHi : meta.label}</span>
                </button>
              ))}
            </div>

            {/* Active Filter Reset Bar */}
            {(q || governmentLevel || stateFilter !== "ALL" || category || beneficiaryType || applicationStatus) && (
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                <span>
                  {lang === "hi"
                    ? `सक्रिय फ़िल्टर लागू — ${pagination.total} परिणाम मिले`
                    : `Active filters applied — ${pagination.total} scheme(s) found`}
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-leaf-700 font-semibold hover:underline"
                >
                  ✕ {lang === "hi" ? "सभी फ़िल्टर हटाएं" : "Clear All Filters"}
                </button>
              </div>
            )}
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-stone-200 rounded-xl p-6 h-72 animate-pulse flex flex-col justify-between"
                >
                  <div>
                    <div className="h-4 bg-stone-200 rounded w-1/3 mb-3" />
                    <div className="h-6 bg-stone-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-stone-100 rounded w-full mb-1.5" />
                    <div className="h-3 bg-stone-100 rounded w-5/6" />
                  </div>
                  <div className="h-16 bg-stone-100 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                onClick={fetchSchemes}
                className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold"
              >
                {lang === "hi" ? "पुनः प्रयास करें" : "Retry"}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && displayedSchemes.length === 0 && (
            <div className="mt-6 bg-white border border-dashed border-stone-300 rounded-2xl p-12 text-center">
              <p className="text-lg font-semibold text-stone-800">
                {activeTab === "saved"
                  ? lang === "hi"
                    ? "आपने अभी तक कोई योजना सहेजी नहीं है।"
                    : "You have no saved schemes yet."
                  : lang === "hi"
                  ? "आपकी खोज या फ़िल्टर से मेल खाती कोई सरकारी योजना नहीं मिली।"
                  : "No government schemes matched your current filters."}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {lang === "hi"
                  ? "सभी योजनाएं देखने के लिए फ़िल्टर हटाएं या बोलकर खोजें।"
                  : "Try clearing filters or use the Voice Assistant to describe what you need."}
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 rounded-lg bg-leaf-600 text-white text-xs font-semibold hover:bg-leaf-700"
              >
                {lang === "hi" ? "सभी योजनाएं दिखाएं" : "Show All Schemes"}
              </button>
            </div>
          )}

          {/* Scheme Cards Grid */}
          {!loading && !error && displayedSchemes.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedSchemes.map((scheme) => {
                const statusMeta =
                  STATUS_BADGE_META[scheme.applicationStatus] || STATUS_BADGE_META.STATUS_UNVERIFIED;
                const isSaved = savedSchemeCodes.has(scheme.schemeCode);
                const displayName = lang === "hi" && scheme.nameHi ? scheme.nameHi : scheme.name;
                const displayDesc =
                  lang === "hi" && scheme.descriptionHi ? scheme.descriptionHi : scheme.description;
                const displayBenefit =
                  lang === "hi" && scheme.benefitSummaryHi ? scheme.benefitSummaryHi : scheme.benefitSummary;

                return (
                  <article
                    key={scheme.id}
                    className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-leaf-400 transition flex flex-col justify-between border-t-4 border-t-leaf-600"
                  >
                    <div>
                      {/* Card Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-mono text-xs font-bold border border-stone-200">
                            {scheme.schemeCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.className}`}
                          >
                            {lang === "hi" ? statusMeta.labelHi : statusMeta.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">
                            {scheme.governmentLevel === "STATE"
                              ? `🏛️ ${scheme.state}`
                              : lang === "hi"
                              ? "🇮🇳 केंद्र सरकार"
                              : "🇮🇳 Central"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSaveScheme(scheme)}
                          aria-label={isSaved ? "Remove from saved schemes" : "Save scheme"}
                          title={isSaved ? "Saved" : "Save scheme"}
                          className={`text-sm px-2 py-1 rounded-md border transition ${
                            isSaved
                              ? "bg-amber-50 border-amber-300 text-amber-700 font-semibold"
                              : "border-stone-200 text-stone-400 hover:text-stone-700"
                          }`}
                        >
                          {isSaved ? "🔖" : "☆"}
                        </button>
                      </div>

                      {/* Title & Ministry */}
                      <h2 className="mt-3 font-bold text-stone-900 text-base leading-snug">
                        <Link to={`/schemes/${scheme.schemeCode}`} className="hover:text-leaf-700">
                          {displayName}
                        </Link>
                      </h2>
                      <p className="text-[11px] text-stone-500 mt-1">{scheme.ministry}</p>

                      {/* Description */}
                      <p className="mt-2.5 text-xs text-stone-600 line-clamp-3 leading-relaxed">
                        {displayDesc}
                      </p>

                      {/* Benefit / Subsidy Highlight Box */}
                      <div className="mt-3 p-3 rounded-xl bg-leaf-50/80 border border-leaf-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-leaf-900">
                            {lang === "hi" ? "वित्तीय सहायता / लाभ:" : "Subsidy / Assistance:"}
                          </span>
                          {scheme.maxSubsidyPercent && (
                            <span className="px-2 py-0.5 rounded bg-leaf-600 text-white text-[11px] font-bold">
                              {lang === "hi"
                                ? `${scheme.maxSubsidyPercent}% तक सब्सिडी`
                                : `Up to ${scheme.maxSubsidyPercent}%`}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-stone-700 line-clamp-2 font-medium">{displayBenefit}</p>
                      </div>

                      {/* Category Tags */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(scheme.categories || []).slice(0, 4).map((cat) => {
                          const meta = SCHEME_CATEGORY_META[cat];
                          return (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px]"
                            >
                              <span>{meta?.icon || "•"}</span>
                              <span>{lang === "hi" ? meta?.labelHi || cat : meta?.label || cat}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Footer: Verification Freshness + Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-100">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 mb-2.5">
                        <span>
                          {scheme.verificationStatus === "OFFICIAL_VERIFIED"
                            ? lang === "hi"
                              ? "✓ आधिकारिक स्रोत सत्यापित"
                              : "✓ Official Source Verified"
                            : lang === "hi"
                            ? "ℹ क्यूरेटेड आधिकारिक रिकॉर्ड"
                            : "ℹ Curated Official Record"}
                        </span>
                        <span>
                          {new Date(scheme.lastVerifiedAt).toLocaleDateString(
                            lang === "hi" ? "hi-IN" : "en-IN",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <SpeakButton
                          id={`card-tts-${scheme.schemeCode}`}
                          text={`${displayName}. ${displayDesc}. ${displayBenefit}`}
                          size="xs"
                        />

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmExternalPortal(scheme)}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-100 transition"
                          >
                            {lang === "hi" ? "पोर्टल ↗" : "Portal ↗"}
                          </button>
                          <Link
                            to={`/schemes/${scheme.schemeCode}`}
                            className="px-3 py-1.5 rounded-lg bg-leaf-600 text-white text-xs font-semibold hover:bg-leaf-700 transition"
                          >
                            {lang === "hi" ? "विवरण और पात्रता" : "Details & Apply"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {activeTab === "all" && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => updateUrlParams({ page: pagination.page - 1 })}
                className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium disabled:opacity-40 hover:bg-stone-50"
              >
                ← {lang === "hi" ? "पिछला" : "Previous"}
              </button>
              <span className="text-xs text-stone-600 px-3">
                {lang === "hi"
                  ? `पृष्ठ ${pagination.page} / ${pagination.totalPages}`
                  : `Page ${pagination.page} of ${pagination.totalPages}`}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateUrlParams({ page: pagination.page + 1 })}
                className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium disabled:opacity-40 hover:bg-stone-50"
              >
                {lang === "hi" ? "अगला" : "Next"} →
              </button>
            </div>
          )}
        </>
      )}

      {/* Official Government Sources Directory & Separation Notice */}
      <div className="mt-10 bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-stone-900">
          🏛️ {lang === "hi" ? "सत्यापित आधिकारिक सरकारी पोर्टल (Official Sources)" : "Verified Official Government Sources"}
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          {lang === "hi"
            ? "सभी योजना विवरण और आवेदन लिंक सीधे भारत सरकार और राज्य कृषि विभाग के आधिकारिक पोर्टल से जुड़े हैं। ब्लॉकचेन ट्रैसेबिलिटी डेटा और सरकारी योजना की जानकारी को अलग-अलग रखा गया है।"
            : "All scheme descriptions and application links reference official Government of India and State Agriculture portals. Government scheme listings are educational and strictly separate from on-chain product verification."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {officialSources.map((src) => (
            <button
              key={src.url}
              type="button"
              onClick={() =>
                setConfirmExternalPortal({
                  name: src.name,
                  nameHi: src.name,
                  officialPortalUrl: src.url,
                  ministry: "Official Government of India Portal",
                })
              }
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-leaf-50 hover:border-leaf-300 text-stone-700 transition"
            >
              🔗 {src.name} ↗
            </button>
          ))}
        </div>
      </div>

      {/* User Confirmation Modal Before Opening External Official Application Website */}
      {confirmExternalPortal && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-stone-900">
              {lang === "hi"
                ? "आधिकारिक सरकारी वेबसाइट खोलने की पुष्टि करें"
                : "Confirm Opening Official Government Portal"}
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {lang === "hi"
                ? `आप "${confirmExternalPortal.nameHi || confirmExternalPortal.name}" के लिए बाहरी आधिकारिक सरकारी पोर्टल पर जा रहे हैं:`
                : `You are about to open the external official government portal for "${confirmExternalPortal.name}":`}
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-stone-100 border border-stone-200 font-mono text-xs text-leaf-800 break-all">
              {confirmExternalPortal.officialPortalUrl}
            </div>
            <p className="text-[11px] text-stone-500 mt-2">
              {lang === "hi"
                ? "सुरक्षा टिप: सुनिश्चित करें कि वेबसाइट '.gov.in' या '.nic.in' डोमेन पर है और कभी भी किसी अनधिकृत व्यक्ति के साथ अपना ओटीपी (OTP) साझा न करें।"
                : "Security Note: Always verify the official .gov.in / .nic.in domain and never share your Aadhaar OTP with unauthorized agents."}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmExternalPortal(null)}
                className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-100"
              >
                {lang === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <a
                href={confirmExternalPortal.officialPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setConfirmExternalPortal(null)}
                className="px-4 py-2 rounded-lg bg-leaf-600 text-white text-xs font-semibold hover:bg-leaf-700"
              >
                {lang === "hi" ? "आधिकारिक पोर्टल खोलें ↗" : "Proceed to Official Portal ↗"}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
