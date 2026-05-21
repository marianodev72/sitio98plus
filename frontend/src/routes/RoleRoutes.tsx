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
import AlojamientosInspectorLayout from "../layouts/AlojamientosInspectorLayout";
import AlojadoLayout from "../layouts/AlojadoLayout";
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
import PerfilAdminGeneral from "../pages/admin_general/Perfil";
import AlojamientosInventario from "../pages/alojamientos/AlojamientosInventario";
import AlojamientosDashboard from "../pages/alojamientos/AlojamientosDashboard";
import AlojamientoDetalle from "../pages/alojamientos/AlojamientoDetalle";
import AlojamientoDocumentoDetalle from "../pages/alojamientos/AlojamientoDocumentoDetalle";
import AlojamientosInspectorDashboard from "../pages/alojamientos_inspector/AlojamientosInspectorDashboard";
import AlojamientosInspectorInventario from "../pages/alojamientos_inspector/AlojamientosInspectorInventario";
import AlojamientosInspectorDocumentos from "../pages/alojamientos_inspector/AlojamientosInspectorDocumentos";
import AlojamientoDocumentoDetalleInspector from "../pages/alojamientos_inspector/AlojamientoDocumentoDetalleInspector";

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

/* JEFE DE BARRIO */
import MiBarrioJefe from "../pages/permisionario/jefe/MiBarrioJefe";
import JefeBarrioDashboard from "../pages/permisionario/jefe/JefeBarrioDashboard";
import GestionesJefeBarrio from "../pages/permisionario/jefe/GestionesJefeBarrio";
import GestionarAnexoJefeBarrio from "../pages/permisionario/jefe/GestionarAnexoJefeBarrio";
import CrearAnexo11JefeBarrio from "../pages/permisionario/jefe/CrearAnexo11JefeBarrio";
import MensajeriaJefeBarrio from "../pages/permisionario/jefe/MensajeriaJefeBarrio";
import VerAnexo04JefeBarrio from "../pages/permisionario/jefe/VerAnexo04JefeBarrio";

/* POSTULANTE */
import PostulanteDashboard from "../pages/postulante/PostulanteDashboard";
import MisAnexos from "../pages/postulante/MisAnexos";
import VerAnexo from "../pages/postulante/VerAnexo";
import NuevaPostulacion from "../pages/postulante/NuevaPostulacion";
import Anexo01Institucional from "../pages/postulante/Anexo01Institucional";
import PostulacionesDashboard from "../pages/postulante/PostulacionesDashboard";
import PostulacionAlojamientoPlaceholder from "../pages/postulante/PostulacionAlojamientoPlaceholder";
import AlojamientoDocumentoReadonly from "../pages/postulante/AlojamientoDocumentoReadonly";

/* ALOJADO */
import AlojadoDashboard from "../pages/alojado/Dashboard";
import MisAnexosAlojado from "../pages/alojado/MisAnexos";
import AlojamientoDocumentoReadonlyAlojado from "../pages/alojado/AlojamientoDocumentoReadonly";
import HistorialOcupacionAlojado from "../pages/alojado/HistorialOcupacion";
import DatosDeclaradosAlojado from "../pages/alojado/DatosDeclarados";
import MisComunicacionesAlojado from "../pages/alojado/MisComunicaciones";
import MisLiquidacionesAlojado from "../pages/alojado/MisLiquidaciones";
import NovedadesAlojado from "../pages/alojado/Novedades";

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

