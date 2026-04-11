import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

import { allServices, printStatusTable, reconcileState, stopServices, tailServiceLog } from "../runtime/services.mjs";
import { inspectProjectAir } from "../runtime/backend-dev.mjs";
import { printInfraStatus, startInfra } from "../infra/index.mjs";
import { commandExists, runCommand, runCommandOrThrow } from "../../shared/process.mjs";
import { composeBaseArgs, composeEnv, goEnv } from "../runtime/context.mjs";
import { printDivider, printField, printFields, printHint, printSection, toRepoRelative } from "../../shared/output.mjs";

export async function printEnv(context) {
  const air = inspectProjectAir(context);
  printSection("当前环境");
  printFields([
    ["仓库根目录", context.repoRoot],
    ["配置文件", toRepoRelative(context, context.configFile)],
    ["项目名前缀", context.projectPrefix],
    ["后端端口", String(context.ports.DEV_BACKEND_PORT ?? 0)],
    ["管理端端口", String(context.ports.DEV_ADMIN_PORT ?? 0)],
    ["移动端端口", String(context.ports.DEV_MOBILE_PORT ?? 0)],
    ["Showcase 端口", String(context.ports.DEV_SHOWCASE_PORT ?? 0)],
    ["PostgreSQL 端口", String(context.ports.DEV_POSTGRES_PORT ?? 0)],
    ["Redis 端口", String(context.ports.DEV_REDIS_PORT ?? 0)],
    ["repo-cli 工作目录", toRepoRelative(context, context.runtimeDir)],
    ["状态文件", toRepoRelative(context, context.statePath)],
    ["日志目录", toRepoRelative(context, context.logsDir)],
    ["前缀配置文件", toRepoRelative(context, context.profilePath)],
    ["后端二进制", toRepoRelative(context, context.backendBinary)],
    ["air 配置", toRepoRelative(context, context.airConfigFile)],
    ["air 二进制", toRepoRelative(context, context.airBinary)],
    ["air 状态", air.summary],
  ]);
  printDivider();
  printHint("推荐下一步:");
  printHint("pnpm repo:infra:status");
  printHint("pnpm repo:service:status backend");
}

export function printSetupStatus(context) {
  if (existsSync(context.settingsFile) && existsSync(context.installLockFile)) {
    console.log("当前状态：已安装");
    return;
  }
  console.log("当前状态：未安装，将进入 Setup Wizard");
}

export async function printStatus(context) {
  printSection("应用服务状态");
  const state = await reconcileState(context);
  printStatusTable(context, state);
  printDivider();
  await printInfraStatus(context);
}

export function printServiceLogs(context, serviceName, lines) {
  printSection(`服务日志 (${serviceName})`);
  printField("文件", toRepoRelative(context, path.join(context.logsDir, `${serviceName}.log`)));
  printField("行数", String(lines));
  printDivider();
  console.log(tailServiceLog(context, serviceName, lines));
}

export async function runOpenAPI(context) {
  printSection("生成 OpenAPI");
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
  printDivider();
  printField("结果", "OpenAPI 与前端类型已同步");
}

export function runMigrate(context) {
  printSection("执行数据库迁移");
  runCommandOrThrow("go", ["run", ".", "migrate", "-c", toPosixPath(context.configFile)], {
    cwd: context.repoRoot,
    env: goEnv(context),
    stdio: "inherit",
  });
  printDivider();
  printField("结果", "迁移完成");
}

