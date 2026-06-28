// frontend/src/pages/admin_general/Gestiones.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import { decodeHtmlEntities } from "../../utils/decodeHtmlEntities";
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
  tieneAnexo02Derivado?: boolean;
  anexo02DerivadoId?: string | null;
  anexo02DerivadoCodigo?: string | null;
  anexo02DerivadoEstado?: string | null;
  anexo02DerivadoViviendaCodigo?: string | null;
  estadoDerivacion?: string | null;
  tramiteCerradoPorDerivacion?: boolean;
  usuarioTieneAnexo02?: boolean;
  anexo02DerivadoDesdeEsteAnexo01?: boolean;
  anexo02RelacionadoId?: string | null;
  anexo02RelacionadoEstado?: string | null;
  anexo02RelacionadoCodigo?: string | null;
  marcaTexto?: string | null;
};

type Panel = "PERMISIONARIOS" | "ALOJADOS";

type FiltrosGestiones = {
  codigo: string;
  estado: string;
  barrio: string;
  q: string;
  sortDir: "asc" | "desc";
  limit: number;
};

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

const FORM_LIMIT_OPTIONS = [50, 100];
const ALOJADOS_LIMIT_OPTIONS = [50, 100, 200];

function safe(v: unknown) {
  if (v === null || v === undefined || v === "") return "-";
  return decodeHtmlEntities(String(v));
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

function estadoOperativo(a: Anexo) {
  const codigo = up(a.codigo);
  const estado = up(a.estado);
  const estadoInstitucional = up(a.estadoInstitucional);
  const resultadoPostulacion = up(a.datos?.resultadoPostulacion);
  const tieneDerivado =
    codigo === "ANEXO_01" &&
    (!!a.tieneAnexo02Derivado ||
      !!a.tramiteCerradoPorDerivacion ||
      up(a.estadoDerivacion) === "ANEXO_02_GENERADO");
  const anexo01Aprobado =
    codigo === "ANEXO_01" &&
    (estado === "APROBADO" ||
      estadoInstitucional === "APROBADO_ADMIN_GENERAL" ||
      resultadoPostulacion === "APROBADO");

  if (estado.includes("RECHAZ") || estadoInstitucional.includes("RECHAZ") || resultadoPostulacion === "RECHAZADO") {
    return {
      texto: "Rechazado",
      border: "rgba(248,113,113,0.42)",
      background: "rgba(127,29,29,0.22)",
      color: "#fecaca",
    };
  }

  if (tieneDerivado) {
    return {
      texto: "ANEXO_02 generado",
      border: "rgba(56,189,248,0.42)",
      background: "rgba(14,116,144,0.20)",
      color: "#cffafe",
    };
  }

  if (codigo === "ANEXO_01" && a.usuarioTieneAnexo02 && !a.anexo02DerivadoDesdeEsteAnexo01) {
    return {
      texto: "Usuario con ANEXO_02",
      border: "rgba(250,204,21,0.45)",
      background: "rgba(113,63,18,0.22)",
      color: "#fef3c7",
    };
  }

  if (anexo01Aprobado) {
    return {
      texto: "Disponible para asignar",
      border: "rgba(251,191,36,0.42)",
      background: "rgba(146,64,14,0.20)",
      color: "#fde68a",
    };
  }

  if (codigo === "ANEXO_02" && ["BORRADOR", "ENVIADO", "EN_REVISION"].includes(estado)) {
    return {
      texto: "En curso",
      border: "rgba(167,139,250,0.42)",
      background: "rgba(76,29,149,0.20)",
      color: "#ddd6fe",
    };
  }

  if (["CERRADO", "ASIGNADO"].includes(estado) || estadoInstitucional.includes("CERRADO")) {
    return {
      texto: "Cerrado",
      border: "rgba(74,222,128,0.36)",
      background: "rgba(20,83,45,0.20)",
      color: "#bbf7d0",
    };
  }

  return null;
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
  const [qFiltro, setQFiltro] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(50);
  const [appliedFilters, setAppliedFilters] = useState<FiltrosGestiones>({
    codigo: TODOS_CODIGOS,
    estado: "",
    barrio: "",
    q: "",
    sortDir: "desc",
    limit: 50,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const myRole = up(user?.role);
  const esAdmin = myRole === "ADMIN" || myRole === "ADMIN_GENERAL";

  useEffect(() => {
    const nextCodigo = panel === "PERMISIONARIOS" ? TODOS_CODIGOS : "ANEXO_21";
    const nextLimit = panel === "PERMISIONARIOS" ? Math.min(limit, 100) : limit;
    const nextFilters: FiltrosGestiones = {
      codigo: nextCodigo,
      estado: "",
      barrio: "",
      q: "",
      sortDir: "desc",
      limit: nextLimit,
    };

    setCodigo(nextCodigo);
    setEstadoFiltro("");
    setBarrioFiltro("");
    setQFiltro("");
    setSortDir("desc");
    setLimit(nextLimit);
    setAppliedFilters(nextFilters);
    setPage(1);
  }, [panel]);

  async function cargarLista() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);
    setTotal(null);

    try {
      if (!appliedFilters.codigo) return;

      if (esAdmin) {
        const requestLimit = panel === "ALOJADOS" ? appliedFilters.limit : Math.min(appliedFilters.limit, 100);
        const params: Record<string, string | number> = {
          sortDir: appliedFilters.sortDir,
          limit: requestLimit,
          page,
        };

        if (appliedFilters.estado) params.estado = appliedFilters.estado;

        if (panel === "ALOJADOS") {
          if (appliedFilters.codigo && appliedFilters.codigo !== TODOS_CODIGOS) params.codigo = appliedFilters.codigo;
          const res = await http.get("/alojamientos-documentos", { params });
          setItems(Array.isArray(res.data?.documentos) ? res.data.documentos : []);
          setTotal(typeof res.data?.total === "number" ? res.data.total : null);
          return;
        }

        if (appliedFilters.barrio.trim()) params.barrio = appliedFilters.barrio.trim();
        if (appliedFilters.q.trim()) params.q = appliedFilters.q.trim();

        const res = await http.get(`/formularios/anexo/${appliedFilters.codigo}`, { params });
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
        setTotal(typeof res.data?.total === "number" ? res.data.total : null);
      } else {
        const res = await http.get(`/formularios/mios`, { params: { codigo: appliedFilters.codigo } });
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

  function aplicarFiltros() {
    setAppliedFilters({
      codigo,
      estado: estadoFiltro,
      barrio: barrioFiltro,
      q: qFiltro,
      sortDir,
      limit,
    });
    setPage(1);
  }

  function limpiarFiltros() {
    const nextCodigo = panel === "PERMISIONARIOS" ? TODOS_CODIGOS : "ANEXO_21";
    const nextLimit = 50;
    const nextFilters: FiltrosGestiones = {
      codigo: nextCodigo,
      estado: "",
      barrio: "",
      q: "",
      sortDir: "desc",
      limit: nextLimit,
    };

    setCodigo(nextCodigo);
    setEstadoFiltro("");
    setBarrioFiltro("");
    setQFiltro("");
    setSortDir("desc");
    setLimit(nextLimit);
    setAppliedFilters(nextFilters);
    setPage(1);
  }

  useEffect(() => {
    cargarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, esAdmin, page]);

  const isAlojados = panel === "ALOJADOS";
  const limitOptions = isAlojados ? ALOJADOS_LIMIT_OPTIONS : FORM_LIMIT_OPTIONS;
  const effectiveLimit = isAlojados ? appliedFilters.limit : Math.min(appliedFilters.limit, 100);
  const totalPages = total !== null ? Math.max(1, Math.ceil(total / effectiveLimit)) : null;
  const canGoNext = totalPages !== null ? page < totalPages : items.length === effectiveLimit;

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

              {!isAlojados && (
                <input
                  value={qFiltro}
                  onChange={(e) => setQFiltro(e.target.value)}
                  disabled={loading}
                  placeholder="Buscar por nombre, apellido, matricula o email"
                  style={{ ...controlStyle, minWidth: 280 }}
                  aria-label="Buscar por nombre, apellido, matricula o email"
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

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
                style={selectStyle}
                aria-label="Cantidad por pagina"
              >
                {limitOptions.map((value) => (
                  <option key={value} value={value} style={optionStyle}>
                    {value} por pagina
                  </option>
                ))}
              </select>

              <button onClick={aplicarFiltros} disabled={loading} style={primaryButtonStyle}>
                {loading ? "Cargando..." : "Aplicar filtros"}
              </button>

              <button onClick={limpiarFiltros} disabled={loading} style={secondaryButtonStyle}>
                Limpiar filtros
              </button>

              <span style={{ color: "rgba(255,255,255,0.72)" }}>
                Resultados visibles: {items.length}
              </span>
              <span style={{ color: "rgba(255,255,255,0.72)" }}>
                Pagina: {page}
                {totalPages !== null ? ` de ${totalPages}` : ""}
              </span>
            </div>
          </section>

          <section style={{ ...softCardStyle, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={loading || page <= 1}
                style={secondaryButtonStyle}
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((value) => value + 1)}
                disabled={loading || !canGoNext}
                style={secondaryButtonStyle}
              >
                Siguiente
              </button>
              <span style={{ color: "rgba(255,255,255,0.72)" }}>
                Cantidad por pagina: {effectiveLimit}
                {total !== null ? ` / Total: ${total}` : ""}
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
                      const operativo = estadoOperativo(an);

                      return (
                        <tr key={an._id}>
                          <td style={tdStyle}>{safe(an.codigo)}</td>
                          <td style={tdStyle}>
                            {safe(an.estado)}
                            {an.estadoInstitucional ? ` / ${safe(an.estadoInstitucional)}` : ""}
                            {operativo ? (
                              <div
                                style={{
                                  display: "inline-flex",
                                  marginTop: 6,
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  border: `1px solid ${operativo.border}`,
                                  background: operativo.background,
                                  color: operativo.color,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {operativo.texto}
                              </div>
                            ) : null}
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
                              {!isAlojados && an.anexo02RelacionadoId && up(an.codigo) === "ANEXO_01" && (
                                <button
                                  disabled={busy}
                                  onClick={() => navigate(`/app/admin-general/gestiones/${an.anexo02RelacionadoId}`)}
                                  style={secondaryButtonStyle}
                                >
                                  Ver ANEXO_02
                                </button>
                              )}
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
