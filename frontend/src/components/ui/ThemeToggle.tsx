"use client";

import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

/**
 * Light/dark toggle. Session-only (resets each new session), set on <html data-theme>.
 * `showLabel` renders it as a labelled menu row (icon + "Light/Dark mode") for the account menu.
 */
export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      sessionStorage.setItem("ppl_theme", next ? "dark" : "light");
    } catch {
      /* private mode — theme just won't persist across reloads */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {showLabel ? (
        <>
          <span className="mic">{dark ? <FiSun /> : <FiMoon />}</span>
          {dark ? "Light mode" : "Dark mode"}
        </>
      ) : (
        dark ? <FiSun /> : <FiMoon />
      )}
    </button>
  );
}
