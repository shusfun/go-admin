// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetupWizardPage } from "./setup-wizard-page";

let host: HTMLDivElement;
let root: Root;

const initialStatus = {
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
  testRedis: ReturnType<typeof vi.fn>;
}) {
  await clickButton("测试连接");
  await flushPromises();
  await clickButton("下一步");
  await flushPromises();

  expect(document.body.textContent).toContain("步骤 2 / 4：Redis 配置");

  await clickButton("测试连接");
  await flushPromises();
  await clickButton("下一步");
  await flushPromises();

  expect(setupApi.testDatabase).toHaveBeenCalledTimes(1);
  expect(setupApi.testRedis).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).toContain("步骤 3 / 4：管理员账号");
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("SetupWizardPage 页面流程", () => {
  it("完成数据库与 Redis 测试后可以进入安装，并在服务就绪后触发 onComplete", async () => {
    vi.useFakeTimers();

    const setupApi = {
      getStatus: vi.fn().mockResolvedValue({ ...initialStatus, needs_setup: false }),
      install: vi.fn().mockResolvedValue(undefined),
      testDatabase: vi.fn().mockResolvedValue(undefined),
      testRedis: vi.fn().mockResolvedValue(undefined),
    };
    const onComplete = vi.fn();

    await act(async () => {
      root.render(<SetupWizardPage initialStatus={initialStatus} onComplete={onComplete} setupApi={setupApi as never} />);
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
      redis: initialStatus.defaults.redis,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await flushPromises(6);

    expect(setupApi.getStatus).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("安装失败时展示错误反馈且不触发完成回调", async () => {
    const setupApi = {
      getStatus: vi.fn(),
      install: vi.fn().mockRejectedValue(new Error("数据库初始化失败")),
      testDatabase: vi.fn().mockResolvedValue(undefined),
      testRedis: vi.fn().mockResolvedValue(undefined),
    };
    const onComplete = vi.fn();

    await act(async () => {
      root.render(<SetupWizardPage initialStatus={initialStatus} onComplete={onComplete} setupApi={setupApi as never} />);
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
});
