import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { goEnv, localServicePort } from "./context.mjs";
import { loadState, nowRFC3339 } from "./state.mjs";
import { isProcessAlive, portOpen, portOwnerPid, startDetachedCommand, stopProcess, waitForPortClosed } from "../../shared/process.mjs";

export function allServices(context) {
  return [
    {
      name: "backend",
      label: "后端 API",
      kind: "local",
      port: localServicePort(context, "backend"),
      mode: "detached",
      command: (ctx) => ({
        name: "go",
        args: ["run", ".", "server", "-c", toPosixPath(ctx.configFile)],
        cwd: ctx.backendRoot,
        env: goEnv(ctx),
      }),
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
    current.mode = service.mode;

    const pidAlive = isProcessAlive(current.pid);
    const serving = await portOpen(service.port);
    if (serving) {
      current.status = "running";
    } else if (pidAlive) {
      current.status = "starting";
    } else {
      current.status = "stopped";
      if (current.pid > 0) {
        current.exitedAt = nowRFC3339();
      }
      current.pid = 0;
    }
    current.updatedAt = nowRFC3339();
    current.logPath = path.join(context.logsDir, `${service.name}.log`);
    state.services[service.name] = current;
  }

  return state;
}

export async function startServices(context, services) {
  await ensureServicesStartable(context, services);

  for (const service of services.filter((item) => item.kind === "local")) {
    if (!service.command) {
      continue;
    }
    const spec = service.command(context);
    const logPath = path.join(context.logsDir, `${service.name}.log`);
    const pid = startDetachedCommand(spec.name, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      logPath,
    });

    const latest = loadState(context);
    latest.services[service.name] = {
      name: service.name,
      status: "starting",
      mode: service.mode,
      port: service.port,
      pid,
      logPath,
      startedAt: nowRFC3339(),
      updatedAt: nowRFC3339(),
    };
    persistState(context, latest);
    console.log(`已发起启动：${service.label}`);
  }
}

export async function stopServices(context, services) {
  const state = await reconcileState(context);
  for (const service of services.filter((item) => item.kind === "local")) {
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
        port: service.port,
        logPath: path.join(context.logsDir, `${service.name}.log`),
      }),
      name: service.name,
      status: "stopped",
      mode: service.mode,
      port: service.port,
      pid: 0,
      logPath: path.join(context.logsDir, `${service.name}.log`),
      updatedAt: nowRFC3339(),
      exitedAt: nowRFC3339(),
    };
    persistState(context, latest);
    console.log(`已停止：${service.label}`);
  }
}

export async function restartServices(context, services) {
  await stopServices(context, services);
  await startServices(context, services);
}

export function printStatusTable(context, state) {
  console.log(`${pad("服务", 10)} ${pad("状态", 10)} ${pad("模式", 10)} ${pad("端口", 6)} 日志`);
  for (const service of allServices(context)) {
    const current = state.services[service.name];
    const logPath = current?.logPath || (service.kind === "local" ? path.join(context.logsDir, `${service.name}.log`) : "");
    console.log(
      `${pad(service.name, 10)} ${pad(displayStatus(current?.status ?? "stopped"), 10)} ${pad(displayMode(current?.mode ?? service.mode), 10)} ${pad(String(service.port), 6)} ${logPath}`,
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

async function ensureServicesStartable(context, services) {
  const state = await reconcileState(context);
  for (const service of services.filter((item) => item.kind === "local")) {
    if ((await portOpen(service.port)) || isProcessAlive(state.services[service.name]?.pid ?? 0)) {
      throw new Error(`${service.label} 已在运行或启动中`);
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

function pad(value, width) {
  return value.padEnd(width, " ");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
