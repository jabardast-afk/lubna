import { useEffect, useMemo, useRef, useState } from "react";

function pickFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const preferredNames = [
    "samantha",
    "victoria",
    "zira",
    "karen",
    "tessa",
    "moira",
    "allison",
    "fiona",
    "serena",
    "aria",
    "female"
  ];

  const exactMatch = voices.find((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name)));
  if (exactMatch) return exactMatch;

  const enVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
  return enVoice ?? voices[0] ?? null;
}

export function useSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setIsSupported(supported);
    if (!supported) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const stop = useMemo(
    () => () => {
      if (!isSupported) return;
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setIsSpeaking(false);
    },
    [isSupported]
  );

  const speak = useMemo(
    () => (text: string) => {
      if (!isSupported) return;
      const content = text.trim();
      if (!content) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
      const chosenVoice = pickFemaleVoice(voices);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = "en-US";
      }
      utterance.rate = 1;
      utterance.pitch = 1.08;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        utteranceRef.current = null;
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setIsSpeaking(false);
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  return {
    isSupported,
    isSpeaking,
    speak,
    stop
  };
}
