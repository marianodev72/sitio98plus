import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000/api",
});

// Interceptor para agregar el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("zn98_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
