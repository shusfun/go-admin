// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@go-admin/i18n";

import { SetupWizardPage } from "./setup-wizard-page";
import { adminMessages } from "../i18n/admin";

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

const initialStatus = {
  hasServerDefaults: true,
  needs_setup: true,
  step: "database",
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
} as const;

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(label));
}

function findInput(name: string) {
  return document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function flushPromises(rounds = 4) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function clickButton(label: string) {
  const button = findButton(label);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function setInputValue(name: string, value: string) {
  const input = findInput(name);
  expect(input).toBeTruthy();
  await act(async () => {
    if (!input) {
      return;
    }
    setNativeValue(input, value);
  });
}

async function advanceToAdminStep(setupApi: {
  testDatabase: ReturnType<typeof vi.fn>;
}) {
  await clickButton("测试连接");
  await flushPromises();
  await clickButton("下一步");
  await flushPromises();

  expect(setupApi.testDatabase).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).toContain("步骤 2 / 3：管理员账号");
}

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
  vi.useRealTimers();
});

describe("SetupWizardPage 页面流程", () => {
  it("完成数据库测试后可以进入安装，并在服务就绪后触发 onComplete", async () => {
    vi.useFakeTimers();

    const setupApi = {
      getStatus: vi.fn().mockResolvedValue({ ...initialStatus, needs_setup: false }),
      install: vi.fn().mockResolvedValue(undefined),
      testDatabase: vi.fn().mockResolvedValue(undefined),
    };
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <SetupWizardPage initialStatus={initialStatus} onComplete={onComplete} setupApi={setupApi as never} />
        </I18nProvider>,
      );
    });

    await clickButton("下一步");
    await flushPromises();
    expect(document.body.textContent).toContain("请先测试连接");

    await advanceToAdminStep(setupApi);

    await setInputValue("password", "admin123");
    await setInputValue("confirmPassword", "admin123");
    await clickButton("开始安装");
    await flushPromises();

    expect(setupApi.install).toHaveBeenCalledWith({
      admin: {
        email: "",
        password: "admin123",
        phone: "",
        username: "admin",
      },
      database: initialStatus.defaults.database,
      environment: "dev",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await flushPromises(6);

    expect(setupApi.getStatus).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      autoLogin: true,
      password: "admin123",
      username: "admin",
    });
  });

  it("安装失败时展示错误反馈且不触发完成回调", async () => {
    const setupApi = {
      getStatus: vi.fn(),
      install: vi.fn().mockRejectedValue(new Error("数据库初始化失败")),
      testDatabase: vi.fn().mockResolvedValue(undefined),
    };
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <SetupWizardPage initialStatus={initialStatus} onComplete={onComplete} setupApi={setupApi as never} />
        </I18nProvider>,
      );
    });

    await advanceToAdminStep(setupApi);

    await setInputValue("password", "admin123");
    await setInputValue("confirmPassword", "admin123");
    await clickButton("开始安装");
    await flushPromises();

    expect(setupApi.install).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("数据库初始化失败");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("后端缺少可信默认值时阻止安装提交", async () => {
    const setupApi = {
      getStatus: vi.fn(),
      install: vi.fn(),
      testDatabase: vi.fn().mockResolvedValue(undefined),
    };

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <SetupWizardPage
            initialStatus={{ ...initialStatus, hasServerDefaults: false, defaults: { ...initialStatus.defaults, environment: "prod" } }}
            onComplete={vi.fn().mockResolvedValue(undefined)}
            setupApi={setupApi as never}
          />
        </I18nProvider>,
      );
    });

    await advanceToAdminStep(setupApi);
    await setInputValue("password", "admin123");
    await setInputValue("confirmPassword", "admin123");
    await clickButton("开始安装");
    await flushPromises();

    expect(setupApi.install).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("初始化信息暂未准备好，请刷新页面后重试。");
  });

  it("非开发环境安装完成后切回登录页而不是自动登录", async () => {
    vi.useFakeTimers();

    const setupApi = {
      getStatus: vi.fn().mockResolvedValue({ ...initialStatus, needs_setup: false, defaults: { ...initialStatus.defaults, environment: "prod" } }),
      install: vi.fn().mockResolvedValue(undefined),
      testDatabase: vi.fn().mockResolvedValue(undefined),
    };
    const onComplete = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      root.render(
        <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
          <SetupWizardPage
            initialStatus={{ ...initialStatus, defaults: { ...initialStatus.defaults, environment: "prod" } }}
            onComplete={onComplete}
            setupApi={setupApi as never}
          />
        </I18nProvider>,
      );
    });

    await advanceToAdminStep(setupApi);
    await setInputValue("password", "admin123");
    await setInputValue("confirmPassword", "admin123");
    await clickButton("开始安装");
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await flushPromises(6);

    expect(onComplete).toHaveBeenCalledWith({
      autoLogin: false,
      password: "admin123",
      username: "admin",
    });
  });
});
