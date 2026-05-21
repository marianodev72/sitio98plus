import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import http from "../../api/http";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type Documento = {
  token: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  datos?: Record<string, any>;
  historialEstados?: Array<{
    fecha?: string;
    estadoAnterior?: string;
    estadoNuevo?: string;
  }>;
  conformidades?: Array<{ tipo?: string; ok?: boolean; rol?: string; fecha?: string }>;
  canDownloadPdf?: boolean;
  canConformarAnexo23?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function safe(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={softCardStyle}>
      <div style={{ color: "rgba(255,255,255,0.64)", fontSize: 12, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, color: "#ffffff", fontWeight: 800, wordBreak: "break-word" }}>
        {safe(value)}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function AlojamientoDocumentoReadonlyAlojado() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function cargar() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await http.get(`/alojamientos-mi/documentos/${token}`);
      setDocumento(res.data?.documento || null);
    } catch {
      setDocumento(null);
      setError("No es posible acceder al documento solicitado.");
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf() {
    if (!token || !documento?.canDownloadPdf || busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await http.get(`/alojamientos-mi/documentos/${token}/pdf`, { responseType: "blob" });
      downloadBlob(new Blob([res.data], { type: "application/pdf" }), `${documento.codigo}.pdf`);
      setInfo("PDF descargado correctamente.");
    } catch {
      setError("No fue posible descargar el PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function prestarConformidad() {
    if (!token || !documento?.canConformarAnexo23 || busy) return;
    const ok = window.confirm("Confirma que presta conformidad sobre el ANEXO_23?");
    if (!ok) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await http.post(`/alojamientos-mi/documentos/${token}/conformidad-anexo-23`, {});
      setDocumento(res.data?.documento || null);
      setInfo("Conformidad registrada correctamente.");
    } catch {
      setError("No fue posible registrar la conformidad.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const datos = documento?.datos || {};
  const huesped = datos.huesped || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  const plaza = datos.plazaSnapshot || {};
  const material = datos.material || {};
  const estadoSistemas = datos.estadoSistemas || {};
  const conformidadAlojado = useMemo(
    () => (documento?.conformidades || []).find((item) => up(item.tipo) === "ALOJADO" && item.ok),
    [documento]
  );

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={buttonRowStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={() => navigate("/app/alojado/anexos")}>
            Volver a Mis Anexos
          </button>
          {documento?.canDownloadPdf ? (
            <button type="button" style={secondaryButtonStyle} onClick={descargarPdf} disabled={busy}>
              {busy ? "Procesando..." : "PDF"}
            </button>
          ) : null}
        </div>

        <section style={{ ...cardStyle, marginTop: 12 }}>
          <h1 style={titleStyle}>Documento de alojamiento</h1>
          <p style={subtitleStyle}>Consulta readonly institucional.</p>
        </section>

        {error ? (
          <section style={{ ...cardStyle, marginTop: 12, color: "#fecaca" }}>{error}</section>
        ) : null}
        {info ? (
          <section style={{ ...cardStyle, marginTop: 12, color: "#bbf7d0" }}>{info}</section>
        ) : null}

        {loading ? (
          <section style={{ ...cardStyle, marginTop: 12 }}>Cargando documento...</section>
        ) : documento ? (
          <>
            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Estado documental</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <strong>{safe(documento.codigo)}</strong>
                <span style={badgeStyle}>{safe(documento.estado)}</span>
                {documento.estadoInstitucional ? (
                  <span style={badgeStyle}>{safe(documento.estadoInstitucional)}</span>
                ) : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <Field label="Creacion" value={fmtDate(documento.createdAt)} />
                <Field label="Actualizacion" value={fmtDate(documento.updatedAt)} />
                <Field label="Readonly" value="SI" />
              </div>
            </section>

            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Datos principales</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <Field label="Postulante / alojado" value={huesped.nombreCompleto || datos.postulanteNombre} />
                <Field label="Apellido" value={huesped.apellido || datos.apellido} />
                <Field label="Nombres" value={huesped.nombres || datos.nombres} />
                <Field label="Genero" value={huesped.genero || datos.genero || datos.sexo} />
                <Field label="Grado / escalafon" value={huesped.gradoEscalafon || datos.gradoEscalafon} />
                <Field label="Destino actual" value={datos.destinoActual || huesped.destinoActual} />
                <Field label="Destino futuro" value={datos.destinoFuturo || huesped.destinoFuturo} />
              </div>
            </section>

            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Alojamiento / plaza</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <Field label="Alojamiento" value={alojamiento.alojamientoCodigo || datos.alojamientoCodigo} />
                <Field label="Lugar" value={alojamiento.lugar || datos.lugar} />
                <Field label="Dependencia" value={alojamiento.dependencia || datos.dependencia} />
                <Field label="Sector" value={alojamiento.sector || datos.sector} />
                <Field label="Tipo / clase" value={[alojamiento.tipo, alojamiento.clase].filter(Boolean).join(" / ")} />
                <Field label="Plaza" value={plaza.numeroPlaza || datos.numeroPlaza} />
              </div>
            </section>

            {up(documento.codigo) === "ANEXO_23" ? (
              <>
                <section style={{ ...cardStyle, marginTop: 12 }}>
                  <h2 style={sectionTitleStyle}>Recepcion</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    <Field label="Lugar firma" value={datos.lugarFirma} />
                    <Field label="Fecha firma" value={datos.fechaFirma} />
                    <Field label="Autorizacion descuento" value={datos.autorizacionDescuento === true ? "SI" : "NO"} />
                    {Object.entries(material).map(([key, value]) => (
                      <Field key={key} label={key} value={value} />
                    ))}
                    {Object.entries(estadoSistemas).map(([key, value]) => (
                      <Field key={key} label={key} value={value} />
                    ))}
                    <Field label="Novedades" value={datos.novedadesTexto} />
                  </div>
                </section>

                <section style={{ ...cardStyle, marginTop: 12 }}>
                  <h2 style={sectionTitleStyle}>Conformidad del alojado</h2>
                  {conformidadAlojado ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                      <Field label="Estado" value="Conformidad registrada" />
                      <Field label="Fecha" value={fmtDate(conformidadAlojado.fecha)} />
                    </div>
                  ) : documento.canConformarAnexo23 ? (
                    <button type="button" style={primaryButtonStyle} onClick={prestarConformidad} disabled={busy}>
                      {busy ? "Procesando..." : "Prestar conformidad"}
                    </button>
                  ) : (
                    <p style={subtitleStyle}>No hay acciones disponibles para este documento.</p>
                  )}
                </section>
              </>
            ) : null}

            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Historial</h2>
              {(documento.historialEstados || []).length === 0 ? (
                <p style={subtitleStyle}>Sin historial registrado.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(documento.historialEstados || []).map((item, index) => (
                    <div key={`${item.fecha || ""}-${index}`} style={softCardStyle}>
                      <strong>{safe(item.estadoNuevo || documento.estado)}</strong>
                      <div style={{ marginTop: 4, color: "rgba(255,255,255,0.72)" }}>
                        Fecha: {fmtDate(item.fecha)}
                      </div>
                      <div style={{ marginTop: 4, color: "rgba(255,255,255,0.72)" }}>
                        {safe(item.estadoAnterior)} - {safe(item.estadoNuevo || documento.estado)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
