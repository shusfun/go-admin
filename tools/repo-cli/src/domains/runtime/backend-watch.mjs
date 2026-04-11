import { watch } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const WATCH_DIRS = ["app", "cmd", "common", "config", "static"];
const WATCH_FILES = ["main.go", "go.mod", "go.sum"];
const WATCH_DELAY_MS = 300;
const BACKEND_STOP_TIMEOUT_MS = 10000;

const options = parseArgs(process.argv.slice(2));
const repoRoot = path.resolve(options.repoRoot || process.cwd());
const configFile = path.resolve(repoRoot, options.configFile || "config/settings.pg.yml");
const backendBinary = path.resolve(repoRoot, options.backendBinary || ".tmp/bin/backend-dev.exe");

let backendChild = null;
let hasSuccessfulBoot = false;
let backendReady = false;
let building = false;
let pendingReason = "";
let rebuildTimer = null;
let shuttingDown = false;
const closeWatchers = [];

if (process.platform !== "win32") {
  console.error("[repo-cli] backend-watch 仅用于 Windows。");
  process.exit(1);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  console.error("[repo-cli] backend watcher 崩溃：");
  console.error(error);
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[repo-cli] backend watcher 出现未处理的 Promise 拒绝：");
  console.error(reason);
  void shutdown("unhandledRejection", 1);
});

console.log(`[repo-cli] Windows backend watcher 已启动，配置文件：${toPosixPath(configFile)}`);
console.log(`[repo-cli] Windows backend watcher 将直接静默拉起 ${toPosixPath(backendBinary)}，不再通过 air 间接启动 PowerShell。`);

setupWatchers();
scheduleBuild("initial");

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

function setupWatchers() {
  for (const relativeDir of WATCH_DIRS) {
    const dirPath = path.join(repoRoot, relativeDir);
    const watcher = watch(dirPath, { recursive: true }, (_, filename) => {
      const changed = normalizeWatchedFilename(relativeDir, filename);
      if (!changed) {
        return;
      }
      scheduleBuild(`文件变更 ${changed}`);
    });
    watcher.on("error", (error) => {
      console.error(`[repo-cli] 监听目录失败 ${toPosixPath(dirPath)}: ${error instanceof Error ? error.message : String(error)}`);
    });
    closeWatchers.push(() => watcher.close());
  }

  for (const relativeFile of WATCH_FILES) {
    const filePath = path.join(repoRoot, relativeFile);
    const watcher = watch(filePath, () => {
      scheduleBuild(`文件变更 ${relativeFile}`);
    });
    watcher.on("error", (error) => {
      console.error(`[repo-cli] 监听文件失败 ${toPosixPath(filePath)}: ${error instanceof Error ? error.message : String(error)}`);
    });
    closeWatchers.push(() => watcher.close());
  }
}

function scheduleBuild(reason) {
  if (shuttingDown) {
    return;
  }
  pendingReason = reason;
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    const nextReason = pendingReason || "change";
    pendingReason = "";
    void runBuildCycle(nextReason);
  }, WATCH_DELAY_MS);
}

async function runBuildCycle(reason) {
  if (shuttingDown) {
    return;
  }
  if (building) {
    pendingReason = pendingReason || reason;
    return;
  }

  building = true;
  try {
    console.log(`[repo-cli] building... (${reason})`);
    const buildResult = await runGoBuild();
    if (!buildResult.ok) {
      console.error(`[repo-cli] 后端编译失败（exit ${buildResult.code}）`);
      if (!hasSuccessfulBoot) {
        process.exit(buildResult.code || 1);
      }
      return;
    }

    console.log("[repo-cli] running...");
    await restartBackend(reason);
  } finally {
    building = false;
    if (pendingReason) {
      scheduleBuild(pendingReason);
    }
  }
}

