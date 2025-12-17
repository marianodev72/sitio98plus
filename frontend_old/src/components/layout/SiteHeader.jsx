// src/components/layout/SiteHeader.jsx
function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Escudo / logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-500/60">
            <span className="text-sm font-bold text-sky-200">ZN</span>
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Alcaldía Naval Zona 98
            </p>
            <p className="text-sm font-semibold text-slate-50">
              Portal de Viviendas Fiscales
            </p>
          </div>
        </div>

        {/* Navegación principal (placeholder) */}
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#" className="hover:text-sky-300">
            Inicio
          </a>
          <a href="#" className="hover:text-sky-300">
            Postulaciones
          </a>
          <a href="#" className="hover:text-sky-300">
            Permisionarios
          </a>
          <a href="#" className="hover:text-sky-300">
            Alojados
          </a>
          <a href="#" className="hover:text-sky-300">
            Administración
          </a>
        </nav>

        {/* Botón de acceso */}
        <div className="flex items-center gap-2">
          <button className="rounded-full border border-sky-500/70 bg-sky-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/30 hover:bg-sky-500">
            Ingresar al portal
          </button>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
