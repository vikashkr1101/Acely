"use client";

import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface AuthShellProps {
  title: string;
  subtitle: string;
  altText: string;
  altHref: string;
  altLabel: string;
  children: ReactNode;
}

/** Presentational wrapper shared by the login & signup pages. */
export function AuthShell({ title, subtitle, altText, altHref, altLabel, children }: AuthShellProps) {
  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="logo auth-logo">
          <span className="mk">A</span>
          <span>
            Ace<span className="grad-text">ly</span>
          </span>
        </Link>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{subtitle}</p>
        {children}
        <p className="auth-alt">
          {altText} <Link href={altHref}>{altLabel}</Link>
        </p>
      </div>
    </main>
  );
}

/**
 * Labelled input used in both auth forms. Accepts an optional leading `icon`; password fields
 * automatically get a show/hide eye toggle.
 */
export function Field({
  label,
  icon,
  type,
  ...props
}: { label: string; icon?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;
  const cls = `${icon ? "has-ic" : ""}${isPassword ? " has-eye" : ""}`.trim();

  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-wrap">
        {icon && <span className="field-ic">{icon}</span>}
        <input {...props} type={inputType} className={cls || undefined} />
        {isPassword && (
          <button
            type="button"
            className="field-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {show ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>
    </label>
  );
}
