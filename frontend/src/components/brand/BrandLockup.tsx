/**
 * Full Acely brand lockup: logo mark + solid wordmark + tagline.
 * The gradient accent lives on "Ace it." here (compact marks keep it on "ly").
 * Theme-safe: the wordmark uses the text token, the mark is a self-contained SVG tile.
 */
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-lockup ${className}`.trim()} role="img" aria-label="Acely — Practice. Improve. Ace it.">
      <span className="bl-mark" aria-hidden />
      <span className="bl-text">
        <span className="bl-word">Acely</span>
        <span className="bl-tag">
          Practice. Improve. <span className="grad-text">Ace it.</span>
        </span>
      </span>
    </div>
  );
}
