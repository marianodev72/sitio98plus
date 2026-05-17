// frontend/src/pages/admin_general/Gestiones.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
  solicitante?: string | { _id?: string; nombre?: string; apellido?: string; email?: string } | null;
  alojado?: string | { _id?: string; nombre?: string; apellido?: string; email?: string } | null;
  usuario?: {
    _id?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    role?: string;
  };
};

type Panel = "PERMISIONARIOS" | "ALOJADOS";

const TODOS_CODIGOS = "TODOS";

const ANEXOS_PERMISIONARIO = [
  "ANEXO_01",
  "ANEXO_02",
  "ANEXO_03",
  "ANEXO_04",
  "ANEXO_07",
  "ANEXO_08",
  "ANEXO_09",
  "ANEXO_11",
];

const ANEXOS_ALOJADO = [
  "ANEXO_21",
  "ANEXO_22",
  "ANEXO_23",
  "ANEXO_24",
  "ANEXO_25",
  "ANEXO_26",
  "ANEXO_28",
];

const ESTADOS_FILTRO = [
  "BORRADOR",
  "ENVIADO",
  "EN_REVISION",
  "APROBADO",
  "RECHAZADO",
  "CERRADO",
  "ASIGNADO",
];

const ESTADOS_ALOJAMIENTO = [
  "BORRADOR",
  "ENVIADO",
  "EN_REVISION",
  "CERRADO",
  "RECHAZADO",
  "ANULADO",
];

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function safeFileNameDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
}

function viviendaLabel(a: Anexo): string {
  const d = a?.datos || {};

  const label =
    (typeof d.viviendaLabel === "string" && d.viviendaLabel.trim()) ||
    (typeof d.viviendaCodigo === "string" && d.viviendaCodigo.trim()) ||
    (typeof d.unidadHabitacional === "string" && d.unidadHabitacional.trim()) ||
    (typeof d.casa === "string" && d.casa.trim()) ||
    "";

  if (label) return label;

  const vid = typeof d.viviendaId === "string" ? d.viviendaId.trim() : "";
  if (/^[0-9a-fA-F]{24}$/.test(vid)) return `…${vid.slice(-6)}`;

  return "—";
}

function alojamientoLabel(a: Anexo): string {
  const d = a?.datos || {};

  const label =
    (typeof d.alojamientoLabel === "string" && d.alojamientoLabel.trim()) ||
    (typeof d.alojamientoCodigo === "string" && d.alojamientoCodigo.trim()) ||
    (typeof d.lugar === "string" && d.lugar.trim()) ||
    (typeof d.destinoActual === "string" && d.destinoActual.trim()) ||
    "";

  return label || "Pendiente";
}

function personaFromRef(value: Anexo["solicitante"]) {
  if (!value) return "";
  if (typeof value === "string") return "";

  const ape = value.apellido ? String(value.apellido).trim() : "";
  const nom = value.nombre ? String(value.nombre).trim() : "";
  const full = `${ape} ${nom}`.trim();

  return full || String(value.email || "").trim();
}

function personaLabel(a: Anexo): string {
  const d = a.datos || {};

  if (typeof d.apellidoNombres === "string" && d.apellidoNombres.trim()) {
    return d.apellidoNombres.trim();
  }
  if (typeof d.apellidoNombre === "string" && d.apellidoNombre.trim()) {
    return d.apellidoNombre.trim();
  }
  if (typeof d.nombreCompleto === "string" && d.nombreCompleto.trim()) {
    return d.nombreCompleto.trim();
  }
  if (typeof d.permisionarioNombre === "string" && d.permisionarioNombre.trim()) {
    return d.permisionarioNombre.trim();
  }
  if (typeof d.postulanteNombre === "string" && d.postulanteNombre.trim()) {
    return d.postulanteNombre.trim();
  }
  if (typeof d.titularNombre === "string" && d.titularNombre.trim()) {
    return d.titularNombre.trim();
  }

  const ape = a.usuario?.apellido ? String(a.usuario.apellido).trim() : "";
  const nom = a.usuario?.nombre ? String(a.usuario.nombre).trim() : "";
  const full = `${ape} ${nom}`.trim();
  const refLabel = personaFromRef(a.solicitante) || personaFromRef(a.alojado);

  if (full || refLabel) return full || refLabel;
  if (!full && !refLabel) return "Sin identificar";

  return full || "—";
}

