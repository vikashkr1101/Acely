// Browser text-to-speech + delivery-metric helpers (all on-device, free).

export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

const FILLERS = ["um", "uh", "er", "erm", "like", "basically", "actually", "literally"];

/** Words-per-minute + filler count from a spoken transcript and its duration. */
export function computeDelivery(
  transcript: string,
  durationMs: number
): { paceWpm?: number; fillerWords: number } {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const clean = (w: string) => w.toLowerCase().replace(/[.,!?;:]/g, "");
  const fillerWords = words.filter((w) => FILLERS.includes(clean(w))).length;
  const minutes = durationMs / 60000;
  const paceWpm =
    minutes > 0.05 && words.length > 0 ? Math.round(words.length / minutes) : undefined;
  return { paceWpm, fillerWords };
}
