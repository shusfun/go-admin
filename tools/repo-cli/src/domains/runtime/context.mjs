import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadProfileData } from "./state.mjs";

export function createRepoContext(options) {
  const repoRoot = findRepoRoot(options.repoRoot);
  const packageName = readPackageName(path.join(repoRoot, "package.json"));
  const ports = loadPorts(path.join(repoRoot, "config", "dev-ports.env"));
  const runtimeDir = path.join(repoRoot, "temp", "repo-cli");
  const profilePath = path.join(runtimeDir, "profile.json");
  const configFile = path.resolve(repoRoot, options.configFile || "config/settings.pg.yml");
  const configDir = path.dirname(configFile);
  const profile = loadProfileData({ profilePath });
  const projectPrefix = normalizeProjectPrefix(options.projectPrefix || profile.project_prefix || packageName);
  const goTmpDir = path.join(repoRoot, ".tmp", "go");
  const goBinDir = path.join(repoRoot, ".tmp", "bin");
  const airBinary = path.join(goBinDir, executableName("air"));
  const airVersionFile = path.join(goBinDir, "air.version");

  ensureDir(runtimeDir);
  ensureDir(path.join(runtimeDir, "logs"));
  ensureDir(goTmpDir);
  ensureDir(goBinDir);

  return {
    repoRoot,
    configFile,
    configDir,
    projectPrefix,
    packageName,
    ports,
    profile,
    goCacheDir: path.join(goTmpDir, "cache"),
    goBinDir,
    airBinary,
    airVersionFile,
    airConfigFile: path.join(repoRoot, ".air.toml"),
    backendDevBinary: path.join(goBinDir, executableName("backend-dev")),
    runtimeDir,
    logsDir: path.join(runtimeDir, "logs"),
    statePath: path.join(runtimeDir, "state.json"),
    profilePath,
    dockerEnvFile: path.join(repoRoot, "config", "dev-ports.env"),
    dockerDevFile: path.join(repoRoot, "docker-compose.dev.yml"),
    dockerAppFile: path.join(repoRoot, "docker-compose.yml"),
    dockerPostgresDataDir: path.join(repoRoot, ".tmp", "docker", "postgres"),
    backendBinary: path.join(repoRoot, executableName(normalizeProjectPrefix(packageName))),
    backendRoot: repoRoot,
    adminDistDir: path.join(repoRoot, "frontend", "apps", "admin-web", "dist"),
    mobileDistDir: path.join(repoRoot, "frontend", "apps", "mobile-h5", "dist"),
    showcaseDistDir: path.join(repoRoot, "frontend", "apps", "ui-showcase", "dist"),
    rootDistDir: path.join(repoRoot, "dist"),
    installLockFile: path.join(configDir, ".installed"),
    settingsFile: configFile,
  };
}

export function goEnv(context, extra = {}) {
  return {
    ...process.env,
    GOCACHE: context.goCacheDir,
    GOBIN: context.goBinDir,
    GOPROXY: process.env.GOPROXY || "https://goproxy.cn,direct",
    ...extra,
  };
}

export function composeEnv(context) {
  const normalizedDB = context.projectPrefix.replaceAll("-", "_") || "go_admin";
  const devDB = `${normalizedDB}_dev`;
  return {
    ...process.env,
    DEV_POSTGRES_DB: devDB,
    DEV_POSTGRES_USER: devDB,
    DEV_POSTGRES_PASSWORD: devDB,
  };
}

export function composeBaseArgs(context, dev) {
  const args = ["compose", "--project-name", context.projectPrefix, "--env-file", context.dockerEnvFile];
  if (dev) {
    args.push("-f", context.dockerDevFile);
  }
  return args;
}

export function localServicePort(context, name) {
  switch (name) {
    case "backend":
      return context.ports.DEV_BACKEND_PORT ?? 0;
    case "admin":
      return context.ports.DEV_ADMIN_PORT ?? 0;
    case "mobile":
      return context.ports.DEV_MOBILE_PORT ?? 0;
    case "showcase":
      return context.ports.DEV_SHOWCASE_PORT ?? 0;
    case "postgres":
      return context.ports.DEV_POSTGRES_PORT ?? 0;
    case "redis":
      return context.ports.DEV_REDIS_PORT ?? 0;
    default:
      return 0;
  }
}

export function normalizeProjectPrefix(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  return normalized || "go-admin";
}

function findRepoRoot(explicit) {
  const candidates = [explicit, process.cwd(), path.dirname(process.argv[1] || process.cwd())].filter(Boolean);
  for (const candidate of candidates) {
    const repoRoot = walkRepoRoot(candidate);
    if (repoRoot) {
      return repoRoot;
    }
  }
  throw new Error("未找到仓库根目录，请在 go-admin 仓库内运行，或通过 --repo-root 指定");
}

function walkRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, "go.mod")) && existsSync(path.join(current, "config", "dev-ports.env"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function readPackageName(packagePath) {
  const payload = JSON.parse(readFileSync(packagePath, "utf8"));
  if (!payload.name) {
    throw new Error("package.json 缺少 name 字段");
  }
  return payload.name;
}

function loadPorts(portsPath) {
  const result = {};
  for (const rawLine of readFileSync(portsPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const [key, rawValue] = line.split("=", 2);
    const value = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(value)) {
      throw new Error(`解析端口失败 ${line}`);
    }
    result[key.trim()] = value;
  }
  return result;
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function executableName(base) {
  return process.platform === "win32" ? `${base}.exe` : base;
}
