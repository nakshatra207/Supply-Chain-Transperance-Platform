import React from "react";
import { Link } from "react-router-dom";
import SpeakButton from "./SpeakButton.jsx";

/**
 * Renders inline formatting (**bold**, `code`, and https:// links) safely as React elements.
 */
function renderInlineTokens(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-stone-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-xs text-leaf-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-leaf-700 underline hover:text-leaf-900 font-medium break-all"
        >
          {part} ↗
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Lightweight, safe Markdown block renderer for AI Assistant responses.
 */
export function FormattedMarkdown({ content, isStreaming = false }) {
  if (!content) {
    if (isStreaming) {
      return (
        <div className="flex items-center gap-2 py-2 text-sm text-stone-500">
          <span className="inline-block w-2 h-4 bg-leaf-600 animate-pulse rounded-xs" />
          <span>Writing response...</span>
        </div>
      );
    }
    return null;
  }
  const lines = String(content).split("\n");
  const elements = [];
  let listItems = [];

  const flushList = (keyPrefix) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${keyPrefix}`} className="list-disc pl-5 space-y-1.5 my-2 text-stone-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineTokens(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(index);
      return;
    }

    if (line === "---") {
      flushList(index);
      elements.push(<hr key={`hr-${index}`} className="my-3 border-stone-200" />);
      return;
    }

    if (line.startsWith("### ")) {
      flushList(index);
      elements.push(
        <h3 key={`h3-${index}`} className="text-base font-bold text-stone-900 mt-3 mb-1.5">
          {renderInlineTokens(line.slice(4))}
        </h3>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushList(index);
      elements.push(
        <h2 key={`h2-${index}`} className="text-lg font-bold text-stone-900 mt-3 mb-1.5">
          {renderInlineTokens(line.slice(3))}
        </h2>
      );
      return;
    }

    if (line.startsWith("> ")) {
      flushList(index);
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-4 border-amber-400 bg-amber-50/70 px-3 py-2 rounded-r-lg text-xs text-amber-900 my-2"
        >
          {renderInlineTokens(line.slice(2))}
        </blockquote>
      );
      return;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      listItems.push(line);
      return;
    }

    flushList(index);
    elements.push(
      <p key={`p-${index}`} className="text-stone-700 leading-relaxed my-1.5">
        {renderInlineTokens(line)}
      </p>
    );
  });

  flushList("end");
  return (
    <div className="text-sm space-y-1 select-text cursor-text">
      {elements}
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 ml-1 align-middle bg-leaf-600 animate-pulse rounded-xs"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Full assistant message card with Model badge, Read Aloud button, Related Schemes,
 * Live Batch Card, Action links, and 1-click Follow-up questions.
 */
export default function AssistantMessageContent({
  message,
  lang = "en",
  onAskFollowUp,
  onNavigate,
  compact = false,
}) {
  const {
    id,
    content,
    isStreaming = false,
    modelUsed,
    relatedSchemes = [],
    relatedBatch = null,
    suggestedActions = [],
    followUpQuestions = [],
  } = message;

  // Strip markdown formatting for cleaner TTS reading
  const plainTextForTts = String(content || "")
    .replace(/[#*`>_~-]/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <div className="space-y-3">
      {/* Top bar: Model provider badge + Latency + Read Aloud */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-leaf-50 text-leaf-800 border border-leaf-200">
            <span>🤖</span>
            <span>{modelUsed?.name || "OrganicTrace AI"}</span>
          </span>
          {modelUsed?.ragGrounded && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ {lang === "hi" ? "सत्यापित डेटाबेस" : "RAG Grounded"}
            </span>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>{lang === "hi" ? "उत्तर लिख रहा है..." : "Writing..."}</span>
            </span>
          )}
          {!isStreaming && typeof modelUsed?.latencyMs === "number" && (
            <span className="text-[11px] text-stone-400 font-mono">{modelUsed.latencyMs}ms</span>
          )}
        </div>

        {plainTextForTts && (
          <SpeakButton
            text={plainTextForTts}
            id={`assistant-msg-${id || "latest"}`}
            size="xs"
            label="Listen"
            labelHi="सुनें"
          />
        )}
      </div>

      {/* Main Markdown Answer */}
      <FormattedMarkdown content={content} isStreaming={isStreaming} />

      {/* Related Government Schemes Cards (shown after streaming finishes so text stays in view while writing) */}
      {!isStreaming && relatedSchemes.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            {lang === "hi" ? "🏛️ संबंधित सरकारी योजनाएं:" : "🏛️ Referenced Government Schemes:"}
          </p>
          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {relatedSchemes.map((s) => (
              <div
                key={s.schemeCode}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-leaf-300 transition flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-leaf-100 text-leaf-800">
                      {s.schemeCode}
                    </span>
                    <span className="text-[11px] font-medium text-stone-500">
                      {s.governmentLevel === "CENTRAL"
                        ? lang === "hi"
                          ? "केंद्र सरकार"
                          : "Central Govt"
                        : `${s.state}`}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 mt-1.5 line-clamp-2">
                    {lang === "hi" && s.nameHi ? s.nameHi : s.name}
                  </h4>
                  {s.maxBenefitAmount && (
                    <p className="text-xs text-leaf-700 font-semibold mt-1">
                      💰 {s.maxBenefitAmount}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-stone-200/70 text-xs">
                  <Link
                    to={`/schemes/${s.schemeCode}`}
                    onClick={() => onNavigate && onNavigate()}
                    className="font-semibold text-leaf-700 hover:text-leaf-900 cursor-pointer"
                  >
                    {lang === "hi" ? "पूरी जानकारी →" : "Full Details →"}
                  </Link>
                  {s.officialPortalUrl && (
                    <a
                      href={s.officialPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-stone-500 hover:text-stone-800 text-[11px] underline cursor-pointer"
                    >
                      {lang === "hi" ? "सरकारी पोर्टल ↗" : "Official Portal ↗"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Live Batch Card */}
      {!isStreaming && relatedBatch && (
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-600 text-white">
                {relatedBatch.batchId}
              </span>
              <span className="text-xs font-bold text-stone-900">{relatedBatch.productName}</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">
              📍 {relatedBatch.farmLocation} · ⛓ {relatedBatch.chainStatus} ·{" "}
              {relatedBatch.eventsCount} {lang === "hi" ? "इवेंट्स" : "events"}
            </p>
          </div>
          <Link
            to={`/trace/${relatedBatch.batchId}`}
            onClick={() => onNavigate && onNavigate()}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition cursor-pointer"
          >
            {lang === "hi" ? "ब्लॉकचेन रिकॉर्ड देखें →" : "Open Live Trace →"}
          </Link>
        </div>
      )}

      {/* Quick Action Navigation Buttons */}
      {!isStreaming && suggestedActions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {suggestedActions.map((act, idx) => (
            <Link
              key={idx}
              to={act.route}
              onClick={() => onNavigate && onNavigate()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-leaf-300 text-leaf-800 hover:bg-leaf-50 transition shadow-2xs cursor-pointer"
            >
              <span>🔗</span>
              <span>{act.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 1-Click Follow-Up Questions */}
      {!isStreaming && followUpQuestions.length > 0 && onAskFollowUp && (
        <div className="pt-2 border-t border-stone-100">
          <p className="text-[11px] font-semibold text-stone-400 mb-1.5">
            {lang === "hi" ? "अगला प्रश्न पूछें:" : "Suggested follow-up questions:"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {followUpQuestions.map((fq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAskFollowUp(fq)}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-leaf-50 text-stone-700 hover:text-leaf-800 border border-stone-200 hover:border-leaf-300 transition cursor-pointer"
              >
                💬 {fq}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
