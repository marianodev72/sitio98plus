// frontend/src/lib/apiClient.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

type RefreshState = {
  inFlight: Promise<void> | null;
};

const refreshState: RefreshState = { inFlight: null };

// Si estás en Vite con proxy a backend, baseURL puede ser "".
const api: AxiosInstance = axios.create({
  baseURL: "",
  withCredentials: true, // ✅ necesario para cookies httpOnly
  headers: { Accept: "application/json" },
});

// Para marcar reintento (evita loops)
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/logout") ||
    url.includes("/api/auth/me")
  );
}

// Política: consideramos “sesión inválida” cuando backend responde 401 o 404 genérico.
// (Ustedes normalizaron errores para no filtrar causas, por eso incluimos 404.)
function isSessionInvalidStatus(status?: number) {
  return status === 401 || status === 404;
}

async function runRefreshOnce(): Promise<void> {
  if (!refreshState.inFlight) {
    refreshState.inFlight = (async () => {
      // Refresh es un endpoint protegido ahora; si la sesión es inválida, fallará.
      await api.post("/api/auth/refresh");
    })()
      .finally(() => {
        refreshState.inFlight = null;
      });
  }
  return refreshState.inFlight;
}

// Hook para que tu app maneje logout/redirección de forma central
// Reemplazá esta función por tu router real si querés.
function hardLogoutAndRedirect() {
  try {
    // Limpieza mínima del lado cliente (no borra cookie httpOnly)
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    sessionStorage.clear();
  } catch {
    // noop
  }
  // Redirigir a login (ajustá a tu ruta real)
  window.location.href = "/login";
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as InternalAxiosRequestConfig | undefined;

    if (!original || isAuthEndpoint(original.url)) {
      // No intentamos refresh sobre endpoints de auth
      return Promise.reject(error);
    }

    if (!isSessionInvalidStatus(status)) {
      return Promise.reject(error);
    }

    // Evitar loops: solo un reintento por request
    if (original._retry) {
      hardLogoutAndRedirect();
      return Promise.reject(error);
    }
    original._retry = true;

    try {
      // Intentar refresh UNA vez (single-flight)
      await runRefreshOnce();
      // Reintentar request original
      return api.request(original);
    } catch (e) {
      // Si refresh falla => sesión inválida de verdad
      hardLogoutAndRedirect();
      return Promise.reject(error);
    }
  }
);

export default api;
