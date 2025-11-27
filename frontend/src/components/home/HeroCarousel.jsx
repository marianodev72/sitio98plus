// src/components/home/HeroCarousel.jsx
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    src: "/images/carrusel-1.jpg",
    title: "Barrio La Misión",
    caption: "Frente a Canal Beagle y de cara a la Ciudad.",
  },
  {
    src: "/images/carrusel-2.jpg",
    title: "Barrio Comandante Luis Piedrabuena",
    caption: "Sobre Av. Maipu enclavada en el casco centrico.",
  },
  {
    src: "/images/carrusel-3.jpg",
    title: "Barrio Almirante Brown",
    caption: "Barrio historico de la ciudad.",
  },
  {
    src: "/images/carrusel-4.jpg",
    title: "Barrio Almirante Storni",
    caption: "Complejo habitacional para la familia naval.",
  },
  {
    src: "/images/carrusel-5.jpg",
    title: "Poder Naval Argentino",
    caption: "Destructor Tipo Meko 360 A.R.A La Argentina.",
  },
  {
    src: "/images/carrusel-6.jpg",
    title: "Lanchas Rápidas en acción",
    caption: "Vocación de servicio en los confines maritimos del sur.",
  },
  {
    src: "/images/carrusel-7.jpg",
    title: "Fuerza de submarinos",
    caption: "Nuestra custodia silenciosa.",
  },
  {
    src: "/images/carrusel-8.jpg",
    title: "Aviación Naval",
    caption: "Medios aéreos operando en el litoral marítimo.",
  },
  {
    src: "/images/carrusel-9.jpg",
    title: "Infantería de marina",
    caption: "Entrenamiento y despliegue desde la zona austral.",
  },
  {
    src: "/images/carrusel-10.jpg",
    title: "Base Naval Ushuaia",
    caption: "Nuestra puerta a la Antartida.",
  },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);

  // Avance automático cada 6 segundos
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const goPrev = () =>
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((prev) => (prev + 1) % slides.length);

  const active = slides[index];

  return (
    <section
      aria-label="Galería de imágenes de viviendas y medios de la Armada"
      className="relative h-80 md:h-[22rem] lg:h-[24rem] overflow-hidden rounded-3xl bg-slate-900 shadow-2xl border border-slate-700/60"
    >
      {/* Imagen */}
      <img
        src={active.src}
        alt={active.title}
        className="h-full w-full object-cover"
      />

      {/* Degradado para legibilidad */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-slate-900/40 to-slate-900/10" />

      {/* Texto superpuesto */}
      <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6 lg:p-7">
        <div className="flex items-center justify-between text-xs font-medium text-sky-300 tracking-[0.2em] uppercase">
          <span>Sistema operativo</span>
          <span className="text-[0.7rem] text-slate-300/80">
            Panel ZN98 • {index + 1}/{slides.length}
          </span>
        </div>

        <div className="mt-4 space-y-2 sm:space-y-3">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-50 drop-shadow-md">
            {active.title}
          </h2>
          <p className="max-w-md text-sm sm:text-base text-slate-100/90">
            {active.caption}
          </p>
        </div>

        {/* Controles inferiores */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/70 backdrop-blur-sm transition hover:border-sky-400 hover:bg-slate-900/90"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4 text-slate-100" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-600/70 bg-slate-900/70 backdrop-blur-sm transition hover:border-sky-400 hover:bg-slate-900/90"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-4 w-4 text-slate-100" />
            </button>
          </div>

          {/* Puntos de progreso */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-sky-400"
                    : "w-2 bg-slate-500/60 hover:bg-slate-300/90"
                }`}
                aria-label={`Ir a la imagen ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
