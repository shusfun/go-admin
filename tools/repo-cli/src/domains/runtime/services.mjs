import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { goEnv, localServicePort } from "./context.mjs";
import { resolveBackendCommand } from "./backend-dev.mjs";
import { loadState, nowRFC3339 } from "./state.mjs";
import { isProcessAlive, portListening, portOpen, portOwnerPid, startDetachedCommand, stopProcess, waitForPortClosed } from "../../shared/process.mjs";
import { formatCommand, printDivider, printField, printFields, printHint, printSection, toRepoRelative } from "../../shared/output.mjs";

const DEFAULT_SERVICE_START_TIMEOUT_MS = 15000;
const BACKEND_HOT_RELOAD_START_TIMEOUT_MS = 60000;
const SERVICE_START_PROGRESS_INTERVAL_MS = 1000;

export function allServices(context) {
  return [
    {
      name: "backend",
      label: "后端 API",
      kind: "local",
      port: localServicePort(context, "backend"),
      mode: "detached",
      command: (ctx) => resolveBackendCommand(ctx),
    },
    {
      name: "admin",
      label: "管理端",
      kind: "local",
      port: localServicePort(context, "admin"),
      mode: "detached",
      command: (ctx) => ({
        name: "pnpm",
        args: ["--filter", "@go-admin/admin-web", "dev"],
        cwd: ctx.repoRoot,
        env: process.env,
      }),
    },
    {
      name: "mobile",
      label: "移动端",
      kind: "local",
      port: localServicePort(context, "mobile"),
      mode: "detached",
      command: (ctx) => ({
        name: "pnpm",
        args: ["--filter", "@go-admin/mobile-h5", "dev"],
        cwd: ctx.repoRoot,
        env: process.env,
      }),
    },
    {
      name: "showcase",
      label: "UI Showcase",
      kind: "local",
      port: localServicePort(context, "showcase"),
      mode: "detached",
      command: (ctx) => ({
        name: "pnpm",
        args: ["--filter", "@go-admin/ui-showcase", "dev"],
        cwd: ctx.repoRoot,
        env: process.env,
      }),
    },
  ];
}

export function normalizeServiceList(context, names) {
  if (names.length === 0) {
    throw new Error("至少指定一个服务，可选值：backend, admin, mobile, showcase");
  }
  if (names.length === 1 && names[0] === "all") {
    return allServices(context);
  }

  const registry = new Map(allServices(context).map((service) => [service.name, service]));
  const result = [];
  const seen = new Set();

  for (const name of names) {
    const service = registry.get(name);
    if (!service) {
      throw new Error(`未知服务：${name}`);
    }
    if (seen.has(service.name)) {
      continue;
    }
    seen.add(service.name);
    result.push(service);
  }

  return result;
}

export async function reconcileState(context) {
  const state = loadState(context);
  const services = allServices(context);

  for (const service of services) {
    const current = state.services[service.name] ?? {
      name: service.name,
      status: "stopped",
      mode: service.mode,
      port: service.port,
      pid: 0,
      logPath: service.kind === "local" ? path.join(context.logsDir, `${service.name}.log`) : "",
    };
    current.name = service.name;
    current.port = service.port;
    current.mode = current.mode || service.mode;
    current.runner = current.runner || defaultRunner(service.name);

    const pidAlive = isProcessAlive(current.pid);
    const listeningPid = await portOwnerPid(service.port);
    const serving = (await portOpen(service.port)) || listeningPid > 0;
    if (serving) {
      current.status = "running";
      current.lastError = "";
      current.readyAt = current.readyAt || nowRFC3339();
      current.exitedAt = "";
      if (!pidAlive || current.pid <= 0) {
        current.pid = listeningPid;
      }
    } else if (pidAlive) {
      current.status = "starting";
      current.exitedAt = "";
    } else {
      if (current.status === "failed") {
        current.status = "failed";
      } else {
        current.status = "stopped";
        if (current.pid > 0) {
          current.exitedAt = nowRFC3339();
        }
        current.lastError = "";
      }
      current.pid = 0;
    }
    current.updatedAt = nowRFC3339();
    current.logPath = path.join(context.logsDir, `${service.name}.log`);
    current.runner = current.runner || defaultRunner(service.name);
    state.services[service.name] = current;
  }

  return state;
}

