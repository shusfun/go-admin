import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runCommandOrThrow, isProcessAlive } from "../../shared/process.mjs";
import { printDivider, printField, printFields, printSection, toRepoRelative } from "../../shared/output.mjs";
import { nowRFC3339 } from "./state.mjs";

const FRONTEND_SERVICE_NAMES = new Set(["admin", "mobile", "showcase"]);
const LOCK_WAIT_TIMEOUT_MS = 60_000;
const LOCK_STALE_TIMEOUT_MS = 10 * 60_000;
const LOCK_POLL_INTERVAL_MS = 250;
const MAX_REPORTED_MISSING_LINKS = 5;
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

export function hasFrontendServices(services) {
  return services.some((service) => FRONTEND_SERVICE_NAMES.has(service.name));
}

export async function ensureFrontendWorkspaceReady(context, services) {
  if (!hasFrontendServices(services)) {
    return;
  }

  await withFrontendDepsLock(context, async () => {
    const inspection = inspectFrontendWorkspace(context);
    if (inspection.ready) {
      if (inspection.shouldPersistState) {
        writeFrontendDepsState(context, inspection);
      }
      return;
    }

    printSection("校验前端依赖");
    printField("范围", "frontend workspace");
    printFields(inspection.reasons.map((reason, index) => [`原因${index + 1}`, reason]));
    printField("执行", "pnpm install --frozen-lockfile --store-dir ./.pnpm-store");
    try {
      runCommandOrThrow("pnpm", ["install", "--frozen-lockfile", "--store-dir", "./.pnpm-store"], {
        cwd: context.repoRoot,
        env: process.env,
        stdio: "inherit",
      });
    } catch (error) {
      throw wrapFrontendDepsInstallError(error);
    }

    const nextInspection = inspectFrontendWorkspace(context);
    if (!nextInspection.ready) {
      throw new Error(`前端依赖同步后仍未通过校验：${nextInspection.reasons.join("；")}`);
    }

    writeFrontendDepsState(context, nextInspection);
    printFields([
      ["状态文件", toRepoRelative(context, frontendDepsStatePath(context))],
      ["结果", "前端依赖已同步"],
    ]);
    printDivider();
  });
}

export function inspectFrontendWorkspace(context) {
  const fingerprint = createFrontendWorkspaceFingerprint(context);
  const cache = readFrontendDepsState(context);
  const rootNodeModulesPath = path.join(context.repoRoot, "node_modules", ".pnpm");
  const missingLinks = collectMissingWorkspaceLinks(fingerprint.packages);
  const reasons = [];

  if (!existsSync(rootNodeModulesPath)) {
    reasons.push("根目录 node_modules/.pnpm 不存在");
  }
  if (cache?.fingerprint && cache.fingerprint !== fingerprint.value) {
    reasons.push("前端依赖清单已变更，需要重新同步 node_modules");
  }
  if (missingLinks.length > 0) {
    reasons.push(formatMissingLinksReason(missingLinks));
  }

  return {
    ready: reasons.length === 0,
    reasons,
    fingerprint: fingerprint.value,
    files: fingerprint.files,
    missingLinks,
    shouldPersistState: !cache || cache.fingerprint !== fingerprint.value,
  };
}

export function createFrontendWorkspaceFingerprint(context) {
  const files = collectFrontendFingerprintFiles(context);
  const hash = createHash("sha256");

  for (const filePath of files) {
    hash.update(toRepoRelative(context, filePath));
    hash.update("\n");
    hash.update(readFileSync(filePath, "utf8"));
    hash.update("\n");
  }

  return {
    value: hash.digest("hex"),
    files,
    packages: collectWorkspacePackages(context),
  };
}

export function frontendDepsStatePath(context) {
  return path.join(context.runtimeDir, "frontend-deps.json");
}

function frontendDepsLockPath(context) {
  return path.join(context.runtimeDir, "frontend-deps.lock");
}

function collectFrontendFingerprintFiles(context) {
  const files = [
    path.join(context.repoRoot, "package.json"),
    path.join(context.repoRoot, "pnpm-workspace.yaml"),
    path.join(context.repoRoot, "pnpm-lock.yaml"),
  ];

  files.push(...collectPackageManifestFiles(path.join(context.repoRoot, "frontend", "apps")));
  files.push(...collectPackageManifestFiles(path.join(context.repoRoot, "frontend", "packages")));

  return files.filter((filePath) => existsSync(filePath)).sort();
}

function collectPackageManifestFiles(baseDir) {
  if (!existsSync(baseDir)) {
    return [];
  }

  return readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name, "package.json"))
    .filter((filePath) => existsSync(filePath))
    .sort();
}

