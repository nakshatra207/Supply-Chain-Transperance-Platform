import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../LanguageContext.jsx";
import SpeakButton from "./SpeakButton.jsx";

export default function ContextualSchemesPanel({ batchId, isFarmerOwner = false }) {
  const { lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkingCode, setLinkingCode] = useState("");

  const loadContextualSchemes = () => {
    if (!batchId) return;
    setLoading(true);
    api
      .get(`/api/schemes/contextual/batch/${batchId}`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContextualSchemes();
  }, [batchId]);

  const handleQuickLink = async (schemeCode) => {
    setLinkingCode(schemeCode);
    try {
      await api.post(`/api/schemes/${schemeCode}/link-batch`, {
        batchId,
        utilizationNote: "Applicable organic/supply-chain support program",
      });
      loadContextualSchemes();
    } catch {
      // ignore
    } finally {
      setLinkingCode("");
    }
  };

  const handleUnlink = async (schemeCode) => {
    setLinkingCode(schemeCode);
    try {
      await api.delete(`/api/schemes/${schemeCode}/link-batch/${batchId}`);
      loadContextualSchemes();
    } catch {
      // ignore
    } finally {
      setLinkingCode("");
    }
  };

  if (loading || !data) return null;

  const linkedList = data.linkedSchemes || [];
  const linkedCodeSet = new Set(linkedList.map((l) => l.scheme?.schemeCode));
  const educationalList = (data.recommendedEducationalSchemes || []).slice(0, 4);

  return (
    <section
      aria-label="Applicable Government Schemes & Farmer Support"
      className="mt-10 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs"
    >
      {/* Explicit Separation Badge between Blockchain Verification and Government Schemes */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
            ℹ️{" "}
            {lang === "hi"
              ? "शैक्षिक सरकारी योजना जानकारी (ब्लॉकचेन सत्यापन से पृथक)"
              : "Educational Scheme Info — Separate from Blockchain Verification"}
          </span>
        </div>
        <Link
          to="/schemes"
          className="text-xs font-semibold text-leaf-700 hover:underline"
        >
          {lang === "hi" ? "सभी सरकारी योजनाएं देखें →" : "Explore All Government Schemes →"}
        </Link>
      </div>

      <h3 className="text-lg font-bold text-stone-900 mt-3">
        🏛️{" "}
        {lang === "hi"
          ? "इस जैविक उत्पाद और क्षेत्र के लिए प्रासंगिक सरकारी योजनाएं"
          : "Relevant Government Schemes for This Organic Product & Region"}
      </h3>
      <p className="text-xs text-stone-500 mt-1">
        {lang === "hi"
          ? data.separationNoticeHi
          : data.separationNotice}
      </p>

      {/* Explicitly Linked Schemes by Farmer (if any) */}
      {linkedList.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-leaf-900 mb-2">
            📌{" "}
            {lang === "hi"
              ? "किसान प्रोफ़ाइल से जुड़ी योजनाएं (ऑफ़-चेन संदर्भ):"
              : "Farmer-Referenced Support Programs (Off-Chain Profile Metadata):"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {linkedList.map((item) => {
              const s = item.scheme;
              if (!s) return null;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-leaf-50/70 border border-leaf-200 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-leaf-900">{s.schemeCode}</span>
                      {isFarmerOwner && (
                        <button
                          type="button"
                          onClick={() => handleUnlink(s.schemeCode)}
                          disabled={linkingCode === s.schemeCode}
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          {lang === "hi" ? "हटाएं" : "Unlink"}
                        </button>
                      )}
                    </div>
                    <Link
                      to={`/schemes/${s.schemeCode}`}
                      className="font-semibold text-stone-900 hover:text-leaf-700 block mt-1"
                    >
                      {lang === "hi" && s.nameHi ? s.nameHi : s.name}
                    </Link>
                    {item.utilizationNote && (
                      <p className="text-stone-600 mt-1 italic">“{item.utilizationNote}”</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contextual Educational Scheme Matches */}
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {educationalList.map(({ scheme, relevanceReasons, relevanceReasonsHi }) => {
          const isAlreadyLinked = linkedCodeSet.has(scheme.schemeCode);
          const displayName = lang === "hi" && scheme.nameHi ? scheme.nameHi : scheme.name;
          const displayBenefit =
            lang === "hi" && scheme.benefitSummaryHi ? scheme.benefitSummaryHi : scheme.benefitSummary;
          const reasons =
            lang === "hi" && relevanceReasonsHi?.length ? relevanceReasonsHi : relevanceReasons || [];

          return (
            <div
              key={scheme.id}
              className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-white border border-stone-200 font-mono text-xs font-semibold text-stone-800">
                    {scheme.schemeCode}
                  </span>
                  <SpeakButton
                    id={`ctx-scheme-${scheme.schemeCode}`}
                    text={`${displayName}. ${displayBenefit}`}
                    size="xs"
                  />
                </div>
                <Link
                  to={`/schemes/${scheme.schemeCode}`}
                  className="font-bold text-stone-900 text-sm hover:text-leaf-700 block mt-2"
                >
                  {displayName}
                </Link>
                <p className="text-xs text-stone-600 mt-1 line-clamp-2">{displayBenefit}</p>
                {reasons.length > 0 && (
                  <p className="mt-2 text-[11px] text-leaf-800 bg-leaf-50 border border-leaf-200 rounded px-2 py-1">
                    ✓ {reasons[0]}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-stone-200/70 flex items-center justify-between text-xs">
                <Link
                  to={`/schemes/${scheme.schemeCode}`}
                  className="text-leaf-700 font-semibold hover:underline"
                >
                  {lang === "hi" ? "पात्रता और विवरण देखें →" : "View Eligibility & Details →"}
                </Link>
                {isFarmerOwner && !isAlreadyLinked && (
                  <button
                    type="button"
                    onClick={() => handleQuickLink(scheme.schemeCode)}
                    disabled={linkingCode === scheme.schemeCode}
                    className="px-2.5 py-1 rounded bg-white border border-stone-300 text-stone-700 hover:bg-leaf-50 hover:border-leaf-300 text-[11px] font-medium"
                  >
                    + {lang === "hi" ? "बैच से जोड़ें" : "Reference on Batch"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
