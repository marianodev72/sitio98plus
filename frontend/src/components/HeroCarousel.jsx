import { useEffect, useState } from "react";

const slides = [
  {
    id: 1,
    title: "Viviendas Fiscales ZN98",
    subtitle: "Administración, gestión y mantenimiento al servicio del personal.",
    image:
      "https://images.pexels.com/photos/439391/pexels-photo-439391.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 2,
    title: "Alojamientos Navales",
    subtitle: "Camarotes y alojamientos para el personal sin grupo familiar.",
    image:
      "https://images.pexels.com/photos/1167021/pexels-photo-1167021.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 3,
    title: "Gestión Digital",
    subtitle: "Postulaciones, formularios, mensajería y estadísticas en un solo portal.",
    image:
      "https://images.pexels.com/photos/1181243/pexels-photo-1181243.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setCurrent((prev) => (prev + 1) % slides.length),
      6000
    );
    return () => clearInterval(timer);
  }, []);

  const activeSlide = slides[current];

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      {/* Imagen de fondo */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${activeSlide.image})` }}
      />
      {/* Degradado */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/60 to-transparent" />

      {/* Contenido */}
      <div className="relative z-10 flex h-full flex-col justify-center px-6 md:px-10">
        <h1 className="max-w-xl text-2xl font-bold text-gold md:text-3xl">
          {activeSlide.title}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-100 md:text-base">
          {activeSlide.subtitle}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-300">
          SITIO 98 · SISTEMA INTEGRAL
        </p>
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setCurrent(idx)}
            className={`h-2 w-6 rounded-full transition ${
              idx === current ? "bg-gold" : "bg-slate-500/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
