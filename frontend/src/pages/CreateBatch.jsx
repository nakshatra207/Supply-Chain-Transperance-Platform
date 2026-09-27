import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../LanguageContext.jsx";

const empty = {
  batchId: "",
  productName: "",
  cropType: "",
  farmLocation: "",
  harvestDate: "",
  quantity: "",
  unit: "kg",
  organicCertId: "",
  description: "",
};

export default function CreateBatch() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/batches", {
        ...form,
        quantity: parseFloat(form.quantity),
      });
      navigate(`/batches/${data.batch.batchId}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-stone-900">{t("create.title")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("create.batchId")} placeholder="ORG-BAS-001" value={form.batchId} onChange={update("batchId")} />
          <Field label={t("create.productName")} placeholder="Organic Basmati Rice" value={form.productName} onChange={update("productName")} />
          <Field label={t("create.cropType")} placeholder="Basmati Rice" value={form.cropType} onChange={update("cropType")} />
          <Field label={t("create.farmLocation")} placeholder="Karnal, Haryana" value={form.farmLocation} onChange={update("farmLocation")} />
          <Field label={t("create.harvestDate")} type="date" value={form.harvestDate} onChange={update("harvestDate")} />
          <Field label={t("create.certId")} placeholder="CERT-001" value={form.organicCertId} onChange={update("organicCertId")} required={false} />
          <Field label={t("create.quantity")} type="number" value={form.quantity} onChange={update("quantity")} />
          <div>
            <label className="block text-sm font-medium text-stone-700">{t("create.unit")}</label>
            <select value={form.unit} onChange={update("unit")} className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white">
              <option value="kg">kg (किलोग्राम)</option>
              <option value="tonnes">tonnes (टन)</option>
              <option value="litres">litres (लीटर)</option>
              <option value="units">units (इकाइयां / पैकेट)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("create.description")}</label>
          <textarea value={form.description} onChange={update("description")} rows={3} className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full py-2.5 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 disabled:opacity-60 transition">
          {loading ? t("create.submitting") : t("create.submitBtn")}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", required = true }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}
