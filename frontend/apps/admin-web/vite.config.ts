import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readDevPorts } from "../../../scripts/dev-ports";
import { createAutoDataAttrsBabelPlugin } from "../../build/auto-data-attrs";

const { DEV_ADMIN_PORT, DEV_BACKEND_PORT } = readDevPorts();
const backendTarget = process.env.VITE_PROXY_TARGET || `http://127.0.0.1:${DEV_BACKEND_PORT}`;
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));

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
        manualChunks(id) {
          if (id.includes("@radix-ui")) {
            return "radix-ui";
          }
          if (id.includes("react-day-picker")) {
            return "react-day-picker";
          }
          if (id.includes("/src/pages/ops-page.tsx")) {
            return "ops-complex-pages";
          }
          if (id.includes("/src/pages/setup-wizard-page.tsx")) {
            return "setup-wizard-page";
          }
          if (
            id.includes("/src/pages/users-page.tsx") ||
            id.includes("/src/pages/menus-page.tsx") ||
            id.includes("/src/pages/roles-page.tsx") ||
            id.includes("/src/pages/depts-page.tsx") ||
            id.includes("/src/pages/dicts-page.tsx") ||
            id.includes("/src/pages/login-logs-page.tsx") ||
            id.includes("/src/pages/opera-logs-page.tsx") ||
            id.includes("/src/pages/schedule-jobs-page.tsx") ||
            id.includes("/src/pages/schedule-logs-page.tsx") ||
            id.includes("/src/pages/set-config-page.tsx")
          ) {
            return "core-admin-pages";
          }
        },
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
