import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "../LanguageContext.jsx";

export default function LanguageToggle() {
  const { lang, currentLanguage, languages, popularLanguageCodes, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const popularLanguages = useMemo(() => {
    return (popularLanguageCodes || [])
      .map((code) => languages.find((l) => l.code === code))
      .filter(Boolean);
  }, [languages, popularLanguageCodes]);

  const filteredLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q)) ||
        (l.script && l.script.toLowerCase().includes(q))
    );
  }, [languages, query]);

  const handleSelect = (code) => {
    setLanguage(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <div className="inline-flex items-center bg-stone-100 p-0.5 rounded-full border border-stone-200 text-xs font-medium">
        <button
          type="button"
          onClick={() => handleSelect("en")}
          className={`px-2 py-1 rounded-full transition-all duration-150 ${
            lang === "en"
              ? "bg-leaf-600 text-white shadow-sm font-semibold"
              : "text-stone-600 hover:text-stone-900"
          }`}
          title="Switch to English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => handleSelect("hi")}
          className={`px-2 py-1 rounded-full transition-all duration-150 flex items-center gap-1 ${
            lang === "hi"
              ? "bg-leaf-600 text-white shadow-sm font-semibold"
              : "text-stone-600 hover:text-stone-900"
          }`}
          title="हिंदी में बदलें (Switch to Hindi)"
        >
          <span>हिन्दी</span>
        </button>

        {lang !== "en" && lang !== "hi" && currentLanguage && (
          <span className="px-2 py-1 rounded-full bg-leaf-600 text-white shadow-sm font-semibold">
            {currentLanguage.nativeName}
          </span>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`px-2.5 py-1 rounded-full transition-all duration-150 flex items-center gap-1 ${
            open
              ? "bg-stone-800 text-white font-semibold"
              : "text-stone-700 hover:bg-stone-200/80 hover:text-stone-900"
          }`}
          title="Choose from all 27 Indian Languages (सभी भारतीय भाषाएं)"
        >
          <span aria-hidden="true">🇮🇳</span>
          <span className="hidden md:inline">भाषाएं</span>
          <span className="text-[10px] opacity-80">▾</span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Select Indian Language"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 z-50"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
            <div>
              <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span>🇮🇳</span>
                <span>Select Language · अपनी भाषा चुनें ({languages.length})</span>
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                All 22 Official Indian Languages + Regional Languages
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-stone-400 hover:text-stone-700 text-sm px-1.5 py-0.5 rounded"
              aria-label="Close language menu"
            >
              ✕
            </button>
          </div>

          {/* Search box */}
          <div className="mt-2.5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language or state (e.g. தமிழ், Punjabi, Marathi, বাংলা)..."
              className="w-full border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-leaf-500"
            />
          </div>

          {/* Quick Popular Languages */}
          {!query.trim() && (
            <div className="mt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5">
                Major Indian Languages (प्रमुख भाषाएं)
              </p>
              <div className="flex flex-wrap gap-1">
                {popularLanguages.map((item) => {
                  const active = item.code === lang;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelect(item.code)}
                      className={`px-2 py-1 rounded-md text-xs font-medium border transition ${
                        active
                          ? "bg-leaf-600 text-white border-leaf-600 shadow-2xs"
                          : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-leaf-50 hover:border-leaf-300 hover:text-leaf-800"
                      }`}
                    >
                      {item.nativeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Language List */}
          <div className="mt-3 max-h-64 overflow-y-auto pr-1 grid grid-cols-2 gap-1.5">
            {filteredLanguages.map((item) => {
              const active = item.code === lang;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`text-left p-2 rounded-lg border transition flex flex-col justify-between ${
                    active
                      ? "bg-leaf-50 border-leaf-500 ring-1 ring-leaf-400"
                      : "bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {item.nativeName}
                    </span>
                    {active && (
                      <span className="text-[10px] font-bold text-leaf-700 shrink-0">✓</span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-600 font-medium truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-stone-400 truncate mt-0.5">
                    {item.region}
                  </div>
                </button>
              );
            })}
            {filteredLanguages.length === 0 && (
              <p className="col-span-2 text-center text-xs text-stone-400 py-4">
                No matching language found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
