// src/pages/adminGeneral/AdminGeneralGestionesPage.tsx
import { useNavigate } from "react-router-dom";

export default function AdminGeneralGestionesPage() {
  const nav = useNavigate();

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h1 className="text-xl font-bold text-slate-100">Mis Gestiones</h1>
        <p className="text-xs text-slate-400">
          Acciones institucionales (cada gestión se inicia desde un botón).
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => nav("asignaciones")}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-bold text-white"
          >
            ASIGNAR VIVIENDA (ANEXO 02)
          </button>

          <button
            onClick={() => nav("/app/admin-general")}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-sm font-bold text-slate-100"
          >
            INICIO
          </button>
        </div>
      </section>
    </div>
  );
}