export async function startServices(context, services) {
  await ensureServicesStartable(context, services);

  const failures = [];
  for (const service of services.filter((item) => item.kind === "local")) {
    if (!service.command) {
      continue;
    }
    printSection(`启动 ${service.label}`);
    printField("阶段", "准备启动命令");
    const spec = service.command(context);
    const logPath = path.join(context.logsDir, `${service.name}.log`);
    resetServiceLog(logPath);
    printField("阶段", "启动后台进程");
    const pid = startDetachedCommand(spec.name, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      logPath,
    });

    const latest = loadState(context);
    latest.services[service.name] = {
      name: service.name,
      status: "starting",
      mode: spec.mode || service.mode,
      runner: spec.runner || defaultRunner(service.name),
      port: service.port,
      pid,
      logPath,
      command: formatCommand(spec.name, spec.args),
      note: spec.note || "",
      toolVersion: spec.toolVersion || "",
      toolScope: spec.toolScope || "",
      startedAt: nowRFC3339(),
      updatedAt: nowRFC3339(),
    };
    persistState(context, latest);

    const startTimeoutMs = resolveServiceStartTimeoutMs(service, spec);
    printFields([
      ["运行器", formatRunner(spec.runner || defaultRunner(service.name), spec.toolScope, spec.toolVersion)],
      ["说明", spec.note || ""],
      ["日志", toRepoRelative(context, logPath)],
      ["超时", `${Math.round(startTimeoutMs / 1000)}s`],
    ]);
    const progress = createServiceStartProgressReporter(context, service, logPath);
    progress(0);
    const ready = await waitForServiceReady(service, pid, startTimeoutMs, {
      onProgress(elapsedMs) {
        progress(elapsedMs);
      },
    });
    if (!ready.ok) {
      const pidStillAlive = isProcessAlive(pid);
      const listeningPid = await portOwnerPid(service.port);
      const failed = loadState(context);
      failed.services[service.name] = {
        ...(failed.services[service.name] ?? {}),
        name: service.name,
        status: "failed",
        mode: spec.mode || service.mode,
        runner: spec.runner || defaultRunner(service.name),
        port: service.port,
        pid: pidStillAlive ? pid : listeningPid,
        logPath,
        command: formatCommand(spec.name, spec.args),
        note: spec.note || "",
        toolVersion: spec.toolVersion || "",
        toolScope: spec.toolScope || "",
        updatedAt: nowRFC3339(),
        exitedAt: pidStillAlive ? "" : nowRFC3339(),
        lastError: ready.reason,
      };
      persistState(context, failed);

      printField("结果", "启动失败");
      printFields([
        ["原因", ready.reason],
        ["运行器", formatRunner(spec.runner || defaultRunner(service.name), spec.toolScope, spec.toolVersion)],
        ["说明", spec.note || ""],
        ["日志", toRepoRelative(context, logPath)],
        ["命令", formatCommand(spec.name, spec.args)],
        ["查看日志", `pnpm repo:service:logs ${service.name} --lines 50`],
      ]);
      const tail = tailServiceLog(context, service.name, 20).trim();
      if (tail && !tail.endsWith("暂无日志输出")) {
        printHint("最近日志:");
        console.log(tail);
      }
      printDivider();
      failures.push(`${service.name}: ${ready.reason}`);
      continue;
    }

    const success = loadState(context);
    success.services[service.name] = {
      ...(success.services[service.name] ?? {}),
      name: service.name,
      status: "running",
      mode: spec.mode || service.mode,
      runner: spec.runner || defaultRunner(service.name),
      port: service.port,
      pid: ready.pid || pid,
      logPath,
      command: formatCommand(spec.name, spec.args),
      note: spec.note || "",
      toolVersion: spec.toolVersion || "",
      toolScope: spec.toolScope || "",
      updatedAt: nowRFC3339(),
      readyAt: nowRFC3339(),
      lastError: "",
    };
    persistState(context, success);

    printField("结果", "运行中");
    printFields([
      ["地址", serviceAccessUrl(service)],
      ["PID", String(ready.pid || pid)],
      ["端口", String(service.port)],
      ["模式", displayMode(spec.mode || service.mode)],
      ["运行器", formatRunner(spec.runner || defaultRunner(service.name), spec.toolScope, spec.toolVersion)],
      ["说明", spec.note || ""],
      ["日志", toRepoRelative(context, logPath)],
      ["配置", service.name === "backend" ? toRepoRelative(context, context.configFile) : ""],
      ["查看状态", `pnpm repo:service:status ${service.name}`],
      ["查看日志", `pnpm repo:service:logs ${service.name} --lines 50`],
    ]);
    printDivider();
  }

  if (failures.length > 0) {
    throw new Error(`以下服务启动失败：${failures.join("; ")}`);
  }
}

