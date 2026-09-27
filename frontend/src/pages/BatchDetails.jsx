import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";
import Timeline, { EVENT_LABELS } from "../components/Timeline.jsx";

const FRONTEND_ORIGIN = window.location.origin;

export default function BatchDetails() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState("");
  const [eventType, setEventType] = useState(Object.keys(EVENT_LABELS)[0]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certId, setCertId] = useState("");
  const [certMsg, setCertMsg] = useState("");

  const load = () => {
    api
      .get(`/api/batches/${batchId}`)
      .then(({ data }) => setBatch(data.batch))
      .catch((err) => setError(err.response?.data?.error || "Failed to load batch"));
  };

  useEffect(load, [batchId]);

  const traceUrl = `${FRONTEND_ORIGIN}/trace/${batchId}`;

  const addEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/batches/${batchId}/events`, { eventType, location, notes });
      setLocation("");
      setNotes("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record event");
    } finally {
      setSubmitting(false);
    }
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadCertificate = async (e) => {
    e.preventDefault();
    if (!certFile) return;
    setCertMsg("Hashing and submitting...");
    try {
      const base64 = await fileToBase64(certFile);
      const { data } = await api.post(`/api/batches/${batchId}/certificate`, {
        certificateId: certId || `CERT-${batchId}`,
        certificateContentBase64: base64,
      });
      setCertMsg(`✓ Certificate hash recorded: ${data.certificateHash}`);
      load();
    } catch (err) {
      setCertMsg(err.response?.data?.error || "Failed to record certificate");
    }
  };

  const downloadQr = () => {
    const canvas = document.getElementById("batch-qr");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batchId}-qr.png`;
    a.click();
  };

  if (error) return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">{error}</p>;
  if (!batch) return <p className="max-w-3xl mx-auto px-4 py-10 text-stone-500">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{batch.productName}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{t("batch.batchId")}: {batch.batchId}</p>
        </div>
        <div className="text-center bg-white p-3 border border-stone-200 rounded-lg shadow-sm">
          <QRCodeCanvas id="batch-qr" value={traceUrl} size={120} includeMargin />
          <button onClick={downloadQr} className="block mt-2 text-xs text-leaf-700 font-medium hover:underline">
            {t("batch.downloadQr")}
          </button>
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
        <Info label={t("batch.crop")} value={batch.cropType} />
        <Info label={t("batch.location")} value={batch.farmLocation} />
        <Info
          label={t("batch.harvestDate")}
          value={new Date(batch.harvestDate).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US")}
        />
        <Info label={t("batch.quantity")} value={`${batch.quantity} ${batch.unit}`} />
        <Info label={t("create.certId")} value={batch.organicCertId || "—"} />
        <Info label="Certificate SHA-256 Hash" value={batch.certificateHash || "Not yet recorded"} mono />
        <Info label="Public Trace Link" value={traceUrl} mono />
      </div>

      {user?.role === "FARMER" && batch.farmerId === user.id && (
        <div className="mt-6 bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900">{t("batch.uploadCertTitle")}</h3>
          <p className="text-xs text-stone-500 mt-1">
            {lang === "hi"
              ? "दस्तावेज़ स्वयं ऑफ़-चेन रहता है। केवल इसका SHA-256 हैश ब्लॉकचेन पर लिखा जाता है।"
              : "The document itself stays off-chain. Only its SHA-256 cryptographic hash is written to the blockchain."}
          </p>
          <form onSubmit={uploadCertificate} className="mt-3 flex flex-wrap gap-2 items-center">
            <input
              placeholder={t("batch.certIdInput")}
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              className="border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
            />
            <input type="file" onChange={(e) => setCertFile(e.target.files[0])} className="text-sm" />
            <button className="px-3 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 transition">
              {t("batch.uploadBtn")}
            </button>
          </form>
          {certMsg && <p className="text-xs mt-2 text-stone-600 break-all">{certMsg}</p>}
        </div>
      )}

      {user?.role === "PARTNER" && (
        <div className="mt-6 bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900">{t("batch.addEventTitle")}</h3>
          <form onSubmit={addEvent} className="mt-3 grid sm:grid-cols-2 gap-3">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              {Object.entries(EVENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(`event.${k}`, v)}
                </option>
              ))}
            </select>
            <input
              placeholder={t("batch.eventLocation")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-stone-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              placeholder={t("batch.eventNotes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border border-stone-300 rounded-md px-3 py-2 text-sm sm:col-span-2"
            />
            <button
              disabled={submitting}
              className="sm:col-span-2 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 disabled:opacity-60 transition"
            >
              {submitting ? t("batch.recordingEvent") : t("batch.recordEventBtn")}
            </button>
          </form>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-stone-900">{t("batch.timelineTitle")}</h2>
      <div className="mt-4">
        <Timeline batch={batch} />
      </div>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div>
      <p className="text-stone-500 text-xs">{label}</p>
      <p className={`text-stone-800 ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</p>
    </div>
  );
}
