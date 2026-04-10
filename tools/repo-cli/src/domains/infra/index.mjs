import { composeBaseArgs, composeEnv, localServicePort } from "../runtime/context.mjs";
import { saveInfraProfile } from "../runtime/state.mjs";
import { commandExists, portOpen, runCommand, runCommandOrThrow } from "../../shared/process.mjs";

const GLOBAL_POSTGRES_FORMULAS = ["postgresql@17", "postgresql@16", "postgresql@15", "postgresql"];
const GLOBAL_REDIS_FORMULAS = ["redis"];

export async function startInfra(context) {
  const report = await inspectInfra(context);
  const active = pickActiveProvider(report);
  if (active === "docker" && report.docker.healthy) {
    persistInfraSelection(context, report.docker.profile);
    console.log(`开发基础设施已就绪，当前来源：docker (${formatPair(report.docker.profile)})`);
    return;
  }
  if (active === "global" && report.global.healthy) {
    persistInfraSelection(context, report.global.profile);
    console.log(`开发基础设施已就绪，当前来源：global (${formatPair(report.global.profile)})`);
    return;
  }

  if (report.global.startable) {
    await startGlobalInfra(context, report.global);
    return;
  }
  if (report.docker.startable) {
    await startDockerInfra(context);
    return;
  }

  throw new Error(buildStartHint(report));
}

export async function stopInfra(context) {
  const report = await inspectInfra(context);
  const active = pickActiveProvider(report, { allowInstalledFallback: false });
  if (active === "docker") {
    stopDockerInfra(context);
    console.log("已停止开发基础设施：docker");
    return;
  }
  if (active === "global") {
    if (!report.global.postgresFormula && !report.global.redisFormula) {
      console.log("检测到全局基础设施正在运行，但未识别到 brew 托管服务，请手动停止对应进程");
      return;
    }
    stopGlobalInfra(report.global);
    console.log("已停止开发基础设施：global");
    return;
  }
  console.log("开发基础设施当前未运行，无需停止");
}

export async function printInfraStatus(context) {
  const report = await inspectInfra(context);
  const active = pickActiveProvider(report, { allowInstalledFallback: false }) || "-";

  console.log(`当前来源: ${active}`);
  console.log(`${pad("来源", 10)} ${pad("已安装", 8)} ${pad("运行中", 8)} ${pad("健康", 8)} 说明`);
  console.log(formatStatusLine("docker", report.docker));
  console.log(formatStatusLine("global", report.global));
}

export async function inspectInfra(context) {
  const docker = await inspectDockerInfra(context);
  const global = await inspectGlobalInfra(context);
  return {
    preferredProvider: context.profile?.infra?.provider || "",
    docker,
    global,
  };
}

function pickActiveProvider(report, options = {}) {
  const order = uniqueProviders([report.preferredProvider, "docker", "global"]);
  for (const provider of order) {
    const current = report[provider];
    if (!current) {
      continue;
    }
    if (current.healthy || current.running) {
      return provider;
    }
  }
  if (options.allowInstalledFallback) {
    for (const provider of order) {
      const current = report[provider];
      if (current?.installed) {
        return provider;
      }
    }
  }
  return "";
}

async function inspectDockerInfra(context) {
  const postgresPort = localServicePort(context, "postgres");
  const redisPort = localServicePort(context, "redis");
  const dockerAvailable = commandExists("docker") && runCommand("docker", ["compose", "version"]).code === 0;
  let running = false;

  if (dockerAvailable) {
    const result = runCommand("docker", [...composeBaseArgs(context, true), "ps", "--status", "running", "--services"], {
      cwd: context.repoRoot,
      env: composeEnv(context),
    });
    const services = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    running = services.includes("postgres") || services.includes("redis");
  }

  const healthy = (await portOpen(postgresPort)) && (await portOpen(redisPort));
  return {
    installed: dockerAvailable,
    running: running || healthy,
    healthy,
    startable: dockerAvailable,
    summary: dockerAvailable ? `端口 ${postgresPort}/${redisPort}` : "未安装 docker compose",
    profile: {
      provider: "docker",
      postgres: { host: "127.0.0.1", port: postgresPort },
      redis: { host: "127.0.0.1", port: redisPort },
    },
  };
}

async function inspectGlobalInfra(context) {
  const preferred = context.profile?.infra?.provider === "global" ? context.profile.infra : null;
  const postgresPort = preferred?.postgres?.port || 5432;
  const redisPort = preferred?.redis?.port || 6379;
  const brewAvailable = commandExists("brew");
  const postgresFormula = brewAvailable ? firstInstalledFormula(GLOBAL_POSTGRES_FORMULAS) : "";
  const redisFormula = brewAvailable ? firstInstalledFormula(GLOBAL_REDIS_FORMULAS) : "";
  const serviceMap = brewAvailable ? readBrewServices() : new Map();
  const postgresRunning = postgresFormula ? isBrewServiceRunning(serviceMap.get(postgresFormula)) : false;
  const redisRunning = redisFormula ? isBrewServiceRunning(serviceMap.get(redisFormula)) : false;
  const healthy = (await checkPostgresHealth(postgresFormula, postgresPort)) && (await checkRedisHealth(redisFormula, redisPort));

  const missing = [];
  if (!brewAvailable) {
    missing.push("brew");
  }
  if (!postgresFormula) {
    missing.push("PostgreSQL");
  }
  if (!redisFormula) {
    missing.push("Redis");
  }

  return {
    installed: brewAvailable && Boolean(postgresFormula) && Boolean(redisFormula),
    running: postgresRunning || redisRunning || healthy,
    healthy,
    startable: brewAvailable && Boolean(postgresFormula) && Boolean(redisFormula),
    summary: missing.length > 0 ? `缺少 ${missing.join(" / ")}` : `端口 ${postgresPort}/${redisPort}`,
    postgresFormula,
    redisFormula,
    profile: {
      provider: "global",
      postgres: { host: "127.0.0.1", port: postgresPort },
      redis: { host: "127.0.0.1", port: redisPort },
    },
  };
}

