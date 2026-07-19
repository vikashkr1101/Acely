"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiGrid, FiMic, FiClipboard, FiCompass, FiBarChart2, FiBookOpen, FiMessageSquare, FiSettings, FiLogOut, FiMoreVertical } from "react-icons/fi";
import { api, clearToken, getToken, type User } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Dashboard", Icon: FiGrid, match: (p: string) => p === "/dashboard" },
  { href: "/mock/new", label: "Practice", short: "Practice", Icon: FiMic, match: (p: string) => p === "/mock/new" },
  { href: "/mock/interview", label: "Mock Interview", short: "Mock", Icon: FiClipboard, match: (p: string) => p === "/mock/interview" },
  { href: "/journey", label: "Journey", short: "Journey", Icon: FiCompass, match: (p: string) => p.startsWith("/journey") },
  { href: "/reports", label: "Reports", short: "Reports", Icon: FiBarChart2, match: (p: string) => p.startsWith("/reports") },
  { href: "/prep", label: "Prep tips", short: "Prep", Icon: FiBookOpen, match: (p: string) => p.startsWith("/prep") },
  { href: "/feedback", label: "Feedback", short: "Feedback", Icon: FiMessageSquare, match: (p: string) => p.startsWith("/feedback") },
];
// Mobile: 5 primary tabs in the bottom bar; the rest live in the ⋮ "More" menu.
const PRIMARY = NAV.slice(0, 5);
const SECONDARY = NAV.slice(5);

export function AppShell({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api.me().then(setUser).catch(() => {
      clearToken();
      router.replace("/login");
    });
  }, [router]);

  // Close the account / More menu on outside click or Escape. Both the desktop footer kebab and the
  // mobile ⋮ tag their region with data-acct-menu, so one handler covers whichever bar is visible.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (t && t.closest && t.closest("[data-acct-menu]")) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <Link href="/dashboard" className="side-logo">
          <span className="mk">P</span>
          <span className="side-word">Prep<span className="grad-text">Pal</span></span>
        </Link>

        <nav className="side-nav">
          {NAV.map(({ href, label, Icon, match }) => (
            <Link key={href} href={href} className={`side-link${match(pathname) ? " active" : ""}`}>
              <Icon className="ic" /> <span className="side-word">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="side-spacer" />

        <div className="side-streak side-word">
          <b>🔥 Keep your streak</b>
          <p>A mock a day keeps the nerves away.</p>
          <Link href="/mock/new" className="btn w sm streak-btn">Practice now</Link>
        </div>

        <div className="side-user" data-acct-menu>
          <Link href="/settings" className="side-avatar" aria-label="Settings" title="Settings">{user?.name?.[0]?.toUpperCase() ?? "…"}</Link>
          <Link href="/settings" className="side-name side-word">{user?.name ?? ""}</Link>
          <button
            className={`side-kebab${menuOpen ? " on" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="More"
          >
            <FiMoreVertical />
          </button>

          {menuOpen && (
            <div className="side-menu" role="menu">
              <ThemeToggle className="side-mi" showLabel />
              <Link href="/settings" className="side-mi" role="menuitem" onClick={() => setMenuOpen(false)}>
                <span className="mic"><FiSettings /></span> Settings
              </Link>
              <div className="side-msep" />
              <button className="side-mi danger" role="menuitem" onClick={logout}>
                <span className="mic"><FiLogOut /></span> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar: logo + name ── */}
      <header className="mtop">
        <Link href="/dashboard" className="mtop-logo">
          <span className="mk">P</span>
          <span>Prep<span className="grad-text">Pal</span></span>
        </Link>
        <Link href="/settings" className="mtop-name">{user?.name ?? ""}</Link>
      </header>

      <main className={`app-main${bleed ? " bleed" : ""}`}>
        {bleed ? children : <div className="app-inner">{children}</div>}
      </main>

      {/* ── Mobile bottom bar: 5 tabs + ⋮ More ── */}
      <nav className="mtabs">
        {PRIMARY.map(({ href, label, short, Icon, match }) => (
          <Link key={href} href={href} className={`mtab${match(pathname) ? " on" : ""}`} onClick={() => setMenuOpen(false)}>
            <Icon className="mti" /> <span>{short ?? label}</span>
          </Link>
        ))}
        <button
          className={`mtab more${menuOpen ? " on" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          data-acct-menu
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <FiMoreVertical className="mti" /> <span>More</span>
        </button>

        {menuOpen && (
          <div className="mtab-menu" role="menu" data-acct-menu>
            {SECONDARY.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="side-mi" role="menuitem" onClick={() => setMenuOpen(false)}>
                <span className="mic"><Icon /></span> {label}
              </Link>
            ))}
            <div className="side-msep" />
            <ThemeToggle className="side-mi" showLabel />
            <Link href="/settings" className="side-mi" role="menuitem" onClick={() => setMenuOpen(false)}>
              <span className="mic"><FiSettings /></span> Settings
            </Link>
            <button className="side-mi danger" role="menuitem" onClick={logout}>
              <span className="mic"><FiLogOut /></span> Sign out
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