export default function Gestiones() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [panel, setPanel] = useState<Panel>("PERMISIONARIOS");
  const anexosDisponibles = useMemo(
    () => (panel === "PERMISIONARIOS" ? ANEXOS_PERMISIONARIO : ANEXOS_ALOJADO),
    [panel]
  );
  const estadosDisponibles = useMemo(
    () => (panel === "PERMISIONARIOS" ? ESTADOS_FILTRO : ESTADOS_ALOJAMIENTO),
    [panel]
  );

  const [codigo, setCodigo] = useState<string>(TODOS_CODIGOS);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [barrioFiltro, setBarrioFiltro] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const myRole = up(user?.role);
  const esAdmin = myRole === "ADMIN" || myRole === "ADMIN_GENERAL";

  useEffect(() => {
    setCodigo(panel === "PERMISIONARIOS" ? TODOS_CODIGOS : "ANEXO_21");
    setEstadoFiltro("");
    setBarrioFiltro("");
  }, [panel]);

  async function cargarLista() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      if (!codigo) return;

      if (esAdmin) {
        const params: Record<string, string | number> = {
          sortDir,
          limit: 50,
          page: 1,
        };

        if (estadoFiltro) params.estado = estadoFiltro;

        if (panel === "ALOJADOS") {
          if (codigo && codigo !== TODOS_CODIGOS) params.codigo = codigo;
          const res = await http.get("/alojamientos-documentos", { params });
          setItems(Array.isArray(res.data?.documentos) ? res.data.documentos : []);
          return;
        }

        if (barrioFiltro.trim()) params.barrio = barrioFiltro.trim();

        const res = await http.get(`/formularios/anexo/${codigo}`, { params });
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      } else {
        const res = await http.get(`/formularios/mios`, { params: { codigo } });
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      }
    } catch (err) {
      console.error("[GESTIONES] Error listando", err);
      setErrorMsg(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf(id: string, cod: string) {
    setBusyId(id);
    setErrorMsg("");

    try {
      const res = await http.get(`/formularios/${id}/pdf`, { responseType: "blob" });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_${cod}_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[GESTIONES] Error PDF", err);
      setErrorMsg(
        "La operación solicitada no está disponible. Por favor, contacte al administrador."
      );
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    cargarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, estadoFiltro, barrioFiltro, sortDir, esAdmin]);

  const isAlojados = panel === "ALOJADOS";

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: "12px 10px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.70)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: "12px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    verticalAlign: "middle",
  };

  const controlStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  fontSize: 14,
  minHeight: 42,
  boxSizing: "border-box",
};

