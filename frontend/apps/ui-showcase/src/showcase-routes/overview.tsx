import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useI18n } from "@go-admin/i18n";
import { Badge, Button, Input } from "@go-admin/ui-admin";

import {
  getShowcaseCategoryDescription,
  getShowcaseCategoryLabel,
  getShowcaseRouteSummary,
} from "../i18n/showcase";
import { showcaseCategories, showcaseEntries, showcaseFeaturedEntries } from "./index";
import { OverviewPreview } from "./overview-previews";
import { type DocEntry } from "./shared";

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

export function OverviewPage() {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);
  const normalizedKeyword = normalizeKeyword(deferredKeyword);
  const totalCategories = showcaseCategories.filter((category) => category.key !== "overview").length;
  const totalEntries = showcaseEntries.filter((entry) => entry.categoryKey !== "overview").length;

  const filteredCategories = useMemo(
    () =>
      showcaseCategories
        .filter((category) => category.key !== "overview")
        .map((category) => {
          const categoryLabel = getShowcaseCategoryLabel(category, t);
          const categoryDescription = getShowcaseCategoryDescription(category, t);
          const searchableCategoryText = `${categoryLabel} ${categoryDescription}`.toLowerCase();
          const items = normalizedKeyword
            ? category.items.filter((item) => {
                const searchableItemText = [
                  item.title,
                  item.href,
                  item.shortLabel,
                  ...(item.exportNames ?? []),
                  ...(item.keywords ?? []),
                  getShowcaseRouteSummary(item, t),
                  categoryLabel,
                  categoryDescription,
                ]
                  .join(" ")
                  .toLowerCase();

                return searchableCategoryText.includes(normalizedKeyword) || searchableItemText.includes(normalizedKeyword);
              })
            : category.items;

          return {
            category,
            categoryDescription,
            categoryLabel,
            items,
          };
        })
        .filter((category) => category.items.length > 0),
    [normalizedKeyword, t],
  );

  const filteredCount = filteredCategories.reduce((sum, category) => sum + category.items.length, 0);
  const guideItems = [
    { description: t("showcase.overview.guide.browse.description"), title: t("showcase.overview.guide.browse.title") },
    { description: t("showcase.overview.guide.layout.description"), title: t("showcase.overview.guide.layout.title") },
    { description: t("showcase.overview.guide.routes.description"), title: t("showcase.overview.guide.routes.title") },
    { description: t("showcase.overview.guide.search.description"), title: t("showcase.overview.guide.search.title") },
  ];

  return (
    <article className="showcase-doc-page showcase-overview-page">
      <header className="showcase-doc-page__header showcase-overview-page__header">
        <div className="showcase-overview-hero">
          <div className="showcase-overview-hero__content">
            <div className="showcase-overview-hero__badge-row">
              <Badge>{t("showcase.overview.hero.badge")}</Badge>
              <span className="showcase-doc-page__eyebrow">{t("showcase.category.overview.label")}</span>
            </div>
            <h1 className="showcase-doc-page__title">{t("showcase.overview.hero.title")}</h1>
            <div className="showcase-doc-page__description">
              <p>{t("showcase.overview.hero.description")}</p>
              <p>{t("showcase.overview.description.sub")}</p>
            </div>
            <div className="showcase-doc-page__meta">
              <span>{t("showcase.overview.meta.categories", undefined, { count: totalCategories })}</span>
              <span>{t("showcase.overview.meta.routes", undefined, { count: totalEntries })}</span>
              <span>{t("showcase.overview.meta.support")}</span>
            </div>
            <div className="showcase-overview-hero__actions">
              {showcaseFeaturedEntries[0] ? (
                <Button asChild type="button">
                  <Link to={showcaseFeaturedEntries[0].href}>{t("showcase.overview.actions.primary")}</Link>
                </Button>
              ) : null}
              <Button asChild type="button" variant="outline">
                <Link to="/navigation/global-search">{t("showcase.overview.actions.search")}</Link>
              </Button>
            </div>
          </div>
          <div className="showcase-overview-hero__preview">
            <OverviewPreview kind="layout" />
          </div>
        </div>

        <div className="showcase-overview-search">
          <Input
            clearable
            className="showcase-overview-search__input"
            onChange={(event) => setKeyword(event.target.value)}
            onClear={() => setKeyword("")}
            placeholder={t("showcase.overview.search.placeholder")}
            prefix={<Search className="h-4 w-4" />}
            size="large"
            value={keyword}
          />
          <p className="showcase-overview-search__meta">
            {normalizedKeyword
              ? t("showcase.overview.search.result", undefined, { count: filteredCount, total: totalEntries })
              : t("showcase.overview.search.idle", undefined, { count: totalEntries })}
          </p>
        </div>
      </header>

      <section className="showcase-doc-block showcase-overview-metrics">
        <div className="showcase-doc-section">
          <h2 className="showcase-doc-section__title">{t("showcase.overview.scale.title")}</h2>
          <p className="showcase-doc-section__description">{t("showcase.overview.scale.description")}</p>
        </div>
        <div className="showcase-overview-metric-grid">
          <MetricCard detail={t("showcase.overview.metrics.categories.detail")} label={t("showcase.overview.metrics.categories.label")} value={String(totalCategories)} />
          <MetricCard detail={t("showcase.overview.metrics.routes.detail")} label={t("showcase.overview.metrics.routes.label")} value={String(totalEntries)} />
          <MetricCard detail={t("showcase.overview.metrics.search.detail")} label={t("showcase.overview.metrics.search.label")} value={t("showcase.overview.metrics.search.value")} />
          <MetricCard detail={t("showcase.overview.metrics.shells.detail")} label={t("showcase.overview.metrics.shells.label")} value={t("showcase.overview.metrics.shells.value")} />
        </div>
      </section>

      <section className="showcase-doc-block showcase-overview-featured">
        <div className="showcase-doc-section">
          <h2 className="showcase-doc-section__title">{t("showcase.overview.featured.title")}</h2>
          <p className="showcase-doc-section__description">{t("showcase.overview.featured.description")}</p>
        </div>
        <div className="showcase-overview-link-grid">
          {showcaseFeaturedEntries.map((item) => (
            <OverviewEntry categoryLabel={findCategoryLabel(item.categoryKey, t)} item={item} key={item.id} />
          ))}
        </div>
      </section>

      <section className="showcase-doc-block showcase-overview-guide">
        <div className="showcase-doc-section">
          <h2 className="showcase-doc-section__title">{t("showcase.overview.section.guideTitle")}</h2>
          <p className="showcase-doc-section__description">{t("showcase.overview.section.guideDescription")}</p>
        </div>
        <div className="showcase-overview-guide-grid">
          {guideItems.map((item) => (
            <article className="showcase-overview-guide-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {filteredCategories.length ? (
        <section className="showcase-doc-block showcase-overview-groups">
          <div className="showcase-doc-section">
            <h2 className="showcase-doc-section__title">{t("showcase.overview.section.categoryTitle")}</h2>
            <p className="showcase-doc-section__description">{t("showcase.overview.section.categoryDescription")}</p>
          </div>

          {filteredCategories.map(({ category, categoryDescription, categoryLabel, items }) => (
            <section className="showcase-overview-group" key={category.key}>
              <div className="showcase-overview-group__header">
                <div className="showcase-overview-group__copy">
                  <h3 className="showcase-overview-group__title" title={categoryDescription}>{categoryLabel}</h3>
                  <p className="showcase-overview-group__description">{categoryDescription}</p>
                </div>
                <span className="showcase-overview-group__count">{t("showcase.overview.category.count", undefined, { count: items.length })}</span>
              </div>
              <div className="showcase-overview-link-grid">
                {items.map((item) => (
                  <OverviewEntry categoryLabel={categoryLabel} item={item} key={item.id} />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <section className="showcase-doc-block showcase-overview-empty">
          <h2 className="showcase-overview-empty__title">{t("showcase.overview.empty.title")}</h2>
          <p className="showcase-overview-empty__description">{t("showcase.overview.empty.description")}</p>
        </section>
      )}
    </article>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className="showcase-overview-metric-card">
      <span className="showcase-overview-metric-card__label">{label}</span>
      <strong className="showcase-overview-metric-card__value">{value}</strong>
      <p className="showcase-overview-metric-card__detail">{detail}</p>
    </article>
  );
}

function findCategoryLabel(categoryKey: string, t: ReturnType<typeof useI18n>["t"]) {
  const category = showcaseCategories.find((item) => item.key === categoryKey);
  return category ? getShowcaseCategoryLabel(category, t) : categoryKey;
}

function OverviewEntry({ categoryLabel, item }: { categoryLabel: string; item: DocEntry }) {
  const { t } = useI18n();
  const summary = getShowcaseRouteSummary(item, t);

  return (
    <Link aria-label={`${categoryLabel} ${item.title}`} className="showcase-overview-entry" to={item.href}>
      <div className="showcase-overview-entry__preview">
        <OverviewPreview kind={item.previewKind} />
      </div>
      <div className="showcase-overview-entry__body">
        <div className="showcase-overview-entry__meta">
          <span>{categoryLabel}</span>
          <span>{item.shortLabel ?? t("showcase.overview.featured.meta")}</span>
        </div>
        <strong className="showcase-overview-entry__title">{item.title}</strong>
        <p className="showcase-overview-entry__summary">{summary}</p>
      </div>
    </Link>
  );
}
