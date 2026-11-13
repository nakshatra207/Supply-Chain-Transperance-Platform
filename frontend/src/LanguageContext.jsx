import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import translations, { INDIAN_LANGUAGES, POPULAR_LANGUAGE_CODES } from "./locales/index.js";

const LanguageContext = createContext(null);

export { translations, INDIAN_LANGUAGES, POPULAR_LANGUAGE_CODES };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("organic_trace_lang");
    if (saved && translations[saved]) return saved;
    return "en";
  });

  const currentLanguage = useMemo(() => {
    return INDIAN_LANGUAGES.find((l) => l.code === lang) || INDIAN_LANGUAGES[0];
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("organic_trace_lang", lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = currentLanguage?.rtl ? "rtl" : "ltr";
    }
  }, [lang, currentLanguage]);

  const setLanguage = (code) => {
    if (translations[code]) {
      setLang(code);
    }
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "hi" : "en"));
  };

  const t = (key, fallback = "") => {
    const langDict = translations[lang] || translations.en;
    if (langDict && langDict[key]) return langDict[key];
    if (lang !== "en" && translations.hi && translations.hi[key]) return translations.hi[key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        currentLanguage,
        languages: INDIAN_LANGUAGES,
        popularLanguageCodes: POPULAR_LANGUAGE_CODES,
        setLanguage,
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
