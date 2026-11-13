import React from "react";
import { useVoice } from "../VoiceContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";

export default function SpeakButton({
  text,
  id = "tts-section",
  label,
  labelHi,
  langOverride = null,
  className = "",
  size = "sm",
}) {
  const { isTtsSupported, isSpeaking, speakingId, speak, stopSpeaking } = useVoice();
  const { lang, currentLanguage } = useLanguage();

  if (!isTtsSupported || !text) return null;

  const isThisSpeaking = isSpeaking && speakingId === id;

  const defaultLabel = lang !== "en" ? labelHi || "सुनें (Read Aloud)" : label || "Read Aloud";
  const stopLabel = lang !== "en" ? "रोकें" : "Stop Reading";

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isThisSpeaking) {
      stopSpeaking();
    } else {
      speak(text, {
        id,
        langOverride: langOverride || currentLanguage?.voiceLang || (lang === "en" ? "en-IN" : `${lang}-IN`),
      });
    }
  };

  const sizeClasses =
    size === "xs"
      ? "px-2 py-1 text-xs gap-1"
      : size === "md"
      ? "px-3.5 py-2 text-sm gap-2"
      : "px-2.5 py-1.5 text-xs gap-1.5";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isThisSpeaking ? stopLabel : defaultLabel}
      aria-pressed={isThisSpeaking}
      className={`inline-flex items-center font-medium rounded-md border transition ${sizeClasses} ${
        isThisSpeaking
          ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
          : "bg-stone-100 border-stone-200 text-stone-700 hover:bg-leaf-50 hover:border-leaf-300 hover:text-leaf-800"
      } ${className}`}
    >
      {isThisSpeaking ? (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          <span>⏹ {stopLabel}</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">🔊</span>
          <span>{defaultLabel}</span>
        </>
      )}
    </button>
  );
}
