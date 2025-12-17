// src/components/admin/RoleBadge.tsx

import React from "react";

export type RoleType =
  | "POSTULANTE"
  | "PERMISIONARIO"
  | "ALOJADO"
  | "INSPECTOR"
  | "JEFE_DE_BARRIO"
  | "ADMIN"
  | "ADMIN_GENERAL"
  | string;

interface RoleBadgeProps {
  role: RoleType | null | undefined;
}

const ROLE_LABELS: Record<string, string> = {
  POSTULANTE: "Postulante",
  PERMISIONARIO: "Permisionario",
  ALOJADO: "Alojado",
  INSPECTOR: "Inspector",
  JEFE_DE_BARRIO: "Jefe de barrio",
  ADMIN: "Admin",
  ADMIN_GENERAL: "Admin general",
};

const ROLE_STYLES: Record<string, string> = {
  POSTULANTE: "bg-sky-900/60 text-sky-200 border-sky-500/60",
  PERMISIONARIO: "bg-emerald-900/60 text-emerald-200 border-emerald-500/60",
  ALOJADO: "bg-teal-900/60 text-teal-200 border-teal-500/60",
  INSPECTOR: "bg-amber-900/60 text-amber-200 border-amber-500/60",
  JEFE_DE_BARRIO: "bg-indigo-900/60 text-indigo-200 border-indigo-500/60",
  ADMIN: "bg-rose-900/60 text-rose-200 border-rose-500/60",
  ADMIN_GENERAL: "bg-fuchsia-900/60 text-fuchsia-200 border-fuchsia-500/60",
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  if (!role) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-300">
        Sin rol
      </span>
    );
  }

  const normalized = String(role).toUpperCase();
  const label = ROLE_LABELS[normalized] ?? normalized;
  const styles =
    ROLE_STYLES[normalized] ?? "bg-slate-900/70 text-slate-200 border-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {label}
    </span>
  );
};
