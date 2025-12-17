// src/pages/adminGeneral/AdminGeneralAsignarViviendaPage.tsx

import React from "react";

export const AdminGeneralAsignarViviendaPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-50">
      <h1 className="text-xl md:text-2xl font-semibold">
        Asignar vivienda fiscal
      </h1>

      <p className="text-sm text-slate-300">
        Aquí el ADMIN_GENERAL podrá buscar postulantes o permisionarios,
        seleccionar una vivienda disponible y registrar la asignación.
      </p>

      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Módulo en construcción. Definiremos juntos el flujo exacto
        (búsqueda por persona, por barrio, por tipo de unidad, etc.)
        y lo conectaremos con las APIs del backend.
      </div>
    </div>
  );
};

export default AdminGeneralAsignarViviendaPage;