function collectWorkspacePackages(context) {
  const packageFiles = [
    ...collectPackageManifestFiles(path.join(context.repoRoot, "frontend", "apps")),
    ...collectPackageManifestFiles(path.join(context.repoRoot, "frontend", "packages")),
  ];
  const packages = [];

  for (const packageFile of packageFiles) {
    const payload = JSON.parse(readFileSync(packageFile, "utf8"));
    if (!payload.name) {
      continue;
    }
    packages.push({
      dir: path.dirname(packageFile),
      manifest: payload,
      name: payload.name,
    });
  }

  return packages.sort((left, right) => left.name.localeCompare(right.name));
}

function collectMissingWorkspaceLinks(packages) {
  const workspacePackages = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const missing = [];

  for (const pkg of packages) {
    for (const field of DEPENDENCY_FIELDS) {
      const deps = pkg.manifest[field];
      if (!deps || typeof deps !== "object") {
        continue;
      }

      for (const [dependencyName, versionRange] of Object.entries(deps)) {
        if (!String(versionRange).startsWith("workspace:")) {
          continue;
        }
        if (!workspacePackages.has(dependencyName)) {
          continue;
        }

        const dependencyPath = resolvePackageNodeModulesPath(pkg.dir, dependencyName);
        if (existsSync(dependencyPath)) {
          continue;
        }

        missing.push({
          consumer: pkg.name,
          dependency: dependencyName,
          field,
          expectedPath: dependencyPath,
        });
      }
    }
  }

  return missing;
}

function resolvePackageNodeModulesPath(packageDir, dependencyName) {
  if (dependencyName.startsWith("@")) {
    const [scope, name] = dependencyName.split("/", 2);
    return path.join(packageDir, "node_modules", scope, name);
  }
  return path.join(packageDir, "node_modules", dependencyName);
}

function formatMissingLinksReason(missingLinks) {
  const samples = missingLinks
    .slice(0, MAX_REPORTED_MISSING_LINKS)
    .map((item) => `${item.consumer} -> ${item.dependency}`)
    .join("，");
  const suffix = missingLinks.length > MAX_REPORTED_MISSING_LINKS ? ` 等 ${missingLinks.length} 项` : "";
  return `检测到缺失的 workspace 依赖链接：${samples}${suffix}`;
}

function readFrontendDepsState(context) {
  const statePath = frontendDepsStatePath(context);
  if (!existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}

function writeFrontendDepsState(context, inspection) {
  const statePath = frontendDepsStatePath(context);
  ensureDir(path.dirname(statePath));
  writeFileSync(
    statePath,
    `${JSON.stringify({ fingerprint: inspection.fingerprint, files: inspection.files.map((filePath) => toRepoRelative(context, filePath)), updatedAt: nowRFC3339() }, null, 2)}\n`,
    "utf8",
  );
}

function wrapFrontendDepsInstallError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ERR_PNPM_OUTDATED_LOCKFILE")) {
    throw new Error(
      [
        "检测到 pnpm-lock.yaml 未同步，已阻止自动启动前端服务。",
        "请先执行 `pnpm repo:deps frontend` 或 `pnpm install --no-frozen-lockfile --store-dir ./.pnpm-store` 更新锁文件。",
        "锁文件更新完成后，再重新执行 `pnpm repo:service:start admin`。",
      ].join(" "),
    );
  }
  throw error;
}

async function withFrontendDepsLock(context, task) {
  const lockPath = frontendDepsLockPath(context);
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;

  while (true) {
    try {
      ensureDir(path.dirname(lockPath));
      writeFileSync(lockPath, `${JSON.stringify({ pid: process.pid, createdAt: Date.now() })}\n`, { encoding: "utf8", flag: "wx" });
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      if (tryClearStaleFrontendDepsLock(lockPath)) {
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error("等待前端依赖校验锁超时，请稍后重试");
      }
      await sleep(LOCK_POLL_INTERVAL_MS);
    }
  }

  try {
    return await task();
  } finally {
    rmSync(lockPath, { force: true });
  }
}

function tryClearStaleFrontendDepsLock(lockPath) {
  if (!existsSync(lockPath)) {
    return true;
  }

  try {
    const payload = JSON.parse(readFileSync(lockPath, "utf8"));
    const createdAt = Number(payload.createdAt ?? 0);
    const pid = Number(payload.pid ?? 0);
    const age = Date.now() - createdAt;
    if (pid > 0 && isProcessAlive(pid) && age < LOCK_STALE_TIMEOUT_MS) {
      return false;
    }
    unlinkSync(lockPath);
    return true;
  } catch {
    const lockStat = statSync(lockPath);
    if (Date.now() - lockStat.mtimeMs < LOCK_STALE_TIMEOUT_MS) {
      return false;
    }
    unlinkSync(lockPath);
    return true;
  }
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function sleep(timeoutMs) {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}
