"use client";

import { useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { computeDelivery, speak, stopSpeaking } from "@/lib/speech";

interface Props {
  question: string;
  busy: boolean;
  onSubmit: (transcript: string, delivery: { paceWpm?: number; fillerWords: number }) => void;
}

export function VoiceAnswer({ question, busy, onSubmit }: Props) {
  const { supported, listening, transcript, start, stop, durationMs } = useSpeechRecognition();

  // Read the question aloud once when it appears.
  useEffect(() => {
    speak(question);
    return () => stopSpeaking();
  }, [question]);

  if (!supported) {
    return (
      <p className="auth-error">
        Voice isn&apos;t supported in this browser — please use Chrome, or start a text mock instead.
      </p>
    );
  }

  function submit() {
    stop();
    onSubmit(transcript, computeDelivery(transcript, durationMs()));
  }

  return (
    <div className="voice-box">
      <button className="btn o sm" type="button" onClick={() => speak(question)}>
        🔊 Replay question
      </button>

      <div className={`mic-area${listening ? " live" : ""}`}>
        <button
          className={`mic-btn${listening ? " live" : ""}`}
          type="button"
          onClick={listening ? stop : start}
        >
          {listening ? "■ Stop" : "🎤 Tap to speak"}
        </button>
        <p className="live-transcript">
          {transcript || (listening ? "Listening… take your time" : "Your answer will appear here as you speak")}
        </p>
      </div>

      <button className="btn" onClick={submit} disabled={busy || !transcript.trim()}>
        {busy ? "Scoring…" : "Submit answer"}
      </button>
    </div>
  );
}
