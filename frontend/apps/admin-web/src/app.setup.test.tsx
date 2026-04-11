// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@go-admin/i18n";

import { adminMessages } from "./i18n/admin";
import { AppContent } from "./app";

const apiMocks = vi.hoisted(() => ({
  getAppConfig: vi.fn(),
  getCaptcha: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@go-admin/api", async () => {
  const actual = await vi.importActual<typeof import("@go-admin/api")>("@go-admin/api");

  return {
    ...actual,
    createApiClient: vi.fn(() => ({
      auth: {
        getCaptcha: apiMocks.getCaptcha,
        login: apiMocks.login,
        logout: apiMocks.logout,
      },
      system: {
        getAppConfig: apiMocks.getAppConfig,
      },
    })),
  };
});

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

vi.mock("./admin-workbench", () => ({
  AdminWorkbench: () => <div>Mock Admin Workbench</div>,
}));

let host: HTMLDivElement;
let root: Root;
let originalLocalStorage: Storage;
let queryClient: QueryClient;

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

async function renderApp(setupApiClient: unknown) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <AppContent setupApiClient={setupApiClient as never} />
        </I18nProvider>
      </QueryClientProvider>,
    );
  });
}

describe("AppContent setup 切换", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    apiMocks.getAppConfig.mockReset();
    apiMocks.getAppConfig.mockResolvedValue({});
    apiMocks.getCaptcha.mockReset();
    apiMocks.login.mockReset();
    apiMocks.logout.mockReset();
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
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 0,
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    queryClient.clear();
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

    await renderApp(setupApiClient);
    await flushPromises();

    expect(setupApiClient.getStatus).toHaveBeenCalledTimes(1);
    expect(apiMocks.getAppConfig).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Mock Setup Wizard");
  });

  it("本地地址下自动登录失败时回到登录页并提示", async () => {
    mockSetupCompletionPayload = {
      autoLogin: false,
      password: "admin123",
      username: "setup-admin",
    };
    apiMocks.login.mockRejectedValue(new Error("登录接口调用失败"));
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

    await renderApp(setupApiClient);
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
    expect(document.querySelector('[data-testid="login-notice"]')?.textContent).toContain("自动登录失败");
  });

  it("setup 状态接口不可用时回退到登录页", async () => {
    const setupApiClient = {
      getStatus: vi.fn().mockRejectedValue(new Error("network error")),
      install: vi.fn(),
      testDatabase: vi.fn(),
    };

    await renderApp(setupApiClient);
    await flushPromises();

    expect(setupApiClient.getStatus).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Mock Login Page");
  });

  it("setup 完成且允许自动登录时会直接进入后台", async () => {
    mockSetupCompletionPayload = {
      autoLogin: true,
      password: "admin123",
      username: "setup-admin",
    };
    apiMocks.login.mockResolvedValue({
      code: 200,
      expire: "2099-01-01T00:00:00Z",
      msg: "ok",
      token: "setup-token",
    });

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

    await renderApp(setupApiClient);
    await flushPromises();

    const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes("完成安装"));
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    expect(apiMocks.login).toHaveBeenCalledWith({
      password: "admin123",
      username: "setup-admin",
    });
    expect(document.body.textContent).toContain("Mock Admin Workbench");
  });

  it("已记住的账号密码会作为登录页初始值", async () => {
    document.cookie = `go_admin_admin_login=${encodeURIComponent(JSON.stringify({ password: "saved123", username: "saved-admin", version: 1 }))}`;

    const setupApiClient = {
      getStatus: vi.fn().mockRejectedValue(new Error("network error")),
      install: vi.fn(),
      testDatabase: vi.fn(),
    };

    await renderApp(setupApiClient);
    await flushPromises();

    expect(lastLoginPageProps).toBeTruthy();
    expect(document.querySelector('[data-testid="login-username"]')?.textContent).toBe("saved-admin");
    expect(document.querySelector('[data-testid="login-password"]')?.textContent).toBe("saved123");
    expect(document.querySelector('[data-testid="login-remember"]')?.textContent).toBe("true");
  });
});
