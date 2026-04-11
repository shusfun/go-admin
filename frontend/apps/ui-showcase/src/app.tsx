import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useI18n, type Locale } from "@go-admin/i18n";
import { AppScrollbar, Backtop, Badge, Button, DocsShell, GlobalSearch, ThemeToggle } from "@go-admin/ui-admin";

import {
  getShowcaseCategoryDescription,
  getShowcaseCategoryLabel,
  getShowcaseRouteSummary,
  getShowcaseRouteSummaryAcrossLocales,
  tShowcase,
} from "./i18n/showcase";
import { showcaseCategories, showcaseRoutes } from "./showcase-routes";

const defaultRoute = showcaseCategories[0]?.items[0]?.path ?? "/actions/button";

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
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
  const currentRoute = showcaseRoutes.find((route) => route.path === location.pathname);

  return (
    <header className="showcase-header hidden xl:flex">
      <div className="showcase-header__brand">
        <Badge>Go Admin UI</Badge>
        <span className="showcase-header__section">{t("showcase.header.section")}</span>
      </div>
      <div className="showcase-header__crumb">
        <span className="showcase-header__eyebrow">{t("showcase.header.eyebrow")}</span>
        <span className="showcase-header__current">{currentRoute?.label ?? t("showcase.header.currentFallback")}</span>
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
              <span className="showcase-sidebar__group-count">{category.items.length}</span>
            </div>
            <nav className="showcase-sidebar__nav">
              {category.items.map((item) => (
                <NavLink
                  className={({ isActive }) => (isActive ? "showcase-sidebar__link is-active" : "showcase-sidebar__link")}
                  key={item.path}
                  onClick={onNavigate}
                  to={item.path}
                >
                  <span className="showcase-sidebar__link-label">{item.label}</span>
                  <span className="showcase-sidebar__link-summary">{getShowcaseRouteSummary(item, t)}</span>
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
  // scroll-rule: allow-page-content-overflow UI Showcase 主内容区保留原生滚动，供锚点与 Backtop 使用。
  const pageContentClassName = "showcase-content-scroll-root px-4 py-6 md:px-8 md:py-8 xl:min-h-0 xl:overflow-y-auto";
  const searchItems = useMemo(
    () =>
      showcaseCategories.flatMap((category) =>
        category.items.map((route) => ({
          description: getShowcaseRouteSummary(route, t),
          id: route.path,
          keywords: [
            category.key,
            route.shortLabel,
            route.path,
            getShowcaseCategoryLabel(category, t),
            getShowcaseCategoryDescription(category, t),
            ...getShowcaseRouteSummaryAcrossLocales(route),
            ...(["zh-CN", "en-US"] as const).flatMap((value) => [
              tShowcase(value as Locale, category.labelKey),
              tShowcase(value as Locale, category.descriptionKey),
            ]),
          ],
          section: getShowcaseCategoryLabel(category, t),
          title: route.label,
        })),
      ),
    [locale, t],
  );

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
            return <Route element={<Component />} key={route.path} path={route.path} />;
          })}
          <Route element={<Navigate replace to={defaultRoute} />} path="*" />
        </Routes>
      </DocsShell>
      <Backtop draggable maxDragOffset={300} target=".showcase-content-scroll-root" visibilityHeight={160} />
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
