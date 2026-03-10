// frontend/src/auth/useAuth.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { http } from "../api/http";

export type User = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  role?: string;
  permisos?: string[];
  activo?: boolean;
  barrioAsignado?: string | null;
  viviendaAsignada?: string | null;
  alojamientoAsignado?: string | null;
  tokenVersion?: number;
};

type AuthCtx = {
  user: User | null;
  initialized: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refresh: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Evita doble carga en React StrictMode
  const didInit = useRef(false);

  async function loadMeOnce() {
    try {
      const res = await http.get("/auth/me");
      const u = res.data?.user || null;
      setUser(u);
    } catch {
      // 401 es normal si no hay sesión
      setUser(null);
    } finally {
      setInitialized(true);
    }
  }

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadMeOnce();
  }, []);

  /**
   * refresh()
   * ---------
   * - Llama a POST /auth/refresh
   * - Si todo OK, actualiza user y devuelve el usuario
   * - Si 401/500 → borra user y devuelve null
   */
  async function refresh(): Promise<User | null> {
    try {
      const res = await http.post("/auth/refresh", {});
      const u = res.data?.user || null;
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setInitialized(true);
    }
  }

  /**
   * logout()
   * --------
   * - Llama a POST /auth/logout
   * - Limpia estado local
   * - El router se encarga de redirigir si corresponde
   */
  async function logout(): Promise<void> {
    try {
      await http.post("/auth/logout", {});
    } catch {
      // silencio institucional
    } finally {
      setUser(null);
      setInitialized(true);
    }
  }

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      initialized,
      setUser,
      refresh,
      logout,
    }),
    [user, initialized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
