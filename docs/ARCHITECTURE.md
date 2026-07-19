# PrepPal — Architecture (v1, frozen)

This is the standing reference for how PrepPal is built. It's **frozen**: unless a
decision creates a real technical problem, we implement against this — we don't
re-open the architecture every time we add a feature. New ideas go through the
plan (`.claude/plans/…`) and, if adopted, get folded in here.

> Cross-checked against ChatGPT / Gemini / DeepSeek reviews. Where they suggested a
> rewrite (drop Spring Boot, add a vector DB, split into microservices, multi-chain
> LLM calls) we said no — see **Deliberate non-goals**. Where they were right (one
> call per answer, evidence-backed scores, no invented reference answers) it's
> baked in below and already shipped.

## What PrepPal is

A **free** AI mock-interview app that makes **Indian freshers interview-ready** —
practice, honest feedback, learning, progress. Positioning: *practice until you're
interview-ready — confidence follows.* The calm, encouraging tone is a **feature**,
not the pitch.

It is **not** a resume builder, a jobs board, a video-interview platform, or a
coding IDE.

## Stack

- **Backend:** Spring Boot 4 (Java 21), Postgres (Neon), Flyway, Spring Data JPA / Hibernate, JWT auth.
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript.
- **AI:** config-driven failover chain, usage logged to `ai_usage`.

We keep Spring Boot on purpose — it's the Java-portfolio proof and it already works.
Free-tier cold starts are a *hosting* problem with hosting fixes (always-on-ish
free host or a keep-alive ping + a graceful "waking up" state), not a reason to
rewrite the backend.

## AI providers

One provider abstraction, ordered by config — never provider-specific logic in the
business code.

- Chain (config `preppal.ai.failover`): **Zhipu → Gemini → Groq → static**. Zhipu
  GLM-4.5-Flash is the free primary; Gemini and Groq back it; the static bank
  guarantees an answer even if every provider is throttled.
- **Per-operation routing:** scoring routes to the most consistent model first
  (`preppal.ai.failover-score` = Gemini-first); generation/coaching prefer the cheap
  one (Zhipu-first). Same engine, ordered per operation.
- 429s back off before falling through to the next provider.
- Add a provider by config, not by touching the flow.

## The evaluation pipeline

**One AI call per answer.** No multi-chain orchestration for v1.

```
generate question → user answers → single evaluate call → { scores + evidence + feedback + example answer }
```

`evaluateAnswer()` returns, in one call:

- **Per-dimension scores (0–100)**, each with a **required evidence quote** from the
  candidate's own answer. No unexplained numbers, ever.
- **Feedback** — written only *after* scoring, so the warm tone can't inflate the
  numbers. Leads with a real strength, then the one highest-leverage fix.
- **An example ("reference") answer** — educational only.

### Scoring rules (frozen)

- **Four canonical axes, always:** communication, technical depth, clarity,
  relevance. Always persisted so the report bars are never empty.
- **Scores are 0–100** with anchored bands + harsh calibration ("most real answers
  land 40–70; only genuinely strong answers exceed 80"). We keep 0–100, **not** a
  1–5 scale — the anchored bands + backend-computed overall already give the
  consistency a coarse scale is meant to buy, without losing granularity.
- **The overall is computed in the backend** — a weighted roll-up from the returned
  dimension scores. We never trust the model's own arithmetic.
- **Level-aware:** a fresher is judged against fresher expectations, not senior ones.
- **Type-aware rubrics:** each interview type (HR · Technical · Behavioral · Project)
  has its own rubric (dimensions + weights + evidence + band anchors), projected onto
  the canonical 4 via an axis map. Key matching is normalised (case/punctuation) so
  the model's casing can't silently drop a dimension.
- **Raw rubric JSON is stored** on each question for debugging and for the session
  pattern detection.

### Reference-answer rule (frozen)

The example answer teaches the *shape* of a strong answer — it is **not** a rewrite
of the candidate's life. The prompt forbids inventing specifics on their behalf: no
fake project names, company names, percentages, millisecond figures, record counts,
or production experience. They fill the shape with their own real work.

## Session analysis (instruction-driven)

After a session completes, one grounded analysis call produces:

- **Coach's note** — reads like a real, relatable human coach speaking to *you*:
  names a specific strength + the real thing holding you back, grounded in your
  actual answers and scores. No generic filler ("keep practising!").
- **What went well / Focus next** — the AI's grounded strengths and focus items.
- **Patterns we noticed** — cross-question habits a human interviewer would catch
  ("answers got vaguer as questions got harder", "structure stayed strong throughout"),
  from the per-question rubric dimensions + answer length + question order. This is
  where PrepPal beats a single overall score.

The AI supplies the specifics **within our rules — it never decides alone.** A
deterministic fallback covers the case where AI is down. The report and the
downloaded PDF both render this same analysis (screen and PDF read the same fields).

## Retry & scoring modes

- **Practice mode:** answer → feedback → retry the same question → compare
  first-vs-improved, delta tracked. Learning happens on the retry.
- **Interview mode:** answer everything uninterrupted, then batch-score at the end
  (paced to respect free-tier rate limits); retry from the report. No retries mid-run.
- Retries are stored as `answer_attempt` rows (question_id, attempt_no, transcript,
  score, rubric_json, feedback) — supports multiple retries + the improvement delta.

## Progress / analytics

- **Compare like-with-like only** — Technical vs Technical, never Technical vs HR.
  The dashboard filters by interview type so the student sees per-type progress.
- Cross-mock stats are **deterministic** (trends, coverage, retry-improvement delta,
  streak, weakest/strongest axis). Readiness is an honest rule-based indicator,
  never a fake precise "pass %".

## Prompts

- Every prompt is **versioned**; the version is stored with the session/answer.
- Output shape is a **fixed JSON schema** — it never changes between providers.

## Data model (v1)

```
users ──< interview_sessions ──< questions ──< answer_attempt
        (+ interview_type, experience_level, entry_mode,          (+ question_type,
           scoring_mode, prompt_version, analysis_json)              rubric_json, retry_of)
ai_usage  (provider, operation, tokens, success — pruned beyond ~60 days)
rubric    (one per interview type: dimensions + weights + evidence + band anchors)
```

Additive, nullable migrations only — every schema change keeps legacy sessions
rendering. Store parsed text, never files, in Postgres. Postgres-only; portable by a
connection-string change.

## Deliberate non-goals (v1)

We are **not** adding these, and proposals to add them should be pushed back on
unless real usage forces it:

- No vector database, no LangChain, no message queues, no microservices.
- No multi-chain LLM orchestration — one evaluation call per answer.
- No video interviews, jobs board, resume builder, or coding IDE.
- No provider-specific business logic — everything goes through the config-driven
  abstraction.
- No premature optimization — ship the feature, optimize only after real usage shows
  a hotspot.

## Guardrails (how we avoid drifting)

- One AI evaluation call per answer unless a future requirement genuinely proves
  otherwise.
- Provider abstraction stays config-swappable (Zhipu / Gemini / future).
- Every score carries evidence from the candidate's own answer.
- Reference answers are educational, never fabricated experience.
- Additive nullable migrations; legacy sessions always render.
- Prompts versioned; raw evaluation JSON stored.
- Prefer simple, maintainable code over clever code.
