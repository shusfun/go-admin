// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduleLogsPage } from "./schedule-logs-page";

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
    jobs: {
      getJobLog: vi.fn().mockResolvedValue({
        id: 21,
        jobName: "同步门店价格",
        jobGroup: "DEFAULT",
        jobType: 1,
        status: 2,
        durationMs: 220,
        entryId: 15,
        startTime: "2026-04-08T10:00:00.000Z",
        endTime: "2026-04-08T10:00:05.000Z",
        cronExpression: "0/30 * * * * *",
        invokeTarget: "http://internal/sync-price",
        message: "同步完成",
      }),
      listJobLogs: vi.fn().mockResolvedValue({
        count: 1,
        list: [
          {
            id: 21,
            jobName: "同步门店价格",
            jobGroup: "DEFAULT",
            jobType: 1,
            status: 2,
            durationMs: 220,
            startTime: "2026-04-08T10:00:00.000Z",
            endTime: "2026-04-08T10:00:05.000Z",
            invokeTarget: "http://internal/sync-price",
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
        <ScheduleLogsPage api={api as never} />
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

describe("ScheduleLogsPage", () => {
  it("选中日志后在详情面板展示完整消息", async () => {
    const api = createApi();

    await renderPage(api);
    await waitForCondition(() => {
      expect(document.querySelector('[data-schedule-log-id="21"]')).toBeTruthy();
      expect(document.body.textContent).toContain("同步门店价格");
    });

    await act(async () => {
      document.querySelector('[data-schedule-log-id="21"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForCondition(() => {
      expect(api.jobs.getJobLog).toHaveBeenCalledWith(21);
      expect(document.body.textContent).toContain("http://internal/sync-price");
      expect(document.body.textContent).toContain("同步完成");
      expect(document.body.textContent).toContain("详情区统一承接执行消息");
    });
  });
});
