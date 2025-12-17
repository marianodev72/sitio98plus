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
    tipoSolicitud: "",
    detalle: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Prefill de grado y nombre a partir del usuario guardado localmente
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("zn98_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setForm((prev) => ({
          ...prev,
          apellidoNombre:
            (user.nombre || "") + (user.apellido ? " " + user.apellido : ""),
          grado: user.grado || "",
        }));
      }
    } catch (e) {
      console.warn("No se pudo leer zn98_user", e);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTipoSolicitud = (tipo) => {
    setForm((prev) => ({
      ...prev,
      tipoSolicitud: tipo,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.tipoSolicitud) {
      setErrorMsg("Debés seleccionar el tipo de solicitud.");
      return;
    }

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
            solicita: form.tipoSolicitud, // 👈 debe coincidir con el enum
            detalle: form.detalle,
          },
        }),
      });

      // Intentamos leer el JSON SIEMPRE, pero sin romper si viene vacío
      let data = null;
      try {
        data = await resp.json();
      } catch (_) {
        data = null;
      }

      if (!resp.ok || (data && data.ok === false)) {
        const message =
          (data && data.message) || "No se pudo guardar el pedido.";
        throw new Error(message);
      }

      setSuccessMsg(
        (data && data.message) || "Pedido de trabajo enviado correctamente."
      );

      // Navegamos a "mis gestiones" luego de un pequeño delay
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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center">
      <div className="w-full max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">Permisionario</h1>
        <p className="text-sm text-slate-300 mb-6">
          Completá esta sección con tu solicitud. Luego el formulario será
          intervenido por el Inspector y por el Administrador General. Todas las
          actuaciones quedarán registradas.
        </p>

        {/* Mensajes */}
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-red-900/60 border border-red-500/60 px-4 py-3 text-sm">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl bg-emerald-900/60 border border-emerald-500/60 px-4 py-3 text-sm">
            {successMsg}
          </div>
        )}

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
                  name="unidad"
                  value={form.unidad}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Dpto.
                </label>
                <input
                  name="dpto"
                  value={form.dpto}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">MB</label>
                <input
                  name="mb"
                  value={form.mb}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">MZ</label>
                <input
                  name="mz"
                  value={form.mz}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Casa
                </label>
                <input
                  name="casa"
                  value={form.casa}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Datos del permisionario */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Permisionario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Grado
                </label>
                <input
                  name="grado"
                  value={form.grado}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Apellido y nombre
                </label>
                <input
                  name="apellidoNombre"
                  value={form.apellidoNombre}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm"
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
                  key={tipo}
                  type="button"
                  className={`px-4 py-2 rounded-full border text-xs font-semibold transition-colors ${
                    form.tipoSolicitud === tipo
                      ? "bg-sky-500 border-sky-400 text-white"
                      : "bg-transparent border-slate-600 text-slate-200 hover:border-sky-400"
                  }`}
                  onClick={() => handleTipoSolicitud(tipo)}
                >
                  {tipo.charAt(0) + tipo.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Detalle del pedido */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Detalle del pedido</h2>
            <p className="text-xs text-slate-400 mb-2">
              Describí claramente qué necesitás (lugar, problema, etc.).
            </p>
            <textarea
              name="detalle"
              rows={4}
              value={form.detalle}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-900/60 border border-slate-600 px-3 py-2 text-sm resize-y min-h-[120px]"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/60">
            <button
              type="button"
              className="px-6 py-2 rounded-full border border-slate-600 text-sm font-semibold hover:bg-slate-800/60"
              onClick={() => navigate("/permisionario/panel")}
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
