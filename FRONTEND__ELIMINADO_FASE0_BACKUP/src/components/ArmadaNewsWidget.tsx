// src/components/ArmadaNewsWidget.tsx

import React from "react";

export const ArmadaNewsWidget: React.FC = () => {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-slate-400">
        Enlace de ejemplo a noticias institucionales de la Armada Argentina.
        Más adelante podemos reemplazar esto por un feed real o enlaces
        oficiales que nos indiquen.
      </p>

      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>
          <a
            href="#"
            className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            Ceremonia en la Base Naval Ushuaia – 05 DIC 2025
          </a>
        </li>
        <li>
          <a
            href="#"
            className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            Operativo de apoyo a comunidades aisladas en la Patagonia
          </a>
        </li>
        <li>
          <a
            href="#"
            className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
          >
            Programa de mantenimiento preventivo de viviendas fiscales
          </a>
        </li>
      </ul>

      <p className="text-[11px] text-slate-500">
        * Contenido de demostración. Los enlaces definitivos se configurarán
        con la Jefatura correspondiente.
      </p>
    </div>
  );
};

export default ArmadaNewsWidget;
