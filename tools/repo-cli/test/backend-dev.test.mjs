import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { createRepoContext } from "../src/domains/runtime/context.mjs";
import { AIR_VERSION, resolveBackendCommand } from "../src/domains/runtime/backend-dev.mjs";
import { createFixtureRepo, removeFixtureRepo } from "./support/fixture-repo.mjs";

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

test("resolveBackendCommand prefers project air hot reload", () => {
  const repoRoot = createFixtureRepo("repo-cli-backend-air");

  try {
    const context = createRepoContext({ repoRoot });
    const command = resolveBackendCommand(context, {
      platform: "linux",
      ensureAirBinary() {
        return {
          binaryPath: context.airBinary,
          version: AIR_VERSION,
          installedNow: false,
        };
      },
    });

    assert.equal(command.name, context.airBinary);
    assert.deepEqual(command.args, ["-c", toPosixPath(context.airConfigFile), "--", "server", "-c", toPosixPath(context.configFile)]);
    assert.equal(command.mode, "hot-reload");
    assert.equal(command.runner, "air");
    assert.equal(command.toolScope, "project");
    assert.equal(command.toolVersion, AIR_VERSION);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveBackendCommand falls back to go run when air bootstrap fails", () => {
  const repoRoot = createFixtureRepo("repo-cli-backend-go");

  try {
    const context = createRepoContext({ repoRoot });
    const command = resolveBackendCommand(context, {
      platform: "linux",
      ensureAirBinary() {
        throw new Error("network unavailable");
      },
    });

    assert.equal(command.name, "go");
    assert.deepEqual(command.args, ["run", ".", "server", "-c", toPosixPath(context.configFile)]);
    assert.equal(command.mode, "detached");
    assert.equal(command.runner, "go");
    assert.match(command.note, /network unavailable/);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("resolveBackendCommand uses native Windows watcher to avoid PowerShell popups", () => {
  const repoRoot = createFixtureRepo("repo-cli-backend-win");

  try {
    const context = createRepoContext({ repoRoot });
    const command = resolveBackendCommand(context, {
      platform: "win32",
    });

    assert.equal(command.name, process.execPath);
    assert.deepEqual(command.args, [
      context.backendWatcherScript,
      "--repoRoot",
      context.repoRoot,
      "--configFile",
      context.configFile,
      "--backendBinary",
      context.backendDevBinary,
    ]);
    assert.equal(command.mode, "hot-reload");
    assert.equal(command.runner, "repo-cli");
    assert.equal(command.toolScope, "project");
    assert.match(command.note, /PowerShell/);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});
