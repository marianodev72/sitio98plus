import React from "react";

export const AdminGeneralAnexosCriticosPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-50">
      <h1 className="text-xl md:text-2xl font-semibold">Anexos críticos</h1>
      <p className="text-sm text-slate-300">
        Espacio previsto para revisar anexos críticos (documentación especial,
        informes técnicos, listados sensibles) asociados a viviendas o
        alojamientos.
      </p>

      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Módulo en construcción. Más adelante definimos qué anexos deben quedar
        visibles para cada rol y cómo se cargan/descargan de forma segura.
      </div>
    </div>
  );
};

export default AdminGeneralAnexosCriticosPage;
