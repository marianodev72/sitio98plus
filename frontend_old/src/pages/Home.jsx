// frontend/src/pages/Home.jsx

import { Link } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";
import HeroCarousel from "../components/home/HeroCarousel";

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-50">
      {/* Encabezado institucional con escudos */}
      <InstitutionalHeader />

      {/* Hero superior: título + texto + botones */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-12">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
            Portal de Viviendas Fiscales y{" "}
            <span className="text-sky-400">Alojamientos Navales ZN98</span>
          </h1>

          <p className="text-slate-300">
            Plataforma unificada para la gestión de viviendas fiscales, hogares
            de permisionarios y alojamientos del personal en la Zona Naval 98.
            Diseñada para simplificar trámites y mejorar la comunicación entre
            postulantes, permisionarios, alojados, inspectores y el Órgano
            Administrador.
          </p>

          {/* Botones principales: Registro / Ingreso */}
          <div className="flex flex-wrap gap-4 mt-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-50 font-semibold text-sm shadow-lg shadow-emerald-500/30 transition"
            >
              Registrarse
            </Link>

            <Link
              to="/login"
              className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-600 transition"
            >
              Ingresar al portal
            </Link>
          </div>
        </div>
      </section>

      {/* Carrusel ocupando todo el ancho disponible */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <HeroCarousel />
        </div>
      </section>
    </div>
  );
}
