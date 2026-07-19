/** A consistent "couldn't load" state for data pages — so a network failure never renders a
 *  misleading empty/first-run/permission screen. Retry reloads by default. */
export function LoadError({ what = "this", onRetry }: { what?: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        maxWidth: 460, margin: "56px auto", textAlign: "center",
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18,
        boxShadow: "var(--sh)", padding: "40px 32px",
      }}
    >
      <div style={{ fontSize: 34 }}>🔌</div>
      <h3 style={{ fontSize: 19, letterSpacing: "-0.02em", margin: "12px 0 6px" }}>Couldn&apos;t load {what}</h3>
      <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
        The server didn&apos;t respond. Make sure the backend is running, then try again.
      </p>
      <button className="btn" onClick={onRetry ?? (() => window.location.reload())}>Retry</button>
    </div>
  );
}
