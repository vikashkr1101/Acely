# Acely — Known Issues & Backlog

A running list so nothing slips, and so we don't re-introduce fixed bugs.
Status: 🔧 fixing now · 📌 open (fix during the journey) · ⏳ deferred (later phase) · ✅ fixed

## 🔧 Fixing now
- **Role validation** — nonsense roles (e.g. "dsfghjm") create junk mocks. Reject non-real roles with a friendly nudge.
- **Setup layout** — two-column wizard (step left + persistent "what happens next" rail right), stepped so it never scrolls.

## 📌 Open (fix during the journey)
- **UI refinement pass** — small polish debt accumulating across the app (spacing, header weight, card alignment, chip sizing, minor inconsistencies noticed in passing). Do a dedicated cleanup sweep near the end of Phase 1 rather than one-off. Keep adding specifics here as spotted.
- **Giant `globals.css`** — Turbopack dev cache truncates newly-added CSS (styles missing in dev until `.next` is cleared). Split the CSS so this stops recurring.
- **Report bars = first attempt only** — retries update the shown score but not the averaged competency bars; revisit with the analytics rework. (Phase 1.6)
- **Journey practice points use session score (latest), not strictly first-attempt** — measurements (checkpoints/interviews) are single-shot so honest by construction; practice retries can slightly inflate their journey point. Refine to first-attempt aggregation if it matters.
- **Journey radar toggle** — deferred; the page ships with Then→Now bars (Overall) + multi-line (By-type). Radar can be added later.

## ⏳ Deferred (later phase — also logged in the plan)
- **Voice accuracy** — in-browser Whisper (transformers.js) for accent accuracy. (v2 — the cut-off + en-IN fixes shipped in v1)
- **Interview-mode batch scoring** — currently synchronous on `complete()` (long request) → async, paced scoring.
- **Follow-up gen latency** — adaptive follow-up runs a synchronous LLM call after each answer (until the per-session cap), adding a beat to the submit. Fine for now; could fire it in parallel with scoring or lazily later.
- **"Regenerate / re-analyze a past mock"** — only if it does NOT rewrite historical scores (snapshot/version them). (Phase 2+)
- **Gemini free-tier rate limits** — some scores fall back to Zhipu; paced batch-scoring mitigates.

## ✅ Added — domain-standardized readiness (track + stack benchmark) (2026-07-19)
- **A Readiness Check now benchmarks to the user's interview TRACK** (Backend / Frontend / Full-Stack / Data-ML / QA / DevOps; GENERAL fallback) so a Backend score always compares against the Backend benchmark, never against Data/ML. A **STACK** (Java-Spring / Python / Node / C#-.NET / Go…) personalizes the questions without splitting the benchmark. `InterviewTrack` enum + `V14` migration (`users.primary_track/stack`, `interview_sessions.track/stack`).
- **Captured once at the first Readiness Check** (picker on `/mock/checkpoint`), stored on the profile, **changeable** via a "Change" affordance; each session stamps the track active when taken (so history stays honest if they switch).
- **Generation:** checkpoints pass a track hint → TECHNICAL + PROJECT questions become track/stack-specific; **HR + Behavioral stay general** (comparable + cheap).
- **Labels:** dashboard shows "📏 Backend Benchmark", report titled "Backend Readiness Assessment" + a stack chip; the old "Standardized" chip is now "Benchmark" (report + PDF).
- Naming per the review: *track = Primary Interview Track · badge = Backend Benchmark · metric = Interview Readiness · report = Backend Readiness Assessment*. (Rejected the review's "Hard difficulty" subheader — it re-introduced exam framing we'd dropped.)

