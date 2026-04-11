// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperaLogsPage } from "./opera-logs-page";

let host: HTMLDivElement;
let root: Root;

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

function createApi() {
  return {
    admin: {
      deleteOperaLogs: vi.fn(),
      getOperaLog: vi.fn().mockResolvedValue({
        id: 12,
        title: "用户管理",
        operUrl: "/api/v1/user/page",
        operName: "admin",
        operIp: "127.0.0.1",
        operLocation: "上海",
        requestMethod: "GET",
        latencyTime: 123,
        status: "1",
        operTime: "2026-04-08T10:00:00.000Z",
        deptName: "平台部",
        userAgent: "Chrome",
        operParam: "{\"pageIndex\":1}",
        jsonResult: "{\"code\":200}",
      }),
      listOperaLogs: vi.fn().mockResolvedValue({
        count: 1,
        list: [
          {
            id: 12,
            title: "用户管理",
            operUrl: "/api/v1/user/page",
            operName: "admin",
            operIp: "127.0.0.1",
            requestMethod: "GET",
            latencyTime: 123,
            status: "1",
            operTime: "2026-04-08T10:00:00.000Z",
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
        <OperaLogsPage api={api as never} />
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

describe("OperaLogsPage", () => {
  it("选中日志后在详情面板展示请求参数和结果", async () => {
    const api = createApi();

    await renderPage(api);
    await waitForCondition(() => {
      expect(document.querySelector('[data-opera-log-id="12"]')).toBeTruthy();
      expect(document.body.textContent).toContain("用户管理");
    });

    await act(async () => {
      document.querySelector('[data-opera-log-id="12"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForCondition(() => {
      expect(api.admin.getOperaLog).toHaveBeenCalledWith(12);
      expect(document.body.textContent).toContain("/api/v1/user/page");
      expect(document.body.textContent).toContain("{\"pageIndex\":1}");
      expect(document.body.textContent).toContain("{\"code\":200}");
    });
  });
});
