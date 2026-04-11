import { normalizeServiceList, printServicesStatus, restartServices, startServices, stopServices } from "../domains/runtime/services.mjs";
import { printHelp } from "../domains/help/index.mjs";
import { printInfraStatus, startInfra, stopInfra } from "../domains/infra/index.mjs";
import { runBuild } from "../domains/build/index.mjs";
import { runDeps } from "../domains/deps/index.mjs";
import { dockerDown, dockerUp, deploy } from "../domains/docker/index.mjs";
import { runDoctor } from "../domains/doctor/index.mjs";
import { printEnv, printServiceLogs, printSetupStatus, printStatus, runDatabaseReset, runMigrate, runOpenAPI, runReinit, runSetup } from "../domains/misc/index.mjs";
import { setProjectPrefix } from "../domains/project-prefix/index.mjs";
import { runRename } from "../domains/rename/index.mjs";
import { runTest, runTypecheck, runVerify } from "../domains/verify/index.mjs";

export async function dispatchCommand(env) {
  const [command, ...rest] = env.args;
  switch (command) {
    case "doctor":
      runDoctor(env.context);
      return;
    case "help":
      printHelp();
      return;
    case "env":
      await printEnv(env.context);
      return;
    case "status":
      await printStatus(env.context);
      return;
    case "setup-status":
      printSetupStatus(env.context);
      return;
    case "deps":
      requireArgs(rest, 1, "用法: repo deps backend|frontend|all");
      runDeps(env.context, rest[0]);
      return;
    case "build":
      requireArgs(rest, 1, "用法: repo build backend|admin|mobile|showcase|frontend|docker|all");
      runBuild(env.context, rest[0]);
      return;
    case "test":
      requireArgs(rest, 1, "用法: repo test backend|frontend|all");
      runTest(env.context, rest[0]);
      return;
    case "typecheck":
      runTypecheck(env.context);
      return;
    case "verify":
      requireArgs(rest, 1, "用法: repo verify frontend|backend|all");
      runVerify(env.context, rest[0]);
      return;
    case "openapi":
      await runOpenAPI(env.context);
      return;
    case "migrate":
      runMigrate(env.context);
      return;
    case "db":
      await runDatabaseCommand(env);
      return;
    case "docker-up":
      dockerUp(env.context);
      return;
    case "docker-down":
      dockerDown(env.context);
      return;
    case "deploy":
      deploy(env.context);
      return;
    case "setup":
      await runSetup(env.context, rest.includes("--with-openapi"), rest.includes("--skip-infra"));
      return;
    case "reinit":
      await runReinit(env.context, rest.includes("--yes"));
      return;
    case "set-prefix":
      await runSetPrefix(env);
      return;
    case "rename":
      await runRenameCommand(env);
      return;
    case "service":
      await runServiceCommand(env);
      return;
    case "infra":
      await runInfraCommand(env);
      return;
    case "fmt":
      throw new Error("repo fmt 暂未提供，请直接执行 gofmt -w");
    default:
      throw new Error(`未知命令：${command ?? "(空)"}`);
  }
}

async function runSetPrefix(env) {
  const reset = env.args.includes("--reset");
  const positional = env.args.slice(1).filter((value) => !value.startsWith("--"));
  if (!reset && positional.length !== 1) {
    throw new Error("请传入新的 project prefix，或使用 --reset");
  }
  setProjectPrefix(env.context, positional[0] ?? "", reset);
}

async function runRenameCommand(env) {
  const positional = env.args.slice(1).filter((value) => !value.startsWith("--"));
  requireArgs(positional, 1, "用法: repo rename <brand> [--dry-run] [--yes] [--verify]");
  await runRename(env.context, positional[0], {
    dryRun: env.args.includes("--dry-run"),
    yes: env.args.includes("--yes"),
    verify: env.args.includes("--verify"),
  });
}

async function runServiceCommand(env) {
  const action = env.args[1];
  switch (action) {
    case "start":
      await startServices(env.context, normalizeServiceList(env.context, env.args.slice(2)));
      return;
    case "status": {
      const positional = env.args.slice(2).filter((value) => !value.startsWith("--"));
      await printServicesStatus(env.context, positional.length > 0 ? normalizeServiceList(env.context, positional) : null);
      return;
    }
    case "stop":
      await stopServices(env.context, normalizeServiceList(env.context, env.args.slice(2)));
      return;
    case "restart":
      await restartServices(env.context, normalizeServiceList(env.context, env.args.slice(2)));
      return;
    case "logs": {
      const positional = env.args.slice(2).filter((value) => !value.startsWith("--"));
      requireArgs(positional, 1, "用法: repo service logs <service> [--lines N]");
      const lineIndex = env.args.indexOf("--lines");
      const lines = lineIndex >= 0 ? Number.parseInt(env.args[lineIndex + 1] ?? "120", 10) : 120;
      printServiceLogs(env.context, positional[0], Number.isFinite(lines) ? lines : 120);
      return;
    }
    default:
      throw new Error("用法: repo service start|status|stop|restart|logs ...");
  }
}

async function runInfraCommand(env) {
  const action = env.args[1];
  switch (action) {
    case "start":
      await startInfra(env.context);
      return;
    case "stop":
      await stopInfra(env.context);
      return;
    case "status":
      await printInfraStatus(env.context);
      return;
    default:
      throw new Error("用法: repo infra start|stop|status");
  }
}

async function runDatabaseCommand(env) {
  const action = env.args[1];
  switch (action) {
    case "reset":
      await runDatabaseReset(env.context);
      return;
    default:
      throw new Error("用法: repo db reset");
  }
}

function requireArgs(values, count, message) {
  if (values.length < count) {
    throw new Error(message);
  }
}
