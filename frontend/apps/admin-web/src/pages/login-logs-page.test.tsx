// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginLogsPage } from "./login-logs-page";

let host: HTMLDivElement;
let root: Root;

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(label));
}

async function flushPromises(rounds = 5) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
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

async function clickButton(label: string) {
  const button = findButton(label);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function createApi() {
  return {
    admin: {
      deleteLoginLogs: vi.fn(),
      getLoginLog: vi.fn().mockResolvedValue({
        id: 7,
        username: "admin",
        status: "2",
        ipaddr: "127.0.0.1",
        loginLocation: "上海",
        browser: "Chrome",
        os: "macOS",
        platform: "desktop",
        loginTime: "2026-04-08T10:00:00.000Z",
        remark: "成功登录",
        msg: "login success",
      }),
      listLoginLogs: vi.fn().mockResolvedValue({
        count: 1,
        list: [
          {
            id: 7,
            username: "admin",
            status: "2",
            ipaddr: "127.0.0.1",
            browser: "Chrome",
            os: "macOS",
            loginTime: "2026-04-08T10:00:00.000Z",
            msg: "login success",
          },
        ],
      }),
    },
  };
}

async function renderPage(api: ReturnType<typeof createApi>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <LoginLogsPage api={api as never} />
      </QueryClientProvider>,
    );
  });

  await flushPromises();
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
});

describe("LoginLogsPage", () => {
  it("点击详情后通过 DetailDialog 展示完整日志内容", async () => {
    const api = createApi();

    await renderPage(api);
    await waitForCondition(() => {
      expect(document.body.textContent).toContain("admin");
      expect(findButton("详情")).toBeTruthy();
    });

    await clickButton("详情");
    await waitForCondition(() => {
      expect(api.admin.getLoginLog).toHaveBeenCalledWith(7);
      expect(document.body.textContent).toContain("登录日志详情");
      expect(document.body.textContent).toContain("上海");
      expect(document.body.textContent).toContain("login success");
    });
  });
});
