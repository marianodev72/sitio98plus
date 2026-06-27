// frontend/src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoutes from "./routes/PublicRoutes";
import RoleRoutes from "./routes/RoleRoutes";
import { useAuth } from "./auth/useAuth";
import CentroAlertasPostLoginGate from "./components/notificaciones/CentroAlertasPostLoginGate";

function ProtectedAppRoutes() {
  const { user, initialized } = useAuth();

  if (!initialized) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword === true) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <>
      <RoleRoutes />
      <CentroAlertasPostLoginGate />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Rutas protegidas */}
      <Route path="/app/*" element={<ProtectedAppRoutes />} />

      {/* Rutas públicas */}
      <Route path="/*" element={<PublicRoutes />} />
    </Routes>
  );
}
