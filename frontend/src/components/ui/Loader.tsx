export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-spin" aria-hidden="true" />
      <span className="loader-label">{label}</span>
    </div>
  );
}
