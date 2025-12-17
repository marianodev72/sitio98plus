import React, { useEffect, useState } from "react";

const slides = [
  {
    id: 1,
    title: "Zona Naval 98 · Ushuaia",
    subtitle:
      "Gestión moderna de viviendas fiscales y alojamientos navales para el personal de la Armada Argentina.",
    badge: "Plataforma institucional",
  },
  {
    id: 2,
    title: "Postulación en línea",
    subtitle:
      "Los postulantes pueden inscribirse, seguir su estado y subir la documentación desde cualquier dispositivo.",
    badge: "Postulantes",
  },
  {
    id: 3,
    title: "Transparencia y trazabilidad",
    subtitle:
      "Cada asignación, inspección y acta se registran como formularios digitales vinculados a la vivienda o alojamiento.",
    badge: "Administración",
  },
];

function HomeCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const current = slides[index];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navyLight to-navy shadow-soft border border-slate-800/80">
      {/* Degradado decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-24 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative px-6 py-10 md:px-10 md:py-14 grid md:grid-cols-2 gap-8 items-center">
        {/* Texto principal */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/80 text-xs text-slate-200 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {current.badge}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-sand mb-4">
            {current.title}
          </h1>
          <p className="text-slate-200/90 text-sm md:text-base mb-6">
            {current.subtitle}
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="#portales"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-gold text-navy font-semibold text-sm shadow-soft hover:bg-yellow-300 transition"
            >
              Ver portales de acceso
            </a>
            <a
              href="https://www.alcaldiazn98.ar/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-slate-400/70 text-slate-100 text-sm hover:bg-slate-100/5 transition"
            >
              Sitio institucional actual
            </a>
          </div>
        </div>

        {/* “Imagen”/tarjeta lateral */}
        <div className="hidden md:block">
          <div className="relative h-56 md:h-64 lg:h-72 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-soft overflow-hidden">
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.28),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.3),transparent_55%)]" />
            <div className="relative z-10 h-full flex flex-col justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-300 mb-2">
                  Paneles internos
                </p>
                <p className="text-lg font-semibold text-sand">
                  Panel de administración · Panel de inspectores · Portal de
                  postulantes
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-100/90">
                <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-600">
                  Formularios ANEXO digitalizados
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-600">
                  Estadísticas de ocupación
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-600">
                  Mensajería interna
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores del carrusel */}
      <div className="flex items-center justify-center gap-2 pb-4">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              index === i ? "w-6 bg-gold" : "w-2 bg-slate-500"
            }`}
            aria-label={`Ir al slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default HomeCarousel;
