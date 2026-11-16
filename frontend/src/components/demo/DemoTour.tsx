"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEMO_RETRY_QUESTION_ID, DEMO_RETRY_REPORT_ID, DEMO_TOUR_EVENT, openAccountGate } from "@/lib/demo";
import { trackDemo } from "@/lib/demo/track";
import { demoFacts } from "@/lib/demo/api";

// Guided tour across the real demo pages: spotlight the actual UI, explain it in one or two lines.
// Progress lives in sessionStorage so a reload resumes where the visitor was.

type Step = {
  route: string;
  /** CSS selector to spotlight; null = centered card. */
  target: string | null;
  title: string;
  body: React.ReactNode;
  /** Runs once the target exists (e.g. expand a collapsed breakdown). */
  prepare?: (el: Element) => void;
  /** Extra button inside the card. */
  extra?: "bts" | "practice";
};

const RETRY_Q = `[data-qid="${DEMO_RETRY_QUESTION_ID}"]`;
const F = demoFacts(DEMO_RETRY_REPORT_ID, DEMO_RETRY_QUESTION_ID);
const list = (xs: number[]) => xs.join(", ").replace(/, (\d+)$/, " and $1");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const openBreakdown = (el: Element) => {
  const d = el.closest("details");
  if (d && !d.open) d.open = true;
};

const STEPS: Step[] = [
  {
    route: "/demo/dashboard",
    target: '[data-tour="readiness"]',
    title: "An honest readiness score",
    body: (
      <>
        <b>{F.readiness}</b>{" "}is this candidate&apos;s interview readiness: the average of their
        {" "}{plural(F.checks, "Readiness Check")}{F.interviews ? <> and {plural(F.interviews, "Mock Interview")}</> : null}
        {" "}(<b>{list(F.measurements)}</b>). Only single-shot sessions scored at the end count, so practice and
        retries can&apos;t inflate it.
      </>
    ),
  },
  {
    route: `/demo/reports/${DEMO_RETRY_REPORT_ID}`,
    target: `${RETRY_Q} [data-tour="evidence"]`,
    prepare: openBreakdown,
    title: "Every score shows its evidence",
    body: (
      <>
        Each answer is graded on its section&apos;s rubric, and every dimension quotes the exact line from the
        answer that earned it. No black-box numbers.
      </>
    ),
  },
  {
    route: `/demo/reports/${DEMO_RETRY_REPORT_ID}`,
    target: `${RETRY_Q} [data-tour="retry"]`,
    prepare: openBreakdown,
    title: `Retry to improve: ${F.retry.from} → ${F.retry.to}`,
    body: (
      <>
        The first answer was generic and scored <b>{F.retry.from}</b>. On the retry they told a specific story,
        and the same rubric scored it <b>{F.retry.to}</b>. Practice is where you improve; Readiness Checks are
        where you measure it.
      </>
    ),
  },
  {
    route: "/demo/journey",
    target: '[data-tour="journey"] .jr-svg', // the readiness chart itself — the whole card is taller than a screen
    title: "Progress you can actually see",
    body: (
      <>
        Readiness across every measurement, plus how each section moved between them. {F.gain.section} went
        from <b>{F.gain.from} to {F.gain.to}</b>. It&apos;s always clear what&apos;s improving and what to work on next.
      </>
    ),
  },
  {
    route: "/demo/journey",
    target: '[data-tour="bts"]',
    extra: "bts",
    title: "Behind the scenes",
    body: (
      <>
        While the first Readiness Check was being scored, Gemini went down (<b>503, overloaded</b>). Acely failed
        over to Zhipu automatically and the answer was still scored. Here&apos;s the real call log.
      </>
    ),
  },
  {
    route: "/demo/journey",
    target: null,
    extra: "practice",
    title: "Now it's your turn",
    body: (
      <>
        Everything you just saw is a real journey with real AI scoring. Want to know where <b>you</b>{" "}stand?
        Take a real practice: it&apos;s free.
      </>
    ),
  },
];

const KEY = "acely_demo_tour"; // "<index>" while running, "done" once finished/skipped
function readState(): string | null {
  try { return window.sessionStorage.getItem(KEY); } catch { return null; }
}
function writeState(v: string) {
  try { window.sessionStorage.setItem(KEY, v); } catch { /* ignore */ }
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;
const CARD_W = 380;

/** Card next to the spotlight: below, else above, else docked at the bottom — clamped to the viewport. */
function placeCard(rect: Rect, cardHeight: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 32);
  const gap = 14;
  let top: number;
  if (rect.top + rect.height + PAD + gap + cardHeight < vh - 12) top = rect.top + rect.height + PAD + gap;
  else if (rect.top - PAD - gap - cardHeight > 58) top = rect.top - PAD - gap - cardHeight;
  else top = Math.max(58, vh - cardHeight - 16); // too tall for either side: dock low, keep its top readable
  const left = Math.max(16, Math.min(vw - w - 16, rect.left + rect.width / 2 - w / 2));
  return { top, left };
}

/** Layout measured for ONE step (keyed by index, so a new step starts unmeasured without a reset). */
type Measure = { index: number; rect: Rect | null; card: { top: number; left: number } | null; missing: boolean };
const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

export function DemoTour({ onOpenBts }: { onOpenBts: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState<number | null>(null);
  const [measure, setMeasure] = useState<Measure | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const maxStep = useRef(0);

  const cur = measure && measure.index === index ? measure : null;
  const rect = cur?.rect ?? null;
  const cardPos = cur?.card ?? null;
  /** The step's target isn't on screen (hidden at this size, or never rendered) → centered card. */
  const missing = cur?.missing ?? false;

  // Auto-start on the first visit this session (after first paint); resume a tour in progress after a
  // reload. "Replay tour" restarts it via DEMO_TOUR_EVENT.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const s = readState();
      if (s === "done") return;
      if (s != null && !Number.isNaN(Number(s))) { setIndex(Math.min(Number(s), STEPS.length - 1)); return; } // resume
      // First visit: auto-start only from the demo's front door, so a shared deep link (e.g. one report)
      // opens on what was shared. "Replay tour" starts it from anywhere.
      if (window.location.pathname === "/demo/dashboard") setIndex(0);
    });
    const onStart = () => { maxStep.current = 0; writeState("0"); setIndex(0); };
    window.addEventListener(DEMO_TOUR_EVENT, onStart);
    return () => { cancelAnimationFrame(raf); window.removeEventListener(DEMO_TOUR_EVENT, onStart); };
  }, []);

  const step = index != null ? STEPS[index] : null;

  // Keep the URL on the step's page, persist progress, track the furthest step reached.
  useEffect(() => {
    if (index == null || !step) return;
    writeState(String(index));
    if (index + 1 > maxStep.current) { maxStep.current = index + 1; trackDemo("step", index + 1); }
    if (pathname !== step.route) router.push(step.route);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find the target (it may render a moment after navigation), prepare + scroll to it, then re-measure
  // every frame so the spotlight and card follow scrolling, resizing and layout shifts.
  useEffect(() => {
    if (index == null || !step || !step.target || pathname !== step.route) return;
    const idx = index;
    const sel = step.target;
    let raf = 0;
    let found: Element | null = null;
    let tries = 0;

    const giveUp = () => setMeasure({ index: idx, rect: null, card: null, missing: true });
    const tick = () => {
      if (!found) {
        const el = document.querySelector(sel);
        if (el) {
          step.prepare?.(el);
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            found = el;
            // Top-align (under the banner, via scroll-margin) so the card has room right below the target.
            el.scrollIntoView({ block: "start", behavior: "smooth" });
          } else if (++tries > 10) {
            return giveUp(); // rendered but hidden at this screen size (e.g. a desktop-only button)
          }
        } else if (++tries > 180) {
          return giveUp(); // never appeared (~3s) — explain it centered rather than hang
        }
      }
      if (found) {
        const b = found.getBoundingClientRect();
        const r: Rect = { top: b.top, left: b.left, width: b.width, height: b.height };
        const card = placeCard(r, cardRef.current?.offsetHeight ?? 220);
        setMeasure((prev) =>
          prev && prev.index === idx && prev.rect && prev.card &&
          near(prev.rect.top, r.top) && near(prev.rect.left, r.left) &&
          near(prev.rect.width, r.width) && near(prev.rect.height, r.height) &&
          near(prev.card.top, card.top) && near(prev.card.left, card.left)
            ? prev
            : { index: idx, rect: r, card, missing: false });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, step, pathname]);

  useEffect(() => { cardRef.current?.focus({ preventScroll: true }); }, [index]);

  const finish = useCallback((how: "complete" | "skip") => {
    writeState("done");
    trackDemo(how);
    setIndex(null);
  }, []);
  const next = useCallback(() => {
    setIndex((i) => (i == null ? i : i + 1 < STEPS.length ? i + 1 : i));
  }, []);
  const back = useCallback(() => setIndex((i) => (i != null && i > 0 ? i - 1 : i)), []);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector(".dm-modal-bg")) return; // a modal is on top — let it handle keys
      if (e.key === "Escape") finish("skip");
      else if (e.key === "ArrowRight" && index < STEPS.length - 1) next();
      else if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, next, back, finish]);

  if (index == null || !step) return null;
  const last = index === STEPS.length - 1;
  const centered = !step.target || missing || !rect;
  // Target still loading (or navigation in flight) → dim only, card appears once it's placed.
  const waiting = !!step.target && !missing && !rect;

  return (
    <>
      {/* Swallow clicks on the page during the tour; scrolling still works. */}
      <div className="dm-tour-catch" aria-hidden="true" />
      {rect ? (
        <div
          className="dm-spot"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="dm-dim" />
      )}

      <div
        ref={cardRef}
        className={`dm-card${centered ? " center" : ""}`}
        style={!centered && cardPos ? { top: cardPos.top, left: cardPos.left } : waiting ? { visibility: "hidden" } : undefined}
        role="dialog"
        aria-modal="false"
        aria-labelledby="dm-tour-title"
        aria-live="polite"
        tabIndex={-1}
        key={index}
      >
        <div className="dm-step">Demo tour · {index + 1} of {STEPS.length}</div>
        <h3 id="dm-tour-title">{step.title}</h3>
        <p>{step.body}</p>
        {step.extra === "bts" && (
          <div className="dm-inline">
            <button className="dm-pbtn" onClick={onOpenBts}>Open the real call log</button>
          </div>
        )}
        <div className="dm-dots" aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} className={i <= index ? "on" : ""} />)}
        </div>
        <div className="dm-row">
          <button className="dm-link" onClick={() => finish("skip")}>{last ? "Close" : "Skip tour"}</button>
          <span className="grow" />
          {index > 0 && <button className="dm-pbtn" onClick={back}>Back</button>}
          {last ? (
            <button className="dm-pbtn primary" onClick={() => { finish("complete"); openAccountGate(); }}>
              Take a real practice →
            </button>
          ) : (
            <button className="dm-pbtn primary" onClick={next}>Next</button>
          )}
        </div>
      </div>
    </>
  );
}
