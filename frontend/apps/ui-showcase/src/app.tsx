import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useI18n } from "@go-admin/i18n";
import { AppScrollbar, Badge, Button, DocsShell, GlobalSearch, ThemeToggle } from "@go-admin/ui-admin";

import {
  getShowcaseCategoryLabel,
  getShowcaseRouteSummary,
} from "./i18n/showcase";
import { showcaseCategories, showcaseEntries, showcaseRouteMap, showcaseRoutes } from "./showcase-routes";
import { buildShowcaseSearchItems } from "./showcase-search";

const defaultRoute = showcaseRoutes.find((route) => route.label === "Overview")?.path ?? "/overview";

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>(".go-admin-shell-content-scroll-root")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return null;
}

function ShowcaseSearchTrigger({ compact = false, onClick }: { compact?: boolean; onClick: () => void }) {
  const { t } = useI18n();

  return (
    <Button
      className={compact ? "showcase-search-trigger showcase-search-trigger--compact" : "showcase-search-trigger"}
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      <span className="showcase-search-trigger__label">{t("showcase.search.trigger")}</span>
      {!compact ? <span className="showcase-search-trigger__shortcut">⌘K</span> : null}
    </Button>
  );
}

function ShowcaseLocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <Button
      aria-label="toggle language"
      className="showcase-locale-toggle"
      onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
      size="sm"
      type="button"
      variant="outline"
    >
      {t("showcase.language.switch")}
    </Button>
  );
}

function ShowcaseHeader({ onSearchOpen }: { onSearchOpen: () => void }) {
  const { t } = useI18n();
  const location = useLocation();
  const currentEntry = showcaseEntries.find((entry) => entry.href === `${location.pathname}${location.hash}`);
  const currentRoute = showcaseRouteMap.get(location.pathname);

  return (
    <header className="showcase-header hidden xl:flex">
      <div className="showcase-header__brand">
        <Badge>Go Admin UI</Badge>
        <span className="showcase-header__section">{t("showcase.header.section")}</span>
      </div>
      <div className="showcase-header__crumb">
        <span className="showcase-header__eyebrow">{t("showcase.header.eyebrow")}</span>
        <span className="showcase-header__current">{currentEntry?.title ?? currentRoute?.label ?? t("showcase.header.currentFallback")}</span>
      </div>
      <div className="showcase-header__actions">
        <ShowcaseSearchTrigger onClick={onSearchOpen} />
        <ShowcaseLocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

function ShowcaseSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();

  return (
    <div className="showcase-sidebar">
      <div className="showcase-sidebar__brand">
        <p className="showcase-sidebar__name">Go Admin UI</p>
        <p className="showcase-sidebar__tagline">{t("showcase.sidebar.tagline")}</p>
      </div>

      <AppScrollbar className="min-h-0 flex-1" viewportClassName="showcase-sidebar__body">
        {showcaseCategories.map((category) => (
          <section className="showcase-sidebar__group" key={category.key}>
            <div className="showcase-sidebar__group-head">
              <p className="showcase-sidebar__group-title">{getShowcaseCategoryLabel(category, t)}</p>
              <span className="showcase-sidebar__group-count">{category.routes.length}</span>
            </div>
            <nav className="showcase-sidebar__nav">
              {category.routes.map((route) => (
                <NavLink
                  className={({ isActive }) => (isActive ? "showcase-sidebar__link is-active" : "showcase-sidebar__link")}
                  key={route.path}
                  onClick={onNavigate}
                  to={route.path}
                >
                  <span className="showcase-sidebar__link-label">{route.label}</span>
                  <span className="showcase-sidebar__link-summary">{getShowcaseRouteSummary(route, t)}</span>
                </NavLink>
              ))}
            </nav>
          </section>
        ))}
      </AppScrollbar>
    </div>
  );
}

export function App() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pageContentClassName = "px-4 py-6 md:px-8 md:py-8";
  const searchItems = useMemo(() => buildShowcaseSearchItems(locale, t), [locale, t]);

  function handleSearchOpenChange(nextOpen: boolean) {
    setSearchOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  }

  return (
    <>
      <ScrollToTop />
      <DocsShell
        className="showcase-shell"
        contentClassName={pageContentClassName}
        contentInnerClassName="max-w-[1120px] gap-8 xl:pb-12"
        header={<ShowcaseHeader onSearchOpen={() => handleSearchOpenChange(true)} />}
        mobileBar={({ openSidebar }) => (
          <div className="showcase-mobile-bar xl:hidden">
            <Button onClick={openSidebar} size="icon" type="button" variant="outline">
              <span className="text-lg leading-none">≡</span>
            </Button>
            <div className="showcase-mobile-bar__title">
              <span>Go Admin UI</span>
              <small>{t("showcase.mobile.subtitle")}</small>
            </div>
            <div className="showcase-mobile-bar__actions">
              <ShowcaseSearchTrigger compact onClick={() => handleSearchOpenChange(true)} />
              <ShowcaseLocaleToggle />
              <ThemeToggle />
            </div>
          </div>
        )}
        mobileDrawerClassName="border-l-0 p-0"
        mobileSidebar={({ closeSidebar }) => <ShowcaseSidebar onNavigate={closeSidebar} />}
        rootClassName="xl:h-[100dvh] xl:overflow-hidden"
        sidebar={<ShowcaseSidebar />}
        sidebarClassName="xl:flex xl:w-[18.5rem] xl:border-r xl:border-border/60 xl:bg-card"
      >
        <Routes>
          <Route element={<Navigate replace to={defaultRoute} />} path="/" />
          {showcaseRoutes.map((route) => {
            const Component = route.component;
            return <Route element={<ShowcaseRouteOutlet routeLabel={route.label}><Component /></ShowcaseRouteOutlet>} key={route.path} path={route.path} />;
          })}
          <Route element={<Navigate replace to={defaultRoute} />} path="*" />
        </Routes>
      </DocsShell>
      <GlobalSearch
        description={t("showcase.search.description")}
        enableHotkeys
        emptyLabel={t("showcase.search.empty")}
        items={searchItems}
        onOpenChange={handleSearchOpenChange}
        onQueryChange={setSearchQuery}
        onSelect={(item) => navigate(item.id)}
        open={searchOpen}
        placeholder={t("showcase.search.placeholder")}
        query={searchQuery}
        title={t("showcase.search.title")}
      />
    </>
  );
}

function ShowcaseRouteOutlet({
  children,
  routeLabel,
}: {
  children: ReactNode;
  routeLabel: string;
}) {
  const anchorIds = Array.from(
    new Set(
      showcaseEntries
        .filter((entry) => entry.ownerRoute === routeLabel && entry.href.includes("#"))
        .map((entry) => entry.href.split("#")[1])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return (
    <>
      {anchorIds.length ? (
        <div aria-hidden className="sr-only">
          {anchorIds.map((anchorId) => (
            <span id={anchorId} key={anchorId} />
          ))}
        </div>
      ) : null}
      {children}
    </>
  );
}
