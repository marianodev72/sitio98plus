//frontend/vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_BACKEND = "http://localhost:3000";

export default defineConfig(({ mode }) => {
  // Carga .env, .env.local, etc.
  const env = loadEnv(mode, process.cwd(), "");

  const BACKEND_URL = env.VITE_BACKEND_URL || DEFAULT_BACKEND;

  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        "/api": {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, _res) => {
              console.error("[vite proxy] error:", err);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              const host = proxyReq.getHeader("host");
              // proxyReq.protocol no siempre existe, logueamos seguro:
              console.log(`[vite proxy] ${req.method} ${req.url} -> ${host}${proxyReq.path}`);
            });
          },
        },
      },
    },
  };
});
