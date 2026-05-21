import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type OcupacionActual = {
  estado?: string;
  fechaInicio?: string | null;
  codigoAsignacion?: string;
  alojamiento?: {
    codigo?: string;
    dependencia?: string;
    lugar?: string;
    sector?: string;
    tipo?: string;
    clase?: string;
    localidad?: string;
    provincia?: string;
  };
  plaza?: {
    codigo?: string;
    numero?: number | null;
    estado?: string;
    generoPermitido?: string;
  };
};

type DocumentoResumen = {
  token: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  canDownloadPdf?: boolean;
  updatedAt?: string;
};

type DocumentoDetalle = DocumentoResumen & {
  canConformarAnexo23?: boolean;
};

function fmt(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fmt(value);
  return date.toLocaleDateString("es-AR");
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: 12,
        background: "rgba(255,255,255,0.045)",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, color: "#ffffff", fontWeight: 800, wordBreak: "break-word" }}>
        {fmt(value)}
      </div>
    </div>
  );
}

const sectionStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "clamp(14px, 2vw, 20px)",
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
} as const;

const primaryButtonStyle = {
  ...buttonStyle,
  border: "none",
  background: "#2563eb",
};

const badgeStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "4px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 800,
} as const;

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

export default function AlojadoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ocupacion, setOcupacion] = useState<OcupacionActual | null>(null);
  const [ultimaGestion, setUltimaGestion] = useState<DocumentoResumen | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoResumen[]>([]);
  const [accionConformidad, setAccionConformidad] = useState<DocumentoDetalle | null>(null);
  const [loadingOcupacion, setLoadingOcupacion] = useState(true);
  const [loadingGestion, setLoadingGestion] = useState(true);
  const [errorOcupacion, setErrorOcupacion] = useState("");
  const [errorGestion, setErrorGestion] = useState("");
  const [errorDescarga, setErrorDescarga] = useState("");
  const [downloadingToken, setDownloadingToken] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadOcupacion() {
      try {
        setLoadingOcupacion(true);
        setErrorOcupacion("");
        const res = await http.get("/alojamientos-mi/ocupacion-actual");
        if (!alive) return;
        setOcupacion(res.data?.ocupacion || null);
      } catch (err: any) {
        if (!alive) return;
        setOcupacion(null);
        setErrorOcupacion(err?.response?.data?.message || "No se pudo obtener la ocupacion actual.");
      } finally {
        if (alive) setLoadingOcupacion(false);
      }
    }

    async function loadGestion() {
      try {
        setLoadingGestion(true);
        setErrorGestion("");
        const docs = await http.get("/alojamientos-mi/documentos");
        if (!alive) return;
        const documentos = Array.isArray(docs.data?.documentos) ? docs.data.documentos : [];
        setDocumentos(documentos);
        setUltimaGestion(documentos[0] || null);

        const anexo23Enviado = documentos.find(
          (doc: DocumentoResumen) => doc.codigo === "ANEXO_23" && doc.estado === "ENVIADO"
        );
        if (!anexo23Enviado) {
          setAccionConformidad(null);
          return;
        }

        try {
          const detalle = await http.get(`/alojamientos-mi/documentos/${anexo23Enviado.token}`);
          if (!alive) return;
          const documento = detalle.data?.documento || null;
          setAccionConformidad(documento?.canConformarAnexo23 ? documento : null);
        } catch {
          if (alive) setAccionConformidad(null);
        }
      } catch {
        if (!alive) return;
        setDocumentos([]);
        setUltimaGestion(null);
        setAccionConformidad(null);
        setErrorGestion("No se pudo obtener la ultima gestion.");
      } finally {
        if (alive) setLoadingGestion(false);
      }
    }

    loadOcupacion();
    loadGestion();
    return () => {
      alive = false;
    };
  }, []);

  const alojamiento = ocupacion?.alojamiento || {};
  const plaza = ocupacion?.plaza || {};
  const ubicacion = [alojamiento.localidad, alojamiento.provincia].filter(Boolean).join(" / ");
  const tipoClase = [alojamiento.tipo, alojamiento.clase].filter(Boolean).join(" / ");
  const ultimoPdf = documentos.find((doc) => doc.canDownloadPdf);
  const trazabilidad = useMemo(
    () =>
      ["ANEXO_21", "ANEXO_22", "ANEXO_23"]
        .map((codigo) => documentos.find((doc) => doc.codigo === codigo))
        .filter(Boolean) as DocumentoResumen[],
    [documentos]
  );

  async function descargarPdf(doc?: DocumentoResumen | null) {
    if (!doc?.canDownloadPdf || downloadingToken) return;
    setDownloadingToken(doc.token);
    setErrorDescarga("");
    try {
      const res = await http.get(`/alojamientos-mi/documentos/${doc.token}/pdf`, {
        responseType: "blob",
      });
      downloadBlob(new Blob([res.data], { type: "application/pdf" }), `${doc.codigo}.pdf`);
    } catch (err) {
      console.error("[alojado-dashboard] Error descargando PDF", err);
      setErrorDescarga("No se pudo descargar el PDF solicitado.");
    } finally {
      setDownloadingToken("");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={sectionStyle}>
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
          Panel ALOJADO
        </p>
        <h1 style={{ margin: 0, color: "#ffffff", fontSize: "clamp(24px, 3vw, 34px)" }}>
          Mi alojamiento actual
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
          {user?.nombre} {user?.apellido} - <b>{user?.role}</b>
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>Accesos rapidos</h2>
        {errorDescarga ? <p style={{ margin: "0 0 10px", color: "#fecaca" }}>{errorDescarga}</p> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          <button type="button" style={primaryButtonStyle} onClick={() => navigate("/app/alojado/anexos")}>
            Mis Anexos
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => document.getElementById("alojado-ocupacion-actual")?.scrollIntoView({ behavior: "smooth" })}
          >
            Ver alojamiento actual
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, opacity: ultimoPdf ? 1 : 0.55, cursor: ultimoPdf ? "pointer" : "not-allowed" }}
            onClick={() => descargarPdf(ultimoPdf)}
            disabled={!ultimoPdf || Boolean(downloadingToken)}
          >
            {downloadingToken && ultimoPdf?.token === downloadingToken ? "Descargando..." : "Descargar ultimo PDF"}
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, opacity: ultimaGestion ? 1 : 0.55, cursor: ultimaGestion ? "pointer" : "not-allowed" }}
            onClick={() => ultimaGestion && navigate(`/app/alojado/anexos/${ultimaGestion.token}`)}
            disabled={!ultimaGestion}
          >
            Ver ultima gestion
          </button>
          <button type="button" style={buttonStyle} onClick={() => navigate("/app/alojado/ocupaciones")}>
            Historial de ocupacion
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>Proximas acciones</h2>
        {loadingGestion ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando acciones...</p>
        ) : errorGestion ? (
          <p style={{ margin: 0, color: "#fecaca" }}>{errorGestion}</p>
        ) : accionConformidad ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#ffffff", fontWeight: 800 }}>ANEXO_23 pendiente de conformidad</span>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => navigate(`/app/alojado/anexos/${accionConformidad.token}`)}
            >
              Prestar conformidad
            </button>
          </div>
        ) : ultimoPdf ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.78)" }}>Tenes un PDF documental disponible.</span>
            <button type="button" style={buttonStyle} onClick={() => descargarPdf(ultimoPdf)} disabled={Boolean(downloadingToken)}>
              {downloadingToken && ultimoPdf.token === downloadingToken ? "Descargando..." : "Descargar PDF"}
            </button>
          </div>
        ) : (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>No tenes acciones pendientes.</p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>
          Ultima gestion alojamientos
        </h2>
        {loadingGestion ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando gestiones...</p>
        ) : errorGestion ? (
          <p style={{ margin: 0, color: "#fecaca" }}>{errorGestion}</p>
        ) : ultimaGestion ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                color: "#ffffff",
                fontWeight: 800,
              }}
            >
              <span>{ultimaGestion.codigo}</span>
              <span style={badgeStyle}>{ultimaGestion.estado}</span>
              {ultimaGestion.estadoInstitucional ? (
                <span style={badgeStyle}>{ultimaGestion.estadoInstitucional}</span>
              ) : null}
            </div>
            <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>
              Actualizado: {fmtDate(ultimaGestion.updatedAt)}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/app/alojado/anexos")}
                style={primaryButtonStyle}
              >
                Ir a Mis Anexos
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
            Sin gestiones recientes.
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>Trazabilidad documental</h2>
        {loadingGestion ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando documentos...</p>
        ) : errorGestion ? (
          <p style={{ margin: 0, color: "#fecaca" }}>{errorGestion}</p>
        ) : trazabilidad.length === 0 ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Sin documentos registrados.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {trazabilidad.map((doc) => (
              <div
                key={doc.codigo}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: 12,
                  background: "rgba(255,255,255,0.045)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ color: "#ffffff" }}>{doc.codigo}</strong>
                  <span style={badgeStyle}>{doc.estado}</span>
                  {doc.estadoInstitucional ? <span style={badgeStyle}>{doc.estadoInstitucional}</span> : null}
                  <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>
                    Actualizado: {fmtDate(doc.updatedAt)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={buttonStyle} onClick={() => navigate(`/app/alojado/anexos/${doc.token}`)}>
                    Ver
                  </button>
                  {doc.canDownloadPdf ? (
                    <button
                      type="button"
                      style={buttonStyle}
                      onClick={() => descargarPdf(doc)}
                      disabled={downloadingToken === doc.token}
                    >
                      {downloadingToken === doc.token ? "Descargando..." : "PDF"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="alojado-ocupacion-actual" style={sectionStyle}>
        {loadingOcupacion ? (
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
            Consultando ocupacion actual...
          </p>
        ) : errorOcupacion ? (
          <div
            style={{
              border: "1px solid rgba(248,113,113,0.45)",
              background: "rgba(127,29,29,0.22)",
              color: "#fecaca",
              borderRadius: 10,
              padding: 12,
              fontWeight: 800,
            }}
          >
            {errorOcupacion}
          </div>
        ) : !ocupacion ? (
          <div
            style={{
              border: "1px solid rgba(250,204,21,0.35)",
              background: "rgba(113,63,18,0.22)",
              color: "#fde68a",
              borderRadius: 10,
              padding: 12,
              fontWeight: 800,
            }}
          >
            No se registra una ocupacion activa.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <Field label="Alojamiento" value={alojamiento.codigo} />
              <Field label="Plaza" value={plaza.numero ? `Plaza ${plaza.numero}` : plaza.codigo} />
              <Field label="Dependencia" value={alojamiento.dependencia} />
              <Field label="Lugar" value={alojamiento.lugar} />
              <Field label="Sector" value={alojamiento.sector} />
              <Field label="Tipo / clase" value={tipoClase} />
              <Field label="Localidad / provincia" value={ubicacion} />
              <Field label="Estado asignacion" value={ocupacion.estado} />
              <Field label="Estado plaza" value={plaza.estado} />
              <Field label="Genero permitido" value={plaza.generoPermitido} />
              <Field label="Fecha inicio" value={fmtDate(ocupacion.fechaInicio)} />
              <Field label="Codigo asignacion" value={ocupacion.codigoAsignacion} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
