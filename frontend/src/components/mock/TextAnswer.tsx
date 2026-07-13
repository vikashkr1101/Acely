"use client";

import { useState } from "react";

interface Props {
  busy: boolean;
  onSubmit: (transcript: string) => void;
}

export function TextAnswer({ busy, onSubmit }: Props) {
  const [text, setText] = useState("");
  return (
    <>
      <textarea
        className="answer-box"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer… take your time."
      />
      <button className="btn" onClick={() => onSubmit(text)} disabled={busy || !text.trim()}>
        {busy ? "Scoring…" : "Submit answer"}
      </button>
    </>
  );
}
