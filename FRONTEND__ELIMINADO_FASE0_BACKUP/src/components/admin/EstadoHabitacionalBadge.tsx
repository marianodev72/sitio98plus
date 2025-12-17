// src/components/admin/EstadoHabitacionalBadge.tsx

import React from "react";

export type EstadoHabitacionalType =
  | "SIN_VIVIENDA"
  | "PERMISIONARIO_ACTIVO"
  | "ALOJADO_ACTIVO"
  | "EN_LISTA_ESPERA"
  | "BAJA"
  | string;

interface EstadoHabitacionalBadgeProps {
  estado: EstadoHabitacionalType | null | undefined;
}

const ESTADO_LABELS: Record<string, string> = {
  SIN_VIVIENDA: "Sin vivienda",
  PERMISIONARIO_ACTIVO: "Permisionario activo",
  ALOJADO_ACTIVO: "Alojado activo",
  EN_LISTA_ESPERA: "En lista de espera",
  BAJA: "Baja",
};

const ESTADO_STYLES: Record<string, string> = {
  SIN_VIVIENDA: "bg-slate-900/70 text-slate-200 border-slate-500/70",
  PERMISIONARIO_ACTIVO:
    "bg-emerald-900/60 text-emerald-200 border-emerald-500/60",
  ALOJADO_ACTIVO: "bg-teal-900/60 text-teal-200 border-teal-500/60",
  EN_LISTA_ESPERA: "bg-amber-900/60 text-amber-200 border-amber-500/60",
  BAJA: "bg-rose-900/70 text-rose-200 border-rose-500/70",
};

export const EstadoHabitacionalBadge: React.FC<
  EstadoHabitacionalBadgeProps
> = ({ estado }) => {
  if (!estado) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-300">
        Sin dato
      </span>
    );
  }

  const normalized = String(estado).toUpperCase();
  const label = ESTADO_LABELS[normalized] ?? normalized;
  const styles =
    ESTADO_STYLES[normalized] ??
    "bg-slate-900/70 text-slate-200 border-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {label}
    </span>
  );
};