export async function stopServices(context, services) {
  const state = await reconcileState(context);
  for (const service of services.filter((item) => item.kind === "local")) {
    printSection(`停止 ${service.label}`);
    const current = state.services[service.name];
    const pid = current?.pid || (await portOwnerPid(service.port));
    if (pid) {
      stopProcess(pid);
      await waitForPortClosed(service.port);
    }
    const latest = loadState(context);
    latest.services[service.name] = {
      ...(latest.services[service.name] ?? {
        name: service.name,
        mode: service.mode,
        runner: defaultRunner(service.name),
        port: service.port,
        logPath: path.join(context.logsDir, `${service.name}.log`),
      }),
      name: service.name,
      status: "stopped",
      mode: service.mode,
      runner: latest.services[service.name]?.runner || defaultRunner(service.name),
      port: service.port,
      pid: 0,
      logPath: path.join(context.logsDir, `${service.name}.log`),
      lastError: "",
      updatedAt: nowRFC3339(),
      exitedAt: nowRFC3339(),
    };
    persistState(context, latest);
    printField("结果", "已停止");
    printFields([
      ["端口", String(service.port)],
      ["日志", toRepoRelative(context, path.join(context.logsDir, `${service.name}.log`))],
    ]);
    printDivider();
  }
}

export async function restartServices(context, services) {
  printSection("重启服务");
  await stopServices(context, services);
  await startServices(context, services);
}

export async function printServicesStatus(context, services = null) {
  const state = await reconcileState(context);
  const selected = services ?? allServices(context);

  for (const service of selected) {
    const current = state.services[service.name] ?? {
      status: "stopped",
      pid: 0,
      mode: service.mode,
      runner: defaultRunner(service.name),
      port: service.port,
      logPath: path.join(context.logsDir, `${service.name}.log`),
      command: "",
      lastError: "",
      note: "",
      toolVersion: "",
      toolScope: "",
    };

    printSection(`${service.label} (${service.name})`);
    printFields([
      ["状态", displayStatus(current.status)],
      ["模式", displayMode(current.mode)],
      ["运行器", formatRunner(current.runner || defaultRunner(service.name), current.toolScope, current.toolVersion)],
      ["地址", serviceAccessUrl(service)],
      ["端口", String(service.port)],
      ["PID", current.pid > 0 ? String(current.pid) : "-"],
      ["命令", current.command || "-"],
      ["说明", current.note || ""],
      ["日志", toRepoRelative(context, current.logPath || path.join(context.logsDir, `${service.name}.log`))],
      ["配置", service.name === "backend" ? toRepoRelative(context, context.configFile) : ""],
      ["最近错误", current.lastError || ""],
      ["开始时间", current.startedAt || ""],
      ["就绪时间", current.readyAt || ""],
      ["退出时间", current.exitedAt || ""],
    ]);
    printHint(`查看日志: pnpm repo:service:logs ${service.name} --lines 50`);
    printDivider();
  }
}

export function printStatusTable(context, state) {
  console.log(`${pad("服务", 10)} ${pad("状态", 10)} ${pad("模式", 8)} ${pad("运行器", 14)} ${pad("端口", 6)} 日志`);
  for (const service of allServices(context)) {
    const current = state.services[service.name];
    const logPath = current?.logPath || (service.kind === "local" ? path.join(context.logsDir, `${service.name}.log`) : "");
    console.log(
      `${pad(service.name, 10)} ${pad(displayStatus(current?.status ?? "stopped"), 10)} ${pad(displayMode(current?.mode ?? service.mode), 8)} ${pad(statusRunner(current, service.name), 14)} ${pad(String(service.port), 6)} ${logPath}`,
    );
  }
}

export function tailServiceLog(context, serviceName, lines) {
  const logPath = path.join(context.logsDir, `${serviceName}.log`);
  if (!existsSync(logPath)) {
    return `${serviceName} 暂无日志输出`;
  }
  const content = requireText(logPath).replaceAll("\r\n", "\n");
  const chunks = content.split("\n");
  return chunks.slice(Math.max(0, chunks.length - lines)).join("\n");
}

