"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* Minimal typings for the Web Speech API (not in lib.dom for all TS versions). */
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/** Only one field listens at a time; starting a new one stops the previous. */
let active: { recognition: SpeechRecognitionLike; stop: () => void } | null = null;

export type SpeechToTextOptions = {
  /** BCP-47 language tag, e.g. "en-IN" or "ta-IN". */
  lang?: string;
  /** Called with each finalized chunk of speech. */
  onResult: (text: string) => void;
};

/** Browser speech-to-text. `supported` is false on the server and in browsers without the Web Speech API. */
export function useSpeechToText({ lang = "en-IN", onResult }: SpeechToTextOptions) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Stop reflects in the UI immediately; the browser may still deliver the last
  // final result afterwards, which onresult keeps handling.
  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    if (recognition && active?.recognition === recognition) active = null;
    recognition?.stop();
  }, []);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition && active?.recognition === recognition) active = null;
      recognition?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    active?.stop();
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onResultRef.current(text);
        }
      }
    };
    recognition.onerror = (e) => {
      if (recognitionRef.current === recognition) stop();
      if (e.error !== "aborted" && e.error !== "no-speech") {
        setError(e.error === "not-allowed" ? "Microphone permission denied" : `Voice input error: ${e.error}`);
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) stop();
    };

    recognitionRef.current = recognition;
    active = { recognition, stop };
    setError(null);
    setListening(true);
    try {
      recognition.start();
    } catch {
      stop();
    }
  }, [lang, stop]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported, listening, error, start, stop, toggle };
}
