# PrepPal — Product & Design Decisions

> The living record of *what* we're building and *why*. Read this first when picking up the project.

## One-liner
**PrepPal — "the interview prep that kills the fear."** A **free** AI mock-interview & career-prep platform for **students and freshers** (India-first).

## The core insight (our positioning)
For freshers, the enemy isn't lack of knowledge — it's **fear**. PrepPal is built, end to end, to **reduce interview anxiety** through safe, repeated AI practice. That fear-reduction angle is our differentiator; nobody else leads with it.

## Target users
Students and freshers preparing for placements / first jobs. Nervous, budget-conscious, mobile-heavy. Design must feel **friendly, encouraging, supportive** — not intimidating or "corporate."

## Features
| Feature | Notes |
|---|---|
| 🎤 **AI Mock Interviews** | role + JD → tailored questions → answer via **Text / Voice / Video** → instant scored feedback |
| 💚 **Fear-reduction design** | calm warm-up, "nothing recorded" privacy, gentle tone, strengths-first feedback, hideable self-view |
| 📉 **Confidence Tracker** (signature) | quick 😰→😌 check-in before/after each mock → visualizes nerves **shrinking** over time |
| 📊 **Dashboard** | readiness score, skill breakdown, streak, recent mocks, confidence journey |
| 🔐 **Auth** | email/password (JWT) — saves history & progress |
| 💼 **Jobs** (later) | curated fresher jobs matched to the user |

## Design decisions (chosen via iterative mockups)
- **Palette:** Bold & Playful — magenta→rose gradient (`#c026d3 → #f43f5e`), soft violet/pink grounds, green for wins, on white. Friendly, energetic.
- **Type:** Plus Jakarta Sans (friendly geometric sans).
- **Landing:** **L1** (split hero: "what we do") → **L3** (interactive "try a question now," no signup wall: "exactly what we do").
- **Dashboard:** **D3** — motivational focus banner (readiness + coaching + next action) up top, then confidence-journey tracker + stats.
- **Live interview:** **I3** — friendly **chat style** (least intimidating), mic bar at the bottom.
- **Video mock:** anxiety-aware — big "🔒 nothing recorded" badge, **hideable self-view** ("Hide me"), "no rush" language, gentle coach nudges.
- **Feedback:** strengths **first**, kind tone, growth framing (no harsh "wrong"), plus a "you went from 8→4 nervous" moment.

## Fear-reduction principles (the psychology, applied)
- **Exposure / desensitization** → the whole app is graded practice; Text→Voice→Video is a comfort ladder.
- **Psychological safety** → "just practice, nothing recorded, retry/delete anytime." (Our no-video-storage is a visible trust feature.)
- **Self-efficacy** → show progress relentlessly; celebrate growth over score.
- **Arousal reappraisal** → reframe "nervous → that's energy."
- **Growth mindset** → mistakes = learning; feedback is constructive, never harsh.
- **Predictability & control** → show what to expect; pause/skip/retry/end always available.

## Tech stack (all free tier)
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Framer Motion + TanStack Query → **Vercel**
- **Backend:** Spring Boot 4 + Java 21 + Spring Data JPA + Spring Security + JWT + Flyway → **Render/Railway**
- **DB:** PostgreSQL → **Neon**
- **AI:** Google **Gemini Flash** (question generation + answer scoring)
- **Voice/Video:** browser Web Speech + MediaRecorder — **processed on-device, video never uploaded/stored**

## Repo layout
```
preppal/
├─ frontend/   # Next.js — see src/app (globals.css = Bold design system)
├─ backend/    # Spring Boot — com.preppal.{auth,user,security,interview,dashboard,common}
└─ docs/PRODUCT.md   # this file
```

## Data model
- **users** — id, name, email, password_hash, created_at
- **interview_sessions** — id, user_id, role, jd, mode, status, overall_score, sub_scores(json text), summary, nerves_before, nerves_after, created_at, completed_at
- **questions** — id, session_id, ordinal, question_text, answer_transcript, feedback, model_answer, score

## API (REST, prefix /api)
```
POST /auth/signup   POST /auth/login   GET /auth/me
POST /interviews                 # create {role, jd, mode} → session + questions
POST /interviews/{id}/answer     # submit an answer
POST /interviews/{id}/nerves     # 😰→😌 check-in (before/after)
POST /interviews/{id}/complete   # final scoring/report
GET  /interviews/{id}   GET /interviews   # detail + history
GET  /dashboard                  # readiness, stats, confidence journey, recent
GET  /health
```

## Build phases
1. **MVP:** Auth + Dashboard + **Text mock** + feedback + nerve check-in → live.
2. Voice mock (browser speech).
3. Video mock (on-device, no storage) + delivery metrics.
4. Jobs + résumé tools + polish.

## Status (update as we go)
- ✅ Monorepo + both apps scaffolded; JDK 21 installed
- ✅ Backend auth (Spring Security + JWT), Flyway schema — compiles
- ✅ Frontend landing (L1 + L3) — builds & serves
- ⏳ Needs: Neon DB + Gemini key in `backend/.env` to run the backend
- ⬜ Next: interview engine (Gemini) + dashboard + auth/dashboard/mock screens + wire end-to-end

## Why this project matters (for Vikash)
A standout **portfolio flagship** (AI + full-stack + Java + a live demo + real product thinking) *and* a potential **micro-startup** in the AI-hiring space he already works in (RecruitBot / TestDelivery / UnleashX). Low-risk: build it, ship it, see if students use it.
