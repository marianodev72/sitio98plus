// src/components/layout/SiteFooter.jsx
function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>
          © {year} Órgano Administrador de Viviendas Fiscales – Zona Naval 98.
          Todos los derechos reservados - Mariano Devoto.
        </p>
        <p className="text-[11px]">
          Sistema interno para gestión de viviendas fiscales y alojamientos
          navales.
        </p>
      </div>
    </footer>
  );
}

export default SiteFooter;
