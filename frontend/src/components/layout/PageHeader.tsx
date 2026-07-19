import type { ReactNode } from "react";
import s from "./PageHeader.module.css";

/** The one page header for every screen: optional eyebrow · title · optional subtitle · optional
 *  right-aligned actions. Consistent type scale + spacing so no page rolls its own. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={s.head}>
      <div>
        {eyebrow && <div className={s.eyebrow}>{eyebrow}</div>}
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.sub}>{subtitle}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  );
}
