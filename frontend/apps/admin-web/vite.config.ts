import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readDevPorts } from "../../../scripts/dev-ports";

const { DEV_ADMIN_PORT, DEV_BACKEND_PORT } = readDevPorts();

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: DEV_ADMIN_PORT,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || `http://127.0.0.1:${DEV_BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
