import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext.jsx";
import {
  SUPPORTED_VOICE_LANGUAGES,
  parseVoiceCommand,
  sanitizeVoiceInput,
} from "./utils/voiceCommandParser.js";

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const { lang, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voiceLang, setVoiceLang] = useState(() => {
    const saved = localStorage.getItem("organic_trace_voice_lang");
    if (saved) return saved;
    return lang === "hi" ? "hi-IN" : "en-IN";
  });

  const [hasMicConsent, setHasMicConsent] = useState(() => {
    return localStorage.getItem("organic_trace_mic_consent") === "true";
  });

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [lastExecutedAction, setLastExecutedAction] = useState(null);

  // Text-to-Speech (TTS) state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");

  const recognitionRef = useRef(null);

  const isSpeechRecognitionSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const isTtsSupported =
    typeof window !== "undefined" && Boolean(window.speechSynthesis);

  // Sync voiceLang when app language switches across Indian languages
  useEffect(() => {
    const matched = SUPPORTED_VOICE_LANGUAGES.find((vl) => vl.appLang === lang);
    if (matched && matched.code !== voiceLang) {
      setVoiceLang(matched.code);
    }
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("organic_trace_voice_lang", voiceLang);
  }, [voiceLang]);

  // Load TTS voices
  useEffect(() => {
    if (!isTtsSupported) return;
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      setAvailableVoices(voices);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isTtsSupported]);

  // Update parsed preview whenever transcript changes
  useEffect(() => {
    const combined = (transcript || interimTranscript || "").trim();
    if (!combined) {
      setParsedPreview(null);
      return;
    }
    setParsedPreview(parseVoiceCommand(combined));
  }, [transcript, interimTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  const grantMicConsentAndListen = useCallback(() => {
    localStorage.setItem("organic_trace_mic_consent", "true");
    setHasMicConsent(true);
  }, []);

  const startListening = useCallback(
    (overrideLang) => {
      setRecognitionError(null);
      setInterimTranscript("");

      if (!isSpeechRecognitionSupported) {
        setRecognitionError({
          code: "unsupported-browser",
          message:
            lang === "hi"
              ? "आपका ब्राउज़र सीधे वॉइस रिकग्निशन का समर्थन नहीं करता है। आप नीचे कमांड टाइप कर सकते हैं या सुझाए गए कमांड चुन सकते हैं।"
              : "Your browser does not support Web Speech API voice recognition. You can type or edit your command below or click any quick voice command.",
        });
        return;
      }

      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = overrideLang || voiceLang || (lang === "hi" ? "hi-IN" : "en-IN");
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      recognition.onresult = (event) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript;
          } else {
            interimStr += res[0].transcript;
          }
        }
        if (finalStr) {
          setTranscript((prev) => sanitizeVoiceInput(`${prev} ${finalStr}`));
          setInterimTranscript("");
        } else {
          setInterimTranscript(sanitizeVoiceInput(interimStr));
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const errCode = event.error || "unknown";
        const errorMap = {
          "not-allowed": {
            en: "Microphone permission was denied. Please allow microphone access in your browser address bar, or type your request below.",
            hi: "माइक्रोफ़ोन की अनुमति अस्वीकार कर दी गई। कृपया ब्राउज़र में माइक्रोफ़ोन की अनुमति दें या नीचे अपना अनुरोध टाइप करें।",
          },
          "service-not-allowed": {
            en: "Speech recognition service is not allowed in this browser context.",
            hi: "इस ब्राउज़र में स्पीच रिकग्निशन सेवा की अनुमति नहीं है।",
          },
          "no-speech": {
            en: "No speech was detected (or the environment is too noisy). Please speak clearly near the microphone and try again.",
            hi: "कोई आवाज़ सुनाई नहीं दी (या आसपास शोर अधिक है)। कृपया माइक्रोफ़ोन के पास स्पष्ट रूप से बोलें।",
          },
          "audio-capture": {
            en: "No microphone hardware was found. Please connect a microphone or type your command below.",
            hi: "कोई माइक्रोफ़ोन नहीं मिला। कृपया माइक्रोफ़ोन कनेक्ट करें या नीचे कमांड लिखें।",
          },
          network: {
            en: "A network error occurred during speech recognition. Please check your connection or use the text box below.",
            hi: "वॉइस पहचान के दौरान नेटवर्क त्रुटि हुई। कृपया कनेक्शन जांचें या नीचे टेक्स्ट बॉक्स का उपयोग करें।",
          },
          aborted: null,
        };

        if (errCode === "aborted") return;
        const msgObj = errorMap[errCode] || {
          en: `Speech recognition encountered an issue (${errCode}). You can edit or type your request below.`,
          hi: `आवाज़ पहचानने में समस्या आई (${errCode})। आप नीचे अपना अनुरोध लिख या संपादित कर सकते हैं।`,
        };
        setRecognitionError({
          code: errCode,
          message: lang === "hi" ? msgObj.hi : msgObj.en,
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        setIsListening(false);
        setRecognitionError({
          code: "start-failed",
          message: err.message || "Could not start microphone listening.",
        });
      }
    },
    [isSpeechRecognitionSupported, voiceLang, lang]
  );

  // Text-to-Speech functions
  const stopSpeaking = useCallback(() => {
    if (isTtsSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingId(null);
  }, [isTtsSupported]);

  const speak = useCallback(
    (text, { id = "global", langOverride = null } = {}) => {
      if (!isTtsSupported || !text) return false;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(String(text));
      const matchedVoiceLang = SUPPORTED_VOICE_LANGUAGES.find((vl) => vl.appLang === lang)?.code;
      const targetLang = langOverride || matchedVoiceLang || voiceLang || (lang === "hi" ? "hi-IN" : "en-IN");
      utterance.lang = targetLang;
      utterance.rate = 0.96;

      // Pick matching voice if available
      if (selectedVoiceURI) {
        const chosen = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
        if (chosen) utterance.voice = chosen;
      } else if (availableVoices.length > 0) {
        const langPrefix = targetLang.split("-")[0].toLowerCase();
        const matchVoice =
          availableVoices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
          availableVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        if (matchVoice) utterance.voice = matchVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingId(id);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingId(null);
      };

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setSpeakingId(id);
      return true;
    },
    [isTtsSupported, lang, voiceLang, selectedVoiceURI, availableVoices]
  );

  const executeCommandText = useCallback(
    (rawCommandText, { closeAfter = true } = {}) => {
      stopListening();
      const parsed = parseVoiceCommand(rawCommandText);
      if (parsed.type === "EMPTY" || parsed.type === "REJECTED_UNSAFE") {
        setParsedPreview(parsed);
        return parsed;
      }

      setLastExecutedAction({
        ...parsed,
        rawText: rawCommandText,
        executedAt: new Date().toISOString(),
      });

      if (parsed.type === "READ_ALOUD") {
        if (parsed.route) {
          navigate(parsed.route);
        }
        window.dispatchEvent(new CustomEvent("organic-trace:voice-read-page"));
      } else if (parsed.route) {
        navigate(parsed.route);
      }

      if (closeAfter) {
        setIsModalOpen(false);
      }
      return parsed;
    },
    [navigate, stopListening]
  );

  const openVoiceModal = useCallback(
    ({ autoStart = false } = {}) => {
      setIsModalOpen(true);
      setRecognitionError(null);
      if (autoStart && hasMicConsent && isSpeechRecognitionSupported) {
        setTimeout(() => startListening(), 150);
      }
    },
    [hasMicConsent, isSpeechRecognitionSupported, startListening]
  );

  const closeVoiceModal = useCallback(() => {
    stopListening();
    setIsModalOpen(false);
  }, [stopListening]);

  return (
    <VoiceContext.Provider
      value={{
        isModalOpen,
        openVoiceModal,
        closeVoiceModal,
        voiceLang,
        setVoiceLang,
        supportedVoiceLanguages: SUPPORTED_VOICE_LANGUAGES,
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
        setRecognitionError,
        parsedPreview,
        executeCommandText,
        lastExecutedAction,
        // TTS
        isTtsSupported,
        isSpeaking,
        speakingId,
        speak,
        stopSpeaking,
        availableVoices,
        selectedVoiceURI,
        setSelectedVoiceURI,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return ctx;
}
