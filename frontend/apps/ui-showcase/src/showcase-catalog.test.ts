import { describe, expect, it } from "vitest";
import * as uiAdmin from "@go-admin/ui-admin";
import type { I18nParams, Translator } from "@go-admin/i18n";

import { tShowcase } from "./i18n/showcase";
import { showcaseEntries, showcaseExportCoverage, showcaseRouteMap } from "./showcase-routes";
import { buildShowcaseSearchItems } from "./showcase-search";

const translate = ((key: string, fallback?: string, params?: I18nParams) =>
  tShowcase("zh-CN", key, fallback, params)) as Translator;

describe("ui-showcase metadata", () => {
  it("覆盖 @go-admin/ui-admin 的全部对外导出", () => {
    const publicExports = Object.keys(uiAdmin).sort((left, right) => left.localeCompare(right, "en"));
    expect(showcaseExportCoverage).toEqual(publicExports);
  });

  it("不存在重复 id、重复 href，且每个条目都能找到归属 route", () => {
    const ids = showcaseEntries.map((entry) => entry.id);
    const hrefs = showcaseEntries.map((entry) => entry.href);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);

    for (const entry of showcaseEntries) {
      const ownerRoute = Array.from(showcaseRouteMap.values()).find((route) => route.label === entry.ownerRoute);
      expect(ownerRoute, `missing owner route for ${entry.title}`).toBeTruthy();
      expect(entry.previewKind, `missing preview kind for ${entry.title}`).toBeTruthy();
    }
  });
});

describe("ui-showcase search registry", () => {
  it("能生成独立页面组件的搜索条目", () => {
    const items = buildShowcaseSearchItems("zh-CN", translate);
    const item = items.find((value) => value.title === "ImageCaptchaField");

    expect(item).toBeTruthy();
    expect(item?.id).toBe("/forms/image-captcha-field");
    expect(item?.section).toBe("表单输入");
  });

  it("能生成 helper 级锚点条目并跳到所属页面片段", () => {
    const items = buildShowcaseSearchItems("zh-CN", translate);
    const item = items.find((value) => value.title === "ListPane");

    expect(item).toBeTruthy();
    expect(item?.id).toBe("/patterns/master-detail-layout#api-listpane");
    expect(item?.keywords).toContain("ListPane");
  });
});
