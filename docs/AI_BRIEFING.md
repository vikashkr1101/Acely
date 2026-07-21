# Acely — Current-State Briefing (for cross-review)

> Paste this whole document to another AI to get an informed second opinion. It is self-contained:
> it explains what Acely is, how the engine and scoring work (with the exact rubrics), the data
> model, and the honest known gaps. At the end is what we specifically want feedback on.

---

## 1. What Acely is

A **free** AI mock-interview & interview-prep web app for **students and fresh graduates, mainly in
India**, trying to land their first job. Built by a **solo developer** as both a real product and a
**Java-portfolio flagship**. Hard constraint: **must stay free to operate**.

Positioning: **"Practice until you're interview-ready — confidence follows."** Honest, calm, private.

**Stack:** Spring Boot 4 (Java 21) + Postgres (Neon) + Flyway migrations backend · Next.js 16 +
React 19 + TypeScript frontend · email/JWT auth · charts are hand-rolled SVG (no chart lib).

**AI:** a config-driven failover chain, usage logged to an `ai_usage` table. Generation/coaching
prefer **Zhipu GLM-4.5-Flash** (free); scoring prefers **Gemini** (more consistent); **Groq** behind;
a **static question/score bank** as the terminal fallback so the app never hard-fails. One structured
LLM call per answer for scoring.

---

## 2. The core model: three session types, two journeys

**Three session shapes:**
- **Practice** = ONE section (HR / Technical / Behavioral / Project). Score-as-you-go, retries
  allowed, inline coaching. This is *training*.
- **Mock Interview** = a MIXED session spanning all sections in one sitting (a realistic full
  interview). Single-shot (no retries), answered uninterrupted, **scored in a batch at the end**.
- **Readiness Check** (internally "checkpoint") = a *standardized* Mock Interview: fixed **Hard**
  difficulty, single-shot, **fixed 8 questions**, no follow-ups — so checkpoint-to-checkpoint deltas
  are comparable. It's the gold-standard measurement. Optional + retakeable.

**Two journeys (analytics):**
- **Overall / Readiness journey** = Readiness Checks + Mock Interviews (both single-shot
  measurements). Checkpoints are the milestone flags; interviews are dots. This is "how
  interview-ready am I, over time."
