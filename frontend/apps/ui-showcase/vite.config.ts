import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { readDevPorts } from "../../../scripts/dev-ports";

const { DEV_SHOWCASE_PORT } = readDevPorts();

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: DEV_SHOWCASE_PORT,
  },
});
