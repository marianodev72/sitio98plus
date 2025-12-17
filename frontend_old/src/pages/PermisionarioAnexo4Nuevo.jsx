// src/pages/PermisionarioAnexo4Nuevo.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

const PermisionarioAnexo4Nuevo = () => {
  const navigate = useNavigate();

  const [barrio, setBarrio] = useState("");
  const [vivienda, setVivienda] = useState("");
  const [representante, setRepresentante] = useState("");
  const [destinosFamiliares, setDestinosFamiliares] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaRegreso, setFechaRegreso] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("zn98_user") || "null");
  const token = localStorage.getItem("zn98_token");

  // Intentamos precargar número de vivienda desde el usuario, si existe
  useEffect(() => {
    if (!user) return;
    const posibleVivienda =
      user?.vivienda?.numero ||
      user?.vivienda?.casa ||
      user?.vivienda?.dpto ||
      user?.casa ||
      user?.numeroVivienda ||
      "";

    if (posibleVivienda) {
      setVivienda(posibleVivienda.toString());
    }
  }, [user]);

  const enviar = async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      if (!barrio.trim()) {
        throw new Error("Debés informar el barrio de la vivienda.");
      }

      const body = {
        barrio,
        vivienda,
        representante,
        destinosFamiliares,
        observaciones,
        fechaSalida: fechaSalida || undefined,
        fechaRegreso: fechaRegreso || undefined,
        permisionarioNombre: user?.nombreCompleto || user?.nombre || "",
        permisionarioGrado: user?.grado || "",
      };

      const resp = await fetch(`${API_BASE_URL}/api/anexo4`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok || data.ok === false) {
        throw new Error(data.message || "No se pudo crear el Anexo 4.");
      }

      alert("Anexo 4 enviado correctamente.");
      navigate("/permisionario/gestiones/anexo4/mis");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/mis-gestiones")}
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold mb-2">Nuevo Anexo 4</h1>
        <p className="text-slate-400 mb-6">
          Este formulario se enviará automáticamente al Jefe de Barrio.
        </p>

        {errorMsg && (
          <div className="text-red-400 bg-red-900/40 border border-red-700 px-3 py-2 rounded-md mb-6">
            {errorMsg}
          </div>
        )}

        <div className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 space-y-4">
          {/* BARRIO */}
          <div>
            <label className="block text-slate-300 text-sm mb-1">
              Barrio *
            </label>
            <input
              type="text"
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
            />
          </div>

          {/* VIVIENDA */}
          <div>
            <label className="block text-slate-300 text-sm mb-1">
              Vivienda
            </label>
            <input
              type="text"
              value={vivienda}
              onChange={(e) => setVivienda(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
              placeholder="Número de vivienda asignada"
            />
          </div>

          {/* REPRESENTANTE */}
          <div>
            <label className="block text-slate-300 text-sm mb-1">
              Datos del representante
            </label>
            <input
              type="text"
              value={representante}
              onChange={(e) => setRepresentante(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
              placeholder="Nombre completo, grado, vínculo, etc."
            />
          </div>

          {/* DESTINOS FAMILIARES */}
          <div>
            <label className="block text-slate-300 text-sm mb-1">
              Destinos familiares
            </label>
            <textarea
              value={destinosFamiliares}
              onChange={(e) => setDestinosFamiliares(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
              rows={3}
            ></textarea>
          </div>

          {/* OBSERVACIONES */}
          <div>
            <label className="block text-slate-300 text-sm mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
              rows={3}
            ></textarea>
          </div>

          {/* FECHAS SALIDA / REGRESO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 text-sm mb-1">
                Salida (fecha de ausencia)
              </label>
              <input
                type="date"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1">
                Regreso (fecha de regreso)
              </label>
              <input
                type="date"
                value={fechaRegreso}
                onChange={(e) => setFechaRegreso(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              onClick={enviar}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar Anexo 4"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermisionarioAnexo4Nuevo;
