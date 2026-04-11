// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetConfigPage } from "./set-config-page";

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
      getSetConfig: vi.fn().mockResolvedValue({
        sys_app_logo: "https://example.com/logo.png",
        sys_app_name: "测试管理台",
        sys_index_sideTheme: "theme-dark",
        sys_index_skinName: "skin-green",
        sys_user_initPassword: "123456",
      }),
      updateSetConfig: vi.fn(),
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
        <SetConfigPage api={api as never} />
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

describe("SetConfigPage", () => {
  it("将系统配置键映射为中文名称并展示当前值含义", async () => {
    const api = createApi();

    await renderPage(api);

    await waitForCondition(() => {
      expect(api.admin.getSetConfig).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain("系统 Logo");
      expect(document.body.textContent).toContain("系统名称");
      expect(document.body.textContent).toContain("侧栏主题");
      expect(document.body.textContent).toContain("皮肤样式");
      expect(document.body.textContent).toContain("初始密码");
      expect(document.body.textContent).toContain("配置键：sys_index_sideTheme");
      expect(document.body.textContent).toContain("当前值含义：深色主题（theme-dark）");
      expect(document.body.textContent).toContain("当前值含义：绿色皮肤（skin-green）");
    });
  });
});
