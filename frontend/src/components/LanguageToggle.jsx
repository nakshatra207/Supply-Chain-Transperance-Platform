import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "../LanguageContext.jsx";

export default function LanguageToggle() {
  const { lang, currentLanguage, languages, popularLanguages, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      // Autofocus search on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filtered languages based on search query
  const filteredLanguages = useMemo(() => {
    if (!searchTerm.trim()) return languages;
    const q = searchTerm.toLowerCase().trim();
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q))
    );
  }, [languages, searchTerm]);

  const popularList = useMemo(() => {
    return languages.filter((l) => popularLanguages?.includes(l.code));
  }, [languages, popularLanguages]);

  const selectLanguage = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 bg-white hover:bg-stone-50 hover:border-leaf-500 shadow-sm text-xs font-medium text-stone-800 transition duration-150 focus:outline-none focus:ring-2 focus:ring-leaf-500/20"
        title="Change Language / भाषा बदलें"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-sm">{currentLanguage.flag || "🌐"}</span>
        <span className="font-semibold text-stone-900">{currentLanguage.nativeName}</span>
        <span className="text-[10px] text-stone-500 uppercase tracking-wider hidden sm:inline">
          ({currentLanguage.code})
        </span>
        <svg
          className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-leaf-600" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 pt-3.5 pb-2.5 bg-gradient-to-r from-leaf-50 to-emerald-50 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🇮🇳</span>
                <h3 className="text-xs font-bold text-stone-900 tracking-wide">
                  All Indian Languages (22 + EN)
                </h3>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-leaf-100 text-leaf-700">
                8th Schedule
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Select your preferred language / अपनी पसंदीदा भाषा चुनें
            </p>

            {/* Search Input */}
            <div className="relative mt-2.5">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg className="h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search language / भाषा खोजें..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder-stone-400 text-stone-800 focus:outline-none focus:border-leaf-500 focus:ring-1 focus:ring-leaf-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-600"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Quick Popular Pills (Shown when not searching) */}
          {!searchTerm && (
            <div className="px-3 py-2 bg-stone-50/60 border-b border-stone-100">
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5 px-1">
                Frequently Used
              </div>
              <div className="flex flex-wrap gap-1">
                {popularList.map((p) => {
                  const isActive = p.code === lang;
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => selectLanguage(p.code)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                        isActive
                          ? "bg-leaf-600 text-white font-semibold shadow-xs"
                          : "bg-white text-stone-700 border border-stone-200 hover:border-leaf-400 hover:text-leaf-700"
                      }`}
                    >
                      {p.flag} {p.nativeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Language List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 scrollbar-thin">
            {filteredLanguages.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                No matching language found for "{searchTerm}"
              </div>
            ) : (
              filteredLanguages.map((item) => {
                const isSelected = item.code === lang;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => selectLanguage(item.code)}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors group ${
                      isSelected ? "bg-leaf-50/70" : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{item.flag}</span>
                      <div className="truncate">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-xs font-semibold ${
                              isSelected ? "text-leaf-700 font-bold" : "text-stone-900 group-hover:text-leaf-600"
                            }`}
                          >
                            {item.nativeName}
                          </span>
                          <span className="text-[11px] text-stone-500 truncate">
                            {item.name}
                          </span>
                        </div>
                        {item.region && (
                          <p className="text-[10px] text-stone-400 truncate">
                            {item.region}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200/60 uppercase">
                        {item.code}
                      </span>
                      {isSelected && (
                        <span className="text-leaf-600 flex items-center" title="Active">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with note */}
          <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>22 Eighth Schedule Languages + English</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-700 font-medium px-2 py-0.5 rounded hover:bg-stone-200/60"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
