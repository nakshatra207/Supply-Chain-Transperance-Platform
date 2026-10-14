import React, { useState, useRef, useEffect, useCallback } from "react";
import { INDIAN_GOV_SCHEMES, SCHEME_CATEGORIES } from "../constants/schemes";
import { useLanguage } from "../LanguageContext.jsx";

const CATEGORY_STYLES = {
  "Organic & Natural": {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    topBar: "border-t-emerald-500",
    accent: "text-emerald-700",
  },
  "Income & Credit": {
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    topBar: "border-t-blue-500",
    accent: "text-blue-700",
  },
  "Water & Soil": {
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
    topBar: "border-t-cyan-500",
    accent: "text-cyan-700",
  },
  "Insurance & Markets": {
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    topBar: "border-t-amber-500",
    accent: "text-amber-700",
  },
  "Infra & Tech": {
    badge: "bg-purple-50 text-purple-800 border-purple-200",
    topBar: "border-t-purple-500",
    accent: "text-purple-700",
  },
};

export default function GovSchemesSlider() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const startXRef = useRef(0);
  const initialScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Filter schemes based on category
  const filteredSchemes =
    selectedCategory === "All"
      ? INDIAN_GOV_SCHEMES
      : INDIAN_GOV_SCHEMES.filter((s) => s.category === selectedCategory);

  // Duplicate items to ensure infinite continuous loop (3 copies)
  const displayItems =
    filteredSchemes.length > 0
      ? [...filteredSchemes, ...filteredSchemes, ...filteredSchemes]
      : [];

  // Continuous auto-scrolling ticker with smooth delta capping
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isAutoScroll) return;

    let animId;
    let lastTime = performance.now();

    const scrollStep = (now) => {
      // Cap delta time to 100ms max so pausing/un-pausing doesn't jump
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isHovered && !isDragging && container) {
        // Smooth scroll rate: 36px per second
        container.scrollLeft += 36 * delta;

        // Wrap around seamlessly
        if (container.scrollWidth > container.clientWidth) {
          const segmentWidth = container.scrollWidth / 3;
          if (segmentWidth > 0) {
            if (container.scrollLeft >= segmentWidth * 2) {
              container.scrollLeft -= segmentWidth;
            } else if (container.scrollLeft <= 0) {
              container.scrollLeft += segmentWidth;
            }
          }
        }
      }
      animId = requestAnimationFrame(scrollStep);
    };

    animId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animId);
  }, [isAutoScroll, isHovered, isDragging, filteredSchemes.length]);

  // Center scroll position when category changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || filteredSchemes.length === 0) return;

    const timer = setTimeout(() => {
      if (container && container.scrollWidth > container.clientWidth) {
        const segmentWidth = container.scrollWidth / 3;
        container.scrollLeft = segmentWidth;
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [selectedCategory, filteredSchemes.length]);

  // Manual scroll controls
  const handleScrollLeft = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const segmentWidth = container.scrollWidth / 3;
    if (container.scrollLeft <= 40) {
      container.scrollLeft += segmentWidth;
    }
    container.scrollBy({ left: -360, behavior: "smooth" });
  }, []);

  const handleScrollRight = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const segmentWidth = container.scrollWidth / 3;
    if (container.scrollLeft >= segmentWidth * 2 - 40) {
      container.scrollLeft -= segmentWidth;
    }
    container.scrollBy({ left: 360, behavior: "smooth" });
  }, []);

  // Mouse Drag-to-Scroll handlers
  const onMouseDown = (e) => {
    const container = containerRef.current;
    if (!container) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    initialScrollLeftRef.current = container.scrollLeft;
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 6) {
      hasDraggedRef.current = true;
    }
    container.scrollLeft = initialScrollLeftRef.current - walk;
  };

  const onMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <section className="py-14 bg-stone-100/70 border-y border-stone-200 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-leaf-100 text-leaf-800 text-xs font-semibold mb-3 border border-leaf-200">
              <span>🏛️</span>
              <span>{t("landing.schemesBadge", "Government Agricultural Initiatives")}</span>
              <span className="text-leaf-400">•</span>
              <span className="bg-leaf-700 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                {INDIAN_GOV_SCHEMES.length} Schemes
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              {t("landing.schemesTitle", "Active Indian Government Schemes")}
            </h2>
            <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
              {t(
                "landing.schemesDesc",
                "Explore national programs powering organic certification, direct income, precision irrigation, and agricultural value chains across India."
              )}
            </p>
          </div>

          {/* Controls: Play/Pause, Left/Right Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsAutoScroll((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border shadow-sm transition active:scale-95 ${
                isAutoScroll
                  ? "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                  : "bg-leaf-600 text-white border-leaf-600 hover:bg-leaf-700"
              }`}
              title={isAutoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            >
              <span>{isAutoScroll ? "⏸" : "▶"}</span>
              <span>{isAutoScroll ? t("landing.schemesPause", "Pause") : t("landing.schemesPlay", "Auto-scroll")}</span>
            </button>

            <button
              type="button"
              onClick={handleScrollLeft}
              className="p-2 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-sm transition active:scale-95"
              aria-label="Scroll left"
              title="Previous schemes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleScrollRight}
              className="p-2 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900 shadow-sm transition active:scale-95"
              aria-label="Scroll right"
              title="Next schemes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {SCHEME_CATEGORIES.map((cat) => {
            const count =
              cat === "All"
                ? INDIAN_GOV_SCHEMES.length
                : INDIAN_GOV_SCHEMES.filter((s) => s.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-leaf-700 text-white shadow font-semibold scale-105"
                    : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-leaf-900 text-leaf-100" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Scrolling Track with Subtle Edge Fades */}
      <div
        className="relative group w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsDragging(false);
        }}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        {/* Left Gradient Edge Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-r from-stone-100/90 to-transparent z-10 pointer-events-none" />

        {/* Right Gradient Edge Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-l from-stone-100/90 to-transparent z-10 pointer-events-none" />

        {/* Scrolling Container */}
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUpOrLeave}
          className={`flex gap-5 overflow-x-auto py-4 px-6 sm:px-12 no-scrollbar select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
        >
          {displayItems.map((scheme, idx) => {
            const styles = CATEGORY_STYLES[scheme.category] || {
              badge: "bg-stone-100 text-stone-700 border-stone-200",
              topBar: "border-t-leaf-500",
              accent: "text-stone-700",
            };

            return (
              <div
                key={`${scheme.id}-${idx}`}
                className={`w-[310px] sm:w-[350px] shrink-0 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between border-t-4 ${styles.topBar} hover:-translate-y-1 relative`}
              >
                <div>
                  {/* Category & Tag Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles.badge}`}
                    >
                      <span>{scheme.icon}</span>
                      <span>{scheme.category}</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      {scheme.shortName || scheme.id.toUpperCase()}
                    </span>
                  </div>

                  {/* Scheme Title */}
                  <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-2">
                    {scheme.name}
                  </h3>

                  {/* Scheme Description */}
                  <p className="mt-2.5 text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3">
                    {scheme.description}
                  </p>
                </div>

                {/* Bottom Highlight & Link */}
                <div className="mt-4 pt-3 border-t border-stone-100 space-y-3">
                  {scheme.benefit && (
                    <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-2.5 flex items-start gap-2">
                      <span className="text-leaf-600 font-bold text-sm shrink-0">✓</span>
                      <p className="text-[11px] sm:text-xs text-stone-700 font-medium leading-tight">
                        <strong className="text-stone-900">{t("landing.schemesKeyBenefit", "Benefit")}: </strong>
                        {scheme.benefit}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-stone-400 font-medium">Govt. of India Initiative</span>
                    {scheme.officialUrl ? (
                      <a
                        href={scheme.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-leaf-700 hover:text-leaf-900 transition hover:underline"
                        onClick={(e) => {
                          if (hasDraggedRef.current) e.preventDefault();
                        }}
                      >
                        <span>{t("landing.schemesLearnMore", "Official Portal")}</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll Status Helper Footer */}
        <div className="max-w-7xl mx-auto px-4 mt-3 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isAutoScroll && !isHovered ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
              }`}
            />
            <span>
              {isAutoScroll && !isHovered
                ? t("landing.schemesAutoScroll", "Auto-scrolling horizontally · Hover or drag to inspect")
                : t("landing.schemesPausedNotice", "Scrolling paused · Use arrows or drag to explore")}
            </span>
          </div>
          <span className="hidden sm:inline text-stone-400">
            Click card links to visit official portals ↗
          </span>
        </div>
      </div>
    </section>
  );
}

