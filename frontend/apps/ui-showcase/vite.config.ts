import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { readDevPorts } from "../../../scripts/dev-ports";
import { createAutoDataAttrsBabelPlugin } from "../../build/auto-data-attrs";
import { createManualChunkResolver } from "../../build/chunking";

const { DEV_SHOWCASE_PORT } = readDevPorts();
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const manualChunks = createManualChunkResolver({
  sourceGroups: [
    {
      chunkName: "showcase-overview",
      matchers: ["/src/showcase-routes/overview.tsx"],
    },
    {
      chunkName: "showcase-foundation-routes",
      matchers: ["/src/showcase-routes/actions.tsx"],
    },
    {
      chunkName: "showcase-forms-routes",
      matchers: ["/src/showcase-routes/forms.tsx"],
    },
    {
      chunkName: "showcase-feedback-routes",
      matchers: ["/src/showcase-routes/feedback.tsx"],
    },
    {
      chunkName: "showcase-data-routes",
      matchers: ["/src/showcase-routes/data.tsx"],
    },
    {
      chunkName: "showcase-layout-routes",
      matchers: ["/src/showcase-routes/layouts.tsx"],
    },
  ],
});

function resolveWorkspacePackage(relativePath: string) {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

function normalizeBase(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === ".") {
    return "/";
  }

  if (/^https?:\/\//.test(normalized)) {
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
  }

  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function resolveShowcaseBase() {
  const explicitBase = process.env.VITE_SHOWCASE_BASE || process.env.VITE_PUBLIC_BASE;
  if (explicitBase) {
    return normalizeBase(explicitBase);
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return "/";
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    return "/";
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return "/";
  }

  return normalizeBase(repo);
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? resolveShowcaseBase() : "/",
  plugins: [
    react({
      babel: {
        plugins: [
          [
            createAutoDataAttrsBabelPlugin({
              includeSource: command !== "build" || process.env.VITE_INCLUDE_DATA_SOURCE === "true",
              workspaceRoot,
            }),
          ],
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@go-admin\/auth$/, replacement: resolveWorkspacePackage("../../packages/auth/src/index.ts") },
      { find: /^@go-admin\/design-tokens$/, replacement: resolveWorkspacePackage("../../packages/design-tokens/src/index.ts") },
      { find: /^@go-admin\/design-tokens\/base\.css$/, replacement: resolveWorkspacePackage("../../packages/design-tokens/src/base.css") },
      { find: /^@go-admin\/design-tokens\/default-theme\.css$/, replacement: resolveWorkspacePackage("../../packages/design-tokens/src/default-theme.css") },
      { find: /^@go-admin\/design-tokens\/host-theme-template\.css$/, replacement: resolveWorkspacePackage("../../packages/design-tokens/src/host-theme-template.css") },
      { find: /^@go-admin\/design-tokens\/theme\.css$/, replacement: resolveWorkspacePackage("../../packages/design-tokens/src/theme.css") },
      { find: /^@go-admin\/design-tokens\/theme$/, replacement: resolveWorkspacePackage("../../packages/design-tokens/src/theme.tsx") },
      { find: /^@go-admin\/i18n$/, replacement: resolveWorkspacePackage("../../packages/i18n/src/index.tsx") },
      { find: /^@go-admin\/types$/, replacement: resolveWorkspacePackage("../../packages/types/src/index.ts") },
      { find: /^@go-admin\/ui-admin$/, replacement: resolveWorkspacePackage("../../packages/ui-admin/src/index.tsx") },
      { find: /^@go-admin\/ui-admin\/styles\.css$/, replacement: resolveWorkspacePackage("../../packages/ui-admin/src/styles.css") },
    ],
  },
  server: {
    host: "0.0.0.0",
    port: DEV_SHOWCASE_PORT,
  },
}));
