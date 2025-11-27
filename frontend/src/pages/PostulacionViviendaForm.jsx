// src/pages/PostulacionViviendaForm.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

// -----------------------------------------------------------------------------
// Helpers de autenticación
// -----------------------------------------------------------------------------
function getAuthToken() {
  try {
    return localStorage.getItem("zn98_token");
  } catch {
    return null;
  }
}

// Decodifica el payload del JWT y devuelve el userId (si existe)
function getUserIdFromToken(token) {
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadBase64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const jsonString = decodeURIComponent(
      atob(payloadBase64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonString);

    // Probamos varias claves típicas
    const candidate =
      payload.userId ||
      payload.id ||
      payload._id ||
      (typeof payload.user === "string" ? payload.user : null) ||
      payload.sub;

    return typeof candidate === "string" ? candidate : null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------
export default function PostulacionViviendaForm() {
  const navigate = useNavigate();

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Datos personales
  const [datos, setDatos] = useState({
    mr: "",
    nroAfiliadoDiba: "",
    gradoEscalafon: "",
    apellido: "",
    nombres: "",
    destinoActual: "",
    destinoFuturo: "",
    telefonoActual: "",
    telefonoFuturo: "",
    fechaUltimoAscenso: "",
    aniosServicio: "",
    adjuntaFidofac: false,
    problemasSocioeconomicos: false,
    esPropietarioViviendaEnZona: false,
  });

  // Convivientes
  const [convivientes, setConvivientes] = useState([
    { apellidoNombres: "", relacion: "", aCargo: true, edad: "", dni: "", diba: "" },
  ]);

  // Animales domésticos
  const [animales, setAnimales] = useState([
    { especie: "", raza: "", edad: "", sexo: "", pesoKg: "" },
  ]);

  // Preferencias
  const [preferencias, setPreferencias] = useState({
    barrioPreferido: "",
    tipoVivienda: "",
    observaciones: "",
  });

  // Adjuntos
  const [adjuntos, setAdjuntos] = useState([]);
  const [adjuntosPreview, setAdjuntosPreview] = useState([]);

  const capacidadTotal =
    1 +
    convivientes.filter(
      (c) => String(c.aCargo).toLowerCase() === "true" || c.aCargo === true
    ).length;

  // ---------------------------------------------------------------------------
  // Handlers de estado
  // ---------------------------------------------------------------------------
  const actualizarDato = (campo, valor) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarPreferencia = (campo, valor) => {
    setPreferencias((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarConviviente = (index, campo, valor) => {
    setConvivientes((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [campo]: valor } : c))
    );
  };

  const agregarConviviente = () => {
    setConvivientes((prev) => [
      ...prev,
      { apellidoNombres: "", relacion: "", aCargo: true, edad: "", dni: "", diba: "" },
    ]);
  };

  const quitarConviviente = (index) => {
    setConvivientes((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarAnimal = (index, campo, valor) => {
    setAnimales((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [campo]: valor } : a))
    );
  };

  const agregarAnimal = () => {
    setAnimales((prev) => [
      ...prev,
      { especie: "", raza: "", edad: "", sexo: "", pesoKg: "" },
    ]);
  };

  const quitarAnimal = (index) => {
    setAnimales((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdjuntosChange = (e) => {
    const files = Array.from(e.target.files || []);
    setAdjuntos(files);
    setAdjuntosPreview(files.map((f) => ({ name: f.name, size: f.size })));
  };

  // ---------------------------------------------------------------------------
  // Envío de formulario
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setExito("");

    const token = getAuthToken();
    if (!token) {
      setError("No se encontró sesión activa. Iniciá sesión nuevamente.");
      return;
    }

    const userId = getUserIdFromToken(token);
    if (!userId) {
      setError(
        "No se pudo obtener el usuario autenticado desde el token. Cerrá sesión e iniciá nuevamente."
      );
      return;
    }

    try {
      setEnviando(true);

      const payload = {
        user: userId, // ⬅⬅ IMPORTANTE: esto hace que el backend tenga el `user` requerido
        tipo: "VIVIENDA",
        datos: {
          ...datos,
          convivientes,
          animales,
          capacidadTotal,
        },
        preferencias,
      };

      const resp = await fetch(`${API_BASE_URL}/api/postulaciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.message || "No se pudo registrar la postulación.");
      }

      // Si tenés un endpoint para subir archivos luego de crear la postulación,
      // se podría llamar acá (por ahora mantenemos solo el JSON).
      // if (adjuntos.length > 0) { ... }

      setExito("Postulación enviada correctamente.");

      setTimeout(() => {
        navigate("/postulante/postulaciones");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error al enviar la postulación.");
    } finally {
      setEnviando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">
              Formulario de inscripción para ocupar vivienda fiscal
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              ANEXO 01 – Declaración jurada de postulación.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/postulante")}
            className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
          >
            Volver al panel
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/70 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {exito && (
          <div className="mb-4 rounded-lg border border-emerald-500/70 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-100">
            {exito}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 md:p-6"
        >
          {/* Datos personales */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Datos personales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-slate-300 mb-1">MR</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.mr}
                  onChange={(e) => actualizarDato("mr", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nº afiliado DIBA</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.nroAfiliadoDiba}
                  onChange={(e) => actualizarDato("nroAfiliadoDiba", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Grado y escalafón</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.gradoEscalafon}
                  onChange={(e) => actualizarDato("gradoEscalafon", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Apellido</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.apellido}
                  onChange={(e) => actualizarDato("apellido", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nombres</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.nombres}
                  onChange={(e) => actualizarDato("nombres", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Destino actual</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.destinoActual}
                  onChange={(e) => actualizarDato("destinoActual", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Destino futuro</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.destinoFuturo}
                  onChange={(e) => actualizarDato("destinoFuturo", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Teléfono actual</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.telefonoActual}
                  onChange={(e) => actualizarDato("telefonoActual", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Teléfono futuro</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.telefonoFuturo}
                  onChange={(e) => actualizarDato("telefonoFuturo", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Fecha último ascenso</label>
                <input
                  type="date"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.fechaUltimoAscenso}
                  onChange={(e) =>
                    actualizarDato("fechaUltimoAscenso", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Años de servicio (según recibo)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={datos.aniosServicio}
                  onChange={(e) => actualizarDato("aniosServicio", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Declaraciones */}
          <section className="space-y-3 text-sm">
            <h2 className="text-lg font-semibold mb-1">Declaraciones</h2>

            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-950"
                checked={datos.adjuntaFidofac}
                onChange={(e) => actualizarDato("adjuntaFidofac", e.target.checked)}
              />
              Agrego fotocopia autenticada de FIDOFAC / Formulario Contribuyente.
            </label>

            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-950"
                checked={datos.problemasSocioeconomicos}
                onChange={(e) =>
                  actualizarDato("problemasSocioeconomicos", e.target.checked)
                }
              />
              Tengo problemas socioeconómicos atendibles (según trámite iniciado).
            </label>

            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600 bg-slate-950"
                checked={datos.esPropietarioViviendaEnZona}
                onChange={(e) =>
                  actualizarDato("esPropietarioViviendaEnZona", e.target.checked)
                }
              />
              Soy, o alguno de mis familiares a cargo es propietario de vivienda en la
              zona naval.
            </label>
          </section>

          {/* Documentación adjunta */}
          <section className="mt-6 text-sm">
            <h2 className="text-lg font-semibold mb-2">Documentación adjunta</h2>
            <p className="text-slate-300 text-xs mb-2">
              Subí en formato PDF o imagen la documentación respaldatoria (FIDOFAC,
              recibos de haberes, constancias, etc.).
            </p>

            <input
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={handleAdjuntosChange}
              className="text-xs file:bg-sky-600 file:text-white file:px-3 file:py-1 file:rounded-full file:hover:bg-sky-500"
            />

            {adjuntosPreview.length > 0 && (
              <ul className="mt-3 bg-slate-950/40 border border-slate-700 rounded-lg p-3 space-y-1">
                {adjuntosPreview.map((f, idx) => (
                  <li key={idx} className="text-xs text-slate-300">
                    {f.name} ({Math.round(f.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Convivientes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                Convivientes a cargo (capacidad familiar)
              </h2>
              <span className="text-xs text-slate-400">
                Capacidad total (titular + a cargo):{" "}
                <span className="font-semibold text-slate-100">
                  {capacidadTotal}
                </span>
              </span>
            </div>

            <div className="space-y-3">
              {convivientes.map((c, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-slate-950/60 border border-slate-700/70 rounded-xl p-3"
                >
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Apellido y nombres
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={c.apellidoNombres}
                      onChange={(e) =>
                        actualizarConviviente(index, "apellidoNombres", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Relación
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={c.relacion}
                      onChange={(e) =>
                        actualizarConviviente(index, "relacion", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      A cargo
                    </label>
                    <select
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={c.aCargo ? "SI" : "NO"}
                      onChange={(e) =>
                        actualizarConviviente(index, "aCargo", e.target.value === "SI")
                      }
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Edad
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={c.edad}
                      onChange={(e) =>
                        actualizarConviviente(index, "edad", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">
                        DNI
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                        value={c.dni}
                        onChange={(e) =>
                          actualizarConviviente(index, "dni", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">
                        DIBA
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                        value={c.diba}
                        onChange={(e) =>
                          actualizarConviviente(index, "diba", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="md:col-span-6 flex justify-end">
                    {convivientes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarConviviente(index)}
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarConviviente}
                className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                + Agregar conviviente
              </button>
            </div>
          </section>

          {/* Animales domésticos */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              Animales domésticos (solo para vivienda tipo casa)
            </h2>

            <div className="space-y-3">
              {animales.map((a, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-slate-950/60 border border-slate-700/70 rounded-xl p-3"
                >
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Especie
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={a.especie}
                      onChange={(e) =>
                        actualizarAnimal(index, "especie", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Raza
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={a.raza}
                      onChange={(e) =>
                        actualizarAnimal(index, "raza", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Edad
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={a.edad}
                      onChange={(e) =>
                        actualizarAnimal(index, "edad", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Sexo
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={a.sexo}
                      onChange={(e) =>
                        actualizarAnimal(index, "sexo", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs"
                      value={a.pesoKg}
                      onChange={(e) =>
                        actualizarAnimal(index, "pesoKg", e.target.value)
                      }
                    />
                  </div>

                  <div className="md:col-span-5 flex justify-end">
                    {animales.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarAnimal(index)}
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarAnimal}
                className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                + Agregar animal
              </button>
            </div>
          </section>

          {/* Preferencias de vivienda */}
          <section>
            <h2 className="text-lg font-semibold mb-2">
              Preferencias de vivienda (no vinculantes)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-slate-300 mb-1">Barrio preferido</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={preferencias.barrioPreferido}
                  onChange={(e) =>
                    actualizarPreferencia("barrioPreferido", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo de vivienda</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={preferencias.tipoVivienda}
                  onChange={(e) =>
                    actualizarPreferencia("tipoVivienda", e.target.value)
                  }
                  placeholder="Casa, departamento, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-300 mb-1">Observaciones</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm"
                  value={preferencias.observaciones}
                  onChange={(e) =>
                    actualizarPreferencia("observaciones", e.target.value)
                  }
                  placeholder="Comentarios que quieras agregar a tu postulación."
                />
              </div>
            </div>
          </section>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/postulante")}
              className="px-4 py-2 rounded-full border border-slate-600 text-sm text-slate-200 hover:bg-slate-800"
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold disabled:opacity-60"
              disabled={enviando}
            >
              {enviando ? "Enviando..." : "Enviar postulación"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
