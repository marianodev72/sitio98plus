// src/pages/Home.jsx

import InstitutionalHeader from "../components/layout/InstitutionalHeader";
import HeroCarousel from "../components/home/HeroCarousel";
import RoleCards from "../components/home/RoleCards";

export default function Home() {
  return (
    <div className="w-full">
      {/* Encabezado institucional */}
      <InstitutionalHeader />

      {/* Separación para que el carrusel no quede pegado */}
      <div className="mt-8" />

      {/* Hero principal: texto + carrusel */}
      <section className="max-w-6xl mx-auto px-4 pb-12 grid md:grid-cols-[1.1fr_1fr] gap-10 items-start">
        {/* Columna izquierda: título, texto y botones */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-400/40">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium tracking-[0.2em] text-emerald-200 uppercase">
              Portal oficial ZN98
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-50 leading-tight">
            Portal de Viviendas Fiscales y{" "}
            <span className="text-sky-400">
              Alojamientos Navales ZN98
            </span>
          </h1>

          <p className="text-slate-300 max-w-xl">
            Plataforma unificada para la gestión de viviendas fiscales,
            hogares de permisionarios y alojamientos del personal en la
            Zona Naval 98. Diseñada para simplificar trámites, mejorar la
            comunicación entre postulantes, permisionarios, alojados,
            inspectores y el Órgano Administrador.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#"
              className="px-6 py-3 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-50 font-semibold text-sm shadow-lg shadow-sky-500/30 transition"
            >
              Ingresar como postulante
            </a>
            <a
              href="#"
              className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-600 transition"
            >
              Acceso permisionarios / alojados
            </a>
          </div>
        </div>

        {/* Columna derecha: carrusel */}
        <div className="md:pl-4">
          <HeroCarousel />
        </div>
      </section>

      {/* Tarjetas de roles abajo */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <RoleCards />
      </section>
    </div>
  );
}
