import React from "react";

export const AdminGeneralPedidosTrabajoPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-50">
      <h1 className="text-xl md:text-2xl font-semibold">
        Pedidos de trabajo y mantenimiento
      </h1>
      <p className="text-sm text-slate-300">
        Aquí se podrán visualizar, priorizar y derivar los pedidos de trabajo
        (reparaciones, mantenimiento, mejoras) relacionados con viviendas y
        alojamientos.
      </p>

      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
        Módulo en construcción. Luego incorporamos listados, filtros por
        estado (pendiente, en curso, finalizado) y vínculo con inspectores y
        jefes de barrio.
      </div>
    </div>
  );
};

export default AdminGeneralPedidosTrabajoPage;
