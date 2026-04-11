// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@go-admin/i18n";

import { SetupWizardPage } from "./setup-wizard-page";
import { adminMessages } from "../i18n/admin";

const defaults = {
  environment: "dev",
  database: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "",
    dbname: "go_admin",
  },
  admin: {
    username: "admin",
    email: "",
    phone: "",
  },
};

let originalLocalStorage: Storage;

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function createSetupApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    testDatabase: vi.fn().mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({ hasServerDefaults: true, needs_setup: false, step: "complete", defaults }),
    ...overrides,
  };
}

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.trim().includes(label),
  );
}

async function waitForCondition(assertion: () => void, timeoutMs = 2000) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  throw lastError instanceof Error ? lastError : new Error("等待断言超时");
}

describe("SetupWizardPage 行为测试", () => {
  let host: HTMLDivElement;
  let root: Root;
  let setupApi: ReturnType<typeof createSetupApi>;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createLocalStorageMock(),
    });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    setupApi = createSetupApi();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    host.remove();
    document.body.innerHTML = "";
  });

  function renderPage(overrides: Parameters<typeof createSetupApi>[0] = {}) {
    setupApi = createSetupApi(overrides);
    act(() => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <SetupWizardPage initialStatus={{ hasServerDefaults: true, defaults } as any} onComplete={vi.fn().mockResolvedValue(undefined)} setupApi={setupApi as any} />
        </I18nProvider>,
      );
    });
  }

  it("在数据库测试成功后前进到管理员步骤", async () => {
    renderPage();

    const testButton = findButton("测试连接");
    expect(testButton).toBeTruthy();

    await act(async () => {
      testButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitForCondition(() => {
      expect(setupApi.testDatabase).toHaveBeenCalled();
      expect(document.body.textContent).toContain("数据库连接成功");
    });

    const nextButton = findButton("下一步");
    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitForCondition(() => {
      expect(document.body.textContent).toContain("管理员账号");
    });
  });

  it("失败的测试连接会提示并阻止下一步", async () => {
    renderPage({
      testDatabase: vi.fn().mockRejectedValue(new Error("连接被拒绝")),
    });

    const testButton = findButton("测试连接");
    expect(testButton).toBeTruthy();

    await act(async () => {
      testButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitForCondition(() => {
      expect(document.body.textContent).toContain("连接被拒绝");
    });

    const nextButton = findButton("下一步");
    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await waitForCondition(() => {
      expect(document.body.textContent).toContain("请先测试连接");
    });
    expect(setupApi.testDatabase).toHaveBeenCalled();
  });
});
