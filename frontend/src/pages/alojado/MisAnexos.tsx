import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
  metaStyle,
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
  canDownloadPdf?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function fmtDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function safe(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
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

export default function MisAnexosAlojado() {
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      const res = await http.get("/alojamientos-mi/documentos");
      setDocumentos(Array.isArray(res.data?.documentos) ? res.data.documentos : []);
    } catch {
      setDocumentos([]);
      setError("No es posible obtener sus anexos de alojamiento.");
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf(doc: Documento) {
    if (!doc.canDownloadPdf || downloading) return;
    setDownloading(doc.token);
    setError("");
    try {
      const res = await http.get(`/alojamientos-mi/documentos/${doc.token}/pdf`, {
        responseType: "blob",
      });
      downloadBlob(new Blob([res.data], { type: "application/pdf" }), `${doc.codigo}.pdf`);
    } catch {
      setError("No fue posible descargar el PDF solicitado.");
    } finally {
      setDownloading("");
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={titleStyle}>Mis Anexos</h1>
          <p style={subtitleStyle}>Historial documental de Alojamientos Navales.</p>
        </div>

        {error ? (
          <div
            style={{
              ...cardStyle,
              marginBottom: 12,
              background: "rgba(127,29,29,0.18)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        ) : null}

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={sectionTitleStyle}>ANEXO_21 / ANEXO_22 / ANEXO_23 / ANEXO_24</h2>
            <button type="button" style={secondaryButtonStyle} onClick={cargar} disabled={loading}>
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          {loading ? (
            <div style={softCardStyle}>Cargando anexos...</div>
          ) : documentos.length === 0 ? (
            <div style={softCardStyle}>No hay anexos de alojamiento registrados.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {documentos.map((doc) => (
                <div key={doc.token} style={softCardStyle}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <strong style={{ color: "#ffffff" }}>{safe(doc.codigo)}</strong>
                    <span style={badgeStyle}>{safe(doc.estado)}</span>
                    {doc.estadoInstitucional ? (
                      <span style={badgeStyle}>{safe(doc.estadoInstitucional)}</span>
                    ) : null}
                  </div>
                  <div style={{ ...metaStyle, marginTop: 8 }}>
                    Creado: {fmtDate(doc.createdAt)} - Actualizado: {fmtDate(doc.updatedAt)}
                  </div>
                  <div style={buttonRowStyle}>
                    <button
                      type="button"
                      style={primaryButtonStyle}
                      onClick={() => navigate(`/app/alojado/anexos/${doc.token}`)}
                    >
                      Ver
                    </button>
                    {doc.canDownloadPdf ? (
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => descargarPdf(doc)}
                        disabled={downloading === doc.token}
                      >
                        {downloading === doc.token ? "Descargando..." : "PDF"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
