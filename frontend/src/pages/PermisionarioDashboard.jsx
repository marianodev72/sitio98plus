// src/pages/PermisionarioDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const PermisionarioDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Panel de Permisionario</h1>
        <p className="text-slate-300 mb-8 max-w-3xl">
          Bienvenido, Carlos Allievi. Desde este panel vas a poder gestionar tu
          vivienda fiscal, tus comunicaciones y tus trámites como permisionario.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mis datos */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Mis datos</h2>
              <p className="text-slate-300 text-sm">
                Datos personales, grupo familiar y datos de contacto declarados
                en tu Anexo 01. Podés actualizarlos cuando cambie tu situación.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/permisionario/mis-datos")}
                className="w-full px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ver y actualizar datos
              </button>
            </div>
          </div>

          {/* Mis gestiones */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Mis gestiones</h2>
              <p className="text-slate-300 text-sm">
                Formularios internos, notas y presentaciones a la Alcaldía.
                Iniciá pedidos de trabajo y consultá el estado de tus
                gestiones.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/permisionario/mis-gestiones")}
                className="w-full px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ir a mis gestiones
              </button>
            </div>
          </div>

          {/* Mis comunicaciones */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Mis comunicaciones</h2>
              <p className="text-slate-300 text-sm">
                Mensajes con el Inspector, Jefe de Barrio, Administración y
                Alcaldía. Podés enviar y recibir comunicaciones y adjuntar
                documentación.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/permisionario/mis-comunicaciones")}
                className="w-full px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ir a mis comunicaciones
              </button>
            </div>
          </div>

          {/* Mis servicios */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Mis servicios</h2>
              <p className="text-slate-300 text-sm">
                Información de luz, agua, gas y solicitudes de mantenimiento.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/permisionario/mis-servicios")}
                className="w-full px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ver servicios
              </button>
            </div>
          </div>

          {/* Noticias y novedades */}
          <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Noticias y novedades
              </h2>
              <p className="text-slate-300 text-sm">
                Comunicaciones generales de la Alcaldía y enlaces a la Gaceta
                Marinera.
              </p>
            </div>
            <div className="mt-6">
              <span className="text-xs text-amber-400">Próximamente</span>
            </div>
          </div>

          {/* Postulación */}
          <div className="bg-[#023a52] border border-sky-700/80 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Postulación</h2>
              <p className="text-slate-100 text-sm">
                Accedé a tu panel de postulante para ver tus postulaciones
                anteriores y generar una nueva (Anexo 01) para cambio de
                vivienda.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/postulante")}
                className="w-full px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold transition-colors"
              >
                Ir al panel de postulante
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermisionarioDashboard;
