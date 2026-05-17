import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type AdjuntoPublico = {
  id?: string;
  campo?: string;
  nombreOriginal?: string;
  mime?: string;
  size?: number;
  fechaSubida?: string;
};

type AlojamientoDocumento = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  datos?: Record<string, any>;
  solicitante?: string | { _id?: string };
  alojado?: string | { _id?: string };
  intervinientes?: Array<{ userId?: string | { _id?: string }; rol?: string }>;
  conformidades?: Array<{
    tipo?: string;
    ok?: boolean;
    usuario?: string | { _id?: string };
    rol?: string;
    fecha?: string;
    observacion?: string;
  }>;
  historialEstados?: Array<{
    estadoNuevo?: string;
    fecha?: string;
    createdAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

const pageStyle: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "clamp(12px, 2vw, 24px)",
  color: "#F8FAFC",
  boxSizing: "border-box",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: 24,
  fontWeight: 850,
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#CBD5E1",
  lineHeight: 1.5,
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 10px",
  color: "#ffffff",
  fontSize: 17,
  fontWeight: 800,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
  gap: 10,
};

const fieldStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(15,23,42,0.48)",
  borderRadius: 10,
  padding: 10,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "#9CA3AF",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
};

const valueStyle: CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "#F8FAFC",
  wordBreak: "break-word",
};

const neutralButtonStyle: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  background: "#1D4ED8",
  border: "1px solid rgba(147,197,253,0.55)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatBytes(size?: number) {
  const value = Number(size || 0);
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function envioFecha(doc: AlojamientoDocumento | null) {
  const match = (doc?.historialEstados || []).find((item) => up(item?.estadoNuevo) === "ENVIADO");
  return match?.fecha || match?.createdAt || "";
}

function adjuntosFromDatos(datos: Record<string, any> | undefined): AdjuntoPublico[] {
  const adjuntos = datos?.adjuntos;
  if (!adjuntos || typeof adjuntos !== "object" || Array.isArray(adjuntos)) return [];
  return Object.values(adjuntos).filter(Boolean) as AdjuntoPublico[];
}

function idValue(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return String((value as { _id?: string })._id || "");
  }
  return String(value || "");
}

function conformidadPostulante(documento: AlojamientoDocumento | null, userId?: string) {
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.find(
    (item) => up(item?.tipo) === "POSTULANTE" && (!userId || idValue(item?.usuario) === userId)
  );
}

function esTitularOInterviniente(documento: AlojamientoDocumento | null, userId?: string) {
  if (!documento || !userId) return false;
  if (idValue(documento.solicitante) === userId) return true;
  if (idValue(documento.alojado) === userId) return true;

  const intervinientes = Array.isArray(documento.intervinientes) ? documento.intervinientes : [];
  return intervinientes.some((item) => idValue(item?.userId) === userId);
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{safe(value)}</span>
    </div>
  );
}

