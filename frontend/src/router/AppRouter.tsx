// src/router/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

import { LoginPage } from "../pages/auth/LoginPage";
import { AdminGeneralLayout } from "../layout/AdminGeneralLayout";

import AdminGeneralDashboard from "../pages/adminGeneral/AdminGeneralDashboard";
import AdminGeneralUsersListPage from "../pages/adminGeneral/AdminGeneralUsersListPage";
import AdminGeneralViviendasListPage from "../pages/adminGeneral/AdminGeneralViviendasListPage";
import AdminGeneralStatsPage from "../pages/adminGeneral/AdminGeneralStatsPage";
import AdminGeneralGestionesPage from "../pages/adminGeneral/AdminGeneralGestionesPage";
import AdminGeneralAsignacionesPage from "../pages/adminGeneral/AdminGeneralAsignacionesPage";

import PostulanteLayout from "../layout/PostulanteLayout";
import PostulanteHomePage from "../pages/postulante/PostulanteHomePage";
import PostulanteAsignacionesPage from "../pages/postulante/PostulanteAsignacionesPage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const store = useAuthStore() as any;
  const token =
    store?.token || localStorage.getItem("token") || (store?.user && store?.token);

  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/app/admin-general"
          element={
            <ProtectedRoute>
              <AdminGeneralLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminGeneralDashboard />} />
          <Route path="usuarios" element={<AdminGeneralUsersListPage />} />
          <Route path="viviendas" element={<AdminGeneralViviendasListPage />} />
          <Route path="estadisticas" element={<AdminGeneralStatsPage />} />

          {/* ✅ MIS GESTIONES */}
          <Route path="gestiones" element={<AdminGeneralGestionesPage />} />
          <Route path="gestiones/asignaciones" element={<AdminGeneralAsignacionesPage />} />
        </Route>

        <Route
          path="/app/postulante"
          element={
            <ProtectedRoute>
              <PostulanteLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PostulanteHomePage />} />
          <Route path="asignaciones" element={<PostulanteAsignacionesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
