import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api.js";
import Timeline from "../components/Timeline.jsx";

export default function Trace() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/trace/${batchId}`)
      .then(({ data }) => {
        setBatch(data.batch);
        setDisclaimer(data.disclaimer);
      })
      .catch((err) => setError(err.response?.data?.error || "Product not found"));
  }, [batchId]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-stone-500 mt-2">Batch ID: {batchId}</p>
      </div>
    );
  }
  if (!batch) return <p className="max-w-2xl mx-auto px-4 py-16 text-stone-500 text-center">Loading...</p>;

  const isVerified = !!batch.certificateHash;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-leaf-100 text-leaf-700 text-xs font-medium">
          Public Product Traceability
        </span>
        <h1 className="text-3xl font-bold text-stone-900 mt-3">{batch.productName}</h1>
        <p className="text-stone-500 text-sm">Batch ID: {batch.batchId}</p>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm bg-white border border-stone-200 rounded-lg p-6">
        <Info label="Crop" value={batch.cropType} />
        <Info label="Farm Location" value={batch.farmLocation} />
        <Info label="Harvest Date" value={new Date(batch.harvestDate).toLocaleDateString()} />
        <Info label="Quantity" value={`${batch.quantity} ${batch.unit}`} />
        <Info label="Farmer" value={batch.farmer?.name || "—"} />
        <Info
          label="Certification Status"
          value={isVerified ? "✓ Certificate hash verified on-chain" : "Pending certificate submission"}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900 text-center">Supply Chain Timeline</h2>
      <div className="mt-6 max-w-xl mx-auto">
        <Timeline batch={batch} />
      </div>

      <div className="mt-10 text-xs text-stone-500 max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
        {disclaimer}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-stone-500 text-xs">{label}</p>
      <p className="text-stone-800">{value}</p>
    </div>
  );
}
