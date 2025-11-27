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
          Desde esta sección vas a poder iniciar y consultar tus gestiones
          internas con la Alcaldía. En esta primera etapa vas a encontrar el
          formulario de <strong>Pedido de trabajo (Anexo 11)</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Pedido de trabajo (Anexo 11) */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Pedido de trabajo (Anexo 11)
              </h2>
              <p className="text-slate-300 text-sm">
                Formulario para solicitar reparaciones, verificaciones o
                provisiones en tu vivienda fiscal. El trámite será intervenido
                por el Inspector y el Administrador General.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() =>
                  navigate("/permisionario/gestiones/anexo11/nuevo")
                }
                className="w-full md:w-auto px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Iniciar pedido de trabajo
              </button>
            </div>
          </div>

          {/* Card: Ver mis gestiones */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Ver mis gestiones</h2>
              <p className="text-slate-300 text-sm">
                Listado de todos los pedidos iniciados, en curso y finalizados.
                Podrás ver el detalle de cada gestión y las intervenciones del
                Inspector y del Administrador General.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/permisionario/gestiones/mis")}
                className="w-full md:w-auto px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ver mis gestiones
              </button>
            </div>
          </div>

          {/* Espacio reservado para futuros anexos 3,4,7,8,9 */}
          <div className="bg-[#0b1020] border border-dashed border-slate-700/60 rounded-2xl p-6 md:col-span-2">
            <h2 className="text-lg font-semibold mb-1">
              Próximamente: otros formularios
            </h2>
            <p className="text-slate-400 text-sm">
              En esta sección se irán incorporando los formularios internos
              restantes (Anexos 3, 4, 7, 8 y 9) para que puedas gestionarlos
              desde el mismo panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermisionarioGestiones;
