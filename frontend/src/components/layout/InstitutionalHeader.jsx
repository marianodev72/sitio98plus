// src/components/layout/InstitutionalHeader.jsx

export default function InstitutionalHeader() {
  return (
    <header
      className="
        w-full
        bg-slate-900/80
        border-b border-slate-700
        px-4 py-4
        flex flex-col items-center gap-3
        md:flex-row md:justify-between md:items-center md:px-8 md:py-4
      "
    >
      {/* ESCUDO ARMADA ARGENTINA */}
      <img
        src="/escudos/escudo-armada.PNG"
        alt="Escudo Armada Argentina"
        className="w-16 h-auto md:w-20"
      />

      {/* TITULOS CENTRALES */}
      <div className="text-center md:flex-1">
        <h1
          className="
            text-2xl md:text-3xl
            font-bold
            text-white
            tracking-wide
          "
        >
          ARMADA ARGENTINA
        </h1>
        <h2
          className="
            text-sm md:text-lg
            text-slate-300
            mt-1
            tracking-wide
          "
        >
          ÁREA NAVAL AUSTRAL
        </h2>
      </div>

      {/* ESCUDO BASE NAVAL USHUAIA */}
      <img
        src="/escudos/base-naval.PNG"
        alt="Escudo Base Naval Ushuaia"
        className="w-16 h-auto md:w-20"
      />
    </header>
  );
}
