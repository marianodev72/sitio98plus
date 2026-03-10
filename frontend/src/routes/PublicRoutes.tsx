// frontend/src/routes/PublicRoutes.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import HomePublic from "../pages/HomePublic";
import Login from "../pages/Login";
import RegisterPostulante from "../pages/RegisterPostulante";
import { useAuth } from "../auth/useAuth";
import { panelPathForUser } from "./panelPathForUser";

export default function PublicRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePublic />} />

      <Route
        path="/login"
        element={user ? <Navigate to={panelPathForUser(user)} replace /> : <Login />}
      />

      <Route path="/registro-postulante" element={<RegisterPostulante />} />

      {/* fallback público */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
