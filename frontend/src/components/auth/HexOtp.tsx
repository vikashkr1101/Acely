"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

/**
 * Animated 6-digit OTP entry. The row of boxes folds (with a 3D tip) into a hexagon
 * "circuit" while the code is verified, then closes green on a match — spinning
 * clockwise and merging into a single check — or red on a mismatch, shaking and
 * unfolding back to the row for another try.
 *
 * `onVerify(code)` resolves on success and throws (with a user-facing message) on
 * failure. `onContinue` fires when the user taps Continue after a successful verify.
 */

const N = 6;
const BW = 42, BH = 50, GAP = 8;
const W = 300, H = 224, CX = 150, CY = 112, R = 70;
const TOTAL_W = N * BW + (N - 1) * GAP;
const ROW_X0 = CX - TOTAL_W / 2;
// clockwise from the top
const ANGLES = [-90, -30, 30, 90, 150, 210].map((d) => (d * Math.PI) / 180);
const rowXY = (i: number): [number, number] => [ROW_X0 + i * (BW + GAP), CY - BH / 2];
const hexCenter = (i: number): [number, number] => [CX + R * Math.cos(ANGLES[i]), CY + R * Math.sin(ANGLES[i])];
const hexXY = (i: number): [number, number] => {
  const [x, y] = hexCenter(i);
  return [x - BW / 2, y - BH / 2];
};
const POINTS = ANGLES.map((_, i) => hexCenter(i).map((v) => v.toFixed(1)).join(",")).join(" ");

type Phase = "entry" | "busy" | "success";

