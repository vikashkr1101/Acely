# Acely — Open items sweep (2026-07-19)

A sweep of everything raised across our sessions, sorted by what needs a call vs. what's intentionally parked. Nothing here is a bug in shipped work — it's "did we drop something you meant to do."

## A. Mentioned but never resolved — these want a decision from you

1. **Re-score old completed interviews.** You asked for this; I pushed back because re-scoring rewrites a session's stored `overall_score` and distorts the historical trend. Never settled. Options: (a) leave it — old data stays as-is; (b) a *dev-only* dry-run re-score that never persists (for tuning prompts); (c) a "re-take" instead of "re-score" (which we already have). **Recommendation: (a)/(c).**
2. **A real Settings page.** The domain feature says a track is "changeable in Settings," but there is **no Settings page** — track is only changeable via the "Change" link on the Readiness Check setup. A small `/settings` (change track/stack, maybe display name, sign out, delete account) would make that copy true.
3. **Generate JD from skills.** You chose Pick-a-starter + Paste for v1 and parked this. Still a clean add whenever (prompt + endpoint + editable preview).
4. **More Prep-tips guides.** You said "add later": **aptitude round**, **group discussion**, **"walk me through your resume"**, **post-interview email/thank-you**. Easy content adds to `/prep`.

## B. Deliberately replaced/folded (noting so they're not "forgotten")

5. **Interactive coach-mark tour** → replaced by the first-run "Start here" dashboard. The pop-up tour itself was dropped on purpose (delays the first mock).
6. **Confidence check-in (separate prompt)** → folded into the Journey "readiness vs nerves" insight, using nerve data we already collect. No third post-interview prompt.

## C. Known polish still open (from the design audit, Tiers C–F)

7. **Landing "Try it" box** looks interactive but does nothing until signup — add a hint or disable.
8. **Chart accessibility / mobile:** journey + dashboard charts are hover-only, so tooltips are dead on phones (tap) and unreachable by keyboard/screen-reader.
9. **Mobile sidebar** still crowds several items at ~9.5px below the 44px tap target.
10. **Dead code prune:** unused `TextAnswer`/`VoiceAnswer`/`NerveCheck` components + a large orphaned legacy CSS block.
11. **Dark mode** — the token groundwork (Tier A colour centralization) is done; the toggle itself is still to build (sessionStorage `data-theme`).

## D. Intentionally deferred to v2 (agreed, not dropped)

Peer **percentile** (needs a user population — would be fake now) · **resume mode** · **company/track question banks** · **SQL/DSA drills** (needs a sandbox) · **in-browser Whisper voice** · **email/push reminders** (in-app reminder ships instead) · full **job-family classification** (track+stack is the lite version) · **regenerate a past mock** (must never rewrite history).

## E. Your own pre-launch actions (not code)

- Rotate the **JWT secret** and **DB password**; set prod env: `JWT_SECRET`, `SPRING_PROFILES_ACTIVE=prod` (so the JWT fail-fast guard arms), `ADMIN_EMAILS`, and the AI keys.
- **Keep-alive ping** (~14 min) or an always-on-ish host to dodge free-tier cold starts.
- **Verify the Gemini model name** for your key in AI Studio (`GEMINI_MODEL`).
- Restart the backend for the pending migrations (**V12 ladder · V13 feedback · V14 track**) and end-to-end smoke test.
