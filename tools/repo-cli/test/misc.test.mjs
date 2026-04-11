import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { createRepoContext } from "../src/domains/runtime/context.mjs";
import {
  parseDatabaseSource,
  resetRunDatabaseResetActionForTest,
  resolveDatabaseResetPlan,
  runReinit,
  setRunDatabaseResetActionForTest,
} from "../src/domains/misc/index.mjs";
import { setProjectPrefix } from "../src/domains/project-prefix/index.mjs";
import { createFixtureRepo, removeFixtureRepo } from "./support/fixture-repo.mjs";

test("setProjectPrefix writes and resets local profile", () => {
  const repoRoot = createFixtureRepo("repo-cli-prefix");
  try {
    const context = createRepoContext({ repoRoot });

    setProjectPrefix(context, "demo-brand", false);
    assert.equal(readFileSync(context.profilePath, "utf8"), '{\n  "project_prefix": "demo-brand"\n}\n');

    setProjectPrefix(context, "", true);
    assert.equal(existsSync(context.profilePath), false);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("runReinit clears runtime artifacts in isolated repo", async () => {
  const repoRoot = createFixtureRepo("repo-cli-reinit");

  try {
    const context = createRepoContext({ repoRoot });
    let resetCalled = 0;
    setRunDatabaseResetActionForTest(async () => {
      resetCalled += 1;
    });
    const targets = [
      path.join(repoRoot, ".tmp", "go", "cache"),
      path.join(repoRoot, ".tmp", "bin"),
      path.join(repoRoot, ".tmp", "docker"),
      context.runtimeDir,
      context.adminDistDir,
      context.mobileDistDir,
      context.showcaseDistDir,
      context.rootDistDir,
      context.backendBinary,
      context.installLockFile,
    ];
    const fileTargets = new Set([context.backendBinary, context.installLockFile]);

    for (const target of targets) {
      mkdirSync(path.dirname(target), { recursive: true });
      if (fileTargets.has(target)) {
        writeFileSync(target, "fixture");
      } else {
        mkdirSync(target, { recursive: true });
        writeFileSync(path.join(target, ".marker"), "fixture");
      }
    }
    const readonlyGoFile = path.join(repoRoot, ".tmp", "go", "mod", "example.com", "pkg@v1.0.0", "fixture.go");
    mkdirSync(path.dirname(readonlyGoFile), { recursive: true });
    writeFileSync(readonlyGoFile, "package fixture\n");
    chmodSync(readonlyGoFile, 0o444);

    await runReinit(context, true);
    assert.equal(resetCalled, 1, "expected reinit to reset project database");

    for (const target of targets) {
      assert.equal(existsSync(target), false, `expected ${target} to be removed`);
    }
  } finally {
    resetRunDatabaseResetActionForTest();
    removeFixtureRepo(repoRoot);
  }
});

test("parseDatabaseSource parses postgres dsn fragments", () => {
  const parsed = parseDatabaseSource("host=127.0.0.1 port=5433 user=demo password=secret dbname=go_admin_dev sslmode=disable");
  assert.deepEqual(parsed, {
    dbname: "go_admin_dev",
    host: "127.0.0.1",
    password: "secret",
    port: 5433,
    sslmode: "disable",
    user: "demo",
  });
});

test("resolveDatabaseResetPlan prefers docker project data dir", () => {
  const repoRoot = createFixtureRepo("repo-cli-db-docker");
  try {
    const context = createRepoContext({ repoRoot });
    writeFileSync(context.profilePath, JSON.stringify({ infra: { provider: "docker" } }, null, 2));
    const nextContext = createRepoContext({ repoRoot });
    const plan = resolveDatabaseResetPlan(nextContext);
    assert.deepEqual(plan, {
      dataDir: nextContext.dockerPostgresDataDir,
      databaseName: "fixture_repo_dev",
      provider: "docker",
    });
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveDatabaseResetPlan infers docker from current project docker config", () => {
  const repoRoot = createFixtureRepo("repo-cli-db-docker-config");
  try {
    const context = createRepoContext({ repoRoot });
    writeFileSync(
      context.configFile,
      [
        "settings:",
        "  database:",
        "    driver: postgres",
        "    source: host=127.0.0.1 port=15432 user=fixture_repo_dev password=fixture_repo_dev dbname=fixture_repo_dev sslmode=disable",
        "",
      ].join("\n"),
    );
    const plan = resolveDatabaseResetPlan(context);
    assert.deepEqual(plan, {
      dataDir: context.dockerPostgresDataDir,
      databaseName: "fixture_repo_dev",
      provider: "docker",
    });
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveDatabaseResetPlan reads current global postgres config", () => {
  const repoRoot = createFixtureRepo("repo-cli-db-global");
  try {
    const context = createRepoContext({ repoRoot });
    writeFileSync(
      context.configFile,
      [
        "settings:",
        "  database:",
        "    driver: postgres",
        "    source: host=127.0.0.1 port=5432 user=demo password=secret dbname=fixture_repo_dev sslmode=disable",
        "",
      ].join("\n"),
    );
    const plan = resolveDatabaseResetPlan(context);
    assert.deepEqual(plan, {
      databaseName: "fixture_repo_dev",
      host: "127.0.0.1",
      password: "secret",
      port: 5432,
      provider: "global",
      user: "demo",
    });
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveDatabaseResetPlan rejects non-project dev database", () => {
  const repoRoot = createFixtureRepo("repo-cli-db-foreign");
  try {
    const context = createRepoContext({ repoRoot });
    writeFileSync(
      context.configFile,
      [
        "settings:",
        "  database:",
        "    driver: postgres",
        "    source: host=127.0.0.1 port=5432 user=demo password=secret dbname=other_project_dev sslmode=disable",
        "",
      ].join("\n"),
    );
    assert.throws(() => resolveDatabaseResetPlan(context), /仅允许重置当前项目开发库/);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveDatabaseResetPlan rejects system databases", () => {
  const repoRoot = createFixtureRepo("repo-cli-db-system");
  try {
    const context = createRepoContext({ repoRoot });
    writeFileSync(
      context.configFile,
      [
        "settings:",
        "  database:",
        "    driver: postgres",
        "    source: host=127.0.0.1 port=5432 user=demo password=secret dbname=postgres sslmode=disable",
        "",
      ].join("\n"),
    );
    assert.throws(() => resolveDatabaseResetPlan(context), /拒绝重置系统数据库/);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});