export async function runDatabaseReset(context) {
  const plan = resolveDatabaseResetPlan(context);

  printSection("重置项目数据库");
  printField("来源", plan.provider);
  printField("目标库", plan.databaseName);
  if (plan.host) {
    printField("地址", `${plan.host}:${plan.port}`);
  }
  printDivider();

  const result = executeDatabaseReset(context, plan);

  printSection("数据库已重置");
  if (result.databaseMissing) {
    printField("结果", `目标库 ${plan.databaseName} 不存在，已视为无内容可清理`);
  } else {
    printField("结果", `已清空当前项目数据库 ${plan.databaseName}`);
  }
  printHint("如需重新初始化，请执行 pnpm repo:service:start backend 并重新走 Setup Wizard");
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

  await stopManagedServicesForReinit(context);
  cleanupActiveInfraForReinit(context);
  clearReinitTargets(context, targets);
  await runDatabaseResetAction(context);
  clearReinitTargets(context, [context.installLockFile]);

  printSection("环境重置");
  printField("结果", "已清理项目数据库、本地产物、安装锁与 repo-cli 状态");
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
  console.log("  然后执行：pnpm repo:service:start backend");
  console.log("  如需前端：pnpm repo:service:start admin");
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export let runDatabaseResetAction = runDatabaseReset;

export function setRunDatabaseResetActionForTest(handler) {
  runDatabaseResetAction = handler;
}

export function resetRunDatabaseResetActionForTest() {
  runDatabaseResetAction = runDatabaseReset;
}

export function resolveDatabaseResetPlan(context) {
  const provider = resolveActiveInfraProvider(context);
  if (provider === "docker") {
    return {
      provider: "docker",
      databaseName: composeEnv(context).DEV_POSTGRES_DB,
      dataDir: context.dockerPostgresDataDir,
    };
  }

  const settings = readSettingsFile(context);
  const database = parseDatabaseSource(settings.database.source);
  if (settings.database.driver !== "postgres") {
    throw new Error(`当前仅支持重置 PostgreSQL，实际驱动为 ${settings.database.driver || "(空)"}`);
  }
  assertResettableDatabaseName(context, database.dbname);

  return {
    provider: "global",
    databaseName: database.dbname,
    host: database.host || "127.0.0.1",
    port: database.port || 5432,
    user: database.user,
    password: database.password,
  };
}

export function parseDatabaseSource(source) {
  const result = {};
  for (const chunk of String(source || "").trim().split(/\s+/)) {
    const [key, ...rest] = chunk.split("=");
    if (!key || rest.length === 0) {
      continue;
    }
    result[key] = rest.join("=");
  }
  if (result.port) {
    const port = Number.parseInt(result.port, 10);
    result.port = Number.isFinite(port) ? port : 0;
  }
  return result;
}

function executeDatabaseReset(context, plan) {
  if (plan.provider === "docker") {
    resetDockerDatabase(context, plan);
    return { databaseMissing: false };
  }
  return resetGlobalPostgres(context, plan);
}

function resetDockerDatabase(context, plan) {
  if (commandExists("docker") && existsSync(context.dockerDevFile)) {
    try {
      runCommandOrThrow("docker", [...composeBaseArgs(context, true), "stop", "postgres"], {
        cwd: context.repoRoot,
        env: composeEnv(context),
        stdio: "inherit",
      });
    } catch (error) {
      console.error(`停止 docker postgres 失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  removeRepoPath(context, plan.dataDir);

  if (commandExists("docker") && existsSync(context.dockerDevFile)) {
    runCommandOrThrow("docker", [...composeBaseArgs(context, true), "up", "-d", "postgres"], {
      cwd: context.repoRoot,
      env: composeEnv(context),
      stdio: "inherit",
    });
  }
}

function resetGlobalPostgres(context, plan) {
  ensurePostgresCommand();
  const adminDatabase = "postgres";
  if (!postgresDatabaseExists(context, plan, adminDatabase)) {
    return { databaseMissing: true };
  }
  const terminateArgs = buildPsqlArgs(
    plan,
    adminDatabase,
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${escapeSQLString(plan.databaseName)}' AND pid <> pg_backend_pid();`,
  );
  const resetArgs = buildPsqlArgs(plan, plan.databaseName, buildProjectDatabaseResetSQL());

  runCommandOrThrow("psql", terminateArgs, {
    cwd: context.repoRoot,
    env: postgresEnv(plan),
    stdio: "inherit",
  });
  runCommandOrThrow("psql", resetArgs, {
    cwd: context.repoRoot,
    env: postgresEnv(plan),
    stdio: "inherit",
  });
  return { databaseMissing: false };
}

function postgresEnv(plan) {
  const env = { ...process.env };
  if (plan.password) {
    env.PGPASSWORD = plan.password;
  }
  return env;
}

function buildPsqlArgs(plan, databaseName, sql) {
  return [
    "-h", plan.host,
    "-p", String(plan.port),
    "-U", plan.user,
    "-d", databaseName,
    "-v", "ON_ERROR_STOP=1",
    "-c", sql,
  ];
}

function ensurePostgresCommand() {
  if (!commandExists("psql")) {
    throw new Error("未找到 psql，无法重置全局 PostgreSQL 数据库");
  }
}

function postgresDatabaseExists(context, plan, adminDatabase) {
  const existsArgs = buildPsqlArgs(
    plan,
    adminDatabase,
    `SELECT 1 FROM pg_database WHERE datname = '${escapeSQLString(plan.databaseName)}';`,
  );
  const result = runCommand("psql", existsArgs, {
    cwd: context.repoRoot,
    env: postgresEnv(plan),
  });
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || `检查数据库 ${plan.databaseName} 是否存在失败`);
  }
  return /\b1\b/.test(result.stdout);
}

function readSettingsFile(context) {
  if (!existsSync(context.configFile)) {
    throw new Error(`未找到配置文件 ${toRepoRelative(context, context.configFile)}，无法定位当前项目数据库`);
  }
  const content = readFileSync(context.configFile, "utf8");
  const driverMatch = content.match(/^\s*driver:\s*([^\s#]+)\s*$/m);
  const sourceMatch = content.match(/^\s*source:\s*(.+?)\s*$/m);
  return {
    database: {
      driver: driverMatch?.[1] ?? "",
      source: sourceMatch?.[1] ?? "",
    },
  };
}

function assertResettableDatabaseName(context, databaseName) {
  const normalized = String(databaseName || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("当前配置缺少数据库名称，无法执行重置");
  }
  if (["postgres", "template0", "template1"].includes(normalized)) {
    throw new Error(`拒绝重置系统数据库 ${databaseName}`);
  }

  const expectedDatabaseName = composeEnv(context).DEV_POSTGRES_DB.toLowerCase();
  if (normalized !== expectedDatabaseName) {
    throw new Error(`仅允许重置当前项目开发库 ${composeEnv(context).DEV_POSTGRES_DB}，实际为 ${databaseName}`);
  }
}

function normalizeInfraProvider(provider) {
  const normalized = String(provider || "").trim().toLowerCase();
  if (normalized === "docker" || normalized === "global") {
    return normalized;
  }
  return "";
}

function escapeSQLString(value) {
  return String(value || "").replaceAll("'", "''");
}

function resolveActiveInfraProvider(context) {
  if (isProjectDockerPostgresRunning(context)) {
    return "docker";
  }

  const explicit = normalizeInfraProvider(context.profile?.infra?.provider || "");
  if (explicit === "docker") {
    return "docker";
  }
  if (looksLikeDockerProjectDatabase(context)) {
    return "docker";
  }
  if (explicit === "global") {
    return "global";
  }
  return "";
}

function isProjectDockerPostgresRunning(context) {
  if (!existsSync(context.dockerDevFile) || !commandExists("docker")) {
    return false;
  }

  const composeVersion = runCommand("docker", ["compose", "version"], {
    cwd: context.repoRoot,
    env: composeEnv(context),
  });
  if (composeVersion.code !== 0) {
    return false;
  }

  const result = runCommand("docker", [...composeBaseArgs(context, true), "ps", "--status", "running", "--services"], {
    cwd: context.repoRoot,
    env: composeEnv(context),
  });
  if (result.code !== 0) {
    return false;
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .includes("postgres");
}

function looksLikeDockerProjectDatabase(context) {
  if (!existsSync(context.configFile)) {
    return false;
  }

  const settings = readSettingsFile(context);
  if (settings.database.driver !== "postgres") {
    return false;
  }

  const database = parseDatabaseSource(settings.database.source);
  const dockerEnv = composeEnv(context);
  const dockerPort = context.ports.DEV_POSTGRES_PORT ?? 0;
  const host = String(database.host || "").trim().toLowerCase();

  return (
    (host === "127.0.0.1" || host === "localhost") &&
    database.port === dockerPort &&
    database.dbname === dockerEnv.DEV_POSTGRES_DB &&
    database.user === dockerEnv.DEV_POSTGRES_USER &&
    database.password === dockerEnv.DEV_POSTGRES_PASSWORD
  );
}

function cleanupActiveInfraForReinit(context) {
  if (resolveActiveInfraProvider(context) !== "docker") {
    return;
  }
  if (!commandExists("docker")) {
    return;
  }

  if (existsSync(context.dockerDevFile)) {
    try {
      runCommandOrThrow("docker", [...composeBaseArgs(context, true), "down", "--volumes", "--remove-orphans"], {
        cwd: context.repoRoot,
        env: composeEnv(context),
        stdio: "inherit",
      });
    } catch (error) {
      console.error(`开发基础设施清理失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (existsSync(context.dockerAppFile)) {
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
}

function buildProjectDatabaseResetSQL() {
  return [
    "DO $$",
    "DECLARE item record;",
    "BEGIN",
    "  FOR item IN (SELECT schemaname, tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP",
    "    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', item.schemaname, item.tablename);",
    "  END LOOP;",
    "  FOR item IN (SELECT sequence_schema, sequence_name FROM information_schema.sequences WHERE sequence_schema = current_schema()) LOOP",
    "    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', item.sequence_schema, item.sequence_name);",
    "  END LOOP;",
    "  FOR item IN (SELECT table_schema, table_name FROM information_schema.views WHERE table_schema = current_schema()) LOOP",
    "    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', item.table_schema, item.table_name);",
    "  END LOOP;",
    "  FOR item IN (SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = current_schema()) LOOP",
    "    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', item.schemaname, item.matviewname);",
    "  END LOOP;",
    "END $$;",
  ].join(" ");
}

async function stopManagedServicesForReinit(context) {
  try {
    await stopServices(context, allServices(context));
  } catch (error) {
    console.error(`停止受管服务失败，将继续执行 reinit：${error instanceof Error ? error.message : String(error)}`);
  }
}

function clearReinitTargets(context, targets) {
  for (const target of targets) {
    removeRepoPath(context, target);
  }
}

function removeRepoPath(context, targetPath) {
  assertPathInsideRepo(context, targetPath);
  if (!existsSync(targetPath)) {
    return;
  }
  makePathWritableRecursive(targetPath);
  try {
    rmSync(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (tryReleaseExecutableLock(context, targetPath, error)) {
      makePathWritableRecursive(targetPath);
      rmSync(targetPath, { recursive: true, force: true });
      return;
    }
    throw error;
  }
}

function assertPathInsideRepo(context, targetPath) {
  const resolvedRoot = path.resolve(context.repoRoot);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`拒绝操作仓库外路径: ${targetPath}`);
  }
}

function makePathWritableRecursive(targetPath) {
  const stat = lstatSync(targetPath);
  if (stat.isSymbolicLink()) {
    return;
  }

  if (stat.isDirectory()) {
    for (const childName of readdirSync(targetPath)) {
      makePathWritableRecursive(path.join(targetPath, childName));
    }
    chmodSync(targetPath, stat.mode | 0o700);
    return;
  }

  chmodSync(targetPath, stat.mode | 0o600);
}

function tryReleaseExecutableLock(context, targetPath, error) {
  if (process.platform !== "win32") {
    return false;
  }
  if (!isExecutablePath(targetPath)) {
    return false;
  }
  const code = error?.code || "";
  if (code !== "EPERM" && code !== "EBUSY") {
    return false;
  }

  const processName = path.basename(targetPath);
  const escapedTarget = targetPath.replaceAll("'", "''");
  const script = [
    `$target='${escapedTarget}'`,
    `$matched=Get-CimInstance Win32_Process -Filter "name = '${processName}'" | Where-Object { $_.ExecutablePath -and [System.StringComparer]::OrdinalIgnoreCase.Equals($_.ExecutablePath, $target) }`,
    `if ($matched) { $matched | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }`,
  ].join("; ");
  const result = runCommand("powershell", ["-NoProfile", "-Command", script], {
    cwd: context.repoRoot,
    env: process.env,
  });

  return result.code === 0;
}

function isExecutablePath(targetPath) {
  const lower = String(targetPath || "").toLowerCase();
  return lower.endsWith(".exe") || lower.endsWith(".cmd") || lower.endsWith(".bat");
}
