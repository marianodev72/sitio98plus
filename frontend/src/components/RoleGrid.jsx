import React from "react";

const roles = [
  {
    id: "postulante",
    title: "Portal de postulantes",
    description:
      "Inscripción para acceder a vivienda fiscal o alojamiento naval, seguimiento de estado y carga de documentación.",
    badge: "Anexo 01 · Anexo 19",
    to: "/login",
    accent: "from-emerald-400/10 to-emerald-300/5 border-emerald-400/50",
  },
  {
    id: "permisionario",
    title: "Permisionarios",
    description:
      "Consultas de estado de la vivienda, pedidos de trabajo, formularios de inspección y actas de entrega.",
    badge: "Anexos 02 al 11",
    to: "/login",
    accent: "from-sky-400/10 to-sky-300/5 border-sky-400/50",
  },
  {
    id: "alojado",
    title: "Alojados",
    description:
      "Gestión de alojamientos navales, novedades, ampliaciones y solicitudes de baja.",
    badge: "Anexos 19 al 25",
    to: "/login",
    accent: "from-indigo-400/10 to-indigo-300/5 border-indigo-400/50",
  },
  {
    id: "administracion",
    title: "Administración & Inspectores",
    description:
      "Paneles de control, asignaciones, estadística de ocupación, mensajería interna y gestión integral.",
    badge: "Administración ZN98",
    to: "/login",
    accent: "from-gold/15 to-orange-300/5 border-gold/70",
  },
];

function RoleGrid() {
  return (
    <section
      id="portales"
      className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      {roles.map((role) => (
        <a
          key={role.id}
          href={role.to}
          className={`group relative flex flex-col h-full rounded-2xl bg-slate-950/50 border px-4 py-4 md:px-5 md:py-5 shadow-sm hover:shadow-soft hover:-translate-y-1 transition-all duration-200 ${role.accent}`}
        >
          <div className="flex-1">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900/70 text-[11px] text-slate-200 mb-3 border border-slate-700/80">
              {role.badge}
            </div>
            <h3 className="text-sand text-lg font-semibold mb-2">
              {role.title}
            </h3>
            <p className="text-xs md:text-sm text-slate-200/90 leading-relaxed">
              {role.description}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-200/90">
            <span className="group-hover:text-gold transition">
              Ingresar al portal
            </span>
            <span className="group-hover:translate-x-1 transition-transform">
              →
            </span>
          </div>
        </a>
      ))}
    </section>
  );
}

export default RoleGrid;
