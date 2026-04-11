import { type PropsWithChildren, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

export * from "./image-captcha-field";
export * from "./image-display";

export function MobileShell({ children }: PropsWithChildren) {
  return (
    <div className="mobile-shell">
      <main className="mobile-main">{children}</main>
    </div>
  );
}

export function MobileHero({
  eyebrow,
  title,
  description,
  media,
}: {
  eyebrow: string;
  title: string;
  description: string;
  media?: ReactNode;
}) {
  return (
    <section className="mobile-card mobile-hero">
      <div className="mobile-hero__content">
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {media ? <div className="mobile-hero__media">{media}</div> : null}
    </section>
  );
}

export function ActionTile({ title, detail }: { title: string; detail: string }) {
  return (
    <article className="mobile-card mobile-tile">
      <strong>{title}</strong>
      <span>{detail}</span>
    </article>
  );
}

export function SurfaceCard({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <section className="mobile-card mobile-surface">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </section>
  );
}

export function BottomTabBar({
  tabs,
}: {
  tabs: Array<{
    label: string;
    to: string;
  }>;
}) {
  return (
    <nav className="mobile-tabs">
      {tabs.map((tab) => (
        <NavLink className={({ isActive }) => `mobile-tab${isActive ? " active" : ""}`} key={tab.to} to={tab.to}>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
