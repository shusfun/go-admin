import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { goEnv } from "./context.mjs";
import { runCommandOrThrow } from "../../shared/process.mjs";

export const AIR_MODULE = "github.com/air-verse/air";
export const AIR_VERSION = "v1.65.0";

export function resolveBackendCommand(context, options = {}) {
  const ensureAir = options.ensureAirBinary ?? ensureAirBinary;
  const platform = options.platform ?? process.platform;

  if (platform === "win32") {
    return {
      name: process.execPath,
      args: [
        context.backendWatcherScript,
        "--repoRoot",
        context.repoRoot,
        "--configFile",
        context.configFile,
        "--backendBinary",
        context.backendDevBinary,
      ],
      cwd: context.backendRoot,
      env: goEnv(context, { GOWORK: "off" }),
      mode: "hot-reload",
      runner: "repo-cli",
      toolVersion: "",
      toolScope: "project",
      note: "Windows 下使用 repo-cli 原生热更新，直接静默拉起 backend-dev.exe，避免 air 重启时弹出 PowerShell。",
    };
  }

  try {
    const air = ensureAir(context);
    return {
      name: air.binaryPath,
      args: ["-c", toPosixPath(context.airConfigFile), "--", "server", "-c", toPosixPath(context.configFile)],
      cwd: context.backendRoot,
      env: goEnv(context, { GOWORK: "off" }),
      mode: "hot-reload",
      runner: "air",
      toolVersion: air.version,
      toolScope: "project",
      note: air.installedNow ? `已准备项目内 air ${air.version}` : `使用项目内 air ${air.version}`,
    };
  } catch (error) {
    return {
      name: "go",
      args: ["run", ".", "server", "-c", toPosixPath(context.configFile)],
      cwd: context.backendRoot,
      env: goEnv(context),
      mode: "detached",
      runner: "go",
      toolVersion: "",
      toolScope: "",
      note: `项目内 air 准备失败，已回退到 go run：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function inspectProjectAir(context) {
  const binaryReady = existsSync(context.airBinary);
  const recordedVersion = readTrimmed(context.airVersionFile);
  const versionMatch = binaryReady && recordedVersion === AIR_VERSION;

  return {
    binaryPath: context.airBinary,
    versionFile: context.airVersionFile,
    desiredVersion: AIR_VERSION,
    recordedVersion,
    ready: versionMatch,
    summary: versionMatch
      ? `已准备 ${AIR_VERSION}（项目内）`
      : binaryReady
        ? `检测到旧 air${recordedVersion ? `（${recordedVersion}）` : ""}，启动 backend 时会升级到 ${AIR_VERSION}`
        : `未准备，首次启动 backend 时会安装 ${AIR_VERSION}`,
  };
}

export function ensureAirBinary(context) {
  mkdirSync(context.goBinDir, { recursive: true });

  const current = inspectProjectAir(context);
  if (current.ready) {
    return {
      binaryPath: context.airBinary,
      version: AIR_VERSION,
      installedNow: false,
    };
  }

  runCommandOrThrow("go", ["install", `${AIR_MODULE}@${AIR_VERSION}`], {
    cwd: context.repoRoot,
    env: goEnv(context, { GOWORK: "off" }),
    stdio: "inherit",
  });

  if (!existsSync(context.airBinary)) {
    throw new Error(`go install 已执行，但未生成 ${path.basename(context.airBinary)}`);
  }

  writeFileSync(context.airVersionFile, `${AIR_VERSION}\n`, "utf8");
  return {
    binaryPath: context.airBinary,
    version: AIR_VERSION,
    installedNow: true,
  };
}

function readTrimmed(filePath) {
  if (!existsSync(filePath)) {
    return "";
  }
  return readFileSync(filePath, "utf8").trim();
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}