## ✅ Added — polish batch + feedback loop (2026-07-19)
- **User feedback loop** — a `feedback` table (V13) + `POST /api/feedback`. Three surfaces: a post-interview card shown **on the scoring screen** (fills the incremental-scoring wait — rate while the last answers score, then straight to the report), a `/feedback` page (rating + category + message, in the sidebar), and an **admin "User feedback" panel** (avg ★, counts, recent list) via `GET /api/admin/feedback`.
- **Read questions aloud** — every question is now dictated (TTS) in **both** text & voice, with a "🔊 Repeat question" button on each (was voice-only).
- **Prep tips page** (`/prep`) — coach-toned guides mapped to sections (TMAY, HR, Technical, Behavioral/STAR, Project, nerves) with a scroll-to TOC; sidebar nav item. Scoped CSS module (avoids the globals.css truncation trap).
- **Journey chart** — even **day-based** x-spacing (same-day mocks share a column, gaps don't stretch the axis) + rich **interactive tooltips** (score, date, per-section breakdown for measurements; dimensions for practice).
- **API rate-limit** — per-user 40/min on `/api/interviews/**` (guards free-tier AI quota); `RATE_LIMIT_PER_MINUTE` overridable.
- **Checkpoints show "Standardized," not "🔥 Hard"** (report + PDF) — fair-comparison framing; users accept honest scores better when it's "the standard test."

## ✅ Added — admin cockpit + retention prune (2026-07-19)
- **Email-gated admin** at `/admin` (frontend) → `GET /api/admin/insights`. Gating is **server-enforced**: `/api/admin/**` returns 403 unless the user's email is in `ADMIN_EMAILS` (default `vikash1128kumar@gmail.com`, comma-separated, case-insensitive) — not just a hidden link.
- **Insights:** users + new/active-7d, mocks + 7d, completion rate, avg readiness (measurements-only), offline-estimated rate, weekly signups, AI provider health (calls / success% / fallbacks from `ai_usage` — no token field exists), practice mix by type, top roles, `ai_usage` size + oldest row.
- **Retention prune:** nightly `@Scheduled` job (03:30) deletes `ai_usage` rows > 60 days + a manual "Prune now" button (`POST /api/admin/prune-ai-usage`). `@EnableScheduling` added.

## ✅ Added — new-user front door + finer ladder (2026-07-19)
- **Broadened positioning:** landing reworked from the old "interviews are scary / fear" copy (which also advertised non-existent Video mocks + a Fresher Jobs board) to *"Practice until you're interview-ready. Confidence follows."* — for students, freshers, career switchers, anyone with an interview. Honest feature list (Text·Voice, honest feedback, readiness checks, journey).
- **About page** (`/about`) — solo-dev origin + privacy / honesty / free promises.
- **First-run dashboard** — the zero-mock state is now a "Start here" 1-2-3 stepper (Readiness Check → practice weak sections → watch it climb) instead of a bare invite.
- **Setup blank-canvas fixes** — JD starter pills (Standard SDE-1 / Frontend React / Data Analyst inject a ready JD) + an honest warm-up note. A full Mock Interview / Readiness Check now genuinely opens with a "tell me about yourself" warm-up (backend opener), so the note is true.
- **Finer experience ladder** — `Fresher · 0–1 · 1–2 · 2–3 · 3–5 · 5+` (was Fresher / 0-1 / 1-3 / 3+), with a **gradual grading ramp** (fresher softened → senior held to a high bar) and a `V12` remap migration for legacy rows.
- **Deferred (decided):** "Generate JD from skills" — pick-a-starter + paste covers the blank-canvas problem at zero cost; generate can be a clean follow-up.

## ✅ Fixed — pre-share hardening (from the 2-AI verification round, 2026-07-19)
- **Measurement-lifecycle integrity (5 blockers both reviewers flagged):**
  - A finished session with **no scored answers** is marked `ABANDONED` (not `COMPLETED`) — never a phantom 0/null measurement.
  - New `POST /interviews/{id}/abandon` to **discard an unfinished session** (kept out of trends, not deleted).
  - Readiness now orders the last-5 by **completion time**, not creation time.
  - Readiness distinguishes *never measured* from *measured-but-all-estimated* (`readinessEstimatedPending`) so the dashboard can show a "re-take for an accurate read" nudge instead of looking glitched.
  - **JWT fail-fast:** refuses to start under a `prod` profile with the dev-default secret; loud warn otherwise (local dev stays frictionless).
- **Report coach layer ("coach, not judge"):**
  - **Ranked Recommendations engine** — a deterministic "Before your next interview" block: 1–3 session-earned next-steps (re-take if estimated · the highest-leverage focus · practice the weakest section · say-more nudge · Readiness Check due), ranked by impact, capped at 3, primary emphasised. Rendered on screen + in the PDF; extensible (new rule = new row).
  - **Calmer colour** everywhere (screen + PDF): green ≥70, **amber 40–69, red only under 40** — a fresher at 55 no longer sees alarm-red.
  - Judgemental copy was already gentle here ("What went well" / "Focus next" / "strong example answer") — no relabel needed.

## ✅ Fixed — launch hardening (from the 3-AI cross-review)
- **Readiness is now ONE number** (`ReadinessService`, measurements-only, avg of last 5, nullable until measured) used by dashboard + auto-ramp + journey; shown as an assessment with "based on N measurements · practice doesn't change it."
- **Gatekeeper dimension:** a factually wrong Technical answer (Correctness < 40) caps the whole answer; Project uses Ownership.
- **Section-coverage quota:** mixed generation now demands an explicit per-section mix (e.g. 2/2/2/2 for 8) so "every section" is real.
- **Fresher STAR softening:** the eval prompt no longer docks freshers for missing quantified business impact.
- **Incremental scoring** (`/score-next` + a progress ring): interviews score one answer per short request → no 504, paces the rate limit.
- **Fallback transparency:** offline-scored sessions are flagged `estimated` — a report banner + excluded from readiness (never a silent guessed milestone).
- **Nerve check-in skippable** ("Skip" / "Skip from now on" via localStorage).
- **Mobile nav** shows tiny labels under icons; **Journey x-axis** dates deduped + domain follows the lens (lone point centers); single-measurement bars read "· baseline."

## ✅ Fixed
- **Mixed report showed canonical-4 + empty per-question breakdown** → root cause: `answer()`/`evaluateAndStore()` re-set `questionType` to the session type (null for mixed), wiping each question's section. Removed both overwrites (section is set at creation). Fixes per-section bars AND the per-question 4-metric+evidence breakdown for mixed/checkpoint reports.
- Checkpoints were getting adaptive follow-ups (→ variable length, breaking comparability) → follow-ups now skipped for checkpoints (fixed 8).
- Journey charts had no x-axis → added date labels (start · mid · end).
- Practice/Mock Interview setup pages had no page header → added.
- Mixed interview question count was 1–6 (thin across 4 sections) → now 4–10 (default 6); backend `@Max` 8→10.
- Redundant "Interview" chip on checkpoint reports (alongside "Readiness Check") → suppressed.
- Interview/checkpoint showed a per-question Score 0 + Retry (and got stuck) → interview mode now just "Answer saved → Next" (scored at the end); retry is Practice-only. Entry copy is mode-aware.
- "Checkpoint" renamed to **"Readiness Check"** across all user-facing copy (code identifiers keep `checkpoint`).
- Readiness Check start page gained a text/voice toggle (was text-only).
- Voice cut-off ("mic stopped transcribing") → race-safe delayed auto-restart + fatal-error guard; **lang → en-IN** for better Indian-accent accuracy.
- Non-technical report labels → report now shows each type's real rubric dimensions (HR = Self-awareness/Motivation/…). (Phase 1.7)
- Coach's note + strengths/focus → grounded instruction-driven session analysis + Patterns section (report + PDF). (Phase 1.6)
- Rubric evidence quotes → surfaced per dimension in the report's expandable breakdown. (Phase 1.7)
- 1-question mocks blocked by `@Min(3)` on `count` → lowered to `@Min(1)`.
- Dashboard streak counted in UTC (off by a day near IST midnight) → computed in Asia/Kolkata.
- Gemini `limit:0` — `gemini-2.0-flash-lite` retired → `gemini-2.5-flash-lite`; then 2.5 began 404-ing for new keys → default `gemini-3.1-flash-lite` (verify per key; env-overridable).
- Rubric key-casing mismatch ("Trade-offs" vs "tradeoffs") broke weighting + bar projection → normalize keys.
- Report: score shown twice + run-on metadata → single score + metadata chips.
- Interview stage flashing before the report → report served from its own `/reports/[id]` route.
- UTF-8 mojibake in the interview page (PowerShell re-encoding) → rewritten as clean UTF-8.
