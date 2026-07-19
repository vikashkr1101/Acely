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
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

export type VoiceStatus = "idle" | "listening" | "reconnecting" | "blocked";

const STALL_MS = 5000; // no transcript for this long WHILE the user is audibly speaking = a real stall
const LEVEL_THRESH = 0.04; // RMS mic level above this = genuine sound (not room noise / silence)

/**
 * Browser speech-to-text hardened against the Web Speech API's silent failures:
 *  (a) ACCUMULATES across taps — tapping the mic again continues instead of wiping the words;
 *  (b) SELF-HEALS — a retrying restart survives the "engine releasing" window, and an `onstart`
 *      running-flag prevents double-starts;
 *  (c) STALL WATCHDOG — a lightweight mic-level meter gates a reconnect so it fires ONLY when the user
 *      is audibly speaking but nothing has transcribed for ~5s (the real bug), never during a normal
 *      pause or a long answer that's transcribing fine. Surfaces `status` so the UI is never silent.
 */
export function useSpeechRecognition() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");

  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef(""); // committed text, persists across restarts & taps
  const wantRef = useRef(false); // does the user still want to be listening?
  const runningRef = useRef(false); // is the engine actually running right now?
  const restartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResultRef = useRef(0); // when we last got any (interim or final) transcript
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const confSumRef = useRef(0);
  const confCountRef = useRef(0);
  // mic-level meter — only used to gate the stall reconnect (so pauses never trigger it)
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // A separate mic stream + analyser purely to read the input level. Fails silently → the stall gate
  // just turns off (the rest of the self-healing still works).
  async function setupMeter() {
    if (analyserRef.current || typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
    } catch {
      /* mic denied/unavailable — recognition's own onerror handles the user-facing state */
    }
  }
  function teardownMeter() {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

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
    rec.lang = "en-IN"; // Indian English — noticeably better on our audience's accents than en-US

    function clearRestart() {
      if (restartRef.current) {
        clearTimeout(restartRef.current);
        restartRef.current = null;
      }
    }
    // Keep trying to (re)start through the "engine still releasing" window until it starts or the user
    // stops. A single onend retry dies silently if start() throws — that's the freeze-until-toggle bug.
    function tryStart() {
      restartRef.current = null;
      if (!wantRef.current || runningRef.current) return;
      try {
        rec.start();
      } catch {
        scheduleRestart(300);
      }
    }
    function scheduleRestart(delay: number) {
      clearRestart();
      restartRef.current = setTimeout(tryStart, delay);
    }
    function micLevel(): number {
      const a = analyserRef.current;
      if (!a) return 0;
      const buf = new Uint8Array(a.fftSize);
      a.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / buf.length);
    }

    rec.onstart = () => {
      runningRef.current = true;
      lastResultRef.current = Date.now();
      if (wantRef.current) setStatus("listening");
    };

    rec.onresult = (e) => {
      lastResultRef.current = Date.now();
      if (wantRef.current) setStatus("listening"); // no-op re-render if already listening
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
      runningRef.current = false;
      // Routine end (pause / Chrome's periodic cutoff) — resume seamlessly, keep status "listening".
      if (wantRef.current) scheduleRestart(250);
      else setListening(false);
    };

    rec.onerror = (e) => {
      if (e && (e.error === "not-allowed" || e.error === "service-not-allowed")) {
        wantRef.current = false;
        setListening(false);
        setStatus("blocked");
      }
      // transient errors (no-speech, network, aborted) fall through to onend, which restarts
    };

    recRef.current = rec;

    const watchdog = setInterval(() => {
      if (!wantRef.current) return;
      const now = Date.now();
      // Engine fully stopped unexpectedly → bring it back (seamless).
      if (!runningRef.current && !restartRef.current) {
        tryStart();
        return;
      }
      // Running but STALLED: audible speech, yet no transcript for STALL_MS → force a reconnect.
      if (runningRef.current && now - lastResultRef.current > STALL_MS && micLevel() > LEVEL_THRESH) {
        setStatus("reconnecting");
        lastResultRef.current = now; // avoid re-triggering while it restarts
        try { rec.stop(); } catch { /* onend will restart */ }
      }
    }, 1000);

    return () => {
      wantRef.current = false;
      clearInterval(watchdog);
      clearRestart();
      teardownMeter();
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    wantRef.current = true;
    lastResultRef.current = Date.now();
    setListening(true);
    setStatus("listening");
    void setupMeter();
    if (runningRef.current) return;
    try {
      recRef.current?.start();
    } catch {
      /* still releasing — the watchdog will start it within a couple of seconds */
    }
  }

  function stop() {
    wantRef.current = false;
    if (restartRef.current) {
      clearTimeout(restartRef.current);
      restartRef.current = null;
    }
    if (startedAtRef.current) durationRef.current = Date.now() - startedAtRef.current;
    teardownMeter();
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
    setStatus("idle");
  }

  function reset() {
    wantRef.current = false;
    if (restartRef.current) {
      clearTimeout(restartRef.current);
      restartRef.current = null;
    }
    teardownMeter();
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
    setStatus("idle");
  }

  const durationMs = () =>
    durationRef.current || (startedAtRef.current ? Date.now() - startedAtRef.current : 0);

  /** Recogniser confidence 0-100 (best-effort; null if the browser gave none). */
  const clarity = () =>
    confCountRef.current ? Math.round((confSumRef.current / confCountRef.current) * 100) : null;

  return { supported, listening, status, transcript, start, stop, reset, durationMs, clarity };
}