- **By-type / Practice journey** = practice mocks per section over time (first & latest emphasized,
  hover shows the 4 dimensions). Checkpoints do NOT plot here (they're general/mixed).

Rationale: Practice trains; measurements (single-shot) define the honest readiness trend. Retries are
a learning tool and shouldn't inflate the trend.

---

## 3. The engine pipeline

1. **Setup** → role + optional JD + experience level (Fresher / 0–1 / 1–3 / 3+) + difficulty
   (Normal / Hard) + mode (text/voice). Practice also picks a section; Interview/Checkpoint are mixed.
2. **Generation** — role- and level-grounded questions. Single-type for practice; **mixed generation**
   for interview/checkpoint (each question tagged with its section: HR/TECHNICAL/BEHAVIORAL/PROJECT).
   A gibberish role returns `{"invalid_role":true}` → 400. Difficulty conditions depth/probing.
3. **Answer evaluation** — ONE structured LLM call per answer that, in order: (a) states what a top
   answer for this level contains, (b) scores each rubric dimension 0–100 **with a quoted evidence
   snippet from the answer**, against anchored bands + level + difficulty, (c) writes short
   encouraging feedback + an educational example answer (no invented specifics). Temp low, forced JSON.
   Each question is scored against **its own section's rubric** (mixed sessions score per section).
4. **Overall computed in backend** — a **weighted** roll-up of the dimension scores (weights from the
   rubric; NEVER trust the model's arithmetic). Also projected onto a canonical 4 (communication /
   technical_depth / relevance / clarity) via the rubric's `axis_map` so report bars are never empty.
5. **Adaptive follow-up** (Practice + Mock Interview, NOT checkpoints) — after an answer, a cheap
   generation call may add ONE grounded follow-up probing what they said; budget-capped (≤2/session).
6. **Retry loop** (Practice only) — retry the same question, re-score, show first-vs-improved delta.
7. **Session analysis** — after completion, one grounded call produces a relatable coach note +
   strengths + focus + cross-question patterns (grounded in the actual answers; deterministic
   fallback if AI is down).
8. **Readiness** = a rolling average of completed scores (see Known Issues — this is computed
   inconsistently across surfaces).

---

## 4. The scoring rubrics (exact definitions)

Per interview type: 4 dimensions (each 0–100, weighted), an `axis_map` projecting onto the canonical
4 report axes, top-answer guidance, and shared anchored bands. Weights per type sum to 1.0.

**Shared band anchors (per dimension, 0–100):**
`0–40` missing/incorrect · `41–60` partly right but vague/incomplete · `61–75` solid but shallow/generic
· `76–90` strong, specific, well-structured · `91–100` exceptional and complete. *Judged against what
is fair for the candidate's stated experience level.* (Hard difficulty tightens this: adequate answers
shouldn't exceed ~60.)

### TECHNICAL — "Technical"
| dimension | weight | what it measures |
|---|---|---|
| Correctness | 0.35 | Are the facts and logic actually correct? |
| Depth | 0.25 | Beyond the surface — the why and the internals? |
| Trade-offs | 0.20 | Do they weigh alternatives / trade-offs? |
| Communication | 0.20 | Clear, well-structured explanation? |
- **axis_map:** communication→[communication]; technical_depth→[correctness,depth,tradeoffs]; relevance→[correctness]; clarity→[communication]
- **Top answer:** factually correct, explains the underlying *why*, weighs ≥1 trade-off, clear with a concrete example.

### BEHAVIORAL — "Behavioral"
| dimension | weight | what it measures |
|---|---|---|
| Structure (STAR) | 0.30 | Situation, Task, Action, Result? |
| Specificity | 0.25 | Concrete real details vs vague generalities? |
| Impact | 0.25 | Clear, ideally quantified outcome? |
| Communication | 0.20 | Clear, concise, first-person (I, not we)? |
- **axis_map:** communication→[communication]; technical_depth→[impact]; relevance→[structure]; clarity→[communication,structure]
- **Top answer:** follows STAR, a real specific example, centred on what THEY did, ends with a concrete/quantified result.

### HR — "HR & Motivation"
| dimension | weight | what it measures |
|---|---|---|
| Relevance | 0.30 | Does it actually answer the question? |
| Self-awareness | 0.25 | Honest, reflective, self-aware? |
| Motivation | 0.25 | Genuine interest/fit with a real reason? |
| Communication | 0.20 | Clear, confident, concise without rambling? |
- **axis_map:** communication→[communication]; technical_depth→[self_awareness]; relevance→[relevance]; clarity→[communication]
- **Top answer:** directly addresses the question, honest & self-aware, genuine motivation with a specific reason, concise.

### PROJECT — "Project"
| dimension | weight | what it measures |
|---|---|---|
| Ownership | 0.30 | Is their specific role / contribution clear? |
| Technical depth | 0.25 | Do they understand the technical choices and why? |
| Challenges | 0.25 | A real problem and how they solved it? |
| Communication | 0.20 | Clear, structured explanation of the project? |
- **axis_map:** communication→[communication]; technical_depth→[ownership,depth]; relevance→[challenges]; clarity→[communication]
- **Top answer:** THEIR role clear, key technical decisions + why, a real challenge + solution, quantified impact where possible.

**Mixed sessions** (Mock Interview / Readiness Check) score each question against its own section's
rubric, then the **per-section** report bars = average of that section's question scores; the overall
readiness = average across all questions.

---

## 5. Reports, dashboard, journey

- **Report:** readiness gauge + the type's real dimension bars (per-section for mixed) + a grounded
  coach note + strengths/focus + cross-question patterns + compact per-question rows (score + coach
  feedback), with an expandable breakdown per question (your own answer + the 4-dimension scores +
  the quoted evidence + the retry compare). One-click vector PDF (jsPDF), same content.
- **Dashboard:** readiness ring, score trend, streak, recent mocks, an **interview-type filter**, an
  adaptive skill card (per-type overview ↔ that type's dimension bars), a persistent **"What to
  practise next"** card (weakest section from the latest checkpoint) + a checkpoint invite/reminder.
- **Journey & Analytics page:** date-range chips · Overall lens (readiness line over time,
  checkpoints as flags) + Then→Now section bars · By-type lens (all sections multi-line, or one
  section drilled in with hover-for-dimensions).

---

## 6. Data model (summary)

```
users ──< interview_sessions ──< questions ──< answer_attempt
   (+ interview_type[null=mixed], experience_level, scoring_mode[PRACTICE|INTERVIEW],
      difficulty[NORMAL|HARD], checkpoint[bool], analysis_json, overall_score, summary)
                                   (+ question_type[section], rubric_json[dims+evidence+overall],
                                      follow_up_of, retry_of)
rubric (one row per type: dimensions[+weights], axis_map, top_answer_guidance, band_anchors)
session_metric (canonical-4 per question, nerves) · ai_usage (provider, op, tokens, success)
```
Additive/nullable migrations only. Scores are 0–100. One structured scoring call per answer.

---

## 7. What we JUST hardened (from a prior 3-AI review) — please VERIFY these

A prior review (GPT / Gemini / DeepSeek) converged on a "trust tripod." We implemented all of it.
Validate whether each is *sound and correct*, not whether it could be more elaborate:

1. **One readiness number.** A single `ReadinessService`: readiness = the average of the **last 5
   MEASUREMENT sessions only** (Readiness Checks + Mock Interviews — both mixed, single-shot).
   **Null until the first measurement.** Practice never affects it. The dashboard ring, the difficulty
   auto-ramp, and the Journey headline all read this one source, so they can't disagree. Shown as an
   assessment with "based on N measurements", not a fake precise pass-probability %.
2. **Incremental scoring (kills the 504).** The interview no longer batch-scores at the end in one
   request. The client calls `POST /score-next` once per answer (each request scores exactly ONE
   answer, ~3s) while a progress ring shows "scored X of N", then finalizes. Avoids the long request
   and paces the free-tier LLM rate limit.
3. **Fallback transparency.** If any answer was scored by the static offline fallback, `AnswerScore`
   carries `estimated=true`; the session is flagged `has_estimated`, shown with a report banner, and
   **excluded from the readiness measurement** (never a silent guessed milestone).
4. **Section-coverage quota.** Mixed generation is now told an explicit per-section quota (e.g. 8 →
   2 Technical / 2 Behavioral / 2 HR / 2 Project) instead of letting the LLM choose the mix.
5. **Gatekeeper dimension.** In the BACKEND: for TECHNICAL, if the Correctness dimension < 40 the
   whole answer's overall is capped to it (PROJECT uses Ownership). A well-spoken but factually wrong
   answer can't score 50+.
6. **Fresher STAR softening.** For a Fresher, the eval prompt no longer docks points for missing
   quantified business impact / production scale — it credits lessons learned and scope instead.
7. **Nerve check-in skippable** ("Skip" / "Skip from now on").

Note on the division of labour: the LLM returns per-dimension band scores + evidence quotes only; the
**backend** computes every number that matters — the weighted overall, the gatekeeper cap, and the
readiness average. We never trust the model to do arithmetic or to decide readiness.

## 8. Known remaining gaps (intentionally deferred — do NOT ask us to fix these now)

Deferred to v2 by deliberate decision: split `globals.css`; denormalizing scores / native Postgres
JSON querying; API rate-limiting; free-tier keep-alive; accessibility audit; dark mode; error-tracking
service; 1–5-vs-0–100 scoring A/B; cached question banks; SQL/DSA drills; in-browser Whisper for voice
accuracy; job-family/domain classification; resume mode; honest peer percentile; learn-mode lessons.
Our own prod-launch actions (not code): rotate secrets, set prod env vars, keep-alive on deploy.

---

## 9. What we want from THIS review (verification, not a fresh audit)

1. **Are the seven hardening fixes in §7 implemented soundly?** Especially: the readiness definition
   (measurements-only, last-5, nullable), the incremental-scoring pattern, and the gatekeeper cap.
   Any correctness or edge-case flaw in these *specific* approaches?
2. **Any REMAINING launch-blocker** for the first ~100 real users we've missed — a trust, consistency,
   or reliability pitfall — that is NOT already on the deferred list in §8?
3. **Is the scoring honest?** Given the rubrics/weights/bands in §4, where would a real interviewer
   most disagree with the scores a fresher would receive?

Constraints for your answer: the architecture is FROZEN — no new features, services, or rewrites;
nothing from the deferred list in §8; keep every suggestion realistic for a solo dev on free tiers;
prioritize ruthlessly (what actually blocks launch vs what's nice-to-have).
