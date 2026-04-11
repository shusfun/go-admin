// @vitest-environment jsdom
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, initializeTheme } from "@go-admin/design-tokens";
import { I18nProvider } from "@go-admin/i18n";

import { showcaseMessages, tShowcase } from "./i18n/showcase";
import { showcaseCategories } from "./showcase-routes";
import { OverviewPage } from "./showcase-routes/overview";
import { App } from "./app";

let host: HTMLDivElement;
let root: Root;

async function flushPromises(rounds = 6) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function renderWithProviders(element: ReactNode, initialEntries = ["/overview"]) {
  return act(async () => {
    root.render(
      <MemoryRouter initialEntries={initialEntries} key={initialEntries.join("|")}>
        <I18nProvider initialLocale="zh-CN" messages={showcaseMessages} storageKey="go-admin:showcase:test-locale">
          <ThemeProvider>{element}</ThemeProvider>
        </I18nProvider>
      </MemoryRouter>,
    );
  });
}

describe("ui-showcase overview and routes", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    initializeTheme();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    host?.remove();
    document.body.innerHTML = "";
  });

  it("Overview 首页能渲染 Hero、规模区、推荐入口和分类索引", async () => {
    const shellsCount = showcaseCategories.find((category) => category.key === "shells")?.items.length ?? 0;

    await renderWithProviders(<OverviewPage />);

    expect(document.body.textContent).toContain("先看信息架构，再进入具体组件或 helper。");
    expect(document.body.textContent).toContain(tShowcase("zh-CN", "showcase.overview.scale.title"));
    expect(document.body.textContent).toContain(tShowcase("zh-CN", "showcase.overview.featured.title"));
    expect(document.body.textContent).toContain(tShowcase("zh-CN", "showcase.overview.section.categoryTitle"));
    expect(document.body.textContent).toContain("应用壳层");
    expect(document.body.textContent).toContain(`${shellsCount} 项条目`);
  });

  it("默认路由会进入 Overview，新分类路径可以访问", async () => {
    await renderWithProviders(<App />, ["/"]);
    await flushPromises();

    expect(document.body.textContent).toContain("先看信息架构，再进入具体组件或 helper。");

    await renderWithProviders(<App />, ["/patterns/toolbar"]);
    await flushPromises();

    expect(document.body.textContent).toContain("Toolbar");
    expect(document.body.textContent).toContain("Toolbar、FilterBar 与 AdvancedFilterPanel 的组合方式。");

    await renderWithProviders(<App />, ["/patterns/filter-panel"]);
    await flushPromises();

    expect(document.body.textContent).toContain("FilterPanel");
    expect(document.body.textContent).toContain("无高级筛选");
  });
});
