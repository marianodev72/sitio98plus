import { useEffect, useState } from "react";
import { http } from "../../api/http";

type Vivienda = {
  _id: string;
  codigo: string;
  barrio: string;
  dormitorios: number;
  estado: string;
  cantidadHabitantes?: number;
  permisionario?: {
    _id?: string;
    nombre?: string;
    apellido?: string;
    matricula?: string;
  };
  hacinamientoRatio?: number;
};

type Semaforo = "verde" | "amarillo" | "rojo";

type EstadoVivienda = "DISPONIBLE" | "OCUPADA" | "RESERVADA" | "REPARACION" | "BAJA";
type SortBy =
  | "codigo"
  | "barrio"
  | "dormitorios"
  | "estado"
  | "permisionario"
  | "personas"
  | "hacinamiento";
type SortDir = "asc" | "desc";

const ESTADOS: { value: EstadoVivienda; label: string }[] = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "OCUPADA", label: "Ocupada" },
  { value: "RESERVADA", label: "Reservada" },
  { value: "REPARACION", label: "Reparación" },
  { value: "BAJA", label: "Baja" },
];

function getSemaforoPorDormitorios(dormitorios: number, personas: number): Semaforo {
  // Regla institucional:
  // 1 dormitorio: 2 verde, 3 a 4 amarillo, >4 rojo
  // 2 dormitorios: 4 verde, 5 amarillo, >5 rojo
  // 3 dormitorios: 6 verde, 7 amarillo, >7 rojo
  // 4+ dormitorios: >10 rojo (si no, verde)
  if (dormitorios <= 1) {
    if (personas <= 2) return "verde";
    if (personas <= 4) return "amarillo";
    return "rojo";
  }

  if (dormitorios === 2) {
    if (personas <= 4) return "verde";
    if (personas === 5) return "amarillo";
    return "rojo";
  }

  if (dormitorios === 3) {
    if (personas <= 6) return "verde";
    if (personas === 7) return "amarillo";
    return "rojo";
  }

  // 4 o más dormitorios
  return personas > 10 ? "rojo" : "verde";
}

function getSemaforoColor(semaforo: Semaforo): string {
  if (semaforo === "verde") return "green";
  if (semaforo === "amarillo") return "orange";
  return "red";
}

function getSemaforoLabel(semaforo: Semaforo): string {
  if (semaforo === "verde") return "Verde";
  if (semaforo === "amarillo") return "Amarillo";
  return "Rojo";
}

function isEstadoVivienda(value: string): value is EstadoVivienda {
  return (
    value === "DISPONIBLE" ||
    value === "OCUPADA" ||
    value === "RESERVADA" ||
    value === "REPARACION" ||
    value === "BAJA"
  );
}

function safeFileNameDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // YYYY-MM-DD_HH-mm
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}`;
}

function sortLabel(sortBy: SortBy): string {
  switch (sortBy) {
    case "codigo":
      return "Código";
    case "barrio":
      return "Barrio";
    case "dormitorios":
      return "Dormitorios";
    case "estado":
      return "Estado";
    case "permisionario":
      return "Permisionario";
    case "personas":
      return "Personas";
    case "hacinamiento":
      return "Hacinamiento";
    default:
      return sortBy;
  }
}

export default function Viviendas() {
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [loading, setLoading] = useState(true);

  // UI estado/errores (genéricos)
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // filtros
  const [codigo, setCodigo] = useState("");
  const [barrio, setBarrio] = useState("");
  const [estado, setEstado] = useState(""); // "" === Todos
  const [dormitorios, setDormitorios] = useState("");
  const [permisionario, setPermisionario] = useState("");
  const [personasMin, setPersonasMin] = useState("");
  const [personasMax, setPersonasMax] = useState("");

  // orden
  const [sortBy, setSortBy] = useState<SortBy>("barrio");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function buildParams(): Record<string, string> {
    const params: Record<string, string> = {};

    if (codigo.trim()) params.codigo = codigo.trim();
    if (barrio.trim()) params.barrio = barrio.trim();
    if (estado) params.estado = estado; // si es "" => no se envía, queda "Todos"
    if (dormitorios) params.dormitorios = dormitorios;
    if (permisionario.trim()) params.permisionario = permisionario.trim();
    if (personasMin) params.personasMin = personasMin;
    if (personasMax) params.personasMax = personasMax;

    params.sortBy = sortBy;
    params.sortDir = sortDir;

    return params;
  }

  async function cargarViviendas() {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = buildParams();

      const res = await http.get("/viviendas", { params });

      const data = res.data;
      const lista = Array.isArray(data) ? data : data?.viviendas;

      setViviendas(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("Error cargando viviendas", err);
      setViviendas([]);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  async function actualizarEstado(viviendaId: string, nuevoEstado: EstadoVivienda) {
    setErrorMsg("");
    setUpdatingId(viviendaId);

    // Optimista (para que se vea inmediato)
    const prev = viviendas;
    setViviendas((curr) => curr.map((v) => (v._id === viviendaId ? { ...v, estado: nuevoEstado } : v)));

    try {
      await http.patch(`/viviendas/${viviendaId}/estado`, { estado: nuevoEstado });

      // Refresco para asegurar consistencia
      await cargarViviendas();
    } catch (err) {
      console.error("Error actualizando estado de vivienda", err);
      setViviendas(prev);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function descargarPdf() {
    setErrorMsg("");
    setDownloadingPdf(true);

    try {
      const params = buildParams();

      const res = await http.get("/viviendas/pdf", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_Viviendas_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando PDF de viviendas", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function limpiarFiltros() {
    // Limpiar filtros
    setCodigo("");
    setBarrio("");
    setEstado("");
    setDormitorios("");
    setPermisionario("");
    setPersonasMin("");
    setPersonasMax("");

    // Reset orden
    setSortBy("barrio");
    setSortDir("asc");

    // Recargar con valores limpios en el próximo tick
    setTimeout(() => {
      cargarViviendas();
    }, 0);
  }

  function applySort(nextSortBy: SortBy) {
    // Si clickean la misma columna, alterna asc/desc.
    // Si clickean otra columna, empieza en asc.
    setSortBy((currentBy) => {
      if (currentBy === nextSortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortDir("asc");
      }
      return nextSortBy;
    });

    // Aplicar automáticamente
    setTimeout(() => {
      cargarViviendas();
    }, 0);
  }

  function sortIndicator(col: SortBy) {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  useEffect(() => {
    cargarViviendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = viviendas.length;

  const thStyle: React.CSSProperties = {
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <h1>Viviendas</h1>

      {errorMsg ? (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            border: "1px solid #ccc",
            background: "#f7f7f7",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <section style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <input placeholder="Barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)} />

          {/* 🔧 Cambio solicitado: "Todos" */}
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="OCUPADA">Ocupada</option>
            <option value="RESERVADA">Reservada</option>
            <option value="REPARACION">Reparación</option>
            <option value="BAJA">Baja</option>
          </select>

          <select value={dormitorios} onChange={(e) => setDormitorios(e.target.value)}>
            <option value="">Dormitorios</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4+</option>
          </select>

          <input
            placeholder="Permisionario (nombre/apellido/matrícula)"
            value={permisionario}
            onChange={(e) => setPermisionario(e.target.value)}
            style={{ minWidth: 280 }}
          />

          <input
            placeholder="Personas mín."
            value={personasMin}
            onChange={(e) => setPersonasMin(e.target.value)}
            inputMode="numeric"
            style={{ width: 120 }}
          />
          <input
            placeholder="Personas máx."
            value={personasMax}
            onChange={(e) => setPersonasMax(e.target.value)}
            inputMode="numeric"
            style={{ width: 120 }}
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="barrio">Orden: Barrio</option>
            <option value="codigo">Orden: Código</option>
            <option value="dormitorios">Orden: Dormitorios</option>
            <option value="estado">Orden: Estado</option>
            <option value="permisionario">Orden: Permisionario</option>
            <option value="personas">Orden: Personas</option>
            <option value="hacinamiento">Orden: Hacinamiento</option>
          </select>

          <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} disabled={loading || downloadingPdf}>
            {sortDir === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>

          <button onClick={cargarViviendas} disabled={loading || downloadingPdf}>
            Aplicar
          </button>

          <button onClick={limpiarFiltros} disabled={loading || downloadingPdf}>
            Limpiar filtros
          </button>

          <button onClick={descargarPdf} disabled={loading || downloadingPdf}>
            {downloadingPdf ? "Generando PDF…" : "Descargar PDF"}
          </button>
        </div>

        <p style={{ marginTop: "0.5rem" }}>
          Resultados: {total} — Orden actual: {sortLabel(sortBy)} {sortDir === "asc" ? "(Asc)" : "(Desc)"}
        </p>
      </section>

      {loading ? (
        <p>Cargando viviendas…</p>
      ) : (
        <table border={1} cellPadding={6} cellSpacing={0}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => applySort("codigo")} title="Ordenar por Código">
                Código{sortIndicator("codigo")}
              </th>
              <th style={thStyle} onClick={() => applySort("barrio")} title="Ordenar por Barrio">
                Barrio{sortIndicator("barrio")}
              </th>
              <th style={thStyle} onClick={() => applySort("dormitorios")} title="Ordenar por Dormitorios">
                Dormitorios{sortIndicator("dormitorios")}
              </th>
              <th style={thStyle} onClick={() => applySort("estado")} title="Ordenar por Estado">
                Estado{sortIndicator("estado")}
              </th>
              <th style={thStyle} onClick={() => applySort("permisionario")} title="Ordenar por Permisionario">
                Permisionario{sortIndicator("permisionario")}
              </th>
              <th style={thStyle} onClick={() => applySort("personas")} title="Ordenar por Personas">
                Personas{sortIndicator("personas")}
              </th>
              <th style={thStyle} onClick={() => applySort("hacinamiento")} title="Ordenar por Hacinamiento">
                Hacinamiento{sortIndicator("hacinamiento")}
              </th>
            </tr>
          </thead>
          <tbody>
            {viviendas.map((v) => {
              const perm = v.permisionario?.apellido
                ? `${v.permisionario.apellido} ${v.permisionario.nombre || ""}`.trim()
                : v.permisionario?.nombre || "-";

              const personasNum = typeof v.cantidadHabitantes === "number" ? v.cantidadHabitantes : null;

              // Regla institucional: personas/hacinamiento/semaforo SOLO si OCUPADA (Anexo 03 cerrado)
              const personas = v.estado === "OCUPADA" ? (personasNum ?? "-") : "-";

              const ratioText = typeof v.hacinamientoRatio === "number" ? v.hacinamientoRatio.toFixed(2) : "-";

              const semaforo =
                v.estado === "OCUPADA" && personasNum !== null
                  ? getSemaforoPorDormitorios(v.dormitorios, personasNum)
                  : null;

              const estadoActual: EstadoVivienda = isEstadoVivienda(v.estado) ? v.estado : "DISPONIBLE";

              return (
                <tr key={v._id}>
                  <td>{v.codigo}</td>
                  <td>{v.barrio}</td>
                  <td>{v.dormitorios}</td>

                  <td>
                    <select
                      value={estadoActual}
                      disabled={updatingId === v._id || downloadingPdf}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!isEstadoVivienda(next)) return;
                        if (next === estadoActual) return;
                        actualizarEstado(v._id, next);
                      }}
                      style={{ minWidth: 150 }}
                    >
                      {ESTADOS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {updatingId === v._id ? <span style={{ marginLeft: 8, fontSize: 12 }}>Guardando…</span> : null}
                  </td>

                  <td>{perm}</td>
                  <td>{personas}</td>
                  <td>
                    {v.estado !== "OCUPADA" || !semaforo ? (
                      "-"
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          title={`Semáforo: ${getSemaforoLabel(semaforo)} (Personas: ${personasNum}, Dormitorios: ${v.dormitorios})`}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: getSemaforoColor(semaforo),
                            display: "inline-block",
                          }}
                        />
                        <span>{ratioText}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
