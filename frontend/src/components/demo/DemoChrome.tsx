"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiHome, FiLogIn, FiMoreHorizontal, FiPlayCircle, FiTerminal } from "react-icons/fi";
import { classifyDemoHref, openAccountGate, startDemoTour } from "@/lib/demo";
import { trackDemo } from "@/lib/demo/track";
import { AccountGate } from "./AccountGate";
import { BehindTheScenes } from "./BehindTheScenes";
import { DemoTour } from "./DemoTour";

// Everything that turns the real app pages into the demo: the banner, link routing (mirrored pages stay
// inside /demo, account-only actions open the sign-up prompt), the guided tour and its modals.
export function DemoChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [bts, setBts] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Count the visit once per tab session.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("acely_demo_opened")) return;
      window.sessionStorage.setItem("acely_demo_opened", "1");
    } catch { /* storage blocked — still count it */ }
    trackDemo("open");
  }, []);

  // Route in-app links: /dashboard → /demo/dashboard; Practice, Profile, … → "needs an account" prompt.
  // Capture phase on document runs before React/Next's Link handler, so we fully own the click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return; // external links, #anchors
      const c = classifyDemoHref(href);
      if (c.kind === "public" || (c.kind === "demo" && c.href === href)) return; // already correct
      e.preventDefault();
      e.stopPropagation();
      if (c.kind === "demo") router.push(c.href);
      else openAccountGate();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // Close the mobile "more" menu on outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  const openBts = useCallback(() => { setMenu(false); setBts(true); trackDemo("bts"); }, []);
  const closeBts = useCallback(() => setBts(false), []);
  const replay = useCallback(() => { setMenu(false); startDemoTour(); }, []);

  return (
    <div className="demo-root">
      <div className="dm-bar" role="region" aria-label="Demo mode">
        <span className="dm-chip">Demo</span>
        <span className="dm-msg">
          <b>You&apos;re viewing a demo</b>
          <span className="long dm-wide"> · a real candidate journey, scored by AI</span>
        </span>
        <span className="dm-spacer" />
        <div className="dm-actions">
          <button className="dm-btn dm-wide" onClick={openBts} data-tour="bts"><FiTerminal /> Behind the scenes</button>
          <button className="dm-btn dm-wide dm-mid" onClick={replay}><FiPlayCircle /> Replay tour</button>
          <span className="dm-sep dm-wide dm-mid" />
          <Link href="/" className="dm-btn dm-wide dm-mid"><FiHome /> Home</Link>
          <Link href="/login" className="dm-btn dm-wide dm-mid" onClick={() => trackDemo("login")}><FiLogIn /> Log in</Link>
          <Link href="/signup" className="dm-btn cta" onClick={() => trackDemo("signup")}>
            <span className="dm-wide">Sign up to practise for real</span>
            <span className="dm-narrow">Sign up free</span>
          </Link>
          <div className="dm-more" ref={menuRef}>
            <button className="dm-btn" aria-label="More demo options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <FiMoreHorizontal />
            </button>
            {menu && (
              <div className="dm-menu" role="menu">
                <button className="dm-btn dm-sm-only" role="menuitem" onClick={openBts}><FiTerminal /> Behind the scenes</button>
                <button className="dm-btn" role="menuitem" onClick={replay}><FiPlayCircle /> Replay tour</button>
                <Link href="/" className="dm-btn" role="menuitem"><FiHome /> Home</Link>
                <Link href="/login" className="dm-btn" role="menuitem" onClick={() => trackDemo("login")}><FiLogIn /> Log in</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {children}

      <DemoTour onOpenBts={openBts} />
      <BehindTheScenes open={bts} onClose={closeBts} />
      <AccountGate />
    </div>
  );
}
