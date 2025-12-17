// src/layout/AdminGeneralLayout.tsx

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEffect } from "react";

export function AdminGeneralLayout() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuthStore();

  // 🔐 Proteger la ruta: si no hay token o no hay user, volver a login
  useEffect(() => {
    if (!token || !user) {
      navigate("/login", { replace: true });
    }
  }, [token, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra superior */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold">
              98
            </div>
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-300">
                SITIO 98 PLUS
              </div>
              <div className="text-sm text-slate-300">
                Panel de Administración General
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            {user && (
              <div className="text-right text-xs">
                <div className="font-semibold text-slate-100">
                  {user.nombre}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-sky-300">
                  {user.role}
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-red-500 hover:bg-red-500/10 hover:text-red-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal con sidebar */}
      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-4">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Navegación
          </div>
          <nav className="space-y-1 text-sm">
            {/* Dashboard / Resumen */}
            <AdminNavItem to="/app/admin-general" label="Resumen" />

            {/* VIVIENDAS */}
            <AdminNavItem
              to="/app/admin-general/viviendas"
              label="Viviendas"
            />

            {/* USUARIOS */}
            <AdminNavItem
              to="/app/admin-general/usuarios"
              label="Usuarios"
            />

            {/* MENSAJES (placeholder para futura implementación) */}
            <AdminNavItem
              to="/app/admin-general/mensajes"
              label="Mensajes"
            />

            {/* GESTIONES (anexos del ADMIN_GENERAL) */}
            <AdminNavItem
              to="/app/admin-general/gestiones"
              label="Gestiones"
            />

            {/* ESTADÍSTICAS */}
            <AdminNavItem
              to="/app/admin-general/estadisticas"
              label="Estadísticas"
            />
          </nav>
        </aside>

        {/* Área de contenido */}
        <main className="flex-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/app/admin-general"}
      className={({ isActive }) =>
        [
          "flex items-center justify-between rounded-lg px-3 py-2 text-xs md:text-sm transition",
          "hover:bg-slate-800/70 hover:text-sky-200",
          isActive ? "bg-slate-800 text-sky-300" : "text-slate-200",
        ].join(" ")
      }
    >
      <span>{label}</span>
    </NavLink>
  );
}
