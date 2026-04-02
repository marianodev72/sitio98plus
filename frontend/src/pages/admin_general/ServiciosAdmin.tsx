import { useEffect, useMemo, useState, type CSSProperties } from "react";
import http from "../../api/http";
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
  successButtonStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type Item = {
  _id: string;
  viviendaCodigo: string;
  periodo: string;
  leidoPorUsuario?: boolean;
  fechaLectura?: string | null;
  requiereAdministracion?: boolean;
  alertaActiva?: boolean;
  servicios?: {
    electricidad?: number | null;
    gas?: number | null;
    agua?: number | null;
  };
  referenciasInstitucionales?: {
    dpeNumeroServicio?: string;
    camuzziNumeroServicio?: string;
    dpossNumeroServicio?: string;
  };
  observaciones?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function toStrMonto(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s;
}

function parseMontoOrNull(raw: string): number | null {
  const s = String(raw || "").trim();
  if (!s) return null;

  const normalized = s.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return NaN as any;
  return n;
}

export default function ServiciosAdmin() {
  const { user } = useAuth();
  const isAdminGeneral = useMemo(() => up(user?.role) === "ADMIN_GENERAL", [user]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [vivienda, setVivienda] = useState("");
  const [estado, setEstado] = useState<"all" | "leidos" | "noleidos">("all");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const [obs, setObs] = useState("");
  const [electricidad, setElectricidad] = useState<string>("");
  const [gas, setGas] = useState<string>("");
  const [agua, setAgua] = useState<string>("");

  const [dpe, setDpe] = useState("");
  const [camuzzi, setCamuzzi] = useState("");
  const [dposs, setDposs] = useState("");

  async function cargar() {
    setLoading(true);
    setError(false);

    try {
      const params: any = { estado };
      if (vivienda.trim()) params.vivienda = vivienda.trim().toUpperCase();

      const { data } = await http.get("/servicios/admin/listado", { params });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpiarFiltros() {
    setVivienda("");
    setEstado("all");
    setTimeout(() => cargar(), 0);
  }

  function openPdf(id: string) {
    try {
      window.open(`/api/servicios/${id}/pdf`, "_blank", "noopener");
    } catch {
      setError(true);
    }
  }

  function openCorreccion(x: Item) {
    if (!isAdminGeneral) return;

    setSelected(x);
    setObs("");

    setElectricidad(toStrMonto(x.servicios?.electricidad));
    setGas(toStrMonto(x.servicios?.gas));
    setAgua(toStrMonto(x.servicios?.agua));

    setDpe(String(x.referenciasInstitucionales?.dpeNumeroServicio || ""));
    setCamuzzi(String(x.referenciasInstitucionales?.camuzziNumeroServicio || ""));
    setDposs(String(x.referenciasInstitucionales?.dpossNumeroServicio || ""));

    setOpen(true);
  }

  function closeCorreccion() {
    setOpen(false);
    setSelected(null);
    setObs("");
    setElectricidad("");
    setGas("");
    setAgua("");
    setDpe("");
    setCamuzzi("");
    setDposs("");
  }

  async function guardarCorreccion() {
    if (!selected) return;

    if (!obs.trim()) {
      setError(true);
      return;
    }

    const e = parseMontoOrNull(electricidad);
    const g = parseMontoOrNull(gas);
    const a = parseMontoOrNull(agua);

    if ([e, g, a].some((x) => typeof x === "number" && !Number.isFinite(x))) {
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      await http.patch(`/servicios/${selected._id}/corregir`, {
        observaciones: obs.trim(),
        servicios: {
          electricidad: e === null ? null : e,
          gas: g === null ? null : g,
          agua: a === null ? null : a,
        },
        referenciasInstitucionales: {
          dpeNumeroServicio: dpe.trim(),
          camuzziNumeroServicio: camuzzi.trim(),
          dpossNumeroServicio: dposs.trim(),
        },
      });

      closeCorreccion();
      await cargar();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const controlStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#F8FAFC",
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

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Servicios — Administración</h2>
          <p style={subtitleStyle}>
            Gestión administrativa de lecturas, alertas y correcciones institucionales.
          </p>
        </div>

        {error ? (
          <div
            style={{
              ...softCardStyle,
              marginBottom: 12,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(127,29,29,0.18)",
              color: "#fecaca",
            }}
          >
            No es posible procesar su solicitud, contáctese con el Administrador
          </div>
        ) : null}

        <div style={cardStyle}>
          <div style={{ ...softCardStyle, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.62)",
                    marginBottom: 6,
                  }}
                >
                  Vivienda
                </div>
                <input
                  value={vivienda}
                  onChange={(e) => setVivienda(e.target.value)}
                  placeholder="Ej: AB-401"
                  style={controlStyle}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.62)",
                    marginBottom: 6,
                  }}
                >
                  Lectura
                </div>
                <select
  value={estado}
  onChange={(e) => setEstado(e.target.value as any)}
  style={selectStyle}
>
  <option value="all" style={optionStyle}>
    Todos
  </option>
  <option value="leidos" style={optionStyle}>
    Leídos
  </option>
  <option value="noleidos" style={optionStyle}>
    No leídos
  </option>
</select>
              </div>

              <div style={buttonRowStyle}>
                <button onClick={cargar} disabled={loading} style={primaryButtonStyle}>
                  Aplicar
                </button>
                <button onClick={limpiarFiltros} disabled={loading} style={secondaryButtonStyle}>
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <h3 style={sectionTitleStyle}>Resultados</h3>

          {loading ? (
            <div style={softCardStyle}>Cargando…</div>
          ) : !items.length ? (
            <div style={softCardStyle}>Sin resultados</div>
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
                width="100%"
                cellPadding={8}
                style={{ borderCollapse: "collapse", minWidth: 760 }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Vivienda</th>
                    <th style={thStyle}>Período</th>
                    <th style={thStyle}>Lectura</th>
                    <th style={thStyle}>Pendiente Admin</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => (
                    <tr key={x._id}>
                      <td style={tdStyle}>{x.viviendaCodigo}</td>
                      <td style={tdStyle}>{x.periodo}</td>
                      <td style={tdStyle}>{x.leidoPorUsuario ? "Leído" : "No leído"}</td>
                      <td style={tdStyle}>{x.requiereAdministracion ? "Sí" : "No"}</td>
                      <td style={tdStyle}>
                        <div style={{ ...buttonRowStyle, marginTop: 0 }}>
                          <button onClick={() => openPdf(x._id)} style={secondaryButtonStyle}>
                            Ver PDF
                          </button>
                          {isAdminGeneral ? (
                            <button
                              onClick={() => openCorreccion(x)}
                              style={successButtonStyle}
                            >
                              Corregir
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {open && selected ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 50,
            }}
            onClick={closeCorreccion}
          >
            <div
              style={{
                ...cardStyle,
                width: 720,
                maxWidth: "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff" }}>
                    Corrección administrativa
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                    {selected.viviendaCodigo} — {selected.periodo}
                  </div>
                </div>
                <button onClick={closeCorreccion} style={secondaryButtonStyle}>
                  Cerrar
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.62)",
                    marginBottom: 6,
                  }}
                >
                  Observación (obligatoria)
                </div>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={3}
                  style={{ ...controlStyle, width: "100%", resize: "vertical" }}
                  placeholder="Observación institucional"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.62)",
                      marginBottom: 6,
                    }}
                  >
                    Electricidad (DPE)
                  </div>
                  <input
                    value={electricidad}
                    onChange={(e) => setElectricidad(e.target.value)}
                    placeholder="Monto"
                    style={{ ...controlStyle, width: "100%" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.62)",
                      marginBottom: 6,
                    }}
                  >
                    Gas (CAMUZZI)
                  </div>
                  <input
                    value={gas}
                    onChange={(e) => setGas(e.target.value)}
                    placeholder="Monto"
                    style={{ ...controlStyle, width: "100%" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.62)",
                      marginBottom: 6,
                    }}
                  >
                    Agua (DPOSS)
                  </div>
                  <input
                    value={agua}
                    onChange={(e) => setAgua(e.target.value)}
                    placeholder="Monto"
                    style={{ ...controlStyle, width: "100%" }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.62)",
                      marginBottom: 6,
                    }}
                  >
                    N° servicio DPE
                  </div>
                  <input
                    value={dpe}
                    onChange={(e) => setDpe(e.target.value)}
                    style={{ ...controlStyle, width: "100%" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.62)",
                      marginBottom: 6,
                    }}
                  >
                    N° servicio CAMUZZI
                  </div>
                  <input
                    value={camuzzi}
                    onChange={(e) => setCamuzzi(e.target.value)}
                    style={{ ...controlStyle, width: "100%" }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.62)",
                      marginBottom: 6,
                    }}
                  >
                    N° servicio DPOSS
                  </div>
                  <input
                    value={dposs}
                    onChange={(e) => setDposs(e.target.value)}
                    style={{ ...controlStyle, width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ ...buttonRowStyle, justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={closeCorreccion} disabled={loading} style={secondaryButtonStyle}>
                  Cancelar
                </button>
                <button
                  onClick={guardarCorreccion}
                  disabled={loading}
                  style={successButtonStyle}
                >
                  Guardar corrección
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}