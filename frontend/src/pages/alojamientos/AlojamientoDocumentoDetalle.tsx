import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  secondaryButtonStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type AdjuntoPublico = {
  id?: string;
  campo?: string;
  nombreOriginal?: string;
  mime?: string;
  size?: number;
  sha256?: string;
  fechaSubida?: string;
  subidoPor?: string;
};

type AlojamientoDocumento = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  datos?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  historialEstados?: Array<Record<string, any>>;
  intervenciones?: Array<Record<string, any>>;
  conformidades?: Array<Record<string, any>>;
};

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function safe(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function fmtDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatBytes(value?: number) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function roleAllowed(role: unknown) {
  return up(role) === "ADMIN_GENERAL";
}

function adjuntosFromDatos(datos?: Record<string, any>): AdjuntoPublico[] {
  const adjuntos = datos?.adjuntos;
  if (!adjuntos || typeof adjuntos !== "object" || Array.isArray(adjuntos)) return [];

  return Object.entries(adjuntos)
    .map(([campo, meta]) => {
      if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
      const item = meta as AdjuntoPublico;
      return {
        id: item.id,
        campo: item.campo || campo,
        nombreOriginal: item.nombreOriginal,
        mime: item.mime,
        size: item.size,
        sha256: item.sha256,
        fechaSubida: item.fechaSubida,
        subidoPor: item.subidoPor,
      };
    })
    .filter(Boolean) as AdjuntoPublico[];
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.62)",
  marginBottom: 4,
};

const valueStyle: CSSProperties = {
  color: "rgba(255,255,255,0.92)",
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const thStyle: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 12,
  color: "rgba(255,255,255,0.64)",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
  verticalAlign: "top",
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{safe(value)}</div>
    </div>
  );
}

function boolLabel(value: unknown) {
  if (value === true) return "SI";
  if (value === false) return "NO";
  return "-";
}

export default function AlojamientoDocumentoDetalle() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [documento, setDocumento] = useState<AlojamientoDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const allowed = roleAllowed(user?.role);
  const datos = documento?.datos || {};
  const adjuntos = useMemo(() => adjuntosFromDatos(datos), [datos]);

  async function cargar() {
    if (!allowed || !id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get(`/alojamientos-documentos/${id}`);
      setDocumento(res.data?.documento || null);
    } catch {
      setDocumento(null);
      setErrorMsg("No es posible acceder al documento de alojamiento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, id]);

  if (!allowed) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={cardStyle}>
            <h2 style={titleStyle}>Recurso no disponible</h2>
            <p style={subtitleStyle}>No es posible acceder al documento solicitado.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Documento de alojamiento</h1>
          <p style={subtitleStyle}>Detalle read-only del universo Alojamientos Navales.</p>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button type="button" style={secondaryButtonStyle} onClick={() => navigate(-1)}>
              Volver
            </button>
            <button type="button" style={secondaryButtonStyle} onClick={cargar} disabled={loading}>
              {loading ? "Cargando..." : "Recargar"}
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                ...softCardStyle,
                marginTop: 16,
                border: "1px solid rgba(239,68,68,0.30)",
                background: "rgba(127,29,29,0.18)",
                color: "#fecaca",
              }}
            >
              {errorMsg}
            </div>
          )}

          {loading && <div style={{ ...softCardStyle, marginTop: 16 }}>Cargando documento...</div>}

          {!loading && documento && (
            <>
              <section
                style={{
                  ...softCardStyle,
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                }}
              >
                <Field label="Codigo" value={documento.codigo} />
                <Field label="Estado" value={documento.estado} />
                <Field label="Estado institucional" value={documento.estadoInstitucional} />
                <Field label="Creado" value={fmtDate(documento.createdAt)} />
                <Field label="Actualizado" value={fmtDate(documento.updatedAt)} />
              </section>

              <section style={{ ...softCardStyle, marginTop: 16 }}>
                <h3 style={{ marginTop: 0, color: "#ffffff" }}>Datos principales</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  <Field label="Tipo de solicitud" value={datos.tipoSolicitud} />
                  <Field label="Lugar" value={datos.lugar} />
                  <Field label="Fecha lugar" value={datos.fechaLugar} />
                  <Field label="Autoridad de asignacion" value={datos.autoridadAsignacion} />
                  <Field label="Zona naval" value={datos.zonaNaval} />
                  <Field label="Organismo administrador" value={datos.organismoAdministrador} />
                  <Field label="MR" value={datos.mr} />
                  <Field label="Afiliado IOSFA" value={datos.afiliadoIOSFA} />
                  <Field label="Grado / escalafon" value={datos.gradoEscalafon} />
                  <Field label="Apellido" value={datos.apellido} />
                  <Field label="Nombres" value={datos.nombres} />
                  <Field label="Destino actual" value={datos.destinoActual} />
                  <Field label="Destino futuro" value={datos.destinoFuturo} />
                  <Field label="Telefono actual" value={datos.telefonoActual} />
                  <Field label="Telefono futuro" value={datos.telefonoFuturo} />
                  <Field label="Ultimo ascenso" value={datos.fechaUltimoAscenso} />
                  <Field label="Anios de servicio" value={datos.aniosServicioRecibo} />
                  <Field label="Acepta reglamento" value={boolLabel(datos.aceptaCondicionesReglamento)} />
                  <Field label="Agrega FIDOFAC" value={boolLabel(datos.agregaFidofac)} />
                  <Field label="Agrega Recibo de Haberes" value={boolLabel(datos.agregaReciboHaberes)} />
                  <Field label="Problemas socioeconomicos" value={boolLabel(datos.tieneProblemasSocioeconomicos)} />
                  <Field label="Oficio socioeconomico" value={datos.oficioProblemasSocioeconomicos} />
                  <Field label="Declarado inepto DGPN" value={boolLabel(datos.declaradoIneptoDGPN)} />
                  <Field label="Indice titularidad" value={boolLabel(datos.agregaIndiceTitularidad)} />
                </div>
              </section>

              <section style={{ ...softCardStyle, marginTop: 16 }}>
                <h3 style={{ marginTop: 0, color: "#ffffff" }}>Adjuntos</h3>
                {adjuntos.length === 0 ? (
                  <p style={subtitleStyle}>No hay adjuntos registrados.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Campo</th>
                          <th style={thStyle}>Archivo</th>
                          <th style={thStyle}>Tipo</th>
                          <th style={thStyle}>Tamanio</th>
                          <th style={thStyle}>Fecha</th>
                          <th style={thStyle}>Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjuntos.map((adjunto) => (
                          <tr key={adjunto.campo || adjunto.id}>
                            <td style={tdStyle}>
                              <span style={badgeStyle}>{safe(adjunto.campo)}</span>
                            </td>
                            <td style={tdStyle}>{safe(adjunto.nombreOriginal)}</td>
                            <td style={tdStyle}>{safe(adjunto.mime)}</td>
                            <td style={tdStyle}>{formatBytes(adjunto.size)}</td>
                            <td style={tdStyle}>{fmtDate(adjunto.fechaSubida)}</td>
                            <td style={tdStyle}>
                              <button
                                type="button"
                                style={{ ...secondaryButtonStyle, padding: "7px 10px" }}
                                onClick={() =>
                                  window.open(
                                    `/api/alojamientos-documentos/${documento._id}/adjuntos/${adjunto.campo}`,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                Descargar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section style={{ ...softCardStyle, marginTop: 16 }}>
                <h3 style={{ marginTop: 0, color: "#ffffff" }}>Historial</h3>
                <p style={subtitleStyle}>
                  Estados: {Array.isArray(documento.historialEstados) ? documento.historialEstados.length : 0} ·
                  Intervenciones: {Array.isArray(documento.intervenciones) ? documento.intervenciones.length : 0} ·
                  Conformidades: {Array.isArray(documento.conformidades) ? documento.conformidades.length : 0}
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
