import React, { useEffect } from "react";
import { useVoice } from "../VoiceContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";
import { VOICE_SAMPLE_COMMANDS } from "../utils/voiceCommandParser.js";

export default function VoiceAssistantModal() {
  const {
    isModalOpen,
    openVoiceModal,
    closeVoiceModal,
    voiceLang,
    setVoiceLang,
    supportedVoiceLanguages,
    hasMicConsent,
    grantMicConsentAndListen,
    isSpeechRecognitionSupported,
    isListening,
    startListening,
    stopListening,
    transcript,
    setTranscript,
    interimTranscript,
    recognitionError,
    parsedPreview,
    executeCommandText,
    isSpeaking,
    stopSpeaking,
    availableVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
  } = useVoice();

  const { lang } = useLanguage();

  // Close modal on Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        closeVoiceModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, closeVoiceModal]);

  const activeText = transcript || interimTranscript || "";

  const handleConfirmRun = (e) => {
    e.preventDefault();
    if (!activeText.trim()) return;
    executeCommandText(activeText);
  };

  const handleConsentAndStart = () => {
    grantMicConsentAndListen();
    startListening();
  };

  return (
    <>
      {/* Floating quick-access microphone button for mobile and desktop */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        {isSpeaking && (
          <button
            type="button"
            onClick={stopSpeaking}
            className="px-3 py-2 rounded-full bg-amber-600 text-white text-xs font-semibold shadow-lg hover:bg-amber-700 transition flex items-center gap-1.5"
            aria-label={lang === "hi" ? "आवाज़ पढ़ना बंद करें" : "Stop reading aloud"}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping" />
            ⏹ {lang === "hi" ? "आवाज़ रोकें" : "Stop Audio"}
          </button>
        )}

        <button
          type="button"
          onClick={() => openVoiceModal({ autoStart: false })}
          aria-label={
            lang === "hi"
              ? "वॉइस असिस्टेंट खोलें (बोलकर खोजें)"
              : "Open Voice Assistant (Speak to search schemes or trace products)"
          }
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-semibold text-sm transition focus:outline-none focus:ring-4 focus:ring-leaf-300 ${
            isListening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-leaf-600 text-white hover:bg-leaf-700"
          }`}
        >
          <span className="text-base" aria-hidden="true">
            🎙️
          </span>
          <span>
            {isListening
              ? lang === "hi"
                ? "सुन रहा है..."
                : "Listening..."
              : lang === "hi"
              ? "बोलकर खोजें"
              : "Voice Assistant"}
          </span>
        </button>
      </div>

      {/* Voice Assistant Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-assistant-title"
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-leaf-100 text-leaf-700 text-lg">
                    🎙️
                  </span>
                  <h2 id="voice-assistant-title" className="text-lg font-bold text-stone-900">
                    {lang === "hi"
                      ? "किसान वॉइस असिस्टेंट (बोलकर नेविगेट करें)"
                      : "Farmer Voice Assistant & Navigation"}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {lang === "hi"
                    ? "सरकारी योजनाएं खोजने, फिल्टर लगाने या क्यूआर/बैच ट्रैक करने के लिए अपनी भाषा में बोलें।"
                    : "Speak in English, Hindi, or regional languages to search schemes, apply filters, or trace organic batches."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeVoiceModal}
                aria-label="Close voice assistant"
                className="text-stone-400 hover:text-stone-700 text-xl leading-none px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Privacy & Microphone Permission Consent Notice */}
            {!hasMicConsent && (
              <div className="mt-4 bg-leaf-50 border border-leaf-200 rounded-xl p-4 text-xs text-stone-700">
                <p className="font-semibold text-leaf-900">
                  {lang === "hi"
                    ? "🔒 माइक्रोफ़ोन अनुमति और गोपनीयता सूचना"
                    : "🔒 Microphone Access & Privacy Notice"}
                </p>
                <p className="mt-1 leading-relaxed">
                  {lang === "hi"
                    ? "आपकी आवाज़ को केवल टेक्स्ट कमांड में बदलने के लिए ब्राउज़र के वेब स्पीच एपीआई का उपयोग किया जाता है। हम आपकी कच्ची ऑडियो रिकॉर्डिंग को कभी भी स्टोर या सेव नहीं करते हैं। कोई भी कार्रवाई करने से पहले आप पहचाने गए शब्दों को देख और बदल सकते हैं।"
                    : "Your microphone is used solely to convert spoken requests into text commands via your browser's speech engine. Raw audio is never recorded or stored on our servers. You can review and edit the recognized words before submitting."}
                </p>
                <button
                  type="button"
                  onClick={handleConsentAndStart}
                  className="mt-3 px-4 py-2 rounded-lg bg-leaf-600 text-white font-semibold hover:bg-leaf-700 transition"
                >
                  {lang === "hi"
                    ? "अनुमति दें और बोलना शुरू करें"
                    : "Grant Permission & Start Listening"}
                </button>
              </div>
            )}

            {/* Language & Voice Controls */}
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="voice-recognition-lang"
                  className="block text-xs font-medium text-stone-600 mb-1"
                >
                  {lang === "hi" ? "बोलने की भाषा (Voice Language)" : "Spoken Language"}
                </label>
                <select
                  id="voice-recognition-lang"
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-leaf-400"
                >
                  {supportedVoiceLanguages.map((vl) => (
                    <option key={vl.code} value={vl.code}>
                      {vl.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tts-voice-select"
                  className="block text-xs font-medium text-stone-600 mb-1"
                >
                  {lang === "hi" ? "पढ़ने की आवाज़ (Read-Aloud Voice)" : "Read-Aloud Speaker Voice"}
                </label>
                <select
                  id="tts-voice-select"
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-leaf-400"
                >
                  <option value="">
                    {lang === "hi" ? "स्वचालित (डिफ़ॉल्ट भारतीय आवाज़)" : "Auto (Default Browser Voice)"}
                  </option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Microphone Listening Status & Trigger */}
            <div className="mt-5 flex flex-col items-center justify-center p-4 rounded-xl bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-3">
                {!isListening ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasMicConsent) {
                        grantMicConsentAndListen();
                      }
                      startListening();
                    }}
                    className="px-5 py-2.5 rounded-full bg-leaf-600 text-white text-sm font-semibold hover:bg-leaf-700 transition flex items-center gap-2 shadow-sm"
                  >
                    <span>🎙️</span>
                    <span>
                      {lang === "hi" ? "माइक्रोफ़ोन चालू करें (बोलें)" : "Tap to Speak"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopListening}
                    className="px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition flex items-center gap-2 shadow-sm animate-pulse"
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span>
                      {lang === "hi" ? "सुन रहा है... (रोकने के लिए दबाएं)" : "Listening... (Tap to Stop)"}
                    </span>
                  </button>
                )}

                {activeText && (
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript("");
                    }}
                    className="px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-600 hover:bg-stone-100"
                  >
                    {lang === "hi" ? "साफ़ करें" : "Clear"}
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-stone-500 text-center" aria-live="polite">
                {isListening
                  ? lang === "hi"
                    ? "माइक्रोफ़ोन सक्रिय है — कृपया अपना प्रश्न बोलें..."
                    : "Microphone is active and listening — speak your request clearly..."
                  : isSpeechRecognitionSupported
                  ? lang === "hi"
                    ? "माइक्रोफ़ोन बंद है। बोलने के लिए ऊपर बटन दबाएं या नीचे टाइप करें।"
                    : "Microphone stopped. Tap above to speak, or edit the text box below."
                  : lang === "hi"
                  ? "इस ब्राउज़र में वेब स्पीच उपलब्ध नहीं है — कृपया नीचे अपना कमांड टाइप करें या चुनें।"
                  : "Web Speech recognition is unavailable in this browser — type or pick a command below."}
              </p>
            </div>

            {/* Error Alert if permission denied / noisy / network error */}
            {recognitionError && (
              <div
                role="alert"
                className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900"
              >
                <span className="font-semibold">⚠ </span>
                {recognitionError.message}
              </div>
            )}

            {/* Editable Recognized Words & Confirmation Form */}
            <form onSubmit={handleConfirmRun} className="mt-4">
              <label
                htmlFor="recognized-speech-input"
                className="block text-xs font-semibold text-stone-700"
              >
                {lang === "hi"
                  ? "पहचाने गए शब्द (जमा करने से पहले जांचें या संपादित करें):"
                  : "Recognized Words (Edit or confirm before submitting):"}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="recognized-speech-input"
                  type="text"
                  value={activeText}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    lang === "hi"
                      ? 'उदा: "हरियाणा के किसानों के लिए योजनाएं दिखाएं" या "ORG-BAS-001 ट्रैक करें"'
                      : 'e.g., "Show the latest organic farming schemes" or "Which schemes are available in Haryana?"'
                  }
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
                />
                <button
                  type="submit"
                  disabled={!activeText.trim()}
                  className="px-4 py-2 rounded-lg bg-leaf-600 text-white text-sm font-semibold hover:bg-leaf-700 disabled:opacity-50 transition whitespace-nowrap"
                >
                  {lang === "hi" ? "पुष्टि करें (Run)" : "Confirm & Go"}
                </button>
              </div>
            </form>

            {/* Parsed Intent Preview */}
            {parsedPreview && parsedPreview.type !== "EMPTY" && (
              <div
                className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                  parsedPreview.type === "REJECTED_UNSAFE"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-leaf-50 border-leaf-200 text-leaf-900"
                }`}
              >
                <div>
                  <span className="font-semibold">
                    {lang === "hi" ? "पहचाना गया कार्य: " : "Detected Action: "}
                  </span>
                  <span>{lang === "hi" ? parsedPreview.summaryHi : parsedPreview.summary}</span>
                </div>
                {parsedPreview.route && (
                  <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-leaf-200 text-stone-600 shrink-0">
                    {parsedPreview.route}
                  </span>
                )}
              </div>
            )}

            {/* Quick Voice Command Suggestions */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                {lang === "hi"
                  ? "उदाहरण वॉइस कमांड (बोलें या क्लिक करके आज़माएं):"
                  : "Sample Voice Commands (Speak or click to populate):"}
              </p>
              <div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {VOICE_SAMPLE_COMMANDS.map((cmd, idx) => {
                  const textToUse = lang === "hi" ? cmd.hi : cmd.en;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTranscript(textToUse)}
                      className="text-left text-xs p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-leaf-50 hover:border-leaf-300 text-stone-700 transition"
                    >
                      “{textToUse}”
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
