import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../LanguageContext.jsx";

export default function PartnerDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingChain, setSyncingChain] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const { t, lang } = useLanguage();

  const fetchBatches = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/api/batches")
      .then(({ data }) => setBatches(data.batches || []))
      .catch((err) => setError(err.response?.data?.error || "Failed to load batches"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleSyncBlockchain = async () => {
    setSyncingChain(true);
    setSyncNotice("");
    setError("");
    try {
      await api.post("/api/batches/sync-chain");
      setSyncNotice(
        lang === "hi"
          ? "✓ सभी बैच और सप्लाई चेन इवेंट्स ब्लॉकचेन से सिंक हो गए हैं।"
          : "✓ All batches and supply-chain events synchronized with the blockchain."
      );
      fetchBatches();
    } catch (err) {
      setError(err.response?.data?.error || "Could not sync blockchain records");
    } finally {
      setSyncingChain(false);
    }
  };

  const stats = useMemo(() => {
    const total = batches.length;
    const onChain = batches.filter((b) => b.chainStatus === "CONFIRMED").length;
    const certified = batches.filter((b) => Boolean(b.certificateHash)).length;
    const totalEvents = batches.reduce((acc, b) => acc + (b.events?.length || 0), 0);
    return {
      total,
      onChain,
      onChainPct: total > 0 ? Math.round((onChain / total) * 100) : 100,
      certified,
      certPct: total > 0 ? Math.round((certified / total) * 100) : 0,
      totalEvents,
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return batches
      .filter((b) => {
        if (statusFilter === "CONFIRMED" && b.chainStatus !== "CONFIRMED") return false;
        if (statusFilter === "CERTIFIED" && !b.certificateHash) return false;
        if (!q) return true;
        return (
          String(b.batchId || "").toLowerCase().includes(q) ||
          String(b.productName || "").toLowerCase().includes(q) ||
          String(b.cropType || "").toLowerCase().includes(q) ||
          String(b.farmLocation || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "QUANTITY") return Number(b.quantity || 0) - Number(a.quantity || 0);
        if (sortBy === "EVENTS") return (b.events?.length || 0) - (a.events?.length || 0);
        return new Date(b.createdAt || b.harvestDate || 0) - new Date(a.createdAt || a.harvestDate || 0);
      });
  }, [batches, searchQuery, statusFilter, sortBy]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
            {t("partner.title")}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{t("partner.desc")}</p>
        </div>

        <button
          type="button"
          onClick={handleSyncBlockchain}
          disabled={syncingChain}
          className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 text-sm font-medium hover:border-leaf-400 hover:text-leaf-800 transition shadow-2xs"
        >
          {syncingChain
            ? lang === "hi"
              ? "सिंक हो रहा है..."
              : "Syncing Chain..."
            : lang === "hi"
            ? "⛓ ब्लॉकचेन सिंक करें"
            : "⛓ Verify & Sync Blockchain"}
        </button>
      </div>

      {/* Analytics KPI Summary Cards */}
      {!loading && batches.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {lang === "hi" ? "सक्रिय बैच" : "Active Batches"}
            </p>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
              {stats.total}
            </p>
            <p className="text-[11px] text-stone-500 mt-1">Ready for partner updates</p>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400 font-medium">On-Chain Verified</span>
              <span className="font-mono font-semibold text-leaf-700 dark:text-leaf-400">
                {stats.onChainPct}%
              </span>
            </div>
            <p className="text-2xl font-bold text-leaf-700 dark:text-leaf-400 mt-1">
              {stats.onChain}/{stats.total}
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-leaf-500 transition-all duration-300"
                style={{ width: `${stats.onChainPct}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400 font-medium">Cert Hash Anchored</span>
              <span className="font-mono font-semibold text-leaf-700 dark:text-leaf-400">
                {stats.certPct}%
              </span>
            </div>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
              {stats.certified}/{stats.total}
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-leaf-600 transition-all duration-300"
                style={{ width: `${stats.certPct}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {lang === "hi" ? "कुल दर्ज चरण" : "Logged Checkpoints"}
            </p>
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">
              {stats.totalEvents}
            </p>
            <p className="text-[11px] text-leaf-700 dark:text-leaf-400 mt-1">
              ✓ SHA-256 anchored
            </p>
          </div>
        </div>
      )}

      {syncNotice && (
        <div className="mt-4 p-3 rounded-lg bg-leaf-50 dark:bg-leaf-950/60 border border-leaf-200 dark:border-leaf-800 text-xs font-medium text-leaf-800 dark:text-leaf-300">
          {syncNotice}
        </div>
      )}

      {/* Search, Filter & Sort Toolbar */}
      {!loading && batches.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "hi"
                ? "बैच आईडी, फसल या स्थान खोजें..."
                : "Search by Batch ID, crop, product, or farm location..."
            }
            className="flex-1 min-w-[200px] border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-stone-950"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter batches"
            className="border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-1.5 text-xs font-medium bg-white dark:bg-stone-950"
          >
            <option value="ALL">All Batches</option>
            <option value="CONFIRMED">On-Chain Confirmed</option>
            <option value="CERTIFIED">With Certificate Hash</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort batches"
            className="border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-1.5 text-xs font-medium bg-white dark:bg-stone-950"
          >
            <option value="NEWEST">Sort: Newest First</option>
            <option value="QUANTITY">Sort: Highest Quantity</option>
            <option value="EVENTS">Sort: Most Events</option>
          </select>
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-stone-500">{t("partner.loading")}</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {filteredBatches.map((b) => (
          <Link
            key={b.id}
            to={`/batches/${b.batchId}`}
            className="block p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-leaf-400 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">{b.productName}</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  b.chainStatus === "CONFIRMED"
                    ? "bg-leaf-100 dark:bg-leaf-900/50 text-leaf-800 dark:text-leaf-300 border border-leaf-200 dark:border-leaf-800"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {b.chainStatus === "CONFIRMED" ? `✓ ${t("farmer.onChain")}` : t("farmer.chainPending")}
              </span>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 font-medium mt-1">
              {t("batch.batchId")}:{" "}
              <span className="font-mono text-stone-900 dark:text-stone-100">{b.batchId}</span>
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {b.quantity} {b.unit} · {b.farmLocation}
            </p>
            {b.chainTxHash && (
              <p
                className="text-[11px] font-mono text-stone-500 dark:text-stone-400 mt-2 truncate"
                title={b.chainTxHash}
              >
                ⛓ Tx: {b.chainTxHash}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 text-xs">
              <span className="text-stone-500 dark:text-stone-400">
                {b.events?.length || 0} {t("partner.eventsRecorded")}
              </span>
              {b.certificateHash ? (
                <span className="text-leaf-700 dark:text-leaf-400 font-medium">
                  ✓ {lang === "hi" ? "प्रमाण पत्र हैश सुरक्षित" : "Cert Hash On-Chain"}
                </span>
              ) : (
                <span className="text-stone-400">
                  {lang === "hi" ? "प्रमाण पत्र लंबित" : "Cert Pending"}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
