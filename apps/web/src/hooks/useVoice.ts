import { useEffect, useRef, useState } from "react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { usePlatform } from "./usePlatform";

type WebRecognition = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => WebRecognition;
    SpeechRecognition?: new () => WebRecognition;
  }
}

export function useVoice() {
  const { isNative } = usePlatform();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const recognitionRef = useRef<WebRecognition | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const start = async () => {
    setTranscript("");
    transcriptRef.current = "";
    if (isNative) {
      const perms = await SpeechRecognition.requestPermissions();
      if (perms.speechRecognition !== "granted") return;

      setIsListening(true);
      await SpeechRecognition.start({
        language: "en-US",
        partialResults: true,
        popup: false
      });
      SpeechRecognition.addListener("partialResults", (result) => {
        if (result.matches?.[0]) {
          transcriptRef.current = result.matches[0];
          setTranscript(result.matches[0]);
        }
      });
      return;
    }

    const SpeechCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechCtor) return;
    const recognition = new SpeechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      transcriptRef.current = text;
      setTranscript(text);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const stop = async () => {
    if (isNative) {
      await SpeechRecognition.stop();
      await SpeechRecognition.removeAllListeners();
      setIsListening(false);
      return transcriptRef.current;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
    return transcriptRef.current;
  };

  const clearTranscript = () => {
    transcriptRef.current = "";
    setTranscript("");
  };

  return { isListening, transcript, start, stop, clearTranscript };
}
