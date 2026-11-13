import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";
import { useVoice } from "../VoiceContext.jsx";
import SpeakButton from "../components/SpeakButton.jsx";
import {
  SCHEME_CATEGORY_META,
  BENEFICIARY_TYPE_META,
  STATUS_BADGE_META,
} from "../constants/schemes.js";

export default function SchemeDetails() {
  const { schemeCode } = useParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { speak } = useVoice();

  const [scheme, setScheme] = useState(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmUrl, setConfirmUrl] = useState(null);

  // Farmer optional batch-linking state
  const [farmerBatches, setFarmerBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [utilizationNote, setUtilizationNote] = useState("");
  const [linkStatusMsg, setLinkStatusMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get(`/api/schemes/${schemeCode}`)
      .then(({ data }) => {
        setScheme(data.scheme);
        setDisclaimer(data.disclaimer || "");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Scheme not found");
      })
      .finally(() => setLoading(false));
  }, [schemeCode]);

  useEffect(() => {
    if (user && (user.role === "FARMER" || user.role === "ADMIN")) {
      api
        .get("/api/batches")
        .then(({ data }) => {
          const list = data.batches || [];
          setFarmerBatches(list);
          if (list.length > 0) setSelectedBatchId(list[0].batchId);
        })
        .catch(() => {});
    }
  }, [user]);

  // Listen for voice "read page aloud" command
  useEffect(() => {
    if (!scheme) return;
    const handleVoiceRead = () => {
      const name = lang === "hi" && scheme.nameHi ? scheme.nameHi : scheme.name;
      const desc = lang === "hi" && scheme.descriptionHi ? scheme.descriptionHi : scheme.description;
      const benefit =
        lang === "hi" && scheme.benefitSummaryHi ? scheme.benefitSummaryHi : scheme.benefitSummary;
      const elig = (
        lang === "hi" && scheme.eligibilityCriteriaHi?.length
          ? scheme.eligibilityCriteriaHi
          : scheme.eligibilityCriteria
      ).join(". ");
      speak(`${name}. ${desc}. ${benefit}. ${elig}`, { id: "scheme-full-page" });
    };
    window.addEventListener("organic-trace:voice-read-page", handleVoiceRead);
    return () => window.removeEventListener("organic-trace:voice-read-page", handleVoiceRead);
  }, [scheme, lang, speak]);

  const handleLinkToBatch = async (e) => {
    e.preventDefault();
    if (!selectedBatchId || !scheme) return;
    setLinkStatusMsg("");
    try {
      await api.post(`/api/schemes/${scheme.schemeCode}/link-batch`, {
        batchId: selectedBatchId,
        utilizationNote,
      });
      setLinkStatusMsg(
        lang === "hi"
          ? `✓ यह योजना बैच ${selectedBatchId} के साथ सफलतापूर्वक जोड़ी गई`
          : `✓ Linked ${scheme.schemeCode} to batch ${selectedBatchId} (informational profile metadata)`
      );
      setUtilizationNote("");
    } catch (err) {
      setLinkStatusMsg(err.response?.data?.error || "Could not link scheme to batch");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">
        {lang === "hi" ? "योजना विवरण लोड हो रहा है..." : "Loading government scheme details..."}
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 font-semibold">{error || "Scheme not found"}</p>
        <Link
          to="/schemes"
          className="inline-block mt-4 px-4 py-2 rounded-lg bg-leaf-600 text-white text-xs font-semibold"
        >
          ← {lang === "hi" ? "सभी सरकारी योजनाओं पर वापस जाएं" : "Back to Government Schemes"}
        </Link>
      </div>
    );
  }

  const displayName = lang === "hi" && scheme.nameHi ? scheme.nameHi : scheme.name;
  const displayDesc = lang === "hi" && scheme.descriptionHi ? scheme.descriptionHi : scheme.description;
  const displayBenefit =
    lang === "hi" && scheme.benefitSummaryHi ? scheme.benefitSummaryHi : scheme.benefitSummary;
  const eligibilityList =
    lang === "hi" && scheme.eligibilityCriteriaHi?.length > 0
      ? scheme.eligibilityCriteriaHi
      : scheme.eligibilityCriteria || [];
  const docsList =
    lang === "hi" && scheme.requiredDocumentsHi?.length > 0
      ? scheme.requiredDocumentsHi
      : scheme.requiredDocuments || [];
  const stepsList =
    lang === "hi" && scheme.applicationStepsHi?.length > 0
      ? scheme.applicationStepsHi
      : scheme.applicationSteps || [];

  const statusMeta =
    STATUS_BADGE_META[scheme.applicationStatus] || STATUS_BADGE_META.STATUS_UNVERIFIED;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-4">
        <Link
          to="/schemes"
          className="text-xs font-semibold text-leaf-700 hover:underline inline-flex items-center gap-1"
        >
          ← {lang === "hi" ? "सरकारी योजना डैशबोर्ड पर वापस जाएं" : "Back to Government Schemes Dashboard"}
        </Link>
      </div>

      {/* Main Scheme Header Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm border-t-4 border-t-leaf-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-stone-100 text-stone-800 font-mono text-xs font-bold border border-stone-200">
              {scheme.schemeCode}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.className}`}>
              {lang === "hi" ? statusMeta.labelHi : statusMeta.label}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
              {scheme.governmentLevel === "STATE"
                ? `🏛️ State Scheme (${scheme.state})`
                : lang === "hi"
                ? "🇮🇳 केंद्रीय सरकारी योजना"
                : "🇮🇳 Central Government Scheme"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-leaf-50 text-leaf-800 border border-leaf-200 text-xs font-medium">
              {scheme.verificationStatus === "OFFICIAL_VERIFIED"
                ? lang === "hi"
                  ? "✓ आधिकारिक स्रोत सत्यापित"
                  : "✓ Official Source Verified"
                : lang === "hi"
                ? "ℹ क्यूरेटेड आधिकारिक रिकॉर्ड"
                : "ℹ Curated Official Record"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/assistant?scheme=${encodeURIComponent(scheme.schemeCode)}&q=${encodeURIComponent(
                lang === "hi"
                  ? `${scheme.schemeCode} (${displayName}) योजना के लाभ, पात्रता, आवश्यक दस्तावेज़ और आवेदन प्रक्रिया विस्तार से समझाएं`
                  : `Explain ${scheme.schemeCode} (${scheme.name}) benefits, eligibility criteria, required documents, and step-by-step application process`
              )}`}
              className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-leaf-800 transition inline-flex items-center gap-1.5"
            >
              <span>🤖</span>
              <span>{lang === "hi" ? "एआई से इस योजना पर पूछें" : "Ask AI About This Scheme"}</span>
            </Link>
            <SpeakButton
              id="scheme-summary-tts"
              text={`${displayName}. ${displayDesc}. ${displayBenefit}`}
              label="Read Summary"
              labelHi="योजना सारांश सुनें"
              size="md"
            />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-3">{displayName}</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          {scheme.ministry}
          {scheme.department ? ` · ${scheme.department}` : ""}
        </p>

        <p className="mt-4 text-sm text-stone-700 leading-relaxed">{displayDesc}</p>

        {/* Key Metadata Grid */}
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-stone-50 border border-stone-200 rounded-xl p-4">
          <div>
            <p className="text-stone-500">{lang === "hi" ? "सहायता का प्रकार" : "Assistance Type"}</p>
            <p className="font-semibold text-stone-900 mt-0.5">{scheme.fundingType.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-stone-500">{lang === "hi" ? "अधिकतम लाभ / सीमा" : "Maximum Benefit"}</p>
            <p className="font-semibold text-leaf-800 mt-0.5">
              {scheme.maxBenefitAmount || (scheme.maxSubsidyPercent ? `Up to ${scheme.maxSubsidyPercent}%` : "As per official norms")}
            </p>
          </div>
          <div>
            <p className="text-stone-500">{lang === "hi" ? "आवेदन विंडो" : "Application Window"}</p>
            <p className="font-semibold text-stone-900 mt-0.5">
              {scheme.isRollingApplication
                ? lang === "hi"
                  ? "वर्ष भर चालू (Rolling)"
                  : "Open Year-Round (Rolling)"
                : scheme.applicationEndDate
                ? `Until ${new Date(scheme.applicationEndDate).toLocaleDateString()}`
                : "Seasonal Window"}
            </p>
          </div>
          <div>
            <p className="text-stone-500">{lang === "hi" ? "अंतिम सत्यापन तिथि" : "Last Verified Date"}</p>
            <p className="font-semibold text-stone-900 mt-0.5">
              {new Date(scheme.lastVerifiedAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Subsidy & Financial Benefit Box */}
        <div className="mt-5 p-4 rounded-xl bg-leaf-50 border border-leaf-200">
          <h2 className="text-sm font-bold text-leaf-900">
            💰 {lang === "hi" ? "सब्सिडी, अनुदान और वित्तीय सहायता विवरण" : "Subsidy, Grant & Financial Assistance Details"}
          </h2>
          <p className="mt-1.5 text-sm text-stone-800 leading-relaxed">{displayBenefit}</p>
        </div>

        {/* Official Portal Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmUrl(scheme.officialPortalUrl)}
            className="px-5 py-2.5 rounded-xl bg-leaf-600 text-white text-sm font-semibold hover:bg-leaf-700 transition shadow-xs"
          >
            🌐 {lang === "hi" ? "आधिकारिक सरकारी पोर्टल पर आवेदन करें ↗" : "Apply on Official Government Portal ↗"}
          </button>

          {scheme.guidelinesUrl && (
            <button
              type="button"
              onClick={() => setConfirmUrl(scheme.guidelinesUrl)}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 transition"
            >
              📄 {lang === "hi" ? "आधिकारिक दिशानिर्देश देखें ↗" : "Official Scheme Guidelines ↗"}
            </button>
          )}
        </div>
      </div>

      {/* Eligibility & Beneficiary Categories */}
      <div className="mt-6 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-stone-900">
            ✅ {lang === "hi" ? "पात्रता मानदंड और लाभार्थी श्रेणियां" : "Eligibility Criteria & Beneficiary Categories"}
          </h2>
          <SpeakButton
            id="scheme-eligibility-tts"
            text={eligibilityList.join(". ")}
            label="Read Eligibility"
            labelHi="पात्रता सुनें"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(scheme.beneficiaryTypes || []).map((bType) => {
            const meta = BENEFICIARY_TYPE_META[bType];
            return (
              <span
                key={bType}
                className="px-3 py-1 rounded-full bg-leaf-50 border border-leaf-200 text-leaf-900 text-xs font-semibold"
              >
                👤 {lang === "hi" ? meta?.labelHi || bType : meta?.label || bType}
              </span>
            );
          })}
        </div>

        {scheme.landholdingRequirement && (
          <p className="mt-3 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
            <strong>{lang === "hi" ? "भूमि आवश्यकता: " : "Landholding Requirement: "}</strong>
            {scheme.landholdingRequirement}
          </p>
        )}

        <ul className="mt-4 space-y-2.5 text-sm text-stone-700">
          {eligibilityList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="text-leaf-600 font-bold mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Required Documents & Step-by-Step Application Process */}
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900">
              📑 {lang === "hi" ? "आवश्यक दस्तावेज" : "Required Documents"}
            </h2>
            <SpeakButton
              id="scheme-docs-tts"
              text={docsList.join(". ")}
              label="Read Docs"
              labelHi="दस्तावेज सुनें"
              size="xs"
            />
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-stone-700">
            {docsList.map((doc, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-leaf-700">☑</span>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900">
              🧭 {lang === "hi" ? "आवेदन कैसे करें (चरण-दर-चरण)" : "Application Steps"}
            </h2>
            <SpeakButton
              id="scheme-steps-tts"
              text={stepsList.join(". ")}
              label="Read Steps"
              labelHi="प्रक्रिया सुनें"
              size="xs"
            />
          </div>
          <ol className="mt-4 space-y-3 text-sm text-stone-700">
            {stepsList.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-leaf-100 text-leaf-800 text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Optional Farmer Action: Link Scheme to an Organic Product Batch */}
      {user && (user.role === "FARMER" || user.role === "ADMIN") && farmerBatches.length > 0 && (
        <div className="mt-6 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-stone-900">
            🔗{" "}
            {lang === "hi"
              ? "इस सरकारी योजना को अपने जैविक उत्पाद बैच से जोड़ें (वैकल्पिक)"
              : "Link This Scheme to Your Organic Product Batch (Optional)"}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {lang === "hi"
              ? "यह लिंक केवल शैक्षिक और किसान प्रोफ़ाइल संदर्भ के लिए है। यह उत्पाद के स्वामित्व या ऑन-चेन ब्लॉकचेन सत्यापन रिकॉर्ड को नहीं बदलता है।"
              : "Associates this scheme with your batch for educational reference on the traceability page without modifying product ownership or on-chain blockchain records."}
          </p>
          <form onSubmit={handleLinkToBatch} className="mt-3 flex flex-wrap gap-3 items-center">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {farmerBatches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} — {b.productName} ({b.farmLocation})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={utilizationNote}
              onChange={(e) => setUtilizationNote(e.target.value)}
              placeholder={
                lang === "hi"
                  ? "टिप्पणी (उदा: PGS क्लस्टर सहायता प्राप्त)"
                  : "Optional note (e.g., Enrolled under PKVY cluster)"
              }
              className="flex-1 min-w-[220px] border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-leaf-600 text-white text-xs sm:text-sm font-semibold hover:bg-leaf-700 transition"
            >
              {lang === "hi" ? "बैच से जोड़ें" : "Link to Batch"}
            </button>
          </form>
          {linkStatusMsg && <p className="mt-2 text-xs text-leaf-700 font-medium">{linkStatusMsg}</p>}
        </div>
      )}

      {/* Disclaimers */}
      <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
        <p>
          <strong>{lang === "hi" ? "पात्रता एवं डेटा अस्वीकरण: " : "Eligibility & Source Disclaimer: "}</strong>
          {lang === "hi"
            ? "योजना का विवरण आधिकारिक सरकारी अधिसूचनाओं से संकलित किया गया है। पात्रता, सब्सिडी दर और अंतिम स्वीकृति पूरी तरह से संबंधित सरकारी विभाग के सत्यापन के अधीन है।"
            : disclaimer}
        </p>
        <p>
          <strong>{lang === "hi" ? "ब्लॉकचेन पृथक्करण सूचना: " : "Blockchain Separation Notice: "}</strong>
          {lang === "hi"
            ? "सरकारी योजना की जानकारी और ऑन-चेन उत्पाद ट्रैसेबिलिटी डेटा अलग-अलग हैं। किसी सरकारी योजना का सूचीबद्ध होना ब्लॉकचेन प्रमाणन नहीं है।"
            : "Government scheme information is strictly separate from blockchain product verification data."}
        </p>
      </div>

      {/* Confirmation Modal Before Opening External Portal */}
      {confirmUrl && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-stone-900">
              {lang === "hi"
                ? "आधिकारिक सरकारी वेबसाइट पर जाने की पुष्टि करें"
                : "Confirm Opening Official Government Website"}
            </h3>
            <p className="text-xs text-stone-600 mt-2">
              {lang === "hi"
                ? "आप निम्नलिखित आधिकारिक सरकारी पोर्टल को नए टैब में खोलने जा रहे हैं:"
                : "You are about to open the following official government portal in a new tab:"}
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-stone-100 border border-stone-200 font-mono text-xs text-leaf-800 break-all">
              {confirmUrl}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmUrl(null)}
                className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-100"
              >
                {lang === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <a
                href={confirmUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setConfirmUrl(null)}
                className="px-4 py-2 rounded-lg bg-leaf-600 text-white text-xs font-semibold hover:bg-leaf-700"
              >
                {lang === "hi" ? "आधिकारिक पोर्टल खोलें ↗" : "Open Official Portal ↗"}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
