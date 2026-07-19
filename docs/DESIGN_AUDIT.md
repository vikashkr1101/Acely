# PrepPal — Frontend Design Audit (2026-07-19)

A close, systematic pass over the whole frontend (three parallel audits: colour/tokens, typography/spacing, component-states/responsive/a11y), deduplicated and prioritized. File refs are under `frontend/`.

Legend: 🐞 real bug · ♿ accessibility · 🎨 design-system consistency · 📱 responsive · 🌒 dark-mode prerequisite · 🧹 hygiene

---

## TIER 1 — Real bugs & correctness (fix regardless of dark mode)

1. 🐞 **`--ink-soft` is used 7× but never defined** in `:root` → every "softened ink" text silently renders full `--ink`. Affects the dashboard segment filter, journey headline, Then→Now bar labels, checkpoint-invite copy. *(globals.css `.db-seg`, `.jr-headline`, `.jr-brow .bl`, `.jr-typebtn`, `.db-invite p`, `.db-plan p`)* — one-line fix: add `--ink-soft`.
2. 🐞 **The score→colour band is defined 4 different ways** → the *same score shows a different colour/verdict on different pages*. A 65 is amber on the dashboard tile but green in its own report; a 55 is red one place, amber another. Two ambers (`#f59e0b` vs `#d97706`) and two reds (`#ef4444` vs `#dc2626`) in play.
   - `dashboard/page.tsx:42` (≥80/≥60) · `dashboard/page.tsx:15` (≥70/≥50) · `reports/page.tsx:14` (≥80/≥60) · `ReportView.tsx:19` (≥70/≥40). **Consolidate to one function + one palette.**
3. 🐞 **Fetch errors are swallowed → users see the wrong screen.** On a network failure: **Dashboard** shows the brand-new-user "let's find your starting line" first-run to an *existing* user; **Journey** shows the empty "start with a readiness check"; **Admin** shows **"🔒 Admins only"** to a real admin whose request merely failed. Reports does it right (has an error block) — copy that pattern to the other three. *(dashboard:87 · journey:37 · admin:35)*
4. 🐞 **Interview loader error is a dead-end** — `mock/[id]/page.tsx:98` renders the error text with no Exit/retry; the user is stranded.

## TIER 2 — Accessibility

