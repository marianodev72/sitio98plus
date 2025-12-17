// src/pages/Anexo7Form.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// 🔹 API base sin imports rotos
const API_BASE_URL = "http://localhost:3000/api";

export default function Anexo7Form() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [cargando, setCargando] = useState(isEdit);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    novedadesAdicionales: "",
  });

  const [cabecera, setCabecera] = useState({
    nombrePermisionario: "",
    barrio: "",
    vivienda: "",
    inspector: "INSPECTOR",
  });

  useEffect(() => {
    if (!isEdit) {
      setCargando(false);
      return;
    }

    const fetchAnexo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/anexo7/${id}`, {
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) return;

        setForm({
          novedadesAdicionales: data.novedadesAdicionales || "",
        });

        setCabecera({
          nombrePermisionario: data.nombrePermisionario || "",
          barrio: data.barrio || "",
          vivienda: data.vivienda || "",
          inspector: data.inspector || "INSPECTOR",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };

    fetchAnexo();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit
        ? `${API_BASE_URL}/anexo7/${id}`
        : `${API_BASE_URL}/anexo7`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          novedadesAdicionales: form.novedadesAdicionales,
        }),
      });

      if (!res.ok) {
        alert("Error guardando Anexo 7");
        return;
      }

      navigate("/permisionario/gestiones/anexo7/mis");
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          className="text-sm text-sky-400 hover:text-sky-300 mb-4"
          onClick={() => navigate("/permisionario/gestiones/anexo7/mis")}
        >
          ← Volver a mis Anexos 7
        </button>

        <h1 className="text-3xl font-bold mb-4">
          {isEdit ? "Editar Anexo 7" : "Nuevo Anexo 7"}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0b1020] border border-slate-700/60 p-6 rounded-2xl space-y-6"
        >
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Permisionario</p>
              <p className="text-slate-100">
                {cabecera.nombrePermisionario || "Se completará automáticamente"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Barrio</p>
              <p className="text-slate-100">
                {cabecera.barrio || "Se completará automáticamente"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Vivienda</p>
              <p className="text-slate-100">
                {cabecera.vivienda || "Se completará automáticamente"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Inspector</p>
              <p className="text-slate-100">{cabecera.inspector}</p>
            </div>
          </div>

          <div>
            <label className="text-slate-300 text-sm block mb-2">
              Novedades adicionales:
            </label>
            <textarea
              required
              value={form.novedadesAdicionales}
              onChange={(e) =>
                setForm({
                  ...form,
                  novedadesAdicionales: e.target.value,
                })
              }
              rows={10}
              className="w-full bg-slate-900 border border-slate-700/60 rounded-xl p-3 text-slate-100 text-sm"
              placeholder="Escribí las novedades adicionales..."
            ></textarea>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-sm font-semibold disabled:opacity-60"
            >
              {guardando
                ? "Guardando..."
                : isEdit
                ? "Guardar cambios"
                : "Crear Anexo 7"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/permisionario/gestiones/anexo7/mis")}
              className="px-6 py-2 rounded-full border border-slate-500 text-slate-300 hover:bg-slate-800 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
