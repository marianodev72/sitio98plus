import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// === INTERCEPTOR PARA AGREGAR TOKEN RS256 ===
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("zn98_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === INTERCEPTOR DE RESPUESTA ===
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el token expiró, cerramos sesión automáticamente
    if (error.response?.status === 401) {
      localStorage.removeItem("zn98_token");
      localStorage.removeItem("zn98_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
