import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const [batchId, setBatchId] = useState("");
  const navigate = useNavigate();

  const goToTrace = (e) => {
    e.preventDefault();
    if (batchId.trim()) navigate(`/trace/${batchId.trim()}`);
  };

  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-leaf-100 text-leaf-700 text-xs font-medium mb-4">
          B.Tech Major Project · Blockchain Traceability
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">
          From Farm to Consumer — <span className="text-leaf-600">Verified Traceability</span>
        </h1>
        <p className="mt-4 text-stone-600 max-w-2xl mx-auto">
          Track every organic product batch from the farmer's field through processing, distribution,
          and retail — with a tamper-evident record backed by blockchain.
        </p>

        <form onSubmit={goToTrace} className="mt-8 max-w-md mx-auto flex gap-2">
          <input
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="Enter Batch ID e.g. ORG-BAS-001"
            className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
          />
          <button className="px-4 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700">
            Trace Product
          </button>
        </form>
      </section>

      <section className="bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-14 grid sm:grid-cols-3 gap-8">
          {[
            { title: "1. Farmer Registers Batch", desc: "Product details are stored in the database and a creation record is written on-chain." },
            { title: "2. Supply Chain Events", desc: "Processors, distributors and retailers add tamper-evident event records as the product moves." },
            { title: "3. Customer Scans QR", desc: "Anyone can scan the batch QR code to see the full verified history — no login required." },
          ].map((s) => (
            <div key={s.title} className="p-5 rounded-lg border border-stone-200 bg-stone-50">
              <h3 className="font-semibold text-stone-900">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-semibold text-stone-900 text-center">Why blockchain here</h2>
        <p className="mt-3 text-center text-stone-600 max-w-2xl mx-auto text-sm">
          The blockchain stores batch IDs, event metadata, timestamps and cryptographic hashes —
          never documents, images, or personal data. This creates a tamper-evident audit trail while
          keeping the bulk of application data in PostgreSQL.
        </p>
        <div className="mt-6 text-xs text-stone-500 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-md p-4">
          <strong>Important:</strong> Blockchain provides a tamper-evident and auditable record of
          submitted and verified supply-chain information. Physical product authenticity still depends
          on trusted participants, certification authorities, inspections, and other verification
          mechanisms.
        </div>
      </section>
    </div>
  );
}
