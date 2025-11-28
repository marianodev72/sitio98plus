// src/pages/PermisionarioGestiones.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const PermisionarioGestiones = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">

        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario")}
        >
          ← Volver al panel
        </button>

        <h1 className="text-3xl font-bold mb-2">Mis gestiones</h1>
        <p className="text-slate-300 mb-8 max-w-3xl">
          Desde esta sección vas a poder iniciar y consultar tus gestiones internas con la Alcaldía.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ANEXO 11 */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <h2 className="text-xl font-semibold mb-2">Pedido de trabajo (Anexo 11)</h2>
            <p className="text-slate-300 text-sm">
              Formulario para solicitar reparaciones y verificaciones en la vivienda fiscal.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  navigate("/permisionario/gestiones/anexo11/nuevo")
                }
                className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Iniciar
              </button>
              <button
                onClick={() =>
                  navigate("/permisionario/gestiones/mis")
                }
                className="px-6 py-2 rounded-full border border-sky-400 text-sky-400 hover:bg-sky-700/20 text-sm font-semibold"
              >
                Ver mis gestiones
              </button>
            </div>
          </div>

          {/* ANEXO 3 */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <h2 className="text-xl font-semibold mb-2">Acta de recepción (Anexo 3)</h2>
            <p className="text-slate-300 text-sm">
              Acta generada por el Inspector. Vos solo tenés que dar conformidad o pedir revisión.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate("/permisionario/gestiones/anexo3/mis")}
                className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ver mis actas
              </button>
            </div>
          </div>

          {/* ANEXO 4 */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <h2 className="text-xl font-semibold mb-2">Formulario de novedades (Anexo 4)</h2>
            <p className="text-slate-300 text-sm">
              Formulario que completás vos como permisionario para informar novedades al Jefe de Barrio.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  navigate("/permisionario/gestiones/anexo4/nuevo")
                }
                className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Iniciar Anexo 4
              </button>
              <button
                onClick={() =>
                  navigate("/permisionario/gestiones/anexo4/mis")
                }
                className="px-6 py-2 rounded-full border border-sky-400 text-sky-400 hover:bg-sky-700/20 text-sm font-semibold"
              >
                Ver mis Anexo 4
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PermisionarioGestiones;