5. ♿ **Input focus rings are removed** — the global `:focus-visible` is overridden with `outline:none` on every text field; the only cue left is a low-contrast border-colour change. Affects login, signup, setup, checkpoint, feedback, interview textarea. *(globals.css `.field input:focus`, `.answer-box:focus`, `.iv-textarea`)*
6. ♿ **Journey chart is mouse-only** — points are bare `<g onMouseEnter>`. **On mobile there's no hover, so tapping a point never shows the tooltip** — the whole "hover for details" interaction is dead on phones. No keyboard focus, no `role`/`<title>` on the SVG. Same for the dashboard sparkline.
7. ♿ **Score signalled by colour alone** in tiles/lists (dashboard recent score, per-type avg, reports ring, admin provider %). The report *gauge* pairs colour with a text verdict (good) — extend that everywhere with a label/icon.
8. ♿ **`--faint` (#a2a6bd) fails contrast (~2.5:1)** but is used for real content (usage counts, meta lines, most admin captions), not just hairlines. Journey axis text `#9a9fbb` at 9px is worse. Darken toward `--muted` for anything meant to be read.
9. ♿ **Divs used where headings belong** — "Coach's note" / "Question by question" / card titles are divs; the live interview question is a div; nerve/scoring screens have an `<h2>` with no `<h1>`. Breaks the SR outline. Heading order also skips h1→h3 on Prep/Dashboard/Admin.
10. ♿ **Invalid nesting: `<button>` inside `<Link>`** — the dashboard recent-mock Discard button. Restructure so row + discard aren't nested interactives.
11. ♿ Icon-only buttons / sliders / react-icons missing `aria-label` / `aria-hidden` in places.

## TIER 3 — Responsive / mobile

12. 📱 **Mobile sidebar is overloaded** — 8 nav items (+user/logout) become a fixed bottom row at `font-size:9.5px`, `padding:6px 8px` → 9 targets across ~360px, well under the 44px tap minimum, with crowding/overflow risk. Consider fewer primary items + a "More" sheet.
13. 📱 **Admin page has no mobile handling** — the provider-health `<table>` has no `overflow-x` wrapper (overflows on narrow screens); fixed-column grids (`72px 1fr 110px`, `96px 1fr 42px`) overflow with long text.
14. 📱 Interview `.iv` is `height:100vh; overflow:hidden` — the long "calm entry" column can clip on short screens with no scroll escape.

## TIER 4 — Design-system consistency (the "same job, many implementations" debt)

15. 🎨 **Type-scale sprawl: ~33 distinct font-sizes** with half-pixel near-dupes (12.5/13/13.5/14/14.5 used interchangeably) and **7 different page-title sizes** (24/26/27/28/30/32/34). Collapse to a ~10-step scale, kill every `.5`.
16. 🎨 **Radius chaos: ~17 radii; the `--r` token is defined but used once.** The "card" radius alone spans 14/15/16/18/20/22/24. Define `--r-sm/md/lg` (8/12/16/20 + 999 pill) and sweep.
17. 🎨 **Card padding drifts 7+ ways** for the same bordered-card object (16 → 40). Introduce a padding ramp.
18. 🎨 **One concept, many components:** primary gradient button (`.btn` vs `.rpv-btn.primary` vs `.iv-submit` vs inline admin/feedback buttons — the inline ones have *no hover/focus*); pill/segment toggle (4+ variants with different active colours); toast (4 ways, two byte-identical); conic score ring (5×); the uppercase "eyebrow" label (~10× with letter-spacing 0.06em→0.16em). Consolidate each into one.
19. 🎨 Font-weight oddballs `650`/`750` break the 600/700/800/900 ladder; body line-height drifts 1.45/1.5/1.55/1.6 for equivalent copy.

## TIER 5 — Dark-mode prerequisites (colour tokenization)

20. 🌒 **`#fff` is overloaded** (~40+ sites) for two meanings — *surface* (→ `var(--card)`) and *ink-on-gradient* (→ a new `--on-brand`). Must be split before dark mode.
21. 🌒 **Semantic colours have no tokens** — success (`#16a34a`/`#e7f8ee`, ~35 sites), danger (`#dc2626`/`#fdeaea`), warning (`#d97706`/`#fdf1e0`), star-gold (`#f5b301`), track-grey (`#eef0f6`) are literals everywhere. Add `--success/-bg`, `--danger/-bg`, `--warn/-bg`, `--star`, `--track` and align the JS score functions onto them.
22. 🌒 **Brand shadows/gradients hardcoded** — `rgba(192,38,211,…)` box-shadows and the `--iv-orb` radial are re-hardcoded, so the (already-present, commented) palette switch wouldn't actually update them. Route through `--csh`/`--brand`/`--iv-orb`.
23. 🌒 A real dark token layer is needed; today dark values only exist scoped to `.iv` (the interview stage) — graduate those into proper dark tokens.

## TIER 6 — Hygiene / dead code

24. 🧹 **Unused components** `TextAnswer.tsx`, `VoiceAnswer.tsx`, `NerveCheck.tsx` (imported nowhere) + a large orphaned legacy CSS block (`.dash-*`, `.mock-*`, old `.rp-*`, `.voice-box`, `.nerve-card`, `.stat-tile`…). Prune — it invites style drift.
25. 🧹 `TYPE_LABEL` (HR/Technical/…) copy-pasted in 5 files; cards rebuilt inline in admin/feedback/about instead of shared classes (this is *how* the scale drifted). Hoist shared constants; use the classes.
26. 🧹 Landing "Try it" textarea looks interactive but is inert until signup — add a hint or disable.

---

## Recommended sequence

**A. Quick correctness wins (small, high-value):** #1 `--ink-soft`, #2 unify score-band (one function + palette — also fixes half of #7), #3 error states, #4 loader escape, #5 focus rings. Mostly a day of surgical fixes.

**B. The design-system pass (the real refactor):** introduce token ramps in `:root` — **type scale, radius scale, spacing scale, and the semantic-colour tokens** — then sweep components onto them and consolidate the duplicated button/pill/card/toast/ring/eyebrow. This is where most debt lives, and it **doubles as the dark-mode prep** (Tier 5 falls out of it).

**C. Accessibility & responsive:** chart tap/keyboard access (#6), colour+label for scores (#7), sidebar mobile (#12), admin mobile (#13), headings (#9).

**D. Dark mode:** once B is done, the toggle is small (sessionStorage `data-theme`).

**E. Hygiene:** prune dead code/CSS (#24–25) — safest done last so it doesn't collide with the refactor.
