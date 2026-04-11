import type { Locale, Translator } from "@go-admin/i18n";
import type { GlobalSearchItem } from "@go-admin/ui-admin";

import {
  getShowcaseCategoryDescription,
  getShowcaseCategoryLabel,
  getShowcaseRouteSummary,
  getShowcaseRouteSummaryAcrossLocales,
  tShowcase,
} from "./i18n/showcase";
import { showcaseCategories, showcaseEntries } from "./showcase-routes";

function compactKeywords(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

export function buildShowcaseSearchItems(locale: Locale, t: Translator): GlobalSearchItem[] {
  return showcaseEntries.map((entry) => {
    const category = showcaseCategories.find((item) => item.key === entry.categoryKey);
    const categoryLabel = category ? getShowcaseCategoryLabel(category, t) : entry.categoryKey;
    const categoryDescription = category ? getShowcaseCategoryDescription(category, t) : entry.categoryKey;

    return {
      description: getShowcaseRouteSummary(entry, t),
      id: entry.href,
      keywords: compactKeywords([
        entry.title,
        entry.href,
        entry.shortLabel,
        ...(entry.exportNames ?? []),
        ...(entry.keywords ?? []),
        categoryLabel,
        categoryDescription,
        ...getShowcaseRouteSummaryAcrossLocales(entry),
        ...(["zh-CN", "en-US"] as const).flatMap((value) => [
          category ? tShowcase(value, category.labelKey) : "",
          category ? tShowcase(value, category.descriptionKey) : "",
        ]),
      ]),
      section: categoryLabel,
      title: entry.title,
    };
  });
}
