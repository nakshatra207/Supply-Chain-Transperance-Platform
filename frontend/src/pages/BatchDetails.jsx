import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";
import Timeline, { EVENT_LABELS } from "../components/Timeline.jsx";
import SpeakButton from "../components/SpeakButton.jsx";
import ContextualSchemesPanel from "../components/ContextualSchemesPanel.jsx";

const FRONTEND_ORIGIN = window.location.origin;

export default function BatchDetails() {
  const { batchId } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [batch, setBatch] = useState(null);
  const [onChainVerification, setOnChainVerification] = useState(null);
  const [error, setError] = useState("");
  const [eventType, setEventType] = useState(Object.keys(EVENT_LABELS)[0]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [certFile, setCertFile] = useState(null);
  const [certId, setCertId] = useState("");
  const [certMsg, setCertMsg] = useState("");
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmEventOpen, setConfirmEventOpen] = useState(false);
  const [eventSuccessMsg, setEventSuccessMsg] = useState("");
  const [copiedText, setCopiedText] = useState("");

  const copyValue = (val) => {
    if (!val || val === "—") return;
    navigator.clipboard?.writeText(String(val)).catch(() => {});
    setCopiedText(String(val));
    setTimeout(() => setCopiedText(""), 1800);
  };

  const load = useCallback(() => {
    api
      .get(`/api/batches/${batchId}`)
      .then(({ data }) => {
        setBatch(data.batch);
        setOnChainVerification(data.onChainVerification || null);
      })
      .catch((err) => setError(err.response?.data?.error || "Failed to load batch"));
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const traceUrl = `${FRONTEND_ORIGIN}/trace/${batchId}`;

  const addEvent = async (e) => {
    if (e) e.preventDefault();
    if (!confirmEventOpen) {
      setConfirmEventOpen(true);
      return;
    }
    setConfirmEventOpen(false);
    setSubmitting(true);
    setEventSuccessMsg("");
    try {
      await api.post(`/api/batches/${batchId}/events`, { eventType, location, notes });
      setLocation("");
      setNotes("");
      setEventSuccessMsg(
        lang === "hi"
          ? "✓ सप्लाई चेन इवेंट SHA-256 हैश के साथ ब्लॉकचेन पर दर्ज हो गया।"
          : "✓ Supply chain checkpoint anchored on blockchain with SHA-256 verification."
      );
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
    if (!certFile) {
      setCertMsg(
        lang === "hi"
          ? "कृपया पहले प्रमाण पत्र फ़ाइल चुनें।"
          : "Please select a certificate file to hash and upload."
      );
      return;
    }
    setCertMsg("Hashing with SHA-256 and anchoring on blockchain...");
    try {
      const base64 = await fileToBase64(certFile);
      const { data } = await api.post(`/api/batches/${batchId}/certificate`, {
        certificateId: certId || batch.organicCertId || `CERT-${batchId}`,
        certificateContentBase64: base64,
      });
      setCertMsg(`✓ Certificate SHA-256 hash recorded on blockchain: ${data.certificateHash}`);
      load();
    } catch (err) {
      setCertMsg(err.response?.data?.error || "Failed to record certificate");
    }
  };

  const verifyCertificate = async (e) => {
    e.preventDefault();
    if (!verifyFile) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const base64 = await fileToBase64(verifyFile);
      const { data } = await api.post(`/api/batches/${batchId}/certificate/verify`, {
        certificateContentBase64: base64,
      });
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({
        error: err.response?.data?.error || "Verification failed",
      });
    } finally {
      setVerifying(false);
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

  const canUploadCert =
    user?.role === "ADMIN" || (user?.role === "FARMER" && batch.farmerId === user.id);
  const canAddEvent =
    user?.role === "PARTNER" ||
    user?.role === "ADMIN" ||
    (user?.role === "FARMER" && batch.farmerId === user.id);

  const effectiveCertHash =
    batch.certificateHash || onChainVerification?.onChainCertificateHash || null;
  const effectiveTxHash = batch.chainTxHash || onChainVerification?.txHash || null;

  const batchSummarySpeech =
    lang === "hi"
      ? `बैच ${batch.batchId}: ${batch.productName}। फसल: ${batch.cropType}, स्थान: ${
          batch.farmLocation
        }, मात्रा: ${batch.quantity} ${batch.unit}। ब्लॉकचेन निर्माण स्थिति: ${
          batch.chainStatus === "CONFIRMED" ? "सत्यापित" : "प्रतीक्षारत"
        }। प्रमाण पत्र हैश: ${effectiveCertHash ? "ब्लॉकचेन पर दर्ज" : "अभी दर्ज नहीं"}।`
      : `Batch ${batch.batchId}: ${batch.productName}. Crop: ${batch.cropType}, Farm Location: ${
          batch.farmLocation
        }, Quantity: ${batch.quantity} ${batch.unit}. Blockchain status: ${
          batch.chainStatus === "CONFIRMED" ? "Confirmed on-chain" : "Pending"
        }. Certificate hash: ${effectiveCertHash ? "Recorded on blockchain" : "Not yet recorded"}.`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-stone-900">{batch.productName}</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                batch.chainStatus === "CONFIRMED"
                  ? "bg-leaf-100 text-leaf-800 border border-leaf-200"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {batch.chainStatus === "CONFIRMED" ? `✓ ${t("farmer.onChain")}` : t("farmer.chainPending")}
            </span>
          </div>
          <p className="text-stone-500 text-sm mt-0.5">
            {t("batch.batchId")}: <span className="font-mono text-stone-800">{batch.batchId}</span>
          </p>
          <div className="mt-2">
            <SpeakButton
              id="batch-details-tts"
              text={batchSummarySpeech}
              label="Read Batch & Verification Status"
              labelHi="बैच और सत्यापन स्थिति सुनें"
            />
          </div>
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
        <Info label={t("batch.farmer")} value={batch.farmer?.name || "—"} />
        <Info label={t("create.certId")} value={batch.organicCertId || onChainVerification?.certificateId || "—"} />
        <Info label="Public Trace Link" value={traceUrl} mono />
      </div>

      {/* Blockchain Storage & Cryptographic Verification Panel */}
      <div className="mt-6 bg-stone-900 text-stone-100 border border-stone-800 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span>⛓</span>
            <span>
              {lang === "hi"
                ? "ब्लॉकचेन स्टोरेज और SHA-256 सत्यापन रिकॉर्ड"
                : "Blockchain Storage & SHA-256 Cryptographic Record"}
            </span>
          </h3>
          {onChainVerification && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                onChainVerification.tamperDetected
                  ? "bg-red-900/70 text-red-200 border border-red-700"
                  : "bg-leaf-900/70 text-leaf-200 border border-leaf-700"
              }`}
            >
              {onChainVerification.tamperDetected
                ? lang === "hi"
                  ? "⚠ छेड़छाड़ का पता चला (Tamper Detected)"
                  : "⚠ Data Mismatch / Tamper Detected"
                : lang === "hi"
                ? "✓ डेटा सुरक्षित और ब्लॉकचेन से सत्यापित"
                : "✓ Tamper-Proof · SHA-256 Verified Intact"}
            </span>
          )}
        </div>

        {typeof onChainVerification?.simdIntegrityScore === "number" && (
          <div className="mt-4 bg-stone-800/90 border border-stone-700 rounded-md p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-stone-300 font-medium">
                ⚡ x86-64 SIMD Cryptographic & Traceability Score
              </span>
              <span className="font-mono font-bold text-leaf-400">
                {onChainVerification.simdIntegrityScore}/100
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone-950 overflow-hidden">
              <div
                className="h-full bg-leaf-500 transition-all duration-300"
                style={{ width: `${onChainVerification.simdIntegrityScore}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
          <DarkInfo
            label={lang === "hi" ? "ब्लॉकचेन नेटवर्क" : "Blockchain Network"}
            value={onChainVerification?.network || "OrganicTrace Cryptographic Ledger + EVM"}
          />
          <DarkInfo
            label={lang === "hi" ? "स्मार्ट कॉन्ट्रैक्ट पता (SupplyChain.sol)" : "Smart Contract Address"}
            value={onChainVerification?.contractAddress || "—"}
            mono
            onCopy={copyValue}
            copiedText={copiedText}
          />
          <DarkInfo
            label={t("batch.txHash")}
            value={effectiveTxHash || "—"}
            mono
            onCopy={copyValue}
            copiedText={copiedText}
          />
          <DarkInfo
            label={lang === "hi" ? "ब्लॉक संख्या और ऑन-चेन इवेंट्स" : "Block # & Anchored Events"}
            value={`Block #${onChainVerification?.blockNumber || 1} · ${
              onChainVerification?.onChainEventsCount ?? (batch.events?.length || 0)
            } event(s) on-chain`}
          />
          <div className="sm:col-span-2">
            <DarkInfo
              label={
                lang === "hi"
                  ? "बैच मेटाडेटा SHA-256 हैश (Canonical Batch Hash)"
                  : "Batch Metadata SHA-256 Hash (On-Chain Anchor)"
              }
              value={onChainVerification?.metadataHash || "—"}
              mono
              onCopy={copyValue}
              copiedText={copiedText}
            />
          </div>
          <div className="sm:col-span-2">
            <DarkInfo
              label={
                lang === "hi"
                  ? "जैविक प्रमाण पत्र SHA-256 हैश (Certificate Hash)"
                  : "Certificate SHA-256 Hash (On-Chain)"
              }
              value={effectiveCertHash || "Not yet recorded"}
              mono
              onCopy={copyValue}
              copiedText={copiedText}
            />
          </div>
          {onChainVerification?.merkleRoot && (
            <div className="sm:col-span-2">
              <DarkInfo
                label={
                  lang === "hi"
                    ? `C11 + SHA-NI बाइनरी मर्कल रूट (${onChainVerification.merkleLeavesCount || 1} हैश लीव्स)`
                    : `C11 + SHA-NI Binary Merkle Tree Root (${onChainVerification.merkleLeavesCount || 1} Anchored Leaves)`
                }
                value={onChainVerification.merkleRoot}
                mono
                onCopy={copyValue}
                copiedText={copiedText}
              />
            </div>
          )}
        </div>
      </div>

      {canUploadCert && (
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
            <input type="file" onChange={(e) => setCertFile(e.target.files?.[0] || null)} className="text-sm" />
            <button className="px-3 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 transition">
              {t("batch.uploadBtn")}
            </button>
          </form>
          {certMsg && <p className="text-xs mt-2 text-leaf-800 font-mono break-all">{certMsg}</p>}
        </div>
      )}

      {effectiveCertHash && (
        <div className="mt-6 bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900">
            {lang === "hi"
              ? "प्रमाण पत्र फ़ाइल की ब्लॉकचेन हैश से सत्यता जांचें (SHA-256)"
              : "Verify Certificate Document Against Blockchain SHA-256 Hash"}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {lang === "hi"
              ? "किसी भी प्रमाण पत्र फ़ाइल को अपलोड करके जांचें कि उसका SHA-256 हैश ब्लॉकचेन पर दर्ज हैश से मेल खाता है या नहीं।"
              : "Select a certificate document to recompute its SHA-256 hash and compare it in constant-time against the immutable blockchain record."}
          </p>
          <form onSubmit={verifyCertificate} className="mt-3 flex flex-wrap gap-2 items-center">
            <input
              type="file"
              onChange={(e) => {
                setVerifyFile(e.target.files?.[0] || null);
                setVerifyResult(null);
              }}
              className="text-sm"
            />
            <button
              disabled={!verifyFile || verifying}
              className="px-3 py-2 rounded-md bg-stone-800 text-white text-sm font-medium hover:bg-stone-900 disabled:opacity-50 transition"
            >
              {verifying
                ? lang === "hi"
                  ? "जांच हो रही है..."
                  : "Verifying..."
                : lang === "hi"
                ? "प्रमाण पत्र सत्यापित करें"
                : "Verify Against Blockchain"}
            </button>
          </form>
          {verifyResult && (
            <div
              className={`mt-3 p-3 rounded-md text-xs border ${
                verifyResult.error
                  ? "bg-red-50 border-red-200 text-red-700"
                  : verifyResult.match
                  ? "bg-leaf-50 border-leaf-200 text-leaf-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {verifyResult.error ? (
                <p>{verifyResult.error}</p>
              ) : (
                <>
                  <p className="font-semibold">
                    {verifyResult.match
                      ? lang === "hi"
                        ? "✓ प्रमाण पत्र प्रामाणिक है — SHA-256 हैश ब्लॉकचेन रिकॉर्ड से बिल्कुल मेल खाता है!"
                        : "✓ Certificate Authentic — SHA-256 hash matches the on-chain blockchain record!"
                      : lang === "hi"
                      ? "✗ प्रमाण पत्र मेल नहीं खाता — यह फ़ाइल ब्लॉकचेन पर दर्ज प्रमाण पत्र से भिन्न है!"
                      : "✗ Hash Mismatch — This file does not match the certificate hash anchored on-chain!"}
                  </p>
                  <p className="font-mono mt-1 break-all">Computed: {verifyResult.computedHash}</p>
                  <p className="font-mono break-all">On-Chain: {verifyResult.storedHash}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {canAddEvent && (
        <div className="mt-6 bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900">{t("batch.addEventTitle")}</h3>
          <p className="text-xs text-stone-500 mt-1">
            {lang === "hi"
              ? "प्रत्येक सप्लाई चेन चरण का SHA-256 हैश बनाकर स्थायी रूप से ब्लॉकचेन पर दर्ज किया जाता है।"
              : "Each checkpoint is hashed with SHA-256 and permanently anchored on the blockchain."}
          </p>
          {eventSuccessMsg && (
            <div className="mt-3 p-2.5 rounded-md bg-leaf-50 border border-leaf-200 text-xs font-medium text-leaf-800">
              {eventSuccessMsg}
            </div>
          )}
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

            {confirmEventOpen ? (
              <div className="sm:col-span-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                  {lang === "hi"
                    ? `क्या आप वाकई "${t(`event.${eventType}`, EVENT_LABELS[eventType])}" को अपरिवर्तनीय ब्लॉकचेन पर दर्ज करना चाहते हैं?`
                    : `Confirm anchoring "${t(`event.${eventType}`, EVENT_LABELS[eventType])}" permanently to the immutable blockchain ledger?`}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmEventOpen(false)}
                    className="px-3 py-1.5 rounded border border-stone-300 bg-white text-stone-700 text-xs font-medium hover:bg-stone-100"
                  >
                    {lang === "hi" ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 py-1.5 rounded bg-leaf-600 text-white text-xs font-semibold hover:bg-leaf-700"
                  >
                    {submitting
                      ? t("batch.recordingEvent")
                      : lang === "hi"
                      ? "✓ हाँ, ब्लॉकचेन पर दर्ज करें"
                      : "✓ Confirm & Anchor"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={submitting}
                className="sm:col-span-2 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 disabled:opacity-60 transition"
              >
                {submitting ? t("batch.recordingEvent") : t("batch.recordEventBtn")}
              </button>
            )}
          </form>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-stone-900">{t("batch.timelineTitle")}</h2>
      <div className="mt-4">
        <Timeline batch={batch} />
      </div>

      <ContextualSchemesPanel
        batchId={batch.batchId}
        isFarmerOwner={user?.role === "FARMER" && batch.farmerId === user.id}
      />
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

function DarkInfo({ label, value, mono, onCopy, copiedText }) {
  const canCopy = mono && onCopy && value && value !== "—" && value !== "Not yet recorded";
  const isCopied = canCopy && copiedText === String(value);
  return (
    <div className="bg-stone-800/80 rounded px-3 py-2 border border-stone-700/70">
      <div className="flex items-center justify-between gap-2">
        <p className="text-stone-400 text-[11px]">{label}</p>
        {canCopy && (
          <button
            type="button"
            onClick={() => onCopy(value)}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-700/80 hover:bg-leaf-700 text-stone-200 transition"
          >
            {isCopied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
      <p className={`text-stone-100 mt-0.5 ${mono ? "font-mono text-[11px] break-all" : "font-medium"}`}>
        {value}
      </p>
    </div>
  );
}
