import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

export default function PartnerDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/batches")
      .then(({ data }) => setBatches(data.batches))
      .catch((err) => setError(err.response?.data?.error || "Failed to load batches"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900">All Batches</h1>
      <p className="text-sm text-stone-500 mt-1">Open a batch to record a processing, shipment, or retail event.</p>

      {loading && <p className="mt-6 text-sm text-stone-500">Loading...</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {batches.map((b) => (
          <Link
            key={b.id}
            to={`/batches/${b.batchId}`}
            className="block p-5 rounded-lg border border-stone-200 bg-white hover:border-leaf-400 hover:shadow-sm transition"
          >
            <h3 className="font-semibold text-stone-900">{b.productName}</h3>
            <p className="text-sm text-stone-500 mt-1">Batch ID: {b.batchId}</p>
            <p className="text-sm text-stone-500">{b.farmLocation}</p>
            <p className="text-xs text-stone-400 mt-2">{b.events?.length || 0} event(s) recorded</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
