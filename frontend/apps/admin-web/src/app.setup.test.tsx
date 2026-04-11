// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@go-admin/i18n";

import { adminMessages } from "./i18n/admin";
import { AppContent } from "./app";

let mockSetupCompletionPayload = {
  autoLogin: false,
  password: "admin123",
  username: "admin",
};
let lastLoginPageProps: Record<string, unknown> | null = null;

vi.mock("./pages/setup-wizard-page", () => ({
  SetupWizardPage: ({ onComplete }: { onComplete: (payload: typeof mockSetupCompletionPayload) => Promise<void> }) => (
    <div>
      <div>Mock Setup Wizard</div>
      <button onClick={() => void onComplete(mockSetupCompletionPayload)} type="button">完成安装</button>
    </div>
  ),
}));

vi.mock("./pages/login-page", () => ({
  LoginPage: (props: Record<string, unknown>) => {
    lastLoginPageProps = props;
    return (
      <div>
        <div>Mock Login Page</div>
        <div data-testid="login-username">{String((props.initialValues as { username?: string } | undefined)?.username ?? "")}</div>
        <div data-testid="login-password">{String((props.initialValues as { password?: string } | undefined)?.password ?? "")}</div>
        <div data-testid="login-remember">{String((props.initialValues as { remember?: boolean } | undefined)?.remember ?? false)}</div>
        <div data-testid="login-notice">{String((props.notice as { message?: string } | undefined)?.message ?? "")}</div>
      </div>
    );
  },
}));

let host: HTMLDivElement;
let root: Root;
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

async function flushPromises(rounds = 6) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("AppContent setup 切换", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mockSetupCompletionPayload = {
      autoLogin: false,
      password: "admin123",
      username: "admin",
    };
    lastLoginPageProps = null;
    document.cookie = "go_admin_admin_login=; Max-Age=0; Path=/";
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createLocalStorageMock(),
    });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
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
    document.cookie = "go_admin_admin_login=; Max-Age=0; Path=/";
  });

  it("检测到 needs_setup=true 时进入 setup 页面", async () => {
    const setupApiClient = {
      getStatus: vi.fn().mockResolvedValue({
        hasServerDefaults: true,
        needs_setup: true,
        step: "welcome",
        defaults: {
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
        },
      }),
      install: vi.fn(),
      testDatabase: vi.fn(),
    };

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <AppContent setupApiClient={setupApiClient as never} />
        </I18nProvider>,
      );
    });
    await flushPromises();

    expect(setupApiClient.getStatus).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Mock Setup Wizard");
  });

  it("setup 完成后切回登录页", async () => {
    mockSetupCompletionPayload = {
      autoLogin: false,
      password: "admin123",
      username: "setup-admin",
    };
    const setupApiClient = {
      getStatus: vi.fn().mockResolvedValue({
        hasServerDefaults: true,
        needs_setup: true,
        step: "welcome",
        defaults: {
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
        },
      }),
      install: vi.fn(),
      testDatabase: vi.fn(),
    };

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <AppContent setupApiClient={setupApiClient as never} />
        </I18nProvider>,
      );
    });
    await flushPromises();

    const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes("完成安装"));
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    expect(document.body.textContent).toContain("Mock Login Page");
    expect(document.querySelector('[data-testid="login-username"]')?.textContent).toBe("setup-admin");
    expect(document.querySelector('[data-testid="login-password"]')?.textContent).toBe("admin123");
    expect(document.querySelector('[data-testid="login-remember"]')?.textContent).toBe("false");
    expect(document.querySelector('[data-testid="login-notice"]')?.textContent).toContain("完成登录后继续");
  });

  it("setup 状态接口不可用时回退到登录页", async () => {
    const setupApiClient = {
      getStatus: vi.fn().mockRejectedValue(new Error("network error")),
      install: vi.fn(),
      testDatabase: vi.fn(),
    };

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <AppContent setupApiClient={setupApiClient as never} />
        </I18nProvider>,
      );
    });
    await flushPromises();

    expect(setupApiClient.getStatus).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Mock Login Page");
  });

  it("已记住的账号密码会作为登录页初始值", async () => {
    document.cookie = `go_admin_admin_login=${encodeURIComponent(JSON.stringify({ password: "saved123", username: "saved-admin", version: 1 }))}`;

    const setupApiClient = {
      getStatus: vi.fn().mockRejectedValue(new Error("network error")),
      install: vi.fn(),
      testDatabase: vi.fn(),
    };

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <AppContent setupApiClient={setupApiClient as never} />
        </I18nProvider>,
      );
    });
    await flushPromises();

    expect(lastLoginPageProps).toBeTruthy();
    expect(document.querySelector('[data-testid="login-username"]')?.textContent).toBe("saved-admin");
    expect(document.querySelector('[data-testid="login-password"]')?.textContent).toBe("saved123");
    expect(document.querySelector('[data-testid="login-remember"]')?.textContent).toBe("true");
  });
});
