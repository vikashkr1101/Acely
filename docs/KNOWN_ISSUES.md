# PrepPal — Known Issues & Backlog

A running list so nothing slips, and so we don't re-introduce fixed bugs.
Status: 🔧 fixing now · 📌 open (fix during the journey) · ⏳ deferred (later phase) · ✅ fixed

## 🔧 Fixing now
- **Role validation** — nonsense roles (e.g. "dsfghjm") create junk mocks. Reject non-real roles with a friendly nudge.
- **Setup layout** — two-column wizard (step left + persistent "what happens next" rail right), stepped so it never scrolls.

## 📌 Open (fix during the journey)
- **Non-technical report labels** — an HR/Behavioral report still shows the canonical-4 labels ("Technical depth" on an HR mock). Should show that type's real rubric dimension names. (Phase 1.6/1.7)
- **Coach's note + "What went well"** — still the old static templates; replace with the instruction-driven session analysis. (Phase 1.6)
- **Rubric evidence quotes** — captured in `rubric_json` but not shown in the report UI yet. (Phase 1.7)
- **Giant `globals.css`** — Turbopack dev cache truncates newly-added CSS (styles missing in dev until `.next` is cleared). Split the CSS so this stops recurring.
- **Report bars = first attempt only** — retries update the shown score but not the averaged competency bars; revisit with the analytics rework. (Phase 1.6)

## ⏳ Deferred (later phase — also logged in the plan)
- **Voice** — Web Speech is unreliable (stops mid-answer, weak on Indian accents) → in-browser Whisper (transformers.js). (Phase 2)
- **Interview-mode batch scoring** — currently synchronous on `complete()` (long request) → async, paced scoring.
- **"Regenerate / re-analyze a past mock"** — only if it does NOT rewrite historical scores (snapshot/version them). (Phase 2+)
- **Gemini free-tier rate limits** — some scores fall back to Zhipu; paced batch-scoring mitigates.

## ✅ Fixed
- Gemini `limit:0` — `gemini-2.0-flash-lite` was retired → switched to `gemini-2.5-flash-lite`.
- Rubric key-casing mismatch ("Trade-offs" vs "tradeoffs") broke weighting + bar projection → normalize keys.
- Report: score shown twice + run-on metadata → single score + metadata chips.
- Interview stage flashing before the report → report served from its own `/reports/[id]` route.
- UTF-8 mojibake in the interview page (PowerShell re-encoding) → rewritten as clean UTF-8.
