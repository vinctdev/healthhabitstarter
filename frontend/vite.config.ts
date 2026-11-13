import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    license: true, // dist/.vite/license.md: licenses of all bundled dependencies (MIT etc. require it)
  },
  server: {
    port: 5173, // localhost only; `npm run dev -- --host` exposes it to the LAN (see docs/development.md)
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        autoRewrite: true, // keep backend redirects on the Vite origin (the API has no CORS)
        headers: {
          Connection: "keep-alive",
        },
        timeout: 120_000,
      },
    },
  },
});
