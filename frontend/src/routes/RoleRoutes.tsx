// frontend/src/routes/RoleRoutes.tsx
import React, { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

/* Layouts */
import AuthLayout from "../layouts/AuthLayout";
import PostulanteLayout from "../layouts/PostulanteLayout";
import AdminGeneralLayout from "../layouts/AdminGeneralLayout";
import AdminLayout from "../layouts/AdminLayout";
import PermisionarioLayout from "../layouts/PermisionarioLayout";
import InspectorLayout from "../layouts/InspectorLayout";
import { ErrorBoundary } from "../components/ErrorBoundary";

/* Admin General */
import AdminGeneralDashboard from "../pages/admin_general/AdminGeneralDashboard";
import UsuariosAdminGeneral from "../pages/admin_general/Usuarios";
import RegistrosAdminGeneral from "../pages/admin_general/RegistrosAdminGeneral";
import ViviendasAdminGeneral from "../pages/admin_general/Viviendas";
import GestionesAdminGeneral from "../pages/admin_general/Gestiones";
import MensajeriaAdminGeneral from "../pages/admin_general/Mensajeria";
import GestionarAnexo from "../pages/admin_general/GestionarAnexo";
import LiquidacionesAdminGeneral from "../pages/admin_general/Liquidaciones";
import ServiciosAdminGeneral from "../pages/admin_general/ServiciosAdmin";
import MantenimientosAdminGeneral from "../pages/admin_general/MantenimientosAdminGeneral";
import EstadisticasAdminGeneral from "../pages/admin_general/Estadisticas";
import AuditoriaInstitucionalPage from "../pages/admin_general/AuditoriaInstitucionalPage";
import LiquidacionesAdminConsulta from "../components/LiquidacionesAdminConsulta";
import LiquidacionesAdminResumen from "../components/LiquidacionesAdminResumen";

/* Admin */
import AdminDashboard from "../pages/admin/AdminDashboard";
import UsuariosAdmin from "../pages/admin/UsuariosAdmin";
import ViviendasAdmin from "../pages/admin/ViviendasAdmin";
import GestionesAdmin from "../pages/admin/GestionesAdmin";
import MensajeriaAdmin from "../pages/admin/MensajeriaAdmin";
import LiquidacionesAdmin from "../pages/admin/LiquidacionesAdmin";
import ServiciosAdmin from "../pages/admin/ServiciosAdmin";

/* Permisionario */
import PermisionarioDashboard from "../pages/permisionario/PermisionarioDashboard";
import MisAnexosPermisionario from "../pages/permisionario/MisAnexosPermisionario";
import MisComunicaciones from "../pages/permisionario/MisComunicaciones";
import MisMantenimientos from "../pages/permisionario/MisMantenimientos";
import MisMantenimientosDetalle from "../pages/permisionario/MisMantenimientosDetalle";
import MisMantenimientosListado from "../pages/permisionario/MisMantenimientosListado";
import MisMantenimientosNuevo from "../pages/permisionario/MisMantenimientosNuevo";
import MisServicios from "../pages/permisionario/MisServicios";
import MisLiquidaciones from "../pages/permisionario/MisLiquidaciones";
import Novedades from "../pages/permisionario/Novedades";
import MisDatosDeclarados from "../pages/permisionario/MisDatosDeclarados";
import ActualizarMisDatosDeclarados from "../pages/permisionario/ActualizarMisDatosDeclarados";
import HistorialMisDatosDeclarados from "../pages/permisionario/HistorialMisDatosDeclarados";
import HistorialMantenimientos from "../pages/permisionario/HistorialMantenimientos";
import NuevoMantenimiento from "../pages/permisionario/NuevoMantenimiento";
import CrearAnexo04Permisionario from "../pages/permisionario/CrearAnexo04Permisionario";
import VerAnexoPermisionario from "../pages/permisionario/VerAnexoPermisionario";
import MiBarrio from "../pages/permisionario/MiBarrio";

/* INSPECTOR (subpanel Mi Barrio) */
import InspectorDashboard from "../pages/permisionario/inspector/InspectorDashboard";
import ViviendasInspector from "../pages/permisionario/inspector/ViviendasInspector";
import MensajeriaInspector from "../pages/permisionario/inspector/MensajeriaInspector";
import GestionesInspector from "../pages/permisionario/inspector/GestionesInspector";
import GestionarAnexoInspector from "../pages/permisionario/inspector/GestionarAnexoInspector";
import CrearAnexo09Desde08 from "../pages/permisionario/inspector/CrearAnexo09Desde08";
import MantenimientosInspector from "../pages/permisionario/inspector/MantenimientosInspector";

/* POSTULANTE */
import PostulanteDashboard from "../pages/postulante/PostulanteDashboard";
import MisAnexos from "../pages/postulante/MisAnexos";
import VerAnexo from "../pages/postulante/VerAnexo";
import NuevaPostulacion from "../pages/postulante/NuevaPostulacion";
import Anexo01Institucional from "../pages/postulante/Anexo01Institucional";


/* Canonical */
import { panelPathForUser } from "./panelPathForUser";

function RoleGate({ children }: { children: React.ReactNode }) {
  const { user, initialized, refresh } = useAuth();
  const did = useRef(false);

  useEffect(() => {
    if (!did.current && initialized && !user) {
      did.current = true;
      refresh().catch(() => {});
    }
  }, [initialized, user, refresh]);

  if (!initialized) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppIndexRedirect() {
  const { user } = useAuth();
  const location = useLocation();

  const isPanelHome = location.pathname === "/app" || location.pathname === "/app/";
  if (!isPanelHome) return null;

  const target = user ? panelPathForUser(user) : "/login";

  if (location.pathname === target) return null;
  if (target === "/app") return null;

  return <Navigate to={target} replace />;
}

/* Fallback institucional (genérico) */
function GenericUnavailable() {
  return (
    <div style={{ padding: 24 }}>
      No es posible procesar su solicitud, contáctese con el Administrador
    </div>
  );
}

export default function RoleRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Este Routes se monta bajo /app/* desde App.tsx */}
      <Route
        path="/"
        element={
          <RoleGate>
            <ErrorBoundary>
              <AuthLayout />
            </ErrorBoundary>
          </RoleGate>
        }
      >
        <Route index element={<AppIndexRedirect />} />

        {/* POSTULANTE */}
<Route path="postulante" element={<PostulanteLayout />}>
  {/* /app/postulante */}
  <Route index element={<PostulanteDashboard />} />

  {/* /app/postulante/mis-anexos */}
  <Route path="mis-anexos" element={<MisAnexos />} />

  {/* /app/postulante/mis-anexos/:id */}
  <Route path="mis-anexos/:id" element={<VerAnexo />} />

  {/* /app/postulante/nueva-postulacion */}
  <Route path="nueva-postulacion" element={<NuevaPostulacion />} />

  {/* /app/postulante/anexo-01 */}
  <Route path="anexo-01" element={<Anexo01Institucional />} />

  {/* fallback interno del postulante */}
  <Route path="*" element={<GenericUnavailable />} />
</Route>


        {/* PERMISIONARIO */}
        <Route path="permisionario" element={<PermisionarioLayout />}>
          <Route index element={<PermisionarioDashboard />} />

          <Route path="anexos" element={<MisAnexosPermisionario />} />
          <Route path="anexos/:id" element={<VerAnexoPermisionario />} />

          <Route path="mis-datos" element={<MisDatosDeclarados />} />
          <Route
            path="mis-datos/actualizar"
            element={<ActualizarMisDatosDeclarados />}
          />
          <Route
            path="mis-datos/historial"
            element={<HistorialMisDatosDeclarados />}
          />

          <Route path="comunicaciones" element={<MisComunicaciones />} />

          <Route path="mis-mantenimientos" element={<MisMantenimientos />} />
          <Route
            path="mis-mantenimientos/listado"
            element={<MisMantenimientosListado />}
          />
          <Route
            path="mis-mantenimientos/:id"
            element={<MisMantenimientosDetalle />}
          />
          <Route
            path="mis-mantenimientos/nuevo"
            element={<MisMantenimientosNuevo />}
          />

          <Route
            path="mis-mantenimientos/historial"
            element={<Navigate to="/app/permisionario/mis-mantenimientos/listado" replace />}
          />
          <Route path="nuevo-mantenimiento" element={<NuevoMantenimiento />} />
          <Route path="servicios" element={<MisServicios />} />
          <Route path="liquidaciones" element={<MisLiquidaciones />} />
          <Route path="novedades" element={<Novedades />} />

          <Route path="anexo-04/nuevo" element={<CrearAnexo04Permisionario />} />

          {/* Mi Barrio (entry genérico existente, se deja intacto) */}
          <Route path="mi-barrio-jefe" element={<MiBarrio />} />

          {/* ============================
              INSPECTOR / MI BARRIO
              Base: /app/permisionario/mi-barrio-inspector
              ============================ */}
          <Route
            path="mi-barrio-inspector"
            element={
              <InspectorLayout basePath="/app/permisionario/mi-barrio-inspector" />
            }
          >
            <Route index element={<InspectorDashboard />} />
            <Route path="viviendas" element={<ViviendasInspector />} />
            <Route path="mensajeria" element={<MensajeriaInspector />} />
            <Route path="gestiones" element={<GestionesInspector />} />
            <Route
              path="gestiones/crear-anexo-09-desde-08/:id"
              element={<CrearAnexo09Desde08 />}
            />
            <Route path="gestiones/:id" element={<GestionarAnexoInspector />} />
            <Route path="mantenimientos" element={<MantenimientosInspector />} />
            {/* /usuarios NO se monta */}
            <Route path="*" element={<GenericUnavailable />} />
          </Route>

          {/* fallback interno para no pantalla blanca */}
          <Route path="*" element={<GenericUnavailable />} />
        </Route>

        {/* ADMIN GENERAL */}
        <Route path="admin-general" element={<AdminGeneralLayout />}>
          <Route index element={<AdminGeneralDashboard />} />
          <Route path="usuarios" element={<UsuariosAdminGeneral />} />
          <Route path="estadisticas" element={<EstadisticasAdminGeneral />} />
          <Route path="registros" element={<RegistrosAdminGeneral />} />
          <Route path="viviendas" element={<ViviendasAdminGeneral />} />
          <Route path="gestiones" element={<GestionesAdminGeneral />} />
          <Route path="gestiones/:id" element={<GestionarAnexo />} />
          <Route path="mensajeria" element={<MensajeriaAdminGeneral />} />
          <Route path="liquidaciones" element={<LiquidacionesAdminGeneral />} />
          <Route path="servicios" element={<ServiciosAdminGeneral />} />
          <Route path="mantenimientos" element={<MantenimientosAdminGeneral />} />
          <Route path="auditoria" element={<AuditoriaInstitucionalPage />} />
          <Route path="liquidaciones-consulta" element={<LiquidacionesAdminConsulta />} />
          <Route path="liquidaciones-resumen" element={<LiquidacionesAdminResumen />} />
        </Route>

        {/* ADMIN */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<UsuariosAdmin />} />
          <Route path="viviendas" element={<ViviendasAdmin />} />
          <Route path="gestiones" element={<GestionesAdmin />} />
          <Route path="mensajeria" element={<MensajeriaAdmin />} />
          <Route path="liquidaciones" element={<LiquidacionesAdmin />} />
          <Route path="servicios" element={<ServiciosAdmin />} />
        </Route>

        {/* fallback interno del panel */}
        <Route path="*" element={<GenericUnavailable />} />
      </Route>

      {/* fallback global */}
      <Route
        path="*"
        element={<Navigate to={user ? panelPathForUser(user) : "/"} replace />}
      />
    </Routes>
  );
}
