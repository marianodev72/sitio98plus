// src/pages/PermisionarioMisDatos.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function PermisionarioMisDatos() {
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [datos, setDatos] = useState(null);

  const [form, setForm] = useState({
    telefono: "",
    email: "",
    domicilio: "",
    destinoActual: "",
    grado: "",
    fechaUltimoAscenso: "",
  });

  const [grupoFamiliar, setGrupoFamiliar] = useState([]);
  const [animales, setAnimales] = useState([]);

  // --------------------------------------------------
  // Cargar datos al entrar
  // --------------------------------------------------
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError("");
        setSuccessMsg("");

        const token = localStorage.getItem("zn98_token");
        if (!token) {
          setError("No se encontró una sesión activa. Volvé a iniciar sesión.");
          setCargando(false);
          navigate("/login");
          return;
        }

        const resp = await fetch(
          `${API_BASE_URL}/api/permisionario/mis-datos`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          setError(data.msg || "No se pudieron obtener tus datos.");
          setCargando(false);
          return;
        }

        const d = data.datos || {};
        setDatos(d);

        setForm({
          telefono: d.telefono || "",
          email: d.email || "",
          domicilio: d.domicilio || "",
          destinoActual: d.destinoActual || "",
          grado: d.grado || "",
          fechaUltimoAscenso: d.fechaUltimoAscenso
            ? new Date(d.fechaUltimoAscenso).toISOString().slice(0, 10)
            : "",
        });

        setGrupoFamiliar(
          Array.isArray(d.grupoFamiliar) ? d.grupoFamiliar : []
        );
        setAnimales(Array.isArray(d.animales) ? d.animales : []);

        setCargando(false);
      } catch (err) {
        console.error("[MIS DATOS] Error cargando datos:", err);
        setError("Error al conectar con el servidor.");
        setCargando(false);
      }
    };

    cargarDatos();
  }, [navigate]);

  // --------------------------------------------------
  // Handlers de formulario
  // --------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Grupo familiar
  const handleGrupoChange = (index, field, value) => {
    setGrupoFamiliar((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [field]: value };
      return copia;
    });
  };

  const agregarConviviente = () => {
    setGrupoFamiliar((prev) => [
      ...prev,
      {
        nombreCompleto: "",
        relacion: "",
        aCargo: "SI",
        edad: "",
        dni: "",
        diba: "",
      },
    ]);
  };

  const eliminarConviviente = (index) => {
    setGrupoFamiliar((prev) => prev.filter((_, i) => i !== index));
  };

  // Animales
  const handleAnimalChange = (index, field, value) => {
    setAnimales((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [field]: value };
      return copia;
    });
  };

  const agregarAnimal = () => {
    setAnimales((prev) => [
      ...prev,
      {
        especie: "",
        raza: "",
        edad: "",
        sexo: "",
        pesoKg: "",
      },
    ]);
  };

  const eliminarAnimal = (index) => {
    setAnimales((prev) => prev.filter((_, i) => i !== index));
  };

  // --------------------------------------------------
  // Guardar (con validaciones)
  // --------------------------------------------------
  const handleGuardar = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Validaciones básicas de front
    if (
      form.telefono &&
      !/^[0-9+\-\s()]+$/.test(form.telefono.trim())
    ) {
      setError(
        "El teléfono solo puede contener números, espacios y los caracteres + - ( )."
      );
      return;
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setError("El formato de email no es válido.");
      return;
    }

    try {
      const token = localStorage.getItem("zn98_token");

      if (!token) {
        setError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }

      setSaving(true);

      const payload = {
        telefono: form.telefono,
        email: form.email,
        domicilio: form.domicilio,
        destinoActual: form.destinoActual,
        grado: form.grado,
        fechaUltimoAscenso: form.fechaUltimoAscenso || null,
        grupoFamiliar,
        animales,
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/permisionario/mis-datos`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        setError(data.msg || "No se pudieron guardar los cambios.");
        return;
      }

      setDatos(data.datos);
      setSuccessMsg("Datos actualizados correctamente.");
    } catch (err) {
      console.error("[MIS DATOS] Error guardando datos:", err);
      setError("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Distintos estados
  // --------------------------------------------------
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InstitutionalHeader />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/permisionario")}
            className="mb-4 text-sky-400 text-sm underline"
          >
            ← Volver al panel
          </button>
          <p className="text-slate-300 text-sm">Cargando tus datos…</p>
        </main>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InstitutionalHeader />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/permisionario")}
            className="mb-4 text-sky-400 text-sm underline"
          >
            ← Volver al panel
          </button>
          <p className="text-slate-300 text-sm">
            No se encontraron datos de permisionario.
          </p>
        </main>
      </div>
    );
  }

  const capacidadTotal =
    1 +
    grupoFamiliar.filter(
      (c) => String(c.aCargo || "").toUpperCase() === "SI"
    ).length;

  // --------------------------------------------------
  // Vista principal
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/permisionario")}
          className="mb-4 text-sky-400 text-sm underline"
        >
          ← Volver al panel
        </button>

        <h1 className="text-2xl font-semibold mb-2">Mis datos</h1>
        <p className="text-slate-300 text-sm mb-6">
          Revisá y actualizá tus datos personales de contacto, destino, grupo
          familiar y mascotas. Los cambios quedan registrados en el sistema.
        </p>

        {/* Mensajes */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-500/60 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-emerald-900/40 border border-emerald-500/60 px-3 py-2 text-sm text-emerald-200">
            {successMsg}
          </div>
        )}

        <form
          onSubmit={handleGuardar}
          className="bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-6 grid gap-6"
        >
          {/* Datos personales / contacto */}
          <section className="grid gap-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Datos personales y de contacto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  readOnly
                  value={datos.nombreCompleto || ""}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">DNI</label>
                <input
                  type="text"
                  readOnly
                  value={datos.dni || ""}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Teléfono
              </label>
              <input
                name="telefono"
                type="text"
                value={form.telefono}
                onChange={handleChange}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Domicilio
              </label>
              <input
                name="domicilio"
                type="text"
                value={form.domicilio}
                onChange={handleChange}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Destino actual
                </label>
                <input
                  name="destinoActual"
                  type="text"
                  value={form.destinoActual}
                  onChange={handleChange}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Grado
                </label>
                <input
                  name="grado"
                  type="text"
                  value={form.grado}
                  onChange={handleChange}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Fecha último ascenso
              </label>
              <input
                name="fechaUltimoAscenso"
                type="date"
                value={form.fechaUltimoAscenso}
                onChange={handleChange}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </section>

          {/* Grupo familiar */}
          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Convivientes a cargo (capacidad familiar)
              </h2>
              <span className="text-xs text-slate-400">
                Capacidad total (titular + a cargo):{" "}
                <span className="font-semibold">{capacidadTotal}</span>
              </span>
            </div>

            <div className="space-y-2">
              {grupoFamiliar.map((c, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-slate-900/60 rounded-xl px-3 py-3"
                >
                  <div className="md:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Apellido y nombres
                    </label>
                    <input
                      type="text"
                      value={c.nombreCompleto || ""}
                      onChange={(e) =>
                        handleGrupoChange(
                          index,
                          "nombreCompleto",
                          e.target.value
                        )
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Relación
                    </label>
                    <input
                      type="text"
                      value={c.relacion || ""}
                      onChange={(e) =>
                        handleGrupoChange(index, "relacion", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      A cargo
                    </label>
                    <select
                      value={c.aCargo || "SI"}
                      onChange={(e) =>
                        handleGrupoChange(index, "aCargo", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Edad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={c.edad || ""}
                      onChange={(e) =>
                        handleGrupoChange(index, "edad", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      DNI
                    </label>
                    <input
                      type="text"
                      value={c.dni || ""}
                      onChange={(e) =>
                        handleGrupoChange(index, "dni", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        DIBA
                      </label>
                      <input
                        type="text"
                        value={c.diba || ""}
                        onChange={(e) =>
                          handleGrupoChange(index, "diba", e.target.value)
                        }
                        className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarConviviente(index)}
                      className="text-[11px] text-red-300 hover:text-red-200 px-2 pb-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={agregarConviviente}
              className="mt-1 inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
            >
              + Agregar conviviente
            </button>
          </section>

          {/* Animales domésticos */}
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Animales domésticos (solo para vivienda tipo casa)
            </h2>

            <div className="space-y-2">
              {animales.map((m, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-slate-900/60 rounded-xl px-3 py-3"
                >
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Especie
                    </label>
                    <input
                      type="text"
                      value={m.especie || ""}
                      onChange={(e) =>
                        handleAnimalChange(index, "especie", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Raza
                    </label>
                    <input
                      type="text"
                      value={m.raza || ""}
                      onChange={(e) =>
                        handleAnimalChange(index, "raza", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Edad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={m.edad || ""}
                      onChange={(e) =>
                        handleAnimalChange(index, "edad", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Sexo
                    </label>
                    <input
                      type="text"
                      value={m.sexo || ""}
                      onChange={(e) =>
                        handleAnimalChange(index, "sexo", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={m.pesoKg || ""}
                      onChange={(e) =>
                        handleAnimalChange(index, "pesoKg", e.target.value)
                      }
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => eliminarAnimal(index)}
                      className="text-[11px] text-red-300 hover:text-red-200 px-2 pb-1"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={agregarAnimal}
              className="mt-1 inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
            >
              + Agregar animal
            </button>
          </section>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-slate-950 transition-colors ${
                saving
                  ? "bg-sky-400/60 cursor-not-allowed"
                  : "bg-sky-500 hover:bg-sky-400"
              }`}
            >
              {saving ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
