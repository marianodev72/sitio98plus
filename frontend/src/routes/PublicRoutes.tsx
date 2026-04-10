// frontend/src/routes/PublicRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import HomePublic from "../pages/HomePublic";
import Login from "../pages/Login";
import RegisterPostulante from "../pages/RegisterPostulante";
import { useAuth } from "../auth/useAuth";
import { panelPathForUser } from "./panelPathForUser";
import ChangePassword from "../pages/ChangePassword";

export default function PublicRoutes() {
  const { user } = useAuth();

  const mustChangePassword = user?.mustChangePassword === true;

  return (
    <Routes>
      <Route path="/" element={<HomePublic />} />

      <Route
        path="/login"
        element={
          user ? (
            mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <Navigate to={panelPathForUser(user)} replace />
            )
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/change-password"
        element={
          user ? (
            mustChangePassword ? (
              <ChangePassword />
            ) : (
              <Navigate to={panelPathForUser(user)} replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/registro-postulante" element={<RegisterPostulante />} />

      {/* fallback público */}
      <Route
        path="*"
        element={
          user ? (
            mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : (
              <Navigate to={panelPathForUser(user)} replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}