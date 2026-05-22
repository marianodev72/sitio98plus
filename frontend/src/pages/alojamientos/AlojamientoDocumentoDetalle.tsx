import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  badgeStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
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

type PlazaElegible = {
  _id: string;
  codigo: string;
  numeroPlaza: number;
  estado: string;
  label: string;
  disponible: boolean;
  alojamiento?: {
    _id?: string;
    codigo?: string;
    dependencia?: string;
    lugar?: string;
    sector?: string;
    tipo?: string;
    numero?: string;
    clase?: string;
    capacidad?: number;
    generoPermitido?: string;
    estado?: string;
  };
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

function conformidadPorTipo(documento: AlojamientoDocumento | null, tipo: string) {
  const tipoUp = up(tipo);
  const conformidades = Array.isArray(documento?.conformidades) ? documento.conformidades : [];
  return conformidades.find((item) => up(item?.tipo) === tipoUp && item?.ok === true) || null;
}

function signerPorTipo(documento: AlojamientoDocumento | null, tipo: string) {
  const tipoUp = up(tipo);
  const signers = Array.isArray((documento as any)?.signers) ? (documento as any).signers : [];
  return signers.find((item: any) => up(item?.tipo) === tipoUp) || null;
}

function descargarBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function AlojamientoDocumentoDetalle() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [documento, setDocumento] = useState<AlojamientoDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [plazas, setPlazas] = useState<PlazaElegible[]>([]);
  const [loadingPlazas, setLoadingPlazas] = useState(false);
  const [plazaSeleccionada, setPlazaSeleccionada] = useState("");
  const [generandoAnexo22, setGenerandoAnexo22] = useState(false);
  const [cerrandoAnexo22, setCerrandoAnexo22] = useState(false);
  const [cerrandoAnexo23, setCerrandoAnexo23] = useState(false);
  const [cerrandoAnexo24, setCerrandoAnexo24] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [plazasError, setPlazasError] = useState("");

  const allowed = roleAllowed(user?.role);
  const datos = documento?.datos || {};
  const huesped = datos.huesped || {};
  const alojamientoSnapshot = datos.alojamientoSnapshot || {};
  const plazaSnapshot = datos.plazaSnapshot || {};
  const adjuntos = useMemo(() => adjuntosFromDatos(datos), [datos]);
  const esAnexo22 = up(documento?.codigo) === "ANEXO_22";
  const esAnexo23 = up(documento?.codigo) === "ANEXO_23";
  const esAnexo24 = up(documento?.codigo) === "ANEXO_24";
  const conformidadPostulante = conformidadPorTipo(documento, "POSTULANTE");
  const conformidadAlojado = conformidadPorTipo(documento, "ALOJADO");
  const conformidadInspector =
    conformidadPorTipo(documento, "INSPECTOR") ||
    (datos.conformidadInspector?.ok === true ? datos.conformidadInspector : null);
  const conformidadAdminGeneral = conformidadPorTipo(documento, "ADMIN_GENERAL");
  const signerPostulante = signerPorTipo(documento, "POSTULANTE");
  const signerAlojado = signerPorTipo(documento, "ALOJADO");
  const signerAdminGeneral = signerPorTipo(documento, "ADMIN_GENERAL");
  const puedePrepararAnexo22 =
    up(documento?.codigo) === "ANEXO_21" && ["ENVIADO", "EN_REVISION"].includes(up(documento?.estado));
  const puedeCerrarAnexo22 =
    esAnexo22 &&
    up(documento?.estado) === "EN_REVISION" &&
    Boolean(conformidadPostulante) &&
    !conformidadAdminGeneral;
  const puedeCerrarAnexo23 =
    esAnexo23 &&
    up(documento?.estado) === "EN_REVISION" &&
    Boolean(conformidadAlojado) &&
    !conformidadAdminGeneral;
  const puedeCerrarAnexo24 =
    esAnexo24 &&
    up(documento?.estado) === "EN_REVISION" &&
    Boolean(conformidadInspector) &&
    !conformidadAdminGeneral;

  async function cargarPlazasElegibles() {
    if (!allowed || !puedePrepararAnexo22) return;

    setLoadingPlazas(true);
    setPlazasError("");

    try {
      const res = await http.get("/alojamientos-plazas/elegibles-asignacion", {
        params: { anexo21Id: documento?._id },
      });
      setPlazas(Array.isArray(res.data?.plazas) ? res.data.plazas : []);
    } catch {
      setPlazas([]);
      setPlazasError("No es posible cargar plazas elegibles en este momento.");
    } finally {
      setLoadingPlazas(false);
    }
  }

  async function cargar() {
    if (!allowed || !id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get(`/alojamientos-documentos/${id}`);
      setDocumento(res.data?.documento || null);
      setPlazaSeleccionada("");
      setInfoMsg("");
    } catch {
      setDocumento(null);
      setErrorMsg("No es posible acceder al documento de alojamiento.");
    } finally {
      setLoading(false);
    }
  }

  async function generarAnexo22() {
    if (!documento?._id || !plazaSeleccionada || generandoAnexo22) return;

    setGenerandoAnexo22(true);
    setInfoMsg("");
    setErrorMsg("");

    try {
      const res = await http.post(`/alojamientos-documentos/${documento._id}/generar-anexo-22`, {
        plazaId: plazaSeleccionada,
      });
      const nuevoDocumento = res.data?.documento;

      if (nuevoDocumento?._id) {
        setInfoMsg("ANEXO_22 generado correctamente.");
        navigate(`/app/admin-general/gestiones/alojamientos/${nuevoDocumento._id}`);
        return;
      }

      setInfoMsg("ANEXO_22 generado correctamente.");
      await cargar();
    } catch {
      setErrorMsg("No es posible generar el ANEXO_22 en este momento.");
      await cargarPlazasElegibles();
    } finally {
      setGenerandoAnexo22(false);
    }
  }

  async function cerrarTramiteAnexo22() {
    if (!documento?._id || !puedeCerrarAnexo22 || cerrandoAnexo22) return;
    const confirmado = window.confirm("Confirma el cierre ADMIN_GENERAL del ANEXO_22?");
    if (!confirmado) return;

    setCerrandoAnexo22(true);
    setInfoMsg("");
    setErrorMsg("");

    try {
      await http.post(`/alojamientos-documentos/${documento._id}/cerrar-anexo-22`, {});
      setInfoMsg("ANEXO_22 cerrado correctamente.");
      await cargar();
    } catch {
      setErrorMsg("No es posible cerrar el ANEXO_22 en este momento.");
    } finally {
      setCerrandoAnexo22(false);
    }
  }

  async function cerrarTramiteAnexo23() {
    if (!documento?._id || !puedeCerrarAnexo23 || cerrandoAnexo23) return;
    const confirmado = window.confirm("Confirma el cierre ADMIN_GENERAL del ANEXO_23?");
    if (!confirmado) return;

    setCerrandoAnexo23(true);
    setInfoMsg("");
    setErrorMsg("");

    try {
      await http.post(`/alojamientos-documentos/${documento._id}/cerrar-anexo-23`, {});
      setInfoMsg("ANEXO_23 cerrado correctamente.");
      await cargar();
    } catch {
      setErrorMsg("No es posible cerrar el ANEXO_23 en este momento.");
    } finally {
      setCerrandoAnexo23(false);
    }
  }

  async function cerrarTramiteAnexo24() {
    if (!documento?._id || !puedeCerrarAnexo24 || cerrandoAnexo24) return;
    const confirmado = window.confirm("Confirma el cierre ADMIN_GENERAL del ANEXO_24?");
    if (!confirmado) return;

    setCerrandoAnexo24(true);
    setInfoMsg("");
    setErrorMsg("");

    try {
      await http.post(`/alojamientos-documentos/${documento._id}/cerrar-anexo-24`, {});
      setInfoMsg("ANEXO_24 cerrado correctamente.");
      await cargar();
    } catch {
      setErrorMsg("No es posible cerrar el ANEXO_24 en este momento.");
    } finally {
      setCerrandoAnexo24(false);
    }
  }

  async function descargarPdfDocumento() {
    if (!documento?._id || (!esAnexo22 && !esAnexo23 && !esAnexo24) || descargandoPdf) return;

    setDescargandoPdf(true);
    setInfoMsg("");
    setErrorMsg("");

    try {
      const res = await http.get(`/alojamientos-documentos/${documento._id}/pdf`, {
        responseType: "blob",
      });
      const codigo = esAnexo24 ? "ANEXO_24" : esAnexo23 ? "ANEXO_23" : "ANEXO_22";
      descargarBlob(new Blob([res.data], { type: "application/pdf" }), `${codigo}_${documento._id}.pdf`);
      setInfoMsg("PDF descargado correctamente.");
    } catch {
      setErrorMsg("No es posible descargar el PDF en este momento.");
    } finally {
      setDescargandoPdf(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, id]);

  useEffect(() => {
    setPlazas([]);
    setPlazasError("");
    setPlazaSeleccionada("");
    if (puedePrepararAnexo22) cargarPlazasElegibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedePrepararAnexo22, documento?._id]);

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
            {esAnexo22 || esAnexo23 || esAnexo24 ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={descargarPdfDocumento}
                disabled={descargandoPdf}
              >
                {descargandoPdf ? "Descargando..." : "Descargar PDF"}
              </button>
            ) : null}
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

          {infoMsg && (
            <div
              style={{
                ...softCardStyle,
                marginTop: 16,
                border: "1px solid rgba(59,130,246,0.30)",
                background: "rgba(30,64,175,0.18)",
                color: "#bfdbfe",
              }}
            >
              {infoMsg}
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
                  <Field label="Lugar" value={alojamientoSnapshot.lugar || datos.lugar} />
                  <Field label="Fecha lugar" value={datos.fechaLugar} />
                  <Field label="Autoridad de asignacion" value={datos.autoridadAsignacion} />
                  <Field label="Zona naval" value={datos.zonaNaval} />
                  <Field label="Organismo administrador" value={datos.organismoAdministrador} />
                  <Field label="MR" value={huesped.mr || datos.mr} />
                  <Field label="Afiliado IOSFA" value={datos.afiliadoIOSFA} />
                  <Field label="Grado / escalafon" value={huesped.gradoEscalafon || datos.gradoEscalafon} />
                  <Field label="Genero" value={huesped.genero || datos.genero || datos.sexo} />
                  <Field label="Apellido" value={huesped.apellido || datos.apellido} />
                  <Field label="Nombres" value={huesped.nombres || datos.nombres} />
                  <Field label="Destino actual" value={huesped.destinoActual || datos.destinoActual} />
                  <Field label="Destino futuro" value={huesped.destinoFuturo || datos.destinoFuturo} />
                  <Field label="Telefono actual" value={huesped.telefono || datos.telefonoActual || datos.telefono} />
                  <Field label="Telefono futuro" value={datos.telefonoFuturo} />
                  <Field label="Email" value={huesped.email || datos.email} />
                  <Field label="Alojamiento" value={alojamientoSnapshot.alojamientoCodigo || datos.alojamientoCodigo} />
                  <Field label="Edificio" value={alojamientoSnapshot.edificio || datos.edificio} />
                  <Field label="Predio" value={alojamientoSnapshot.predio || datos.predio} />
                  <Field label="Localidad" value={alojamientoSnapshot.localidad || datos.localidad} />
                  <Field label="Provincia" value={alojamientoSnapshot.provincia || datos.provincia} />
                  <Field label="Plaza" value={plazaSnapshot.numeroPlaza || datos.numeroPlaza} />
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

              {puedePrepararAnexo22 && (
                <section style={{ ...softCardStyle, marginTop: 16 }}>
                  <h3 style={{ marginTop: 0, color: "#ffffff" }}>Asignacion de plaza / ANEXO_22</h3>
                  <p style={subtitleStyle}>
                    Seleccion de plaza para generar el acta de asignacion. La disponibilidad se revalida al
                    confirmar.
                  </p>

                  {plazasError && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid rgba(239,68,68,0.30)",
                        background: "rgba(127,29,29,0.18)",
                        color: "#fecaca",
                      }}
                    >
                      {plazasError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <label style={{ display: "grid", gap: 6, flex: "1 1 360px", minWidth: 0 }}>
                      <span style={labelStyle}>Plaza elegible</span>
                      <select
                        value={plazaSeleccionada}
                        onChange={(e) => setPlazaSeleccionada(e.target.value)}
                        disabled={loadingPlazas || plazas.length === 0}
                        style={{
                          width: "100%",
                          minHeight: 44,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#ffffff",
                          colorScheme: "dark",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="" style={{ backgroundColor: "#111827", color: "#ffffff" }}>
                          {loadingPlazas
                            ? "Cargando plazas..."
                            : plazas.length
                            ? "Seleccionar plaza..."
                            : "Sin plazas elegibles"}
                        </option>
                        {plazas.map((plaza) => (
                          <option
                            key={plaza._id}
                            value={plaza._id}
                            style={{ backgroundColor: "#111827", color: "#ffffff" }}
                          >
                            {plaza.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      style={primaryButtonStyle}
                      disabled={!plazaSeleccionada || loadingPlazas || generandoAnexo22}
                      onClick={generarAnexo22}
                    >
                      {generandoAnexo22 ? "Generando..." : "Generar ANEXO_22"}
                    </button>

                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      disabled={loadingPlazas || generandoAnexo22}
                      onClick={cargarPlazasElegibles}
                    >
                      Actualizar plazas
                    </button>
                  </div>

                  {!loadingPlazas && plazas.length === 0 && !plazasError && (
                    <p style={{ ...subtitleStyle, marginTop: 12 }}>
                      No hay plazas elegibles disponibles para asignacion.
                    </p>
                  )}
                </section>
              )}

              {esAnexo22 && (
                <section style={{ ...softCardStyle, marginTop: 16 }}>
                  <h3 style={{ marginTop: 0, color: "#ffffff" }}>Conformidades</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="Postulante"
                      value={conformidadPostulante ? "Conformado" : "Pendiente"}
                    />
                    <Field
                      label="Fecha postulante"
                      value={fmtDate(conformidadPostulante?.fecha)}
                    />
                    <Field
                      label="Firmante postulante"
                      value={signerPostulante?.nombre || conformidadPostulante?.rol}
                    />
                    <Field
                      label="Admin General"
                      value={conformidadAdminGeneral ? "Conformado" : "Pendiente"}
                    />
                    <Field
                      label="Fecha admin"
                      value={fmtDate(conformidadAdminGeneral?.fecha)}
                    />
                    <Field
                      label="Firmante admin"
                      value={signerAdminGeneral?.nombre || conformidadAdminGeneral?.rol}
                    />
                  </div>

                  {puedeCerrarAnexo22 ? (
                    <div style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        disabled={cerrandoAnexo22}
                        onClick={cerrarTramiteAnexo22}
                      >
                        {cerrandoAnexo22 ? "Cerrando..." : "Cerrar trámite"}
                      </button>
                    </div>
                  ) : null}
                </section>
              )}

              {esAnexo23 && (
                <section style={{ ...softCardStyle, marginTop: 16 }}>
                  <h3 style={{ marginTop: 0, color: "#ffffff" }}>Conformidades</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="Alojado"
                      value={conformidadAlojado ? "Conformado" : "Pendiente"}
                    />
                    <Field
                      label="Fecha alojado"
                      value={fmtDate(conformidadAlojado?.fecha)}
                    />
                    <Field
                      label="Firmante alojado"
                      value={signerAlojado?.nombre || conformidadAlojado?.rol}
                    />
                    <Field
                      label="Admin General"
                      value={conformidadAdminGeneral ? "Conformado" : "Pendiente"}
                    />
                    <Field
                      label="Fecha admin"
                      value={fmtDate(conformidadAdminGeneral?.fecha)}
                    />
                    <Field
                      label="Firmante admin"
                      value={signerAdminGeneral?.nombre || conformidadAdminGeneral?.rol}
                    />
                  </div>

                  {puedeCerrarAnexo23 ? (
                    <div style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        disabled={cerrandoAnexo23}
                        onClick={cerrarTramiteAnexo23}
                      >
                        {cerrandoAnexo23 ? "Cerrando..." : "Cerrar trámite"}
                      </button>
                    </div>
                  ) : null}
                </section>
              )}

              {esAnexo24 && (
                <section style={{ ...softCardStyle, marginTop: 16 }}>
                  <h3 style={{ marginTop: 0, color: "#ffffff" }}>ANEXO_24</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <Field label="Novedades adicionales" value={datos.novedadesTexto} />
                    <Field label="Observaciones inspector" value={datos.observacionesInspector} />
                    <Field
                      label="Revision inspector"
                      value={conformidadInspector ? "Conformada" : "Pendiente"}
                    />
                    <Field label="Fecha inspector" value={fmtDate(conformidadInspector?.fecha)} />
                    <Field label="Lugar firma" value={datos.lugarFirma} />
                    <Field label="Fecha firma" value={datos.fechaFirma} />
                    <Field
                      label="Admin General"
                      value={conformidadAdminGeneral ? "Conformado" : "Pendiente"}
                    />
                    <Field label="Fecha admin" value={fmtDate(conformidadAdminGeneral?.fecha)} />
                    <Field label="Firmante admin" value={signerAdminGeneral?.nombre || conformidadAdminGeneral?.rol} />
                  </div>

                  {puedeCerrarAnexo24 ? (
                    <div style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        style={primaryButtonStyle}
                        disabled={cerrandoAnexo24}
                        onClick={cerrarTramiteAnexo24}
                      >
                        {cerrandoAnexo24 ? "Cerrando..." : "Cerrar tramite"}
                      </button>
                    </div>
                  ) : null}
                </section>
              )}

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
