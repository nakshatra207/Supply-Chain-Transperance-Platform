import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import translations, { INDIAN_LANGUAGES, POPULAR_LANGUAGE_CODES } from "./locales/index.js";

const LanguageContext = createContext(null);

export { translations, INDIAN_LANGUAGES, POPULAR_LANGUAGE_CODES };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("organic_trace_lang") || "en";
  });

  const currentLanguage = useMemo(() => {
    return INDIAN_LANGUAGES.find((l) => l.code === lang) || INDIAN_LANGUAGES[0];
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("organic_trace_lang", lang);
    if (document && document.documentElement) {
      document.documentElement.lang = lang;
      // Handle RTL for Urdu, Sindhi, etc. if required
      if (currentLanguage?.rtl) {
        document.documentElement.setAttribute("dir", "rtl");
      } else {
        document.documentElement.setAttribute("dir", "ltr");
      }
    }
  }, [lang, currentLanguage]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "hi" : "en"));
  };

  const t = (key, fallback = "") => {
    const langDict = translations[lang] || translations.en;
    if (langDict && langDict[key]) return langDict[key];
    if (translations.hi && translations.hi[key]) return translations.hi[key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        currentLanguage,
        languages: INDIAN_LANGUAGES,
        popularLanguages: POPULAR_LANGUAGE_CODES,
        setLanguage: setLang,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