function runGoBuild() {
  return new Promise((resolve) => {
    const child = spawn("go", ["build", "-o", backendBinary, "."], {
      cwd: repoRoot,
      env: {
        ...process.env,
        GOWORK: "off",
      },
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", (error) => {
      console.error(`[repo-cli] 执行 go build 失败：${error instanceof Error ? error.message : String(error)}`);
      resolve({ ok: false, code: 1 });
    });
    child.once("exit", (code) => {
      resolve({ ok: code === 0, code: code ?? 1 });
    });
  });
}

async function restartBackend(reason) {
  await stopBackend(`rebuild: ${reason}`);
  backendReady = false;

  const child = spawn(backendBinary, ["server", "-c", toPosixPath(configFile)], {
    cwd: repoRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  backendChild = child;
  mirrorStream(child.stdout, process.stdout, handleBackendLogLine);
  mirrorStream(child.stderr, process.stderr, handleBackendLogLine);

  child.once("error", (error) => {
    console.error(`[repo-cli] backend-dev 启动失败：${error instanceof Error ? error.message : String(error)}`);
    if (!hasSuccessfulBoot && !shuttingDown) {
      process.exit(1);
    }
  });

  child.once("exit", (code, signal) => {
    if (backendChild === child) {
      backendChild = null;
    }
    const suffix = signal ? `signal=${signal}` : `code=${code ?? 0}`;
    console.log(`[repo-cli] backend-dev 已退出，${suffix}`);
    if (!backendReady && !hasSuccessfulBoot && !shuttingDown) {
      process.exit(code ?? 1);
    }
  });
}

function mirrorStream(stream, target, onLine) {
  if (!stream) {
    return;
  }
  let remainder = "";

  stream.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    target.write(text);

    const combined = remainder + text;
    const lines = combined.split(/\r?\n/);
    remainder = lines.pop() ?? "";
    for (const line of lines) {
      onLine(line);
    }
  });

  stream.on("end", () => {
    if (!remainder) {
      return;
    }
    onLine(remainder);
    remainder = "";
  });
}

function handleBackendLogLine(line) {
  if (isBackendReadyLine(line)) {
    backendReady = true;
    hasSuccessfulBoot = true;
  }
}

function isBackendReadyLine(line) {
  const content = String(line || "");
  return content.includes("Server run at:")
    || content.includes("Setup API running at:")
    || content.includes("entering Setup Wizard mode")
    || content.includes("swagger/admin/index.html");
}

async function stopBackend(reason) {
  const child = backendChild;
  if (!child || child.exitCode !== null) {
    backendChild = null;
    return;
  }

  console.log(`[repo-cli] stopping backend-dev (${reason})`);
  backendChild = null;

  child.kill();
  const exited = await waitForExit(child, BACKEND_STOP_TIMEOUT_MS);
  if (exited) {
    return;
  }

  console.warn(`[repo-cli] backend-dev 在 ${BACKEND_STOP_TIMEOUT_MS}ms 内未退出，改用 taskkill 强制结束`);
  spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
    cwd: repoRoot,
    env: process.env,
    stdio: "ignore",
    windowsHide: true,
  });
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      done(false);
    }, timeoutMs);

    const onExit = () => {
      clearTimeout(timer);
      done(true);
    };

    child.once("exit", onExit);
  });
}

async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
    rebuildTimer = null;
  }

  console.log(`[repo-cli] backend watcher 正在退出（${reason}）`);
  for (const closeWatcher of closeWatchers.splice(0)) {
    try {
      closeWatcher();
    } catch {
      // noop
    }
  }
  await stopBackend(reason);
  process.exit(exitCode);
}

function normalizeWatchedFilename(prefix, filename) {
  const raw = String(filename || "").replaceAll("\\", "/").trim();
  if (!raw) {
    return prefix;
  }
  return `${prefix}/${raw}`.replaceAll("//", "/");
}

function toPosixPath(filePath) {
  return String(filePath || "").replaceAll("\\", "/");
}
