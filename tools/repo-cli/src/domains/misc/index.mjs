import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

import { printStatusTable, reconcileState, tailServiceLog } from "../runtime/services.mjs";
import { printInfraStatus, startInfra } from "../infra/index.mjs";
import { commandExists, runCommandOrThrow } from "../../shared/process.mjs";
import { composeBaseArgs, composeEnv, goEnv } from "../runtime/context.mjs";

export async function printEnv(context) {
  const lines = [
    ["仓库根目录", context.repoRoot],
    ["配置文件", context.configFile],
    ["项目名前缀", context.projectPrefix],
    ["后端端口", context.ports.DEV_BACKEND_PORT ?? 0],
    ["管理端端口", context.ports.DEV_ADMIN_PORT ?? 0],
    ["移动端端口", context.ports.DEV_MOBILE_PORT ?? 0],
    ["Showcase 端口", context.ports.DEV_SHOWCASE_PORT ?? 0],
    ["PostgreSQL 端口", context.ports.DEV_POSTGRES_PORT ?? 0],
    ["Redis 端口", context.ports.DEV_REDIS_PORT ?? 0],
    ["repo-cli 工作目录", context.runtimeDir],
    ["状态文件", context.statePath],
    ["日志目录", context.logsDir],
    ["前缀配置文件", context.profilePath],
    ["后端二进制", context.backendBinary],
  ];

  for (const [label, value] of lines) {
    console.log(`${label.padEnd(18, " ")} ${value}`);
  }
}

export function printSetupStatus(context) {
  if (existsSync(context.settingsFile) && existsSync(context.installLockFile)) {
    console.log("当前状态：已安装");
    return;
  }
  console.log("当前状态：未安装，将进入 Setup Wizard");
}

export async function printStatus(context) {
  const state = await reconcileState(context);
  printStatusTable(context, state);
  console.log("");
  await printInfraStatus(context);
}

export function printServiceLogs(context, serviceName, lines) {
  console.log(tailServiceLog(context, serviceName, lines));
}

export async function runOpenAPI(context) {
  mkdirSync(context.goBinDir, { recursive: true });
  const swagBinary = path.join(context.goBinDir, process.platform === "win32" ? "swag.exe" : "swag");
  if (!existsSync(swagBinary)) {
    runCommandOrThrow("go", ["install", "github.com/swaggo/swag/cmd/swag@v1.16.4"], {
      cwd: context.repoRoot,
      env: goEnv(context, { GOWORK: "off" }),
      stdio: "inherit",
    });
  }
  runCommandOrThrow(swagBinary, ["init", "-g", "main.go", "--parseDependency", "--parseDepth=6", "--instanceName", "admin", "-o", "./docs/admin"], {
    cwd: context.repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  runCommandOrThrow("node", ["./scripts/sync-openapi.mjs"], { cwd: context.repoRoot, env: process.env, stdio: "inherit" });
  runCommandOrThrow("pnpm", ["run", "openapi"], { cwd: context.repoRoot, env: process.env, stdio: "inherit" });
  runCommandOrThrow("pnpm", ["typecheck"], { cwd: context.repoRoot, env: process.env, stdio: "inherit" });
}

export function runMigrate(context) {
  runCommandOrThrow("go", ["run", ".", "migrate", "-c", toPosixPath(context.configFile)], {
    cwd: context.repoRoot,
    env: goEnv(context),
    stdio: "inherit",
  });
}

export async function runReinit(context, yes) {
  if (!yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error("非交互终端执行 reinit 必须显式传入 --yes");
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("⚠️ 将清理本地缓存、dist、安装锁、repo-cli 状态与产物，确认继续？[y/N]: ")).trim().toLowerCase();
    rl.close();
    if (answer !== "y" && answer !== "yes") {
      throw new Error("已取消 reinit");
    }
  }

  if (commandExists("docker")) {
    try {
      runCommandOrThrow("docker", [...composeBaseArgs(context, true), "down", "--volumes", "--remove-orphans"], {
        cwd: context.repoRoot,
        env: composeEnv(context),
        stdio: "inherit",
      });
    } catch (error) {
      console.error(`开发基础设施清理失败：${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      runCommandOrThrow("docker", [...composeBaseArgs(context, false), "down", "--volumes", "--remove-orphans"], {
        cwd: context.repoRoot,
        env: composeEnv(context),
        stdio: "inherit",
      });
    } catch (error) {
      console.error(`应用容器清理失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const targets = [
    path.join(context.repoRoot, ".tmp", "go"),
    path.join(context.repoRoot, ".tmp", "bin"),
    path.join(context.repoRoot, ".tmp", "docker"),
    context.runtimeDir,
    context.adminDistDir,
    context.mobileDistDir,
    context.showcaseDistDir,
    context.rootDistDir,
    context.backendBinary,
    context.installLockFile,
  ];
  for (const target of targets) {
    rmSync(target, { recursive: true, force: true });
  }
  console.log("环境重置完成");
}

export async function runSetup(context, withOpenAPI, skipInfra) {
  const doctor = await import("../doctor/index.mjs");
  const deps = await import("../deps/index.mjs");

  console.log("==> 环境检查");
  const report = doctor.doctorReport(context);
  const missing = [];
  const required = new Set(["go", "node", "pnpm"]);
  for (const item of report) {
    if (item.ok) {
      console.log(`  [OK] ${item.name.padEnd(15, " ")} ${item.output}`);
      continue;
    }
    console.log(`  [缺失] ${item.name}`);
    if (!required.has(item.name)) {
      continue;
    }
    missing.push(item.name);
  }
  if (missing.length > 0) {
    throw new Error(`初始化中止，缺少必需环境：${missing.join(", ")}`);
  }

  console.log("\n==> 安装依赖");
  deps.runDeps(context, "all");

  if (withOpenAPI) {
    console.log("\n==> 生成 OpenAPI");
    await runOpenAPI(context);
  }

  if (skipInfra) {
    console.log("\n==> 跳过基础设施启动");
  } else {
    console.log("\n==> 启动基础设施");
    await startInfra(context);
  }

  console.log("\n==> 安装状态");
  printSetupStatus(context);

  console.log("\n==> 完成");
  if (skipInfra) {
    console.log("  可继续执行：pnpm repo:infra:start");
  }
  console.log("  然后执行：pnpm repo:service:backend");
  console.log("  如需前端：pnpm repo:service:admin");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
