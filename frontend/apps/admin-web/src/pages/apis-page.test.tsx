// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@go-admin/i18n";

import { adminMessages } from "../i18n/admin";
import { ApisPage } from "./apis-page";

let host: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
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
      listApis: vi.fn().mockResolvedValue({
        count: 1,
        list: [
          {
            id: 11,
            title: "用户列表",
            path: "/api/v1/sys-user",
            action: "GET",
            handle: "admin/user/list",
            type: "权限接口",
          },
        ],
      }),
      updateApi: vi.fn(),
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
      <I18nProvider initialLocale="zh-CN" messages={adminMessages}>
        <QueryClientProvider client={queryClient}>
          <ApisPage api={api as never} />
        </QueryClientProvider>
      </I18nProvider>,
    );
  });

  await flushPromises();
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
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
  consoleErrorSpy.mockRestore();
});

describe("ApisPage", () => {
  it("在未传 viewPresets 时仍能稳定渲染列表且不会触发最大更新深度错误", async () => {
    const api = createApi();

    await renderPage(api);

    await waitForCondition(() => {
      expect(api.admin.listApis).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain("接口管理");
      expect(document.body.textContent).toContain("用户列表");
      expect(document.body.textContent).toContain("/api/v1/sys-user");
    });

    const maxDepthErrors = consoleErrorSpy.mock.calls.filter(([message]) => typeof message === "string" && message.includes("Maximum update depth exceeded"));
    expect(maxDepthErrors).toHaveLength(0);
  });
});