async function waitForServiceReady(service, pid, timeoutMs = DEFAULT_SERVICE_START_TIMEOUT_MS, options = {}) {
  const deadline = Date.now() + timeoutMs;
  let nextProgressAt = Date.now();
  while (Date.now() < deadline) {
    const listeningPid = await portOwnerPid(service.port);
    if ((await portOpen(service.port)) || listeningPid > 0) {
      return { ok: true, pid: listeningPid || pid };
    }
    if (!isProcessAlive(pid)) {
      return { ok: false, reason: "进程已退出，端口未就绪" };
    }
    if (typeof options.onProgress === "function" && Date.now() >= nextProgressAt) {
      options.onProgress(timeoutMs - Math.max(0, deadline - Date.now()));
      nextProgressAt = Date.now() + SERVICE_START_PROGRESS_INTERVAL_MS;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { ok: false, reason: `等待端口 ${service.port} 就绪超时（${Math.round(timeoutMs / 1000)}s）` };
}

export function resolveServiceStartTimeoutMs(service, spec = {}) {
  if (service.name === "backend" && ((spec.runner || "") === "air" || (spec.mode || "") === "hot-reload")) {
    return BACKEND_HOT_RELOAD_START_TIMEOUT_MS;
  }
  return DEFAULT_SERVICE_START_TIMEOUT_MS;
}

export function extractLatestLogLineForProgress(content) {
  for (const rawLine of String(content || "").replaceAll("\r\n", "\n").split("\n").reverse()) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    return line;
  }
  return "";
}

export function summarizeServiceStartupProgress(service, latestLogLine) {
  const line = String(latestLogLine || "");
  if (!line) {
    return "进程已启动，等待端口就绪";
  }

  if (service.name === "backend") {
    if (line.includes("building...")) {
      return "正在编译后端";
    }
    if (line.includes("running...")) {
      return "编译完成，正在拉起后端进程";
    }
    if (line.includes("Setup Wizard Mode") || line.includes("Setup API running at:") || line.includes("entering Setup Wizard mode")) {
      return "已进入 Setup Wizard 模式";
    }
    if (line.includes("Startup database bootstrap enabled") || line.includes("Startup database bootstrap completed")) {
      return "正在执行启动迁移检查";
    }
    if (line.includes("Server run at:") || line.includes("swagger/admin/index.html")) {
      return "业务路由已加载，等待端口确认";
    }
  }

  if (line.includes("ready in") || line.includes("Local:")) {
    return "开发服务器已启动，等待端口确认";
  }
  return "进程已启动，等待端口就绪";
}

function createServiceStartProgressReporter(context, service, logPath) {
  let lastSnapshot = "";

  return (elapsedMs) => {
    const latestLogLine = extractLatestLogLineForProgress(readProgressLog(logPath));
    const stage = summarizeServiceStartupProgress(service, latestLogLine);
    const waitedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const snapshot = `${waitedSeconds}|${stage}|${latestLogLine}`;
    if (snapshot === lastSnapshot) {
      return;
    }
    lastSnapshot = snapshot;

    printField("进度", `已等待 ${waitedSeconds}s，${stage}`);
    if (latestLogLine) {
      printField("最近日志", truncateProgressLogLine(latestLogLine), "    ");
    }
  };
}

function readProgressLog(logPath) {
  if (!existsSync(logPath)) {
    return "";
  }
  return readFileSync(logPath, "utf8");
}

function truncateProgressLogLine(line) {
  const normalized = String(line || "").trim();
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 117)}...`;
}

function resetServiceLog(logPath) {
  writeFileSync(logPath, "", "utf8");
}

async function ensureServicesStartable(context, services) {
  const state = await reconcileState(context);
  for (const service of services.filter((item) => item.kind === "local")) {
    const currentPid = state.services[service.name]?.pid ?? 0;
    const listeningPid = await portOwnerPid(service.port);
    if ((await portListening(service.port)) || isProcessAlive(currentPid)) {
      const occupantPid = listeningPid || currentPid;
      throw new Error(occupantPid > 0 ? `${service.label} 端口 ${service.port} 已被占用（PID ${occupantPid}）` : `${service.label} 已在运行或启动中`);
    }
  }
}

function persistState(context, state) {
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  writeFileSync(context.statePath, payload, "utf8");
}

function requireText(filePath) {
  return readFileSync(filePath, "utf8");
}

function displayMode(mode) {
  if (mode === "hot-reload") {
    return "热更新";
  }
  if (mode === "detached") {
    return "后台";
  }
  return mode || "-";
}

function displayStatus(status) {
  switch (status) {
    case "running":
      return "运行中";
    case "starting":
      return "启动中";
    case "failed":
      return "失败";
    case "stopped":
      return "未启动";
    default:
      return "未知";
  }
}

function serviceAccessUrl(service) {
  if (!service.port) {
    return "";
  }
  return `http://127.0.0.1:${service.port}`;
}

function pad(value, width) {
  return value.padEnd(width, " ");
}

function statusRunner(current, serviceName) {
  return formatRunner(current?.runner || defaultRunner(serviceName), current?.toolScope || "", current?.toolVersion || "");
}

function defaultRunner(serviceName) {
  return serviceName === "backend" ? "go" : "pnpm";
}

function formatRunner(runner, scope, version) {
  const base = runner || "-";
  const scoped = scope === "project" ? `项目内 ${base}` : base;
  return version ? `${scoped} ${version}` : scoped;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
