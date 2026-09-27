import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../LanguageContext.jsx";

export default function FarmerDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    api
      .get("/api/batches")
      .then(({ data }) => setBatches(data.batches))
      .catch((err) => setError(err.response?.data?.error || "Failed to load batches"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">{t("farmer.title")}</h1>
        <Link
          to="/farmer/batches/new"
          className="px-4 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 transition"
        >
          {t("farmer.createBtn")}
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-stone-500">{t("farmer.loading")}</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && batches.length === 0 && (
        <div className="mt-10 text-center text-stone-500 border border-dashed border-stone-300 rounded-lg py-12">
          {t("farmer.empty")}
        </div>
      )}

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {batches.map((b) => (
          <Link
            key={b.id}
            to={`/batches/${b.batchId}`}
            className="block p-5 rounded-lg border border-stone-200 bg-white hover:border-leaf-400 hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-900">{b.productName}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.chainStatus === "CONFIRMED"
                    ? "bg-leaf-100 text-leaf-700"
                    : "bg-amber-100 text-amber-700"
                  }`}
              >
                {b.chainStatus === "CONFIRMED" ? t("farmer.onChain") : t("farmer.chainPending")}
              </span>
            </div>
            <p className="text-sm text-stone-500 mt-1">{t("batch.batchId")}: {b.batchId}</p>
            <p className="text-sm text-stone-500">
              {b.quantity} {b.unit} · {b.farmLocation}
            </p>
            <p className="text-xs text-stone-400 mt-2">
              {b.events?.length || 0} {t("farmer.eventsCount")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