function RedirectAlojamientosInspectorLegacy() {
  const location = useLocation();
  const target = location.pathname.replace(
    /^\/app\/alojamientos-inspector/,
    "/app/permisionario/alojamientos-inspector"
  );

  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
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

  {/* /app/postulante/mis-anexos/alojamientos/:id */}
  <Route path="mis-anexos/alojamientos/:id" element={<AlojamientoDocumentoReadonly />} />

  {/* /app/postulante/mis-anexos/:id */}
  <Route path="mis-anexos/:id" element={<VerAnexo />} />

  {/* /app/postulante/nueva-postulacion */}
  <Route path="nueva-postulacion" element={<NuevaPostulacion />} />

  {/* /app/postulante/postulaciones */}
  <Route path="postulaciones" element={<PostulacionesDashboard />} />

  {/* /app/postulante/postulaciones/alojamiento */}
  <Route path="postulaciones/alojamiento" element={<PostulacionAlojamientoPlaceholder />} />

  {/* /app/postulante/anexo-01 */}
  <Route path="anexo-01" element={<Anexo01Institucional />} />

  {/* fallback interno del postulante */}
  <Route path="*" element={<GenericUnavailable />} />
</Route>

        {/* ALOJADO */}
        <Route path="alojado" element={<AlojadoLayout />}>
          <Route index element={<AlojadoDashboard />} />
          <Route path="anexos" element={<MisAnexosAlojado />} />
          <Route path="anexos/:token" element={<AlojamientoDocumentoReadonlyAlojado />} />
          <Route path="ocupaciones" element={<HistorialOcupacionAlojado />} />
          <Route path="datos" element={<DatosDeclaradosAlojado />} />
          <Route path="comunicaciones" element={<MisComunicacionesAlojado />} />
          <Route path="liquidaciones" element={<MisLiquidacionesAlojado />} />
          <Route path="novedades" element={<NovedadesAlojado />} />
          <Route path="*" element={<GenericUnavailable />} />
        </Route>

        {/* INSPECTOR ALOJAMIENTOS (compatibilidad: módulo migrado bajo PERMISIONARIO) */}
        <Route path="alojamientos-inspector/*" element={<RedirectAlojamientosInspectorLegacy />} />

        {/* PERMISIONARIO */}
        <Route path="permisionario" element={<PermisionarioLayout />}>
          <Route index element={<PermisionarioDashboard />} />

          <Route path="anexos" element={<MisAnexosPermisionario />} />
          <Route path="anexos/:id" element={<VerAnexoPermisionario />} />
          <Route
            path="anexo-01-cambio-vivienda"
            element={
              <Anexo01Institucional
                defaultTipoSolicitud="CAMBIO_VIVIENDA"
                lockTipoSolicitud
                returnTo="/app/permisionario/anexos"
                submitSuccessTo="/app/permisionario/anexos"
                subtituloContextual="Solicitud de cambio de vivienda para Permisionario. Se reutiliza el circuito documental ANEXO_01 existente."
              />
            }
          />

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

          {/* ============================
              INSPECTOR ALOJAMIENTOS
              Base: /app/permisionario/alojamientos-inspector
              ============================ */}
          <Route path="alojamientos-inspector" element={<AlojamientosInspectorLayout />}>
            <Route index element={<AlojamientosInspectorDashboard />} />
            <Route path="inventario" element={<AlojamientosInspectorInventario />} />
            <Route path="documentos" element={<AlojamientosInspectorDocumentos />} />
            <Route path="documentos/:id" element={<AlojamientoDocumentoDetalleInspector />} />
            <Route path="*" element={<GenericUnavailable />} />
          </Route>

          {/* Mi Barrio (entry genérico existente, se deja intacto) */}
          <Route path="mi-barrio-jefe" element={<MiBarrioJefe />} />

{/* ============================
    JEFE DE BARRIO / MI BARRIO
    Base: /app/permisionario/mi-barrio-jefe
   ============================ */}
<Route path="mi-barrio-jefe" element={<MiBarrioJefe />} />
<Route path="mi-barrio-jefe/dashboard" element={<JefeBarrioDashboard />} />
<Route path="mi-barrio-jefe/gestiones" element={<GestionesJefeBarrio />} />
<Route path="mi-barrio-jefe/gestiones/:id" element={<GestionarAnexoJefeBarrio />} />
<Route path="mi-barrio-jefe/anexo-04/:id" element={<VerAnexo04JefeBarrio />} />
<Route path="mi-barrio-jefe/crear-anexo-11" element={<CrearAnexo11JefeBarrio />} />
<Route path="mi-barrio-jefe/mensajeria" element={<MensajeriaJefeBarrio />} />

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
          <Route
            path="alojamientos"
            element={<AlojamientosInventario basePath="/app/admin-general/alojamientos" />}
          />
          <Route
            path="alojamientos/inventario"
            element={<AlojamientosInventario basePath="/app/admin-general/alojamientos" />}
          />
          <Route
            path="alojamientos/dashboard"
            element={<AlojamientosDashboard basePath="/app/admin-general/alojamientos" />}
          />
          <Route path="alojamientos/:id" element={<AlojamientoDetalle />} />
          <Route path="gestiones" element={<GestionesAdminGeneral />} />
          <Route path="gestiones/alojamientos/:id" element={<AlojamientoDocumentoDetalle />} />
          <Route path="gestiones/:id" element={<GestionarAnexo />} />
          <Route path="mensajeria" element={<MensajeriaAdminGeneral />} />
          <Route path="liquidaciones" element={<LiquidacionesAdminGeneral />} />
          <Route path="servicios" element={<ServiciosAdminGeneral />} />
          <Route path="mantenimientos" element={<MantenimientosAdminGeneral />} />
          <Route path="auditoria" element={<AuditoriaInstitucionalPage />} />
          <Route path="liquidaciones-consulta" element={<LiquidacionesAdminConsulta />} />
          <Route path="liquidaciones-resumen" element={<LiquidacionesAdminResumen />} />
          <Route path="perfil" element={<PerfilAdminGeneral />} />
        </Route>

        {/* ADMIN */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<UsuariosAdmin />} />
          <Route path="viviendas" element={<ViviendasAdmin />} />
          <Route
            path="alojamientos"
            element={<AlojamientosInventario basePath="/app/admin/alojamientos" />}
          />
          <Route
            path="alojamientos/inventario"
            element={<AlojamientosInventario basePath="/app/admin/alojamientos" />}
          />
          <Route
            path="alojamientos/dashboard"
            element={<AlojamientosDashboard basePath="/app/admin/alojamientos" />}
          />
          <Route path="alojamientos/:id" element={<AlojamientoDetalle />} />
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
