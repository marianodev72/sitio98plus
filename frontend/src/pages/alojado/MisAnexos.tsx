import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";
import Anexo28PedidoForm, { type Anexo28PedidoDatos } from "../../components/alojamientos/Anexo28PedidoForm";
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
  const [info, setInfo] = useState("");
  const [downloading, setDownloading] = useState("");
  const [creandoAnexo28, setCreandoAnexo28] = useState(false);
  const [anexo28, setAnexo28] = useState<Anexo28PedidoDatos>({
    solicitaCambio: false,
    solicitaReparacion: false,
    solicitaVerificacion: false,
    solicitaProvision: false,
    descripcionSolicitud: "",
    lugarFirma: "",
    fechaFirma: "",
  });

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

  async function crearAnexo28() {
    if (creandoAnexo28) return;
    setCreandoAnexo28(true);
    setError("");
    setInfo("");
    try {
      const res = await http.post("/alojamientos-mi/documentos/anexo-28", { datos: anexo28 });
      const nuevo = res.data?.documento;
      if (nuevo?.token) {
        navigate(`/app/alojado/anexos/${nuevo.token}`);
        return;
      }
      setInfo("ANEXO_28 creado correctamente.");
      await cargar();
    } catch {
      setError("No fue posible crear el ANEXO_28. Verifique que tenga una ocupacion activa.");
    } finally {
      setCreandoAnexo28(false);
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
        {info ? (
          <div style={{ ...cardStyle, marginBottom: 12, color: "#bbf7d0" }}>{info}</div>
        ) : null}

        <section style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={sectionTitleStyle}>Nuevo ANEXO_28</h2>
              <p style={subtitleStyle}>Pedido de trabajo sobre su ocupacion activa.</p>
            </div>
            <button type="button" style={primaryButtonStyle} onClick={crearAnexo28} disabled={creandoAnexo28}>
              {creandoAnexo28 ? "Creando..." : "Crear ANEXO_28"}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <Anexo28PedidoForm value={anexo28} onChange={setAnexo28} readOnly={creandoAnexo28} />
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 style={sectionTitleStyle}>ANEXO_21 / ANEXO_22 / ANEXO_23 / ANEXO_24 / ANEXO_25 / ANEXO_26 / ANEXO_28</h2>
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
