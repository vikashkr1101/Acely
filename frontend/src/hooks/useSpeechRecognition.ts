"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the standard DOM lib).
interface RecognitionAlt {
  transcript: string;
  confidence: number;
}
interface RecognitionResult {
  0: RecognitionAlt;
  isFinal: boolean;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

/**
 * Browser speech-to-text that (a) ACCUMULATES across taps — tapping the mic
 * again continues instead of wiping the previous words — and (b) AUTO-RESTARTS
 * when the recogniser drops out on a pause, so it doesn't cut you off mid-answer.
 */
export function useSpeechRecognition() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef(""); // committed text, persists across restarts & taps
  const wantRef = useRef(false); // does the user still want to be listening?
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const confSumRef = useRef(0);
  const confCountRef = useRef(0);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalRef.current += r[0].transcript;
          if (r[0].confidence > 0) {
            confSumRef.current += r[0].confidence;
            confCountRef.current++;
          }
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript((finalRef.current + interim).replace(/\s+/g, " ").trim());
    };

    rec.onend = () => {
      // Keep going through pauses while the user still wants to speak.
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* restart race — ignore */
        }
      } else {
        setListening(false);
      }
    };
    rec.onerror = () => {
      /* onend fires next and will restart if still wanted */
    };

    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  function start() {
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    wantRef.current = true;
    setListening(true);
    try {
      recRef.current?.start();
    } catch {
      /* already running */
    }
  }

  function stop() {
    wantRef.current = false;
    if (startedAtRef.current) durationRef.current = Date.now() - startedAtRef.current;
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }

  function reset() {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    finalRef.current = "";
    startedAtRef.current = 0;
    durationRef.current = 0;
    confSumRef.current = 0;
    confCountRef.current = 0;
    setTranscript("");
    setListening(false);
  }

  const durationMs = () =>
    durationRef.current || (startedAtRef.current ? Date.now() - startedAtRef.current : 0);

  /** Recogniser confidence 0-100 (best-effort; null if the browser gave none). */
  const clarity = () =>
    confCountRef.current ? Math.round((confSumRef.current / confCountRef.current) * 100) : null;

  return { supported, listening, transcript, start, stop, reset, durationMs, clarity };
}
