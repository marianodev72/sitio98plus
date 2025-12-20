// frontend/src/routes/RoleRoutes.tsx
import { Navigate, Route, Routes } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import AdminGeneralLayout from "../layouts/AdminGeneralLayout";

import Home from "../pages/Home";
import Login from "../pages/Login";
import DashboardHome from "../pages/DashboardHome";

// Admin General pages
import Viviendas from "../pages/admin_general/Viviendas";
import Usuarios from "../pages/admin_general/Usuarios";
import Mensajeria from "../pages/admin_general/Mensajeria";
import Gestiones from "../pages/admin_general/Gestiones";
import GestionarAnexo from "../pages/admin_general/GestionarAnexo";

// ✅ Placeholder (hasta que armemos el panel real)
function PostulanteEnConstruccion() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Panel POSTULANTE (en construcción)</h2>
      <p>Este panel se completa en la siguiente fase.</p>
    </div>
  );
}

export default function RoleRoutes() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* App protegida: todo lo que cuelga de /app requiere sesión */}
      <Route path="/app" element={<AuthLayout />}>
        {/* Home interno */}
        <Route index element={<DashboardHome />} />

        {/* ADMIN GENERAL */}
        <Route path="admin-general" element={<AdminGeneralLayout />}>
          <Route index element={<Navigate to="viviendas" replace />} />
          <Route path="viviendas" element={<Viviendas />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="mensajeria" element={<Mensajeria />} />
          <Route path="gestiones" element={<Gestiones />} />
          <Route path="gestiones/:id" element={<GestionarAnexo />} />
        </Route>

        {/* POSTULANTE */}
        <Route path="postulante" element={<PostulanteEnConstruccion />} />

        {/* Otros roles (los armamos después) */}
        <Route
          path="*"
          element={
            <div style={{ padding: 32 }}>
              <h2>La página solicitada no está disponible.</h2>
              <p>Por favor, contacte al administrador.</p>
            </div>
          }
        />
      </Route>

      {/* Fallback global */}
      <Route
        path="*"
        element={
          <div style={{ padding: 32 }}>
            <h2>La página solicitada no está disponible.</h2>
            <p>Por favor, contacte al administrador.</p>
          </div>
        }
      />
    </Routes>
  );
}
