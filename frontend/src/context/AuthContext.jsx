import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);  // {id, nombre, apellido, email, role, estado}
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar token y usuario desde localStorage al iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem("zn98_token");
    const storedUser = localStorage.getItem("zn98_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("zn98_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/users/login", { email, password });
    const { token: jwt, user: userData } = res.data;

    localStorage.setItem("zn98_token", jwt);
    localStorage.setItem("zn98_user", JSON.stringify(userData));

    setToken(jwt);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("zn98_token");
    localStorage.removeItem("zn98_user");
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
