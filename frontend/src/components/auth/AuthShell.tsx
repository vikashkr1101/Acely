import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";

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
          <span className="mk">P</span>
          <span>
            Prep<span className="grad-text">Pal</span>
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

/** Labelled input used in both auth forms. */
export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
