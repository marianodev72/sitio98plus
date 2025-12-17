// frontend/src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Al cargar la app, verificamos si hay token
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    api
      .get("/users/me")
      .then((res) => setUser(res.data.user))
      .catch(() => logout());
  }, []);

  function login(usuario, clave) {
    return api
      .post("/users/login", { email: usuario, password: clave })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
        return res.data.user;
      });
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  }

  // Interceptor de respuestas
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        logout();
      }
      // NO expulsamos en 403
      return Promise.reject(err);
    }
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
