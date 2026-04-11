import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

import { createRepoContext } from "../src/domains/runtime/context.mjs";
import { createFrontendWorkspaceFingerprint, frontendDepsStatePath, inspectFrontendWorkspace } from "../src/domains/runtime/frontend-deps.mjs";
import { createFixtureRepo, removeFixtureRepo } from "./support/fixture-repo.mjs";

test("inspectFrontendWorkspace detects missing workspace links", () => {
  const repoRoot = createFixtureRepo("repo-cli-frontend-deps-missing-link");

  try {
    seedFrontendWorkspace(repoRoot);
    seedRootNodeModules(repoRoot);

    const context = createRepoContext({ repoRoot });
    const inspection = inspectFrontendWorkspace(context);

    assert.equal(inspection.ready, false);
    assert.equal(inspection.missingLinks.length, 1);
    assert.equal(inspection.missingLinks[0].consumer, "@go-admin/ui-admin");
    assert.equal(inspection.missingLinks[0].dependency, "@go-admin/auth");
    assert.match(inspection.reasons.join("\n"), /workspace 依赖链接/);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("inspectFrontendWorkspace requires reinstall when fingerprint changes", () => {
  const repoRoot = createFixtureRepo("repo-cli-frontend-deps-fingerprint");

  try {
    seedFrontendWorkspace(repoRoot);
    seedRootNodeModules(repoRoot);
    seedWorkspaceLink(repoRoot, "frontend/packages/ui-admin", "@go-admin/auth");

    const context = createRepoContext({ repoRoot });
    const initial = createFrontendWorkspaceFingerprint(context);
    writeFileSync(frontendDepsStatePath(context), `${JSON.stringify({ fingerprint: initial.value }, null, 2)}\n`, "utf8");

    writeFileSync(
      path.join(repoRoot, "frontend", "packages", "ui-admin", "package.json"),
      JSON.stringify(
        {
          name: "@go-admin/ui-admin",
          private: true,
          dependencies: {
            "@go-admin/auth": "workspace:*",
            "@go-admin/types": "workspace:*",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const inspection = inspectFrontendWorkspace(context);
    assert.equal(inspection.ready, false);
    assert.match(inspection.reasons.join("\n"), /前端依赖清单已变更/);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

test("inspectFrontendWorkspace accepts healthy workspace without cached state", () => {
  const repoRoot = createFixtureRepo("repo-cli-frontend-deps-healthy");

  try {
    seedFrontendWorkspace(repoRoot);
    seedRootNodeModules(repoRoot);
    seedWorkspaceLink(repoRoot, "frontend/packages/ui-admin", "@go-admin/auth");

    const context = createRepoContext({ repoRoot });
    const inspection = inspectFrontendWorkspace(context);

    assert.equal(inspection.ready, true);
    assert.equal(inspection.shouldPersistState, true);
    assert.equal(inspection.missingLinks.length, 0);
  } finally {
    removeFixtureRepo(repoRoot);
  }
});

function seedFrontendWorkspace(repoRoot) {
  writeFileSync(
    path.join(repoRoot, "pnpm-workspace.yaml"),
    ["packages:", "  - frontend/apps/*", "  - frontend/packages/*", ""].join("\n"),
    "utf8",
  );
  writeFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");

  mkdirSync(path.join(repoRoot, "frontend", "packages", "auth"), { recursive: true });
  mkdirSync(path.join(repoRoot, "frontend", "packages", "types"), { recursive: true });
  mkdirSync(path.join(repoRoot, "frontend", "packages", "ui-admin"), { recursive: true });

  writeFileSync(
    path.join(repoRoot, "frontend", "packages", "auth", "package.json"),
    JSON.stringify({ name: "@go-admin/auth", private: true }, null, 2),
    "utf8",
  );
  writeFileSync(
    path.join(repoRoot, "frontend", "packages", "types", "package.json"),
    JSON.stringify({ name: "@go-admin/types", private: true }, null, 2),
    "utf8",
  );
  writeFileSync(
    path.join(repoRoot, "frontend", "packages", "ui-admin", "package.json"),
    JSON.stringify(
      {
        name: "@go-admin/ui-admin",
        private: true,
        dependencies: {
          "@go-admin/auth": "workspace:*",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

function seedRootNodeModules(repoRoot) {
  mkdirSync(path.join(repoRoot, "node_modules", ".pnpm"), { recursive: true });
}

function seedWorkspaceLink(repoRoot, packageRelativePath, dependencyName) {
  const linkPath = resolveNodeModulesPath(path.join(repoRoot, packageRelativePath), dependencyName);
  mkdirSync(linkPath, { recursive: true });
}

function resolveNodeModulesPath(packageDir, dependencyName) {
  if (dependencyName.startsWith("@")) {
    const [scope, name] = dependencyName.split("/", 2);
    return path.join(packageDir, "node_modules", scope, name);
  }
  return path.join(packageDir, "node_modules", dependencyName);
}
