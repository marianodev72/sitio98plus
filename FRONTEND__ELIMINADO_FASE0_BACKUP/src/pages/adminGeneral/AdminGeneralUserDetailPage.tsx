// src/pages/adminGeneral/AdminGeneralUserDetailPage.tsx

import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { AdminUserSummary } from "../../api/users";
import { RoleBadge } from "../../components/admin/RoleBadge";
import { EstadoHabitacionalBadge } from "../../components/admin/EstadoHabitacionalBadge";

interface LocationState {
  user?: AdminUserSummary;
}

export const AdminGeneralUserDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const user = state?.user;

  const volver = () => navigate("/app/admin-general/usuarios");

  if (!user) {
    return (
      <div className="space-y-4 text-slate-50">
        <h1 className="text-2xl font-semibold">Detalle de usuario</h1>
        <p className="text-sm text-amber-300">
          No se recibieron los datos del usuario (ID: {id}). Regresá al listado
          y volvé a abrir el detalle.
        </p>
        <button
          type="button"
          onClick={volver}
          className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
        >
          ← Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-50">
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">
            {user.apellido}, {user.nombre}
          </h1>
          <p className="text-sm text-slate-300">
            Detalle del usuario en el sistema SITIO 98 PLUS.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <RoleBadge role={user.role} />
          <EstadoHabitacionalBadge estado={user.estadoHabitacional} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 space-y-2 text-sm">
          <h2 className="text-sm font-semibold text-slate-100">
            Datos principales
          </h2>
          <p className="text-xs text-slate-300">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="text-xs text-slate-300">
            <strong>Rol:</strong> <RoleBadge role={user.role} />
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 space-y-2 text-sm">
          <h2 className="text-sm font-semibold text-slate-100">
            Situación habitacional
          </h2>
          <p className="text-xs text-slate-300">
            <strong>Estado:</strong>{" "}
            <EstadoHabitacionalBadge estado={user.estadoHabitacional} />
          </p>
          <p className="text-xs text-slate-300">
            <strong>Unidad asignada:</strong>{" "}
            {user.viviendaAsignada
              ? "Vivienda fiscal"
              : user.alojamientoAsignado
              ? "Alojamiento naval"
              : "Sin unidad asignada"}
          </p>
          <p className="text-xs text-slate-300">
            <strong>Barrio:</strong> {user.barrioAsignado ?? "—"}
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={volver}
        className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
      >
        ← Volver al listado
      </button>
    </div>
  );
};

export default AdminGeneralUserDetailPage;
