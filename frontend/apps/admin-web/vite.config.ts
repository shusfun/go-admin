import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readDevPorts } from "../../../scripts/dev-ports";
import { createAutoDataAttrsBabelPlugin } from "../../build/auto-data-attrs";
import { createManualChunkResolver } from "../../build/chunking";

const { DEV_ADMIN_PORT, DEV_BACKEND_PORT } = readDevPorts();
const backendTarget = process.env.VITE_PROXY_TARGET || `http://127.0.0.1:${DEV_BACKEND_PORT}`;
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const manualChunks = createManualChunkResolver({
  sourceGroups: [
    {
      chunkName: "admin-authenticated-app",
      matchers: ["/src/admin-workbench.tsx"],
    },
    {
      chunkName: "admin-setup",
      matchers: ["/src/pages/setup-wizard-page.tsx"],
    },
    {
      chunkName: "admin-ops-pages",
      matchers: ["/src/pages/ops-page.tsx"],
    },
    {
      chunkName: "admin-core-pages",
      matchers: [
        "/src/pages/users-page.tsx",
        "/src/pages/menus-page.tsx",
        "/src/pages/roles-page.tsx",
        "/src/pages/depts-page.tsx",
        "/src/pages/dicts-page.tsx",
        "/src/pages/login-logs-page.tsx",
        "/src/pages/opera-logs-page.tsx",
        "/src/pages/schedule-jobs-page.tsx",
        "/src/pages/schedule-logs-page.tsx",
        "/src/pages/set-config-page.tsx",
      ],
    },
    {
      chunkName: "admin-tooling-pages",
      matchers: [
        "/src/pages/apis-page.tsx",
        "/src/pages/server-monitor-page.tsx",
        "/src/pages/swagger-page.tsx",
        "/src/pages/module-page.tsx",
        "/src/pages/profile-page.tsx",
      ],
    },
  ],
});

export default defineConfig(({ command }) => ({
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
  server: {
    host: "0.0.0.0",
    port: DEV_ADMIN_PORT,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/admin-api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/app-api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/swagger": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
}));
