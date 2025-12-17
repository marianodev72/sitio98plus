import React from "react";

export const AdminGeneralReportesEstadisticasPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-50">
      <h1 className="text-xl md:text-2xl font-semibold">
        Reportes y estadísticas
      </h1>
      <p className="text-sm text-slate-300">
        Panel reservado para indicadores de ocupación, rotación, tiempos de
        respuesta y otros datos operativos de la Zona Naval 98.
      </p>

      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Módulo en construcción. Más adelante conectamos esta vista con los
        endpoints del backend y agregamos gráficos (Recharts) y exportación de
        reportes.
      </div>
    </div>
  );
};

export default AdminGeneralReportesEstadisticasPage;
