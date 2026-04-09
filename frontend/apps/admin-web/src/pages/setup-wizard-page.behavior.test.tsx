// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetupWizardPage } from "./setup-wizard-page";

const defaults = {
  environment: "dev",
  database: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "",
    dbname: "go_admin",
  },
  redis: {
    host: "127.0.0.1",
    port: 6379,
    password: "",
    db: 0,
  },
  admin: {
    username: "admin",
    email: "",
    phone: "",
  },
};

function createSetupApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    testDatabase: vi.fn().mockResolvedValue(undefined),
    testRedis: vi.fn().mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({ needs_setup: false, step: "complete", defaults }),
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
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    setupApi = createSetupApi();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
    document.body.innerHTML = "";
  });

  function renderPage(overrides: Parameters<typeof createSetupApi>[0] = {}) {
    setupApi = createSetupApi(overrides);
    act(() => {
      root.render(<SetupWizardPage initialStatus={{ defaults } as any} setupApi={setupApi as any} onComplete={vi.fn()} />);
    });
  }

  it("在数据库测试成功后前进到 Redis 步骤", async () => {
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
      expect(document.body.textContent).toContain("Redis 配置");
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