export default function AlojamientoDocumentoReadonly() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [documento, setDocumento] = useState<AlojamientoDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingConformidad, setSubmittingConformidad] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const datos = documento?.datos || {};
  const adjuntos = useMemo(() => adjuntosFromDatos(datos), [datos]);
  const esAnexo22 = up(documento?.codigo) === "ANEXO_22";
  const userId = String(user?._id || "");
  const conformidadActual = conformidadPostulante(documento, userId);
  const puedeConformar =
    esAnexo22 &&
    up(documento?.estado) === "ENVIADO" &&
    up(user?.role) === "POSTULANTE" &&
    esTitularOInterviniente(documento, userId) &&
    !conformidadActual;

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get(`/alojamientos-documentos/${id}`);
      setDocumento(res.data?.documento || null);
    } catch {
      setDocumento(null);
      setErrorMsg("No es posible acceder al documento solicitado.");
    } finally {
      setLoading(false);
    }
  }

  async function prestarConformidad() {
    if (!id || !puedeConformar || submittingConformidad) return;
    const confirmado = window.confirm("Confirma que presta conformidad sobre el ANEXO_22?");
    if (!confirmado) return;

    setSubmittingConformidad(true);
    setErrorMsg("");
    setInfoMsg("");

    try {
      await http.post(`/alojamientos-documentos/${id}/conformidad-postulante`, {});
      await cargar();
      setInfoMsg("Conformidad registrada correctamente.");
    } catch {
      setErrorMsg("No fue posible registrar la conformidad.");
    } finally {
      setSubmittingConformidad(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div style={pageStyle}>
      <button type="button" style={neutralButtonStyle} onClick={() => navigate("/app/postulante/mis-anexos")}>
        Volver a Mis anexos
      </button>

      <section style={cardStyle}>
        <h1 style={titleStyle}>Documento de alojamiento</h1>
        <p style={subtitleStyle}>Consulta read-only de solicitud institucional de Alojamientos Navales.</p>
      </section>

      {errorMsg ? (
        <section
          style={{
            ...cardStyle,
            background: "rgba(127,29,29,0.18)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#FCA5A5",
          }}
        >
          {errorMsg}
        </section>
      ) : null}

      {infoMsg ? (
        <section
          style={{
            ...cardStyle,
            background: "rgba(22,101,52,0.18)",
            border: "1px solid rgba(74,222,128,0.35)",
            color: "#BBF7D0",
          }}
        >
          {infoMsg}
        </section>
      ) : null}

      {loading ? (
        <section style={cardStyle}>
          <p style={{ margin: 0, color: "#CBD5E1" }}>Cargando documento...</p>
        </section>
      ) : documento ? (
        <>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Estado documental</h2>
            <div style={gridStyle}>
              <Field label="Codigo" value={documento.codigo} />
              <Field label="Estado" value={documento.estado} />
              <Field label="Estado institucional" value={documento.estadoInstitucional} />
              <Field label="Creacion" value={fmtDate(documento.createdAt)} />
              <Field label="Actualizacion" value={fmtDate(documento.updatedAt)} />
              <Field label="Envio" value={fmtDate(envioFecha(documento))} />
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Datos personales</h2>
            <div style={gridStyle}>
              <Field label="Tipo solicitud" value={datos.tipoSolicitud} />
              <Field label="Postulante / alojado" value={datos.postulanteNombre} />
              <Field label="Apellido" value={datos.apellido} />
              <Field label="Nombres" value={datos.nombres} />
              <Field label="Genero" value={datos.genero || datos.sexo} />
              <Field label="M.R." value={datos.mr} />
              <Field label="Grado / escalafon" value={datos.gradoEscalafon} />
              <Field label="Afiliado IOSFA" value={datos.afiliadoIOSFA} />
            </div>
          </section>

          {esAnexo22 ? (
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Asignacion de alojamiento</h2>
              <div style={gridStyle}>
                <Field label="Alojamiento" value={datos.alojamientoCodigo} />
                <Field label="Dependencia" value={datos.dependencia} />
                <Field label="Lugar" value={datos.lugar} />
                <Field label="Sector" value={datos.sector} />
                <Field label="Tipo" value={datos.tipo} />
                <Field label="Numero" value={datos.numero} />
                <Field label="Clase" value={datos.clase} />
                <Field label="Capacidad" value={datos.capacidad} />
                <Field label="Genero permitido" value={datos.generoPermitido} />
                <Field label="Plaza" value={datos.numeroPlaza} />
                <Field label="Codigo plaza" value={datos.plazaCodigo} />
                <Field label="Fecha reserva" value={fmtDate(datos.fechaReserva)} />
              </div>
            </section>
          ) : null}

          {esAnexo22 ? (
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Conformidad del postulante</h2>
              {conformidadActual ? (
                <div style={gridStyle}>
                  <Field label="Estado" value="Conformidad registrada" />
                  <Field label="Fecha" value={fmtDate(conformidadActual.fecha)} />
                  <Field label="Rol" value={conformidadActual.rol || "POSTULANTE"} />
                </div>
              ) : (
                <>
                  <p style={subtitleStyle}>
                    Revise los datos de asignacion. Si esta de acuerdo, preste conformidad para
                    continuar el tramite.
                  </p>
                  {puedeConformar ? (
                    <button
                      type="button"
                      style={{
                        ...primaryButtonStyle,
                        opacity: submittingConformidad ? 0.65 : 1,
                        cursor: submittingConformidad ? "not-allowed" : "pointer",
                      }}
                      onClick={prestarConformidad}
                      disabled={submittingConformidad}
                    >
                      {submittingConformidad ? "Registrando..." : "Prestar conformidad"}
                    </button>
                  ) : (
                    <p style={{ margin: 0, color: "#CBD5E1" }}>
                      No hay acciones de conformidad disponibles para este documento.
                    </p>
                  )}
                </>
              )}
            </section>
          ) : null}

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Datos laborales</h2>
            <div style={gridStyle}>
              <Field label="Destino actual" value={datos.destinoActual} />
              <Field label="Destino futuro" value={datos.destinoFuturo} />
              <Field label="Telefono actual" value={datos.telefonoActual} />
              <Field label="Telefono futuro" value={datos.telefonoFuturo} />
              <Field label="Fecha ultimo ascenso" value={datos.fechaUltimoAscenso} />
              <Field label="Anios servicio recibo" value={datos.aniosServicioRecibo} />
              <Field label="Fecha traslado zona" value={datos.fechaEstimadaTrasladoZona} />
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Grupo familiar</h2>
            {Array.isArray(datos.grupoFamiliar) && datos.grupoFamiliar.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {datos.grupoFamiliar.map((item: any, index: number) => (
                  <div key={index} style={fieldStyle}>
                    <span style={valueStyle}>
                      {safe(item?.apellidoNombre || item?.nombreCompleto || item?.nombre || item)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#CBD5E1" }}>Sin grupo familiar declarado.</p>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Adjuntos</h2>
            {adjuntos.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {adjuntos.map((adjunto, index) => (
                  <div key={adjunto.id || adjunto.campo || index} style={fieldStyle}>
                    <span style={labelStyle}>{safe(adjunto.campo)}</span>
                    <span style={valueStyle}>{safe(adjunto.nombreOriginal)}</span>
                    <span style={{ ...valueStyle, color: "#CBD5E1" }}>
                      {safe(adjunto.mime)} - {formatBytes(adjunto.size)} - {fmtDate(adjunto.fechaSubida)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#CBD5E1" }}>Sin adjuntos registrados.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
