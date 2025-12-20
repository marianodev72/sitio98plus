import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Props = {
  roles: string[];
  children: JSX.Element;
};

export default function RequireRole({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;

  const role = String(user.role || "").toUpperCase();
  const allowed = roles.map((r) => String(r).toUpperCase());

  if (!allowed.includes(role)) {
    // ❗ Redirección genérica, sin pistas
    return <Navigate to="/unavailable" replace />;
  }

  return children;
}
