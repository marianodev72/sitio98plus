// src/api/http.ts
// Cliente HTTP central del FRONTEND SITIO 98 PLUS

import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Base URL del backend (desde .env)
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Cliente Axios
export const http = axios.create({
  baseURL: BASE_URL,
  // En este proyecto usamos cookies para algunos flujos (anexos, descargas, etc.)
  // y header Authorization para JWT.
  withCredentials: true,
});

// Interceptor de request → agrega token JWT SIEMPRE que exista en el store
http.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de errores de respuesta
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el token caduca o no es válido → logout automático
    if (error?.response?.status === 401) {
      try {
        useAuthStore.getState().logout();
      } catch {
        // evitar que falle el interceptor si por algún motivo el store no está disponible
      }
    }
    return Promise.reject(error);
  }
);