async function startDockerInfra(context) {
  runCommandOrThrow("docker", [...composeBaseArgs(context, true), "up", "-d", "postgres", "redis"], {
    cwd: context.repoRoot,
    env: composeEnv(context),
    stdio: "inherit",
  });

  const report = await waitForHealthy(context, async () => {
    const current = await inspectDockerInfra(context);
    return current.healthy ? current : null;
  });
  if (!report) {
    throw new Error("docker 基础设施启动后未通过健康检查，请执行 pnpm repo:infra:status 查看详情");
  }

  persistInfraSelection(context, report.profile);
  console.log(`已启动开发基础设施：docker (${formatPair(report.profile)})`);
}

async function startGlobalInfra(context, report) {
  runCommandOrThrow("brew", ["services", "start", report.postgresFormula], {
    cwd: context.repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  runCommandOrThrow("brew", ["services", "start", report.redisFormula], {
    cwd: context.repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  const healthy = await waitForHealthy(context, async () => {
    const current = await inspectGlobalInfra(context);
    return current.healthy ? current : null;
  });
  if (!healthy) {
    throw new Error("global 基础设施启动后未通过健康检查，请执行 pnpm repo:infra:status 查看详情");
  }

  persistInfraSelection(context, healthy.profile);
  console.log(`已启动开发基础设施：global (${formatPair(healthy.profile)})`);
}

function stopDockerInfra(context) {
  runCommandOrThrow("docker", [...composeBaseArgs(context, true), "stop", "postgres", "redis"], {
    cwd: context.repoRoot,
    env: composeEnv(context),
    stdio: "inherit",
  });
}

function stopGlobalInfra(report) {
  if (report.postgresFormula) {
    runCommandOrThrow("brew", ["services", "stop", report.postgresFormula], {
      env: process.env,
      stdio: "inherit",
    });
  }
  if (report.redisFormula) {
    runCommandOrThrow("brew", ["services", "stop", report.redisFormula], {
      env: process.env,
      stdio: "inherit",
    });
  }
}

function persistInfraSelection(context, profile) {
  saveInfraProfile(context, {
    ...profile,
    updated_at: new Date().toISOString(),
  });
}

function firstInstalledFormula(formulas) {
  for (const formula of formulas) {
    const result = runCommand("brew", ["list", "--versions", formula]);
    if (result.code === 0 && result.stdout.trim() !== "") {
      return formula;
    }
  }
  return "";
}

function readBrewServices() {
  const result = runCommand("brew", ["services", "list"]);
  const services = new Map();
  if (result.code !== 0) {
    return services;
  }

  for (const line of result.stdout.split(/\r?\n/).slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const [name, status] = trimmed.split(/\s+/, 3);
    services.set(name, status || "");
  }
  return services;
}

function isBrewServiceRunning(status) {
  return Boolean(status && !["none", "stopped", "error", "unknown"].includes(status));
}

async function checkPostgresHealth(formula, port) {
  const checker = resolveBrewBinary("pg_isready", formula);
  if (checker) {
    const result = runCommand(checker, ["-h", "127.0.0.1", "-p", String(port)]);
    if (result.code === 0) {
      return true;
    }
  }
  return await portOpen(port);
}

async function checkRedisHealth(formula, port) {
  const checker = resolveBrewBinary("redis-cli", formula);
  if (checker) {
    const result = runCommand(checker, ["-h", "127.0.0.1", "-p", String(port), "ping"]);
    if (result.code === 0 && result.stdout.toUpperCase().includes("PONG")) {
      return true;
    }
  }
  return await portOpen(port);
}

function resolveBrewBinary(binary, formula) {
  if (commandExists(binary)) {
    return binary;
  }
  if (!formula || !commandExists("brew")) {
    return "";
  }
  const prefix = runCommand("brew", ["--prefix", formula]);
  if (prefix.code !== 0) {
    return "";
  }
  return `${prefix.stdout.trim()}/bin/${binary}`;
}

async function waitForHealthy(context, checker, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const report = await checker(context);
    if (report) {
      return report;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

function buildStartHint(report) {
  return [
    "未找到可启动的开发基础设施。",
    `global: ${report.global.summary}`,
    `docker: ${report.docker.summary}`,
  ].join("\n");
}

function formatStatusLine(name, report) {
  return `${pad(name, 10)} ${pad(toYesNo(report.installed), 8)} ${pad(toYesNo(report.running), 8)} ${pad(toYesNo(report.healthy), 8)} ${report.summary}`;
}

function formatPair(profile) {
  return `PG ${profile.postgres.host}:${profile.postgres.port}, Redis ${profile.redis.host}:${profile.redis.port}`;
}

function uniqueProviders(items) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function toYesNo(value) {
  return value ? "是" : "否";
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}
