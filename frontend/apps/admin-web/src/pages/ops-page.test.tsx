// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpsPage } from "./ops-page";

let host: HTMLDivElement;
let root: Root;

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(label));
}

function findInput() {
  return document.querySelector("input") as HTMLInputElement | null;
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function flushPromises(rounds = 6) {
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
  const environment = {
    actions: ["deploy_all"],
    confirmName: "prod-sh",
    domain: "https://prod.example.com",
    enabled: true,
    key: "prod-sh",
    lastDeploy: null,
    name: "上海生产",
    pendingCommits: {
      backend: {
        commits: [{ hash: "abc1234", message: "backend release" }],
        count: 1,
        recent: [{ hash: "abc1234", message: "backend release" }],
      },
      frontend: {
        commits: [{ hash: "def5678", message: "frontend release" }],
        count: 1,
        recent: [{ hash: "def5678", message: "frontend release" }],
      },
    },
    runningTask: null,
    status: "healthy",
  };

  const detail = {
    commits: {
      backend: [{ hash: "abc1234", message: "backend release" }],
      frontend: [{ hash: "def5678", message: "frontend release" }],
    },
    createdAt: "2026-04-08T10:00:00.000Z",
    env: "prod-sh",
    errMsg: "",
    finishedAt: "",
    id: 7,
    log: "started\n",
    startedAt: "2026-04-08T10:01:00.000Z",
    status: "running",
    step: 2,
    stepName: "构建镜像",
    suggestion: "",
    summary: "",
    totalSteps: 9,
    type: "deploy_all",
  };

  return {
    ops: {
      cancelTask: vi.fn(),
      connectTaskStream: vi.fn().mockImplementation((_taskId, handlers) => {
        handlers.onLog?.({ line: "done\n", offset: 12 });
        handlers.onDone?.({
          duration: "10s",
          domain: "https://prod.example.com",
          status: "success",
          summary: "代码更新完成",
        });
        return vi.fn();
      }),
      createTask: vi.fn().mockResolvedValue({ id: 7 }),
      getEnvironments: vi.fn().mockResolvedValue([environment]),
      getTask: vi.fn().mockResolvedValue(detail),
      getTasks: vi.fn().mockResolvedValue({
        count: 1,
        list: [
          {
            createdAt: "2026-04-08T10:00:00.000Z",
            env: "prod-sh",
            finishedAt: "",
            id: 7,
            startedAt: "2026-04-08T10:01:00.000Z",
            status: "running",
            type: "deploy_all",
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
        <OpsPage api={api as never} />
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

describe("OpsPage", () => {
  it("创建任务前要求输入环境标识确认", async () => {
    const api = createApi();

    await renderPage(api);
    await waitForCondition(() => {
      expect(findButton("全部更新")).toBeTruthy();
    });

    await clickButton("全部更新");
    await flushPromises();

    expect(document.body.textContent).toContain("请输入 prod-sh 确认");

    const input = findInput();
    expect(input).toBeTruthy();

    await act(async () => {
      if (!input) {
        return;
      }
      setNativeValue(input, "prod-sh");
    });

    await clickButton("确认更新");
    await flushPromises(8);

    expect(api.ops.createTask).toHaveBeenCalledWith({
      confirmName: "prod-sh",
      env: "prod-sh",
      type: "deploy_all",
    });
  });

  it("查看任务详情时通过日志与步骤组件展示实时状态更新", async () => {
    const api = createApi();

    await renderPage(api);
    await waitForCondition(() => {
      expect(findButton("查看日志")).toBeTruthy();
    });

    await clickButton("查看日志");
    await waitForCondition(() => {
      expect(api.ops.getTask).toHaveBeenCalledWith(7);
      expect(api.ops.connectTaskStream).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain("任务状态");
      expect(document.body.textContent).toContain("执行完成，耗时 10s");
      expect(document.body.textContent).toContain("done");
    });
  });
});
