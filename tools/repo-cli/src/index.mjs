import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRepoContext } from "./domains/runtime/context.mjs";
import { dispatchCommand } from "./commands/index.mjs";

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseGlobalOptions(argv);
  if (parsed.args[0] === "help") {
    await dispatchCommand({ context: null, args: parsed.args });
    return;
  }
  const context = createRepoContext(parsed.options);
  await dispatchCommand({ context, args: parsed.args });
}

export function parseGlobalOptions(argv) {
  const options = {};
  const args = [];
  const filteredArgv = argv[0] === "--" ? argv.slice(1) : argv;

  for (let index = 0; index < filteredArgv.length; index += 1) {
    const current = filteredArgv[index];
    if (current === "--config") {
      options.configFile = filteredArgv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--project-prefix") {
      options.projectPrefix = filteredArgv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--repo-root") {
      options.repoRoot = filteredArgv[index + 1];
      index += 1;
      continue;
    }
    args.push(current);
  }

  if (args.length === 0) {
    return { options, args: ["help"] };
  }

  return { options, args };
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
