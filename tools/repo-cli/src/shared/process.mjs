import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { closeSync, openSync } from "node:fs";

export function runCommand(command, args, options = {}) {
  const normalizedCommand = normalizeCommand(command);
  const result = spawnSync(normalizedCommand, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    stdio: options.stdio === "inherit" ? "inherit" : "pipe",
    windowsHide: true,
    shell: shouldUseShell(normalizedCommand),
  });

  if (result.error) {
    throw result.error;
  }

  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function runCommandOrThrow(command, args, options = {}) {
  const result = runCommand(command, args, options);
  if (result.code !== 0) {
    const err = new Error(result.stderr.trim() || `${command} ${args.join(" ")} 失败`);
    err.exitCode = result.code;
    throw err;
  }
  return result;
}

export function commandExists(command) {
  const lookup = process.platform === "win32" ? "where" : "which";
  const result = runCommand(lookup, [command]);
  return result.code === 0;
}

export function startDetachedCommand(
  command,
  args,
  options,
) {
  const outFd = openSync(options.logPath, "a");
  const errFd = openSync(options.logPath, "a");

  try {
    const normalizedCommand = normalizeCommand(command);
    const child = spawn(normalizedCommand, args, {
      cwd: options.cwd,
      env: options.env,
      detached: true,
      stdio: ["ignore", outFd, errFd],
      windowsHide: true,
      shell: shouldUseShell(normalizedCommand),
    });
    child.unref();
    return child.pid ?? 0;
  } finally {
    closeSync(outFd);
    closeSync(errFd);
  }
}

export function stopProcess(pid) {
  if (pid <= 0) {
    return;
  }
  if (process.platform === "win32") {
    runCommand("taskkill", ["/PID", String(pid), "/T", "/F"]);
    return;
  }
  runCommand("kill", ["-TERM", `-${pid}`]);
}

export function isProcessAlive(pid) {
  if (pid <= 0) {
    return false;
  }
  if (process.platform === "win32") {
    const result = runCommand("tasklist", ["/FI", `PID eq ${pid}`, "/NH"]);
    if (result.code !== 0) {
      return false;
    }
    return parseWindowsTasklistAlive(result.stdout, pid);
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function normalizeCommand(command) {
  if (process.platform !== "win32") {
    return command;
  }
  if (/\.[A-Za-z0-9]+$/.test(command)) {
    return command;
  }
  if (["pnpm", "npm", "npx"].includes(command)) {
    return `${command}.cmd`;
  }
  return command;
}

function shouldUseShell(command) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
}

export async function portOpen(port) {
  if (!port) {
    return false;
  }
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(400);
    socket.once("connect", () => {
      cleanup();
      resolve(true);
    });
    socket.once("timeout", () => {
      cleanup();
      resolve(false);
    });
    socket.once("error", () => {
      cleanup();
      resolve(false);
    });

    socket.connect(port, "127.0.0.1");
  });
}

export async function portListening(port) {
  if (!port) {
    return false;
  }
  if (await portOpen(port)) {
    return true;
  }
  return (await portOwnerPid(port)) > 0;
}

export async function portOwnerPid(port) {
  if (!port) {
    return 0;
  }

  if (process.platform === "win32") {
    const result = runCommand("netstat", ["-ano", "-p", "tcp", "-n"]);
    if (result.code !== 0) {
      return 0;
    }
    return parseWindowsNetstatPid(result.stdout, port);
  }

  const lsof = runCommand("lsof", ["-tiTCP:" + String(port), "-sTCP:LISTEN"]);
  if (lsof.code === 0) {
    return parsePid(lsof.stdout);
  }
  if (process.platform === "darwin") {
    return 0;
  }

  let ss;
  try {
    ss = runCommand("ss", ["-ltnp", `sport = :${port}`]);
  } catch {
    return 0;
  }
  if (ss.code !== 0) {
    return 0;
  }
  const match = ss.stdout.match(/pid=(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export async function waitForPortClosed(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await portListening(port))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return !(await portListening(port));
}

function parsePid(output) {
  const match = output.trim().match(/^(\d+)/m);
  if (!match) {
    return 0;
  }
  const pid = Number.parseInt(match[1], 10);
  return Number.isFinite(pid) ? pid : 0;
}

export function parseWindowsNetstatPid(output, port) {
  const suffix = `:${port}`;
  for (const rawLine of String(output || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 5 || parts[0].toUpperCase() !== "TCP") {
      continue;
    }
    const [_, localAddress, foreignAddress, __, pidText] = parts;
    if (!localAddress.endsWith(suffix) || !hasZeroPort(foreignAddress)) {
      continue;
    }
    const pid = Number.parseInt(pidText, 10);
    if (Number.isFinite(pid)) {
      return pid;
    }
  }
  return 0;
}

function hasZeroPort(address) {
  return /:0$/.test(address);
}

export function parseWindowsTasklistAlive(output, pid) {
  const expectedPid = Number.parseInt(String(pid), 10);
  if (!Number.isFinite(expectedPid) || expectedPid <= 0) {
    return false;
  }

  for (const rawLine of String(output || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 2) {
      continue;
    }
    const currentPid = Number.parseInt(parts[1], 10);
    if (currentPid === expectedPid) {
      return true;
    }
  }

  return false;
}
