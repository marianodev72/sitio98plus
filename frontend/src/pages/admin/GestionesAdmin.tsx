// frontend/src/pages/admin/GestionesAdmin.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

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

const VIVIENDAS_CODES = [
  "ANEXO_01",
  "ANEXO_02",
  "ANEXO_03",
  "ANEXO_04",
  "ANEXO_07",
  "ANEXO_08",
  "ANEXO_09",
  "ANEXO_11",
];

const ALOJAMIENTOS_CODES = [
  "ANEXO_21",
  "ANEXO_22",
  "ANEXO_23",
  "ANEXO_24",
  "ANEXO_25",
  "ANEXO_26",
  "ANEXO_28",
];

const ANEXOS_PERMISIONARIO = VIVIENDAS_CODES;
const ANEXOS_ALOJADO = ALOJAMIENTOS_CODES;

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
  if (
    typeof (a as any).viviendaCodigo === "string" &&
    (a as any).viviendaCodigo.trim()
  ) {
    return (a as any).viviendaCodigo.trim();
  }

  const d = a.datos || {};

  const codigo =
    typeof d.viviendaCodigo === "string" ? d.viviendaCodigo.trim() : "";
  if (codigo) return codigo;

  const label =
    typeof d.viviendaLabel === "string" ? d.viviendaLabel.trim() : "";
  if (label) return label;

  const unidad =
    typeof d.unidadHabitacional === "string" ? d.unidadHabitacional.trim() : "";
  const casa =
    typeof d.casa === "string" ? d.casa.trim() : "";
  const vid =
    typeof d.viviendaId === "string" ? d.viviendaId : "";

  if (unidad) return unidad;
  if (casa) return casa;

  const pareceObjectId =
    typeof vid === "string" && /^[a-fA-F0-9]{24}$/.test(vid);
  if (vid && !pareceObjectId) return vid;

  return "—";
}

function alojamientoLabel(a: Anexo): string {
  const d = a.datos || {};

  const label =
    (typeof d.alojamientoLabel === "string" && d.alojamientoLabel.trim()) ||
    (typeof d.alojamientoCodigo === "string" && d.alojamientoCodigo.trim()) ||
    (typeof d.lugar === "string" && d.lugar.trim()) ||
    (typeof d.alojamiento?.codigo === "string" && d.alojamiento.codigo.trim()) ||
    (typeof d.alojamientoSnapshot?.codigo === "string" && d.alojamientoSnapshot.codigo.trim()) ||
    "";

  if (label) return label;

  const plaza =
    (typeof d.plazaCodigo === "string" && d.plazaCodigo.trim()) ||
    (typeof d.plaza?.codigoPublico === "string" && d.plaza.codigoPublico.trim()) ||
    (typeof d.plazaSnapshot?.codigoPublico === "string" && d.plazaSnapshot.codigoPublico.trim()) ||
    "";

  return plaza || "-";
}

function personaLabel(a: Anexo): string {
  const d = a.datos || {};

  if (typeof d.apellidoNombres === "string" && d.apellidoNombres.trim()) return d.apellidoNombres.trim();
  if (typeof d.permisionarioNombre === "string" && d.permisionarioNombre.trim()) return d.permisionarioNombre.trim();
  if (typeof d.postulanteNombre === "string" && d.postulanteNombre.trim()) return d.postulanteNombre.trim();
  if (typeof d.titularNombre === "string" && d.titularNombre.trim()) return d.titularNombre.trim();

  const alojado = typeof a.alojado === "object" && a.alojado ? a.alojado : null;
  const alojadoNombre = [alojado?.apellido, alojado?.nombre].filter(Boolean).join(" ").trim();
  if (alojadoNombre) return alojadoNombre;

  const solicitante = typeof a.solicitante === "object" && a.solicitante ? a.solicitante : null;
  const solicitanteNombre = [solicitante?.apellido, solicitante?.nombre].filter(Boolean).join(" ").trim();
  if (solicitanteNombre) return solicitanteNombre;

  const ape = a.usuario?.apellido ? String(a.usuario.apellido).trim() : "";
  const nom = a.usuario?.nombre ? String(a.usuario.nombre).trim() : "";
  const full = `${ape} ${nom}`.trim();
  return full || "—";
}

