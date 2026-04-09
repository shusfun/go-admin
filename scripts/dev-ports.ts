import fs from "node:fs";
import path from "node:path";

export type DevPorts = {
  DEV_BACKEND_PORT: number;
  DEV_ADMIN_PORT: number;
  DEV_SHOWCASE_PORT: number;
  DEV_MOBILE_PORT: number;
};

const defaultPorts: DevPorts = {
  DEV_BACKEND_PORT: 18123,
  DEV_ADMIN_PORT: 26173,
  DEV_SHOWCASE_PORT: 26175,
  DEV_MOBILE_PORT: 26174,
};

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const delimiterIndex = trimmed.indexOf("=");
  if (delimiterIndex < 0) {
    return null;
  }

  const key = trimmed.slice(0, delimiterIndex).trim();
  const value = trimmed.slice(delimiterIndex + 1).trim();
  return [key, value] as const;
}

export function readDevPorts(): DevPorts {
  const envPath = path.resolve("config/dev-ports.env");
  const ports: DevPorts = { ...defaultPorts };

  if (!fs.existsSync(envPath)) {
    return ports;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;
    if (!(key in ports)) {
      continue;
    }

    const port = Number(value);
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      ports[key as keyof DevPorts] = port;
    }
  }

  return ports;
}
