import test from "node:test";
import assert from "node:assert/strict";

import { createRepoContext } from "../src/domains/runtime/context.mjs";
import {
  allServices,
  extractLatestLogLineForProgress,
  resolveStopPidCandidates,
  resolveServiceStartTimeoutMs,
  summarizeServiceStartupProgress,
} from "../src/domains/runtime/services.mjs";
import { createFixtureRepo, removeFixtureRepo } from "./support/fixture-repo.mjs";

test("resolveServiceStartTimeoutMs gives backend air enough cold-start time", () => {
  const repoRoot = createFixtureRepo("repo-cli-services-timeout");

  try {
    const context = createRepoContext({ repoRoot });
    const backend = allServices(context).find((service) => service.name === "backend");
    assert.ok(backend, "expected backend service definition");

    assert.equal(resolveServiceStartTimeoutMs(backend, { runner: "air", mode: "hot-reload" }), 120000);
    assert.equal(resolveServiceStartTimeoutMs(backend, { runner: "go", mode: "detached" }), 15000);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveServiceStartTimeoutMs keeps default timeout for frontend dev servers", () => {
  const repoRoot = createFixtureRepo("repo-cli-services-frontend-timeout");

  try {
    const context = createRepoContext({ repoRoot });
    const admin = allServices(context).find((service) => service.name === "admin");
    assert.ok(admin, "expected admin service definition");

    assert.equal(resolveServiceStartTimeoutMs(admin, { runner: "pnpm", mode: "detached" }), 15000);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("extractLatestLogLineForProgress returns the last non-empty line", () => {
  const line = extractLatestLogLineForProgress("\n[15:00:00] building...\n\n2026-04-10 Server run at:\n");
  assert.equal(line, "2026-04-10 Server run at:");
});

test("summarizeServiceStartupProgress recognizes backend build stages", () => {
  const repoRoot = createFixtureRepo("repo-cli-services-progress");

  try {
    const context = createRepoContext({ repoRoot });
    const backend = allServices(context).find((service) => service.name === "backend");
    assert.ok(backend, "expected backend service definition");

    assert.equal(summarizeServiceStartupProgress(backend, "[15:00:00] building..."), "正在编译后端");
    assert.equal(summarizeServiceStartupProgress(backend, "[15:00:10] running..."), "编译完成，正在拉起后端进程");
    assert.equal(summarizeServiceStartupProgress(backend, "2026-04-10 info System not configured, entering Setup Wizard mode..."), "已进入 Setup Wizard 模式");
    assert.equal(summarizeServiceStartupProgress(backend, "2026-04-10 Startup database bootstrap enabled, checking migrations..."), "正在执行启动迁移检查");
    assert.equal(summarizeServiceStartupProgress(backend, "Server run at:"), "业务路由已加载，等待端口确认");
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("summarizeServiceStartupProgress recognizes frontend ready logs", () => {
  const repoRoot = createFixtureRepo("repo-cli-services-progress-frontend");

  try {
    const context = createRepoContext({ repoRoot });
    const admin = allServices(context).find((service) => service.name === "admin");
    assert.ok(admin, "expected admin service definition");

    assert.equal(summarizeServiceStartupProgress(admin, "ready in 532ms"), "开发服务器已启动，等待端口确认");
    assert.equal(summarizeServiceStartupProgress(admin, ""), "进程已启动，等待端口就绪");
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveStopPidCandidates deduplicates state pid and port owner pid", () => {
  assert.deepEqual(resolveStopPidCandidates(28380, 2648, 28380, 0, -1), [28380, 2648]);
  assert.deepEqual(resolveStopPidCandidates(0, 0), []);
});
