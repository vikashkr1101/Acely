"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiGrid, FiMic, FiBarChart2, FiLogOut } from "react-icons/fi";
import { api, clearToken, getToken, type User } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: FiGrid, match: (p: string) => p === "/dashboard" },
  { href: "/mock/new", label: "Practice", Icon: FiMic, match: (p: string) => p.startsWith("/mock") },
  { href: "/reports", label: "Reports", Icon: FiBarChart2, match: (p: string) => p.startsWith("/reports") },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

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

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="app-shell">
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

        <div className="side-user">
          <span className="side-avatar">{user?.name?.[0]?.toUpperCase() ?? "…"}</span>
          <span className="side-name side-word">{user?.name ?? ""}</span>
          <button className="side-logout" onClick={logout} aria-label="Log out">
            <FiLogOut />
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-inner">{children}</div>
      </main>
    </div>
  );
}
