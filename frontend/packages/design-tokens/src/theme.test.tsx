// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY, applyThemeToDocument, getStoredTheme, initializeTheme, resolveTheme } from "./theme";

describe("theme", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.dataset.theme = "";
    document.documentElement.style.colorScheme = "";
    window.localStorage.clear();
  });

  it("returns system by default", () => {
    expect(getStoredTheme()).toBe("system");
  });

  it("applies a dark theme to document", () => {
    applyThemeToDocument("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("resolves and initializes system theme from storage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        matches: query.includes("dark"),
        removeEventListener: vi.fn(),
      })),
    );

    expect(resolveTheme("system")).toBe("dark");

    initializeTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("system");
  });
});