export function HexOtp({
  onVerify,
  onContinue,
}: {
  onVerify: (code: string) => Promise<void>;
  onContinue: () => void;
}) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("entry");
  const [status, setStatus] = useState("Type the 6-digit code, or paste it");
  const [statusKind, setStatusKind] = useState<"" | "ok" | "bad">("");

  const phaseRef = useRef<Phase>("entry");
  const groupRef = useRef<HTMLDivElement>(null);
  const wiresRef = useRef<SVGSVGElement>(null);
  const polyRef = useRef<SVGPolygonElement>(null);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const checkRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glitRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLInputElement>(null);
  const rm = useRef(false);

  useEffect(() => {
    rm.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resetBoxesToRow();
    capRef.current?.focus();
    const boxes = boxRefs.current;
    return () => boxes.forEach((b) => b?.getAnimations().forEach((a) => a.cancel()));
  }, []);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, rm.current ? Math.min(ms, 60) : ms));

  function resetBoxesToRow() {
    boxRefs.current.forEach((b, i) => {
      if (!b) return;
      b.getAnimations().forEach((a) => a.cancel());
      const [rx, ry] = rowXY(i);
      b.style.transform = `translate(${rx}px,${ry}px)`;
    });
  }

  async function foldToHex() {
    // 1. the boxes travel into their hexagon positions first
    const anims = boxRefs.current.map((b, i) => {
      if (!b) return null;
      const [rx, ry] = rowXY(i);
      const [hx, hy] = hexXY(i);
      const mid = rm.current
        ? []
        : [{ transform: `translate(${(rx + hx) / 2}px,${(ry + hy) / 2 - 24}px) rotateX(60deg) scale(.9)`, offset: 0.5 }];
      return b.animate(
        [
          { transform: `translate(${rx}px,${ry}px) rotateX(0deg)` },
          ...mid,
          { transform: `translate(${hx}px,${hy}px) rotateX(0deg)` },
        ],
        { duration: rm.current ? 1 : 700, easing: "cubic-bezier(.65,0,.2,1)", fill: "forwards", delay: rm.current ? 0 : i * 40 },
      );
    });
    await Promise.all(anims.filter((a): a is Animation => !!a).map((a) => a.finished));

    // 2. only once they're settled do the wires draw in to close the circuit
    const poly = polyRef.current;
    wiresRef.current?.classList.add("show");
    if (poly) {
      const per = 6 * R;
      poly.style.strokeDasharray = String(per);
      poly.style.strokeDashoffset = String(per);
      await poly.animate([{ strokeDashoffset: per }, { strokeDashoffset: 0 }], {
        duration: rm.current ? 1 : 520,
        easing: "ease-out",
        fill: "forwards",
      }).finished;
    }
  }

  async function unfoldToRow() {
    const anims = boxRefs.current.map((b, i) => {
      if (!b) return null;
      const [rx, ry] = rowXY(i);
      const [hx, hy] = hexXY(i);
      const mid = rm.current
        ? []
        : [{ transform: `translate(${(rx + hx) / 2}px,${(ry + hy) / 2 - 24}px) rotateX(58deg) scale(.9)`, offset: 0.5 }];
      return b.animate(
        [
          { transform: `translate(${hx}px,${hy}px) rotateX(0deg)` },
          ...mid,
          { transform: `translate(${rx}px,${ry}px) rotateX(0deg)` },
        ],
        { duration: rm.current ? 1 : 600, easing: "cubic-bezier(.65,0,.2,1)", fill: "forwards", delay: rm.current ? 0 : i * 30 },
      );
    });
    wiresRef.current?.classList.remove("show");
    polyRef.current?.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 6 * R }], {
      duration: rm.current ? 1 : 400,
      easing: "ease-in",
      fill: "forwards",
    });
    await Promise.all(anims.filter((a): a is Animation => !!a).map((a) => a.finished));
  }

  async function collapse() {
    const g = groupRef.current;
    if (!g) return;
    await g.animate(
      [
        { transform: "rotate(0deg) scale(1)", opacity: 1 },
        { transform: `rotate(${rm.current ? 0 : 85}deg) scale(.08)`, opacity: 0 },
      ],
      { duration: rm.current ? 1 : 720, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" },
    ).finished;
  }

  function animateCheck() {
    checkRef.current?.animate(
      [
        { transform: "translate(-50%,-50%) scale(0)" },
        { transform: `translate(-50%,-50%) scale(${rm.current ? 1 : 1.12})`, offset: 0.7 },
        { transform: "translate(-50%,-50%) scale(1)" },
      ],
      { duration: rm.current ? 1 : 520, easing: "cubic-bezier(.34,1.56,.5,1)", fill: "forwards" },
    );
  }

  function burst() {
    if (rm.current) return;
    ringRef.current?.animate(
      [
        { transform: "translate(-50%,-50%) scale(.6)", opacity: 0.8 },
        { transform: "translate(-50%,-50%) scale(2)", opacity: 0 },
      ],
      { duration: 900, easing: "ease-out" },
    );
    const glit = glitRef.current;
    if (!glit) return;
    const n = 18;
    for (let k = 0; k < n; k++) {
      const s = document.createElement("div");
      s.className = "hexotp-spark";
      glit.appendChild(s);
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = 38 + Math.random() * 56;
      s.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
      ).finished.then(() => s.remove());
    }
  }

  function shake() {
    if (rm.current) return;
    groupRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-8px)" },
        { transform: "translateX(7px)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 420, easing: "ease-in-out" },
    );
  }

  async function run(code: string) {
    if (phaseRef.current !== "entry") return;
    setPhaseBoth("busy");
    setStatusKind("");
    setStatus("Verifying…");
    capRef.current?.blur();
    resetBoxesToRow();

    const foldP = foldToHex();
    let ok = true;
    let msg = "";
    try {
      await onVerify(code);
    } catch (e) {
      ok = false;
      msg = e instanceof Error && e.message ? e.message : "That code didn't match. Try again.";
    }
    await foldP;
    await wait(420);

    if (ok) {
      groupRef.current?.classList.add("ok");
      setStatus("Code matched");
      await wait(650);
      await collapse();
      setPhaseBoth("success");
      setStatusKind("ok");
      setStatus("🔒 Verified and secure");
      animateCheck();
      burst();
    } else {
      groupRef.current?.classList.add("bad");
      setStatusKind("bad");
      setStatus(msg);
      shake();
      await wait(900);
      await unfoldToRow();
      groupRef.current?.classList.remove("bad");
      resetBoxesToRow();
      wiresRef.current?.classList.remove("show");
      setValue("");
      setStatusKind("");
      setStatus(msg);
      setPhaseBoth("entry");
      setTimeout(() => capRef.current?.focus(), 30);
    }
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    if (phaseRef.current !== "entry") return;
    const digits = (e.target.value.match(/\d/g) || []).join("").slice(0, N);
    setValue(digits);
    if (digits.length === N) run(digits);
  }

  return (
    <div className="hexotp">
      <div className="hexotp-stage">
        <div className="hexotp-group" ref={groupRef}>
          <svg className="hexotp-wires" ref={wiresRef} viewBox={`0 0 ${W} ${H}`}>
            <polygon ref={polyRef} points={POINTS} />
          </svg>
          {Array.from({ length: N }).map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                boxRefs.current[i] = el;
              }}
              className={`hexotp-box${phase === "entry" && i === value.length ? " on" : ""}`}
            >
              {value[i] ?? ""}
            </div>
          ))}
        </div>
        <div className="hexotp-ring" ref={ringRef} />
        <div className="hexotp-check" ref={checkRef}>
          ✓
        </div>
        <div className="hexotp-glit" ref={glitRef} />
        {phase !== "success" && (
          <input
            ref={capRef}
            className="hexotp-cap"
            value={value}
            onChange={onInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={N}
            disabled={phase !== "entry"}
            aria-label="Verification code"
          />
        )}
      </div>

      <div className={`hexotp-status${statusKind ? ` ${statusKind}` : ""}`}>{status}</div>

      {phase === "success" && (
        <button type="button" className="btn hexotp-continue" onClick={onContinue}>
          Continue →
        </button>
      )}
    </div>
  );
}
