import { describe, expect, it, vi } from "vitest";

import { waitForSetupCompletion } from "./setup-wizard-page";

describe("waitForSetupCompletion", () => {
  it("在服务恢复并返回 needs_setup=false 时结束轮询", async () => {
    const getStatus = vi
      .fn()
      .mockRejectedValueOnce(new Error("restarting"))
      .mockResolvedValueOnce({ needs_setup: true, step: "welcome" })
      .mockResolvedValueOnce({ needs_setup: false, step: "welcome" });

    const completed = await waitForSetupCompletion(getStatus, {
      maxAttempts: 5,
      delayMs: 0,
      sleepFn: async () => {},
    });

    expect(completed).toBe(true);
    expect(getStatus).toHaveBeenCalledTimes(3);
  });

  it("超出最大重试次数后返回 false", async () => {
    const getStatus = vi.fn().mockResolvedValue({ needs_setup: true, step: "welcome" });

    const completed = await waitForSetupCompletion(getStatus, {
      maxAttempts: 3,
      delayMs: 0,
      sleepFn: async () => {},
    });

    expect(completed).toBe(false);
    expect(getStatus).toHaveBeenCalledTimes(3);
  });
});
