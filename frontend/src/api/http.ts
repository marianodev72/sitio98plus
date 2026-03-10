// frontend/src/api/http.ts
import axios from "axios";

/**
 * Cliente HTTP institucional (frontend)
 * - baseURL absoluto (/api) para evitar /app/api/... (Vite)
 * - credentials true para cookie token
 * - reintento único con refresh ante 401 (sin loops)
 */

const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 30000,
});

// Evita que múltiples 401 disparen múltiples refresh en paralelo
let refreshingPromise: Promise<void> | null = null;

async function ensureRefreshOnce() {
  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      // refresh usa cookie httpOnly; no expone nada al frontend
      await axios.post("/api/auth/refresh", null, { withCredentials: true, timeout: 30000 });
    })().finally(() => {
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
}

http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config;

    // ✅ Reintento controlado: SOLO si es 401 y no reintentamos antes
    if (status === 401 && original && !original.__didRetry) {
      try {
        original.__didRetry = true;
        await ensureRefreshOnce();
        return http.request(original);
      } catch {
        // si refresh falla, devolvemos error tal cual (fail-closed)
        return Promise.reject(err);
      }
    }

    // Fail-closed: devolvemos el error para que la UI muestre mensaje opaco
    return Promise.reject(err);
  }
);

export default http;
export { http };
