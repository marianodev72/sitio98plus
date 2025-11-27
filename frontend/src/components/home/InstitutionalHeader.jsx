export default function InstitutionalHeader() {
  return (
    <div className="w-full flex flex-col items-center mt-8 mb-10">
      <div className="w-full flex items-center justify-between px-10">
        
        {/* Escudo Armada (izquierda) */}
        <img
          src="/escudos/armada.png"
          alt="Escudo Armada Argentina"
          className="w-24 h-auto"
        />

        {/* Títulos */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-wide">
            ARMADA ARGENTINA
          </h1>
          <h2 className="text-xl text-gray-300 mt-1 tracking-wide">
            ÁREA NAVAL AUSTRAL
          </h2>
        </div>

        {/* Escudo Base Naval (derecha) */}
        <img
          src="/escudos/base-naval.png"
          alt="Escudo Base Naval Ushuaia"
          className="w-24 h-auto"
        />
      </div>
    </div>
  );
}
