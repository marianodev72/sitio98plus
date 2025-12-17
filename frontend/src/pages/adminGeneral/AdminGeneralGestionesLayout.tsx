// src/pages/adminGeneral/AdminGeneralGestionesLayout.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AdminGeneralGestionesLayout() {
  const nav = useNavigate();
  const loc = useLocation();

  const base = "/app/admin-general/gestiones";
  const isInicio = loc.pathname === base;
  const isAsignar = loc.pathname === `${base}/asignar-vivienda`;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Mis Gestiones</h1>
            <p className="text-xs text-slate-400">
              Acciones institucionales (cada gestión se inicia desde un botón).
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => nav(base)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold border",
              isInicio
                ? "bg-sky-600 text-white border-sky-500"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800",
            ].join(" ")}
          >
            INICIO
          </button>

          <button
            onClick={() => nav(`${base}/asignar-vivienda`)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold border",
              isAsignar
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800",
            ].join(" ")}
          >
            ASIGNAR VIVIENDA (ANEXO 02)
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
