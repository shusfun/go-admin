import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readDevPorts } from "../../../scripts/dev-ports";
import { createAutoDataAttrsBabelPlugin } from "../../build/auto-data-attrs";
import { createManualChunkResolver } from "../../build/chunking";

const { DEV_MOBILE_PORT, DEV_BACKEND_PORT } = readDevPorts();
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const manualChunks = createManualChunkResolver({
  sourceGroups: [
    {
      chunkName: "mobile-login",
      matchers: ["/src/pages/login-page.tsx"],
    },
    {
      chunkName: "mobile-workbench",
      matchers: ["/src/mobile-workbench.tsx"],
    },
    {
      chunkName: "mobile-pages",
      matchers: ["/src/pages/home-page.tsx", "/src/pages/profile-page.tsx", "/src/pages/status-page.tsx"],
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
    port: DEV_MOBILE_PORT,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || `http://127.0.0.1:${DEV_BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
}));
