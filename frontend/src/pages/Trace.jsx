import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../api.js";
import Timeline, { EVENT_LABELS } from "../components/Timeline.jsx";
import SpeakButton from "../components/SpeakButton.jsx";
import ContextualSchemesPanel from "../components/ContextualSchemesPanel.jsx";
import { useLanguage } from "../LanguageContext.jsx";
import { useVoice } from "../VoiceContext.jsx";

export default function Trace() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [onChainVerification, setOnChainVerification] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [error, setError] = useState("");
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const { t, lang } = useLanguage();
  const { speak, lastExecutedAction } = useVoice();

  const copyValue = (val) => {
    if (!val || val === "—") return;
    navigator.clipboard?.writeText(String(val)).catch(() => {});
    setCopiedText(String(val));
    setTimeout(() => setCopiedText(""), 1800);
  };

  useEffect(() => {
    api
      .get(`/api/trace/${batchId}`)
      .then(({ data }) => {
        setBatch(data.batch);
        setOnChainVerification(data.onChainVerification || null);
        setDisclaimer(data.disclaimer);
      })
      .catch((err) => setError(err.response?.data?.error || t("trace.notFound")));
  }, [batchId, t]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

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

  const journeyNarration = useMemo(() => {
    if (!batch) return "";
    const isVerified = !!(batch.certificateHash || onChainVerification?.onChainCertificateHash);
    const isOnChain = batch.chainStatus === "CONFIRMED";
    const eventsSummary = (batch.events || [])
      .map((e) => `${EVENT_LABELS[e.eventType] || e.eventType} at ${e.location || "facility"}`)
      .join(", then ");

    if (lang === "hi") {
      return `उत्पाद: ${batch.productName}, बैच आईडी ${batch.batchId}। किसान: ${
        batch.farmer?.name || "पंजीकृत किसान"
      }, स्थान: ${batch.farmLocation}। कुल मात्रा: ${batch.quantity} ${batch.unit}। ब्लॉकचेन निर्माण स्थिति: ${
        isOnChain ? "ब्लॉकचेन पर सत्यापित" : "प्रतीक्षारत"
      }। जैविक प्रमाण पत्र हैश: ${
        isVerified ? "ब्लॉकचेन पर सत्यापित" : "जमा होना शेष"
      }। सप्लाई चेन यात्रा में कुल ${(batch.events || []).length} चरण दर्ज हैं।`;
    }

    return `Product: ${batch.productName}, Batch ID ${batch.batchId}. Grown by ${
      batch.farmer?.name || "Registered Farmer"
    } in ${batch.farmLocation}. Quantity: ${batch.quantity} ${batch.unit}. Blockchain Record Status: ${
      isOnChain ? "Confirmed on-chain" : "Pending confirmation"
    }. Organic Certificate Hash: ${
      isVerified ? "Verified on blockchain" : "Pending certificate submission"
    }. ${
      eventsSummary
        ? `Supply chain journey includes: ${eventsSummary}.`
        : "No intermediate processing events recorded yet."
    }`;
  }, [batch, onChainVerification, lang]);

  // Listen for voice read-aloud or verify-blockchain trigger
  useEffect(() => {
    if (!batch || !journeyNarration) return;
    const handleVoiceRead = () => {
      speak(journeyNarration, { id: "trace-journey-tts" });
    };
    window.addEventListener("organic-trace:voice-read-page", handleVoiceRead);

    if (
      lastExecutedAction?.type === "VERIFY_BLOCKCHAIN" &&
      lastExecutedAction?.params?.batchId === batch.batchId
    ) {
      speak(journeyNarration, { id: "trace-journey-tts" });
    }

    return () => window.removeEventListener("organic-trace:voice-read-page", handleVoiceRead);
  }, [batch, journeyNarration, speak, lastExecutedAction]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-sm text-stone-500 mt-2">{t("batch.batchId")}: {batchId}</p>
      </div>
    );
  }
  if (!batch) return <p className="max-w-2xl mx-auto px-4 py-16 text-stone-500 text-center">{t("trace.loading")}</p>;

  const effectiveCertHash =
    batch.certificateHash || onChainVerification?.onChainCertificateHash || null;
  const effectiveTxHash = batch.chainTxHash || onChainVerification?.txHash || null;
  const isVerified = !!effectiveCertHash;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-leaf-100 text-leaf-700 text-xs font-medium">
          {t("trace.badge")}
        </span>
        <h1 className="text-3xl font-bold text-stone-900 mt-3">{batch.productName}</h1>
        <p className="text-stone-500 text-sm mt-1">
          {t("batch.batchId")}: <span className="font-mono text-stone-800">{batch.batchId}</span>
        </p>
        <div className="mt-3 flex justify-center">
          <SpeakButton
            id="trace-journey-tts"
            text={journeyNarration}
            label="Read Product Journey & Blockchain Verification"
            labelHi="उत्पाद यात्रा और ब्लॉकचेन सत्यापन सुनें"
            size="md"
          />
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <Info label={t("batch.crop")} value={batch.cropType} />
        <Info label={t("batch.location")} value={batch.farmLocation} />
        <Info
          label={t("batch.harvestDate")}
          value={new Date(batch.harvestDate).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US")}
        />
        <Info label={t("batch.quantity")} value={`${batch.quantity} ${batch.unit}`} />
        <Info label={t("batch.farmer")} value={batch.farmer?.name || "—"} />
        <Info
          label={t("trace.certStatus")}
          value={
            isVerified ? (
              <span className="text-leaf-700 font-medium">{t("trace.certVerified")}</span>
            ) : (
              <span className="text-amber-600">{t("trace.certPending")}</span>
            )
          }
        />
      </div>

      {/* Live Blockchain Verification & Cryptographic Audit Card */}
      <div className="mt-6 bg-stone-900 text-stone-100 border border-stone-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <span>⛓</span>
            <span>
              {lang === "hi"
                ? "लाइव ब्लॉकचेन और SHA-256 अखंडता जांच"
                : "Live Blockchain & SHA-256 Tamper Verification"}
            </span>
          </h3>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              onChainVerification?.tamperDetected
                ? "bg-red-900/70 text-red-200 border border-red-700"
                : "bg-leaf-900/70 text-leaf-200 border border-leaf-700"
            }`}
          >
            {onChainVerification?.tamperDetected
              ? lang === "hi"
                ? "⚠ डेटा छेड़छाड़ की चेतावनी"
                : "⚠ Data Mismatch / Tamper Detected"
              : lang === "hi"
              ? "✓ छेड़छाड़-रहित · ब्लॉकचेन पर सत्यापित"
              : "✓ Verified Intact · On-Chain Match"}
          </span>
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
            label={lang === "hi" ? "नेटवर्क" : "Network"}
            value={onChainVerification?.network || "OrganicTrace Cryptographic Ledger + EVM"}
          />
          <DarkInfo
            label={lang === "hi" ? "स्मार्ट कॉन्ट्रैक्ट (SupplyChain.sol)" : "Smart Contract Address"}
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
            label={lang === "hi" ? "ब्लॉक और ऑन-चेन चरण" : "Block & On-Chain Events"}
            value={`Block #${onChainVerification?.blockNumber || 1} · ${
              onChainVerification?.onChainEventsCount ?? (batch.events?.length || 0)
            } verified event(s)`}
          />
          <div className="sm:col-span-2">
            <DarkInfo
              label={
                lang === "hi"
                  ? "उत्पाद मेटाडेटा SHA-256 हैश (Canonical Metadata Hash)"
                  : "Batch Metadata SHA-256 Hash (Tamper-Detection Anchor)"
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
                  : "Organic Certificate SHA-256 Hash"
              }
              value={effectiveCertHash || "Pending certificate submission"}
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

        {effectiveCertHash && (
          <div className="mt-4 pt-4 border-t border-stone-800">
            <p className="text-xs font-medium text-stone-200">
              {lang === "hi"
                ? "प्रमाण पत्र फ़ाइल सत्यापित करें (Verify Certificate File):"
                : "Verify Certificate File Against On-Chain SHA-256 Hash:"}
            </p>
            <form onSubmit={verifyCertificate} className="mt-2 flex flex-wrap gap-2 items-center">
              <input
                type="file"
                onChange={(e) => {
                  setVerifyFile(e.target.files?.[0] || null);
                  setVerifyResult(null);
                }}
                className="text-xs text-stone-300"
              />
              <button
                disabled={!verifyFile || verifying}
                className="px-3 py-1.5 rounded-md bg-leaf-600 text-white text-xs font-medium hover:bg-leaf-700 disabled:opacity-50 transition"
              >
                {verifying
                  ? lang === "hi"
                    ? "जांच हो रही है..."
                    : "Verifying..."
                  : lang === "hi"
                  ? "SHA-256 हैश मिलाएं"
                  : "Verify Certificate"}
              </button>
            </form>
            {verifyResult && (
              <div
                className={`mt-2 p-2.5 rounded text-xs border ${
                  verifyResult.error || !verifyResult.match
                    ? "bg-red-950/80 border-red-800 text-red-200"
                    : "bg-leaf-950/80 border-leaf-800 text-leaf-200"
                }`}
              >
                {verifyResult.error ? (
                  <p>{verifyResult.error}</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      {verifyResult.match
                        ? lang === "hi"
                          ? "✓ प्रमाण पत्र प्रामाणिक है — SHA-256 हैश ब्लॉकचेन से मेल खाता है!"
                          : "✓ Authentic — Document SHA-256 matches the immutable blockchain hash!"
                        : lang === "hi"
                        ? "✗ हैश मेल नहीं खाता — यह फ़ाइल ब्लॉकचेन रिकॉर्ड से भिन्न है!"
                        : "✗ Mismatch — Document SHA-256 does not match the blockchain certificate hash!"}
                    </p>
                    <p className="font-mono text-[11px] mt-1 break-all">
                      Computed: {verifyResult.computedHash}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900 text-center">{t("trace.timelineTitle")}</h2>
      <div className="mt-6 max-w-xl mx-auto">
        <Timeline batch={batch} />
      </div>

      <div className="mt-10 text-xs text-stone-500 max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-md p-4 text-center">
        {lang === "hi" ? t("footer.disclaimer") : disclaimer || t("footer.disclaimer")}
      </div>

      <ContextualSchemesPanel batchId={batch.batchId} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-stone-500 text-xs">{label}</p>
      <div className="text-stone-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function DarkInfo({ label, value, mono, onCopy, copiedText }) {
  const canCopy = mono && onCopy && value && value !== "—" && value !== "Pending certificate submission";
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
