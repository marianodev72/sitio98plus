// src/pages/PermisionarioAnexo11Nuevo.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

// SIN tildes para que coincida con el enum del backend
const tipoOpciones = ["CAMBIO", "REPARACION", "VERIFICACION", "PROVISION"];

const PermisionarioAnexo11Nuevo = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    unidad: "",
    dpto: "",
    mb: "",
    mz: "",
    casa: "",
    grado: "",
    apellidoNombre: "",
    tipoSolicitud: "REPARACION",
    detalle: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Prellenar nombre/grado desde zn98_user
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("zn98_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setForm((prev) => ({
          ...prev,
          apellidoNombre:
            (user.nombre || "") +
            (user.apellido ? " " + user.apellido : ""),
          grado: user.grado || "",
        }));
      }
    } catch (e) {
      console.warn("No se pudo leer zn98_user", e);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.detalle.trim()) {
      setErrorMsg("Por favor describí brevemente el trabajo solicitado.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("zn98_token");

      const resp = await fetch(`${API_BASE_URL}/api/anexo11`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          permisionario: {
            unidad: form.unidad,
            dpto: form.dpto,
            mb: form.mb,
            mz: form.mz,
            casa: form.casa,
            grado: form.grado,
            apellidoNombre: form.apellidoNombre,
            solicita: form.tipoSolicitud, // 👈 ESTE CAMPO ES EL DEL ENUM
            detalle: form.detalle,
          },
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo guardar el pedido.");
      }

      const data = await resp.json();

      setSuccessMsg("Pedido de trabajo enviado correctamente.");
      setTimeout(() => {
        navigate("/permisionario/gestiones/mis");
      }, 1200);
    } catch (err) {
      console.error("Error al crear Anexo 11:", err);
      setErrorMsg(err.message || "Error al enviar el pedido.");
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
          ← Volver a Mis gestiones
        </button>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Pedido de trabajo (Anexo 11)
        </h1>
        <p className="text-slate-300 mb-6 max-w-3xl text-sm md:text-base">
          Completá esta sección con tu solicitud. Luego el formulario será
          intervenido por el Inspector y por el Administrador General. Todas las
          actuaciones quedarán registradas.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0b1020] border border-slate-700/60 rounded-2xl p-6 space-y-6"
        >
          {/* Datos de ubicación */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Datos de la vivienda / unidad
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Unidad
                </label>
                <input
                  type="text"
                  name="unidad"
                  value={form.unidad}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Dpto.
                </label>
                <input
                  type="text"
                  name="dpto"
                  value={form.dpto}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">MB</label>
                <input
                  type="text"
                  name="mb"
                  value={form.mb}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">MZ</label>
                <input
                  type="text"
                  name="mz"
                  value={form.mz}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Casa
                </label>
                <input
                  type="text"
                  name="casa"
                  value={form.casa}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* Datos del permisionario */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Permisionario</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Grado
                </label>
                <input
                  type="text"
                  name="grado"
                  value={form.grado}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-300 mb-1">
                  Apellido y nombre
                </label>
                <input
                  type="text"
                  name="apellidoNombre"
                  value={form.apellidoNombre}
                  onChange={handleChange}
                  className="w-full rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tipo de solicitud */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Solicito</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {tipoOpciones.map((tipo) => (
                <button
                  type="button"
                  key={tipo}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, tipoSolicitud: tipo }))
                  }
                  className={`text-xs md:text-sm px-3 py-2 rounded-full border transition-colors ${
                    form.tipoSolicitud === tipo
                      ? "bg-sky-500 border-sky-400 text-white"
                      : "bg-[#050816] border-slate-700 text-slate-200 hover:border-sky-500"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Detalle */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Detalle del pedido</h2>
            <label className="block text-xs text-slate-300 mb-1">
              Describí claramente qué necesitás (lugar, problema, etc.).
            </label>
            <textarea
              name="detalle"
              value={form.detalle}
              onChange={handleChange}
              rows={5}
              className="w-full mt-1 rounded-md bg-[#050816] border border-slate-700 px-3 py-2 text-sm outline-none resize-y"
            />
          </div>

          {/* Mensajes */}
          {errorMsg && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded-md px-3 py-2">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-600/60 rounded-md px-3 py-2">
              {successMsg}
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col md:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate("/permisionario/mis-gestiones")}
              className="px-5 py-2 rounded-full border border-slate-600 text-sm hover:border-slate-400"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-sm font-semibold transition-colors"
            >
              {loading ? "Enviando..." : "Enviar pedido de trabajo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PermisionarioAnexo11Nuevo;
