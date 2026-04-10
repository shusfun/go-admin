import { runCommand } from "../../shared/process.mjs";

export function doctorReport(_context) {
  const items = [
    { name: "go", command: "go", args: ["version"] },
    { name: "node", command: "node", args: ["--version"] },
    { name: "pnpm", command: "pnpm", args: ["--version"] },
    { name: "brew", command: "brew", args: ["--version"] },
    { name: "docker", command: "docker", args: ["--version"] },
    { name: "docker compose", command: "docker", args: ["compose", "version"] },
  ];
  return items.map((item) => {
    const result = runCommand(item.command, item.args);
    const output = `${result.stdout}${result.stderr}`.trim();
    return {
      name: item.name,
      output,
      ok: result.code === 0,
    };
  });
}

export function runDoctor(context) {
  for (const item of doctorReport(context)) {
    if (item.ok) {
      console.log(`${item.name.padEnd(16, " ")} ${item.output}`);
    } else {
      console.log(`${item.name.padEnd(16, " ")} 缺失或不可用`);
    }
  }
}
