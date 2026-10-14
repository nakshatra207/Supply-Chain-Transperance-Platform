import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../LanguageContext.jsx";
import GovSchemesSlider from "../components/GovSchemesSlider.jsx";

export default function Landing() {
  const [batchId, setBatchId] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const goToTrace = (e) => {
    e.preventDefault();
    if (batchId.trim()) navigate(`/trace/${batchId.trim()}`);
  };

  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-leaf-100 text-leaf-700 text-xs font-medium mb-4">
          {t("landing.badge")}
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">
          {t("landing.heroTitle")} <span className="text-leaf-600">{t("landing.heroHighlight")}</span>
        </h1>
        <p className="mt-4 text-stone-600 max-w-2xl mx-auto">
          {t("landing.heroDesc")}
        </p>

        <form onSubmit={goToTrace} className="mt-8 max-w-md mx-auto flex gap-2">
          <input
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder={t("landing.inputPlaceholder")}
            className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400 bg-white"
          />
          <button className="px-4 py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 transition">
            {t("landing.traceBtn")}
          </button>
        </form>
      </section>

      <section className="bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-14 grid sm:grid-cols-3 gap-8">
          {[
            {
              title: t("landing.step1Title"),
              desc: t("landing.step1Desc"),
            },
            {
              title: t("landing.step2Title"),
              desc: t("landing.step2Desc"),
            },
            {
              title: t("landing.step3Title"),
              desc: t("landing.step3Desc"),
            },
          ].map((s) => (
            <div key={s.title} className="p-5 rounded-lg border border-stone-200 bg-stone-50">
              <h3 className="font-semibold text-stone-900">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Horizontally scrolling Indian Government Schemes */}
      <GovSchemesSlider />

      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-semibold text-stone-900 text-center">{t("landing.whyTitle")}</h2>
        <p className="mt-3 text-center text-stone-600 max-w-2xl mx-auto text-sm">
          {t("landing.whyDesc")}
        </p>
        <div className="mt-6 text-xs text-stone-500 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-md p-4">
          <strong>{t("landing.importantTitle")}</strong> {t("landing.importantDesc")}
        </div>
      </section>
    </div>
  );
}
