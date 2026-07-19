# PrepPal — New-User Experience (the "front door")

**The problem, in one line:** a stranger who opens PrepPal today lands in an app full of empty
charts, with no story telling them *what this is, whether it's for them, or how to start.* We tuned
a great engine; the doorway was missing.

Your instinct was **tour + about**. After weighing it (and two AI passes), here's **exactly** what
we're building — and where your tour idea landed.

---

## The decision (what we're building vs. the tour)

We're solving it in **three answers a nervous fresher needs, in order**, plus a small setup fix:

| # | The question in their head | What we build | Answers |
|---|----------------------------|---------------|---------|
| 1 | "Is this even for me?" | **Landing / positioning screen** | first 5 seconds |
| 2 | "Okay… how do I start?" | **First-run "Start here" dashboard** | first minute |
| 3 | "Is this legit / safe?" | **About page** | builds trust |
| 4 | "What do I even type?" | **Setup blank-canvas fixes** | removes the freeze |

**Where the interactive tour went:** *deferred, on purpose.* A pop-up coach-mark tour (highlight this,
click next, highlight that) is more to build, more to maintain, and easy to get wrong — and it tends
to *delay* the person from the one thing that actually sells the product: **taking their first mock.**
Instead, the **first-run "Start here" screen IS the tour** — it teaches by pointing at the next action,
not by narrating the UI. If we still want coach-marks later, they drop in cleanly on top. So your tour
idea isn't dropped — it's replaced by something lighter that does the same job better for v1.

---

## Part 1 — Landing / positioning: "Is this for me?"

A real first screen (before/around signup), not a cold app. Copy:

- **Hero:** *"Practice until you're interview-ready. Confidence follows."*
- **Sub:** *"Free, private AI mock interviews built for Indian students & freshers landing their
  first job."*
- **Trust badge:** *"100% Free • Built by a solo developer for students"*
- **Outcome strip (shows the loop, not a feature list):** *Realistic mocks → Honest feedback →
  True readiness*
- **One primary button:** *Start your first mock* (→ signup, then straight into setup).

Why: it names the audience out loud (Indian student / fresher / first job), states it's free up front
(kills the "is this a paywall?" fear), and sells the *outcome*, not the tech.

## Part 2 — First-run "Start here" dashboard: "How do I use it?"

For a brand-new user with zero sessions, we **replace the empty charts** with a warm, compact guide
(and swap back to the real analytics the moment they finish their first session):

- **Headline:** *"No data yet — let's find your starting line."*
- **A 1‑2‑3 stepper:**
  1. **Take a Readiness Check** — find out exactly where you stand today.
  2. **Practice your weak sections** — HR, Technical, Behavioral, Project — no pressure.
  3. **Watch your readiness climb** — every mock updates your journey.
- **Primary action:** *Take your first Readiness Check* (the natural starting line).
- Kept **flat and short** — one glance → one obvious next click.

Why: an empty dashboard is a dead end. This turns the first screen into momentum, and it reuses the
Readiness Check we already have as the perfect "start here."

## Part 3 — About page: "Is this legit?"

A single static `/about` route, linked in the footer/nav. Your competitive edge as a solo dev is
**transparency**, so we lean into it:

- **Origin:** built by one developer because talented students fail interviews from *nerves and not
  knowing what's asked* — not from lacking ability.
- **Privacy promise:** *"Your practice is private. We don't record video, we don't store your voice
  audio, and we never sell your data."*
- **Honesty promise:** *"We don't hand out fake confidence. The AI grades honestly — like a real
  interviewer — so you know exactly what to fix before the real thing."*

Why: trust is the whole game for a free tool a stressed student is deciding whether to rely on.

## Part 4 — Setup blank-canvas fixes: "What do I type?"

At the start of a mock, the empty Job Description box is where freshers freeze. Two tiny fixes:

- **JD pills:** `[Standard SDE‑1]` `[Frontend React]` `[Data Analyst]` — one click drops in a
  pre-written JD. Zero LLM cost, instant unblock.
- **Warm-up note:** *"💡 Your first question is always 'Tell me about yourself.'"* — kills the fear
  of the unknown and gives an easy opening swing.

---

## What we are deliberately NOT doing (keeping it calm)

No interactive coach-mark tour (for now), no gamification (badges/XP/streak rewards/levels/
leaderboards/avatars), no motivational-quote spam. Interview prep is stressful enough — the calm is
the product.

## Cost / risk

All of it is **frontend + copy** (Next.js/React) — **no new AI calls, no schema changes.** The
"Start here" screen is a conditional render on the existing dashboard; the JD pills and warm-up note
are static; About is one page.

## Build status

Approved scope = **Positioning + first-run guide + About + setup fixes** (tour deferred). Design mock
comes next for your approval before any code, same as the report coach layer.