export default function GestionesAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [panel, setPanel] = useState<Panel>("PERMISIONARIOS");
  const anexosDisponibles = useMemo(
    () => (panel === "PERMISIONARIOS" ? ANEXOS_PERMISIONARIO : ANEXOS_ALOJADO),
    [panel]
  );

  const [codigo, setCodigo] = useState<string>(ANEXOS_PERMISIONARIO[0]);
  const [items, setItems] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const myRole = up(user?.role);
  const esAdmin = myRole === "ADMIN" || myRole === "ADMIN_GENERAL";

  useEffect(() => {
    const codes = panel === "PERMISIONARIOS" ? VIVIENDAS_CODES : ALOJAMIENTOS_CODES;
    if (!codes.includes(codigo)) setCodigo(codes[0]);
  }, [codigo, panel]);

  async function cargarLista() {
    setLoading(true);
    setErrorMsg("");
    setItems([]);

    try {
      if (!codigo) return;

      if (esAdmin) {
        if (panel === "ALOJADOS") {
          if (!ALOJAMIENTOS_CODES.includes(codigo)) {
            setCodigo(ALOJAMIENTOS_CODES[0]);
            return;
          }

          const res = await http.get("/alojamientos-documentos", {
            params: { codigo, limit: 50, page: 1 },
          });
          setItems(Array.isArray(res.data?.documentos) ? res.data.documentos : []);
          return;
        }

        if (!VIVIENDAS_CODES.includes(codigo)) {
          setCodigo(VIVIENDAS_CODES[0]);
          return;
        }

        const res = await http.get(`/formularios/anexo/${codigo}`);
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      } else {
        const res = await http.get(`/formularios/mios`, { params: { codigo } });
        setItems(Array.isArray(res.data?.anexos) ? res.data.anexos : []);
      }
    } catch (err) {
      console.error("[GESTIONES][ADMIN] Error listando", err);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf(id: string, cod: string) {
    setBusyId(id);
    setErrorMsg("");

    try {
      const res =
        panel === "ALOJADOS"
          ? await http.get(`/alojamientos-documentos/${id}/pdf`, { responseType: "blob" })
          : await http.get(`/formularios/${id}/pdf`, { responseType: "blob" });

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
      console.error("[GESTIONES][ADMIN] Error PDF", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    cargarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, esAdmin, panel]);

  const pageStyle: CSSProperties = {
    padding: 24,
    background: "#0b1220",
    minHeight: "100%",
    color: "#eaf0ff",
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(6px)",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const tabButtonStyle = (active: boolean): CSSProperties => ({
    ...buttonStyle,
    background: active ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.05)",
  });

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
  };

  const optionStyle: CSSProperties = {
    backgroundColor: "#1f2937",
    color: "#ffffff",
  };

  const tableWrapStyle: CSSProperties = {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 760,
  };

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    verticalAlign: "middle",
  };

  const isAlojados = panel === "ALOJADOS";

  return (
    <div style={pageStyle}>
      <h1 style={{ marginTop: 0, marginBottom: 16, color: "#ffffff" }}>
        Gestiones — ADMIN (solo lectura)
      </h1>

      <section style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setPanel("PERMISIONARIOS")}
          style={tabButtonStyle(panel === "PERMISIONARIOS")}
        >
          Permisionarios
        </button>
        <button
          onClick={() => setPanel("ALOJADOS")}
          style={tabButtonStyle(panel === "ALOJADOS")}
        >
          Alojados
        </button>
      </section>

      {errorMsg ? (
        <div
          style={{
            ...cardStyle,
            marginBottom: 12,
            border: "1px solid rgba(239,68,68,0.30)",
            background: "rgba(127,29,29,0.18)",
            color: "#fecaca",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      <section style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            disabled={loading}
            style={selectStyle}
          >
            {anexosDisponibles.map((c) => (
              <option key={c} value={c} style={optionStyle}>
                {c}
              </option>
            ))}
          </select>

          <button onClick={cargarLista} disabled={loading} style={buttonStyle}>
            {loading ? "Cargando…" : "Actualizar"}
          </button>

          <span style={{ marginLeft: 12, color: "rgba(255,255,255,0.80)" }}>
            Resultados: {items.length}
          </span>
        </div>
      </section>

      <section style={cardStyle}>
        {loading ? (
          <p style={{ margin: 0 }}>Cargando anexos…</p>
        ) : items.length === 0 ? (
          <p style={{ margin: 0 }}>No hay anexos.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
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
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {isAlojados ? (
                            <button
                              disabled={busy}
                              onClick={() => navigate(`/app/admin/gestiones/alojamientos/${an._id}`)}
                              style={buttonStyle}
                            >
                              Ver
                            </button>
                          ) : null}
                          <button
                            disabled={busy}
                            onClick={() => descargarPdf(an._id, up(an.codigo))}
                            style={buttonStyle}
                          >
                            PDF
                          </button>
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
  );
}
