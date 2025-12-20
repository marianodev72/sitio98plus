import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Cargando sesión…</p>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
