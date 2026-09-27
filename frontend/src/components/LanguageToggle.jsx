import React from "react";
import { useLanguage } from "../LanguageContext.jsx";

export default function LanguageToggle() {
  const { lang, toggleLanguage, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center bg-stone-100 p-0.5 rounded-full border border-stone-200 text-xs font-medium">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1 rounded-full transition-all duration-150 ${lang === "en"
            ? "bg-leaf-600 text-white shadow-sm font-semibold"
            : "text-stone-600 hover:text-stone-900"
          }`}
        title="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        className={`px-2.5 py-1 rounded-full transition-all duration-150 flex items-center gap-1 ${lang === "hi"
            ? "bg-leaf-600 text-white shadow-sm font-semibold"
            : "text-stone-600 hover:text-stone-900"
          }`}
        title="हिंदी में बदलें (Translate to Hindi)"
      >
        <span>🇮🇳</span> हिंदी
      </button>
    </div>
  );
}