const selectStyle: CSSProperties = {
  ...controlStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  colorScheme: "dark",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Gestiones</h1>
          <p style={subtitleStyle}>
            Consulta y administración de anexos por panel, código y acciones institucionales.
          </p>
        </div>

        <div style={cardStyle}>
          <section style={{ ...softCardStyle, marginBottom: 12 }}>
            <div style={buttonRowStyle}>
              <button
                onClick={() => setPanel("PERMISIONARIOS")}
                style={
                  panel === "PERMISIONARIOS" ? primaryButtonStyle : secondaryButtonStyle
                }
              >
                Permisionarios
              </button>
              <button
                onClick={() => setPanel("ALOJADOS")}
                style={panel === "ALOJADOS" ? primaryButtonStyle : secondaryButtonStyle}
              >
                Alojados
              </button>
            </div>
          </section>

          {errorMsg ? (
            <div
              style={{
                ...softCardStyle,
                marginBottom: 12,
                border: "1px solid rgba(239,68,68,0.30)",
                background: "rgba(127,29,29,0.18)",
                color: "#fecaca",
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          <section style={{ ...softCardStyle, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
  value={codigo}
  onChange={(e) => setCodigo(e.target.value)}
  disabled={loading}
  style={selectStyle}
>
  {!isAlojados && (
    <option value={TODOS_CODIGOS} style={optionStyle}>
      Todos
    </option>
  )}
  {anexosDisponibles.map((c) => (
    <option key={c} value={c} style={optionStyle}>
      {c}
    </option>
  ))}
</select>

              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                disabled={loading}
                style={selectStyle}
                aria-label="Estado"
              >
                <option value="" style={optionStyle}>
                  Todos los estados
                </option>
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado} style={optionStyle}>
                    {estado}
                  </option>
                ))}
              </select>

              {!isAlojados && (
                <input
                  value={barrioFiltro}
                  onChange={(e) => setBarrioFiltro(e.target.value)}
                  disabled={loading}
                  placeholder="Barrio"
                  style={{ ...controlStyle, minWidth: 180 }}
                  aria-label="Barrio"
                />
              )}

              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value === "asc" ? "asc" : "desc")}
                disabled={loading}
                style={selectStyle}
                aria-label="Orden por fecha"
              >
                <option value="desc" style={optionStyle}>
                  Mas recientes primero
                </option>
                <option value="asc" style={optionStyle}>
                  Mas antiguos primero
                </option>
              </select>

              <button onClick={cargarLista} disabled={loading} style={primaryButtonStyle}>
                {loading ? "Cargando…" : "Actualizar"}
              </button>

              <span style={{ color: "rgba(255,255,255,0.72)" }}>
                Resultados: {items.length}
              </span>
            </div>
          </section>

          <section>
            <h3 style={sectionTitleStyle}>Listado</h3>

            {loading ? (
              <div style={softCardStyle}>Cargando anexos…</div>
            ) : items.length === 0 ? (
              <div style={softCardStyle}>No hay anexos.</div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <table
                  border={0}
                  cellPadding={6}
                  cellSpacing={0}
                  style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Código</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>
                        {isAlojados ? "Alojamiento / Unidad" : "Vivienda / Unidad"}
                      </th>
                      <th style={thStyle}>
                        {isAlojados ? "Postulante / Alojado" : "Postulante / Permisionario"}
                      </th>
                      <th style={thStyle}>Fecha</th>
                      <th style={thStyle}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((an) => {
                      const busy = busyId === an._id;

                      return (
                        <tr key={an._id}>
                          <td style={tdStyle}>{safe(an.codigo)}</td>
                          <td style={tdStyle}>
                            {safe(an.estado)}
                            {an.estadoInstitucional ? ` / ${safe(an.estadoInstitucional)}` : ""}
                          </td>
                          <td style={tdStyle}>
                            {isAlojados ? alojamientoLabel(an) : viviendaLabel(an)}
                          </td>
                          <td style={tdStyle}>{personaLabel(an)}</td>
                          <td style={tdStyle}>{fmtDate(an.updatedAt || an.createdAt)}</td>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                            <div style={{ ...buttonRowStyle, marginTop: 0 }}>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  navigate(
                                    isAlojados
                                      ? `/app/admin-general/gestiones/alojamientos/${an._id}`
                                      : `/app/admin-general/gestiones/${an._id}`
                                  )
                                }
                                style={primaryButtonStyle}
                              >
                                Gestionar
                              </button>
                              {!isAlojados && (
                                <button
                                  disabled={busy}
                                  onClick={() => descargarPdf(an._id, up(an.codigo))}
                                  style={secondaryButtonStyle}
                                >
                                  PDF
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
