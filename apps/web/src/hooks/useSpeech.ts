import { useCallback, useEffect, useMemo, useRef, useState } from "react";

async function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length) return existing;

  return new Promise((resolve) => {
    const complete = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;
      synth.removeEventListener?.("voiceschanged", complete);
      if (synth.onvoiceschanged === complete) {
        synth.onvoiceschanged = null;
      }
      resolve(voices);
    };

    synth.addEventListener?.("voiceschanged", complete);
    synth.onvoiceschanged = complete;
  });
}

async function selectVoice(userLocale?: string, overrideVoiceId?: string | null) {
  const voices = await waitForVoices();
  const lang = userLocale || navigator.language;

  if (overrideVoiceId) {
    const override = voices.find((voice) => voice.voiceURI === overrideVoiceId || voice.name === overrideVoiceId);
    if (override) return override;
  }

  if (/^(zh|cmn|yue)/i.test(lang)) {
    return (
      voices.find((voice) => /zh|chinese|mandarin|普通话|tingting/i.test(voice.name)) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) ||
      null
    );
  }

  if (/^hi/i.test(lang)) {
    return (
      voices.find((voice) => /hindi|lekha/i.test(voice.name) && !(voice as SpeechSynthesisVoice & { gender?: string }).gender?.match(/male/i)) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("hi")) ||
      null
    );
  }

  return (
    voices.find((voice) => /female|zira|samantha|karen|moira/i.test(voice.name) && voice.lang.toLowerCase().startsWith("en")) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

interface UseSpeechOptions {
  userLocale?: string;
  voiceId?: string | null;
}

export function useSpeech({ userLocale, voiceId }: UseSpeechOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setIsSupported(supported);
    if (!supported) return;

    let mounted = true;
    const loadVoices = async () => {
      const nextVoices = await waitForVoices();
      if (mounted) setVoices(nextVoices);
    };

    void loadVoices();

    return () => {
      mounted = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useMemo(
    () => async (text: string) => {
      if (!isSupported) return;
      const content = text.trim();
      if (!content) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      const chosenVoice = await selectVoice(userLocale, voiceId);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = /^hi/i.test(userLocale ?? navigator.language) ? "hi-IN" : "en-US";
      }
      utterance.rate = 1;
      utterance.pitch = 1.02;
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
    [isSupported, userLocale, voiceId]
  );

  return {
    isSupported,
    isSpeaking,
    speak,
    stop,
    voices
  };
}
