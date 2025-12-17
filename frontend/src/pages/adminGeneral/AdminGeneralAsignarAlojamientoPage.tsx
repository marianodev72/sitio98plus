import React from "react";

export const AdminGeneralAsignarAlojamientoPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-50">
      <h1 className="text-xl md:text-2xl font-semibold">
        Asignar alojamiento naval
      </h1>
      <p className="text-sm text-slate-300">
        Desde este módulo se podrán gestionar las plazas de alojamientos
        (por ejemplo, camarotes, habitaciones) para el personal autorizado.
      </p>

      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Módulo en construcción. Luego definimos filtros (unidad, grado,
        destino, fechas de estadía, etc.) y lo integramos con el backend.
      </div>
    </div>
  );
};

export default AdminGeneralAsignarAlojamientoPage;
