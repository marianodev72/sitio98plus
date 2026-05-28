import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  actualizarAnexo15,
  anularAnexo15,
  descargarPdfAnexo15,
  enviarAnexo15,
  obtenerAnexo15,
  type Anexo15Documento,
  type Anexo15FormData,
} from "../../api/anexo15";
import Anexo15Adjuntos from "../../components/anexo15/Anexo15Adjuntos";
import Anexo15Form from "../../components/anexo15/Anexo15Form";
import Anexo15Historial from "../../components/anexo15/Anexo15Historial";
import Anexo15Readonly from "../../components/anexo15/Anexo15Readonly";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

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

export default function Anexo15SolicitanteDetalle({ listPath }: { listPath: string }) {
  const { token } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Anexo15Documento | null>(null);
  const [form, setForm] = useState<Anexo15FormData>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editable = Boolean(doc?.canEditar);

  async function cargar() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const next = await obtenerAnexo15(token);
      setDoc(next);
      setForm(next.datos?.solicitud || {});
    } catch {
      setError("No es posible acceder a la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  async function guardar() {
    if (!token || !editable) return;
    setBusy(true);
    try {
      const next = await actualizarAnexo15(token, form);
      setDoc(next);
    } catch {
      setError("No es posible guardar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function enviar() {
    if (!token || !doc?.canEnviar) return;
    setBusy(true);
    try {
      const next = await enviarAnexo15(token);
      setDoc(next);
      setForm(next.datos?.solicitud || {});
    } catch {
      setError("No es posible enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function anular() {
    if (!token || !doc?.canAnular) return;
    setBusy(true);
    try {
      setDoc(await anularAnexo15(token));
    } catch {
      setError("No es posible anular la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function pdf(preview: boolean) {
    if (!token) return;
    try {
      const res = await descargarPdfAnexo15(token, preview);
      const blob = new Blob([res.data], { type: "application/pdf" });
      if (preview) {
        window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
        return;
      }
      downloadBlob(blob, "ANEXO_15.pdf");
    } catch {
      setError("No es posible obtener el PDF.");
    }
  }

  useEffect(() => {
    cargar();
  }, [token]);

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <section style={cardStyle}>
          <div style={buttonRowStyle}>
            <button type="button" style={secondaryButtonStyle} onClick={() => navigate(listPath)}>Volver</button>
            {doc?.canPdf ? <button type="button" style={secondaryButtonStyle} onClick={() => pdf(true)}>Vista previa PDF</button> : null}
            {doc?.canPdf ? <button type="button" style={secondaryButtonStyle} onClick={() => pdf(false)}>Descargar PDF</button> : null}
          </div>
          <h1 style={titleStyle}>ANEXO_15</h1>
          <p style={subtitleStyle}>Solicitud de reintegro.</p>
          {doc ? <span style={badgeStyle}>{doc.estado}</span> : null}
        </section>

        {error ? <section style={{ ...cardStyle, marginTop: 12, color: "#fecaca" }}>{error}</section> : null}
        {loading ? <section style={{ ...cardStyle, marginTop: 12 }}>Cargando...</section> : null}

        {doc ? (
          <>
            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Solicitud</h2>
              {editable ? <Anexo15Form value={form} onChange={setForm} readOnly={busy} /> : <Anexo15Readonly documento={doc} />}
              {editable ? (
                <div style={buttonRowStyle}>
                  <button type="button" style={secondaryButtonStyle} onClick={guardar} disabled={busy}>Guardar</button>
                  <button type="button" style={primaryButtonStyle} onClick={enviar} disabled={busy}>Enviar</button>
                  <button type="button" style={secondaryButtonStyle} onClick={anular} disabled={busy}>Anular</button>
                </div>
              ) : null}
            </section>

            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Adjuntos</h2>
              <Anexo15Adjuntos documento={doc} editable={editable} onUpdated={setDoc} />
            </section>

            <section style={{ ...cardStyle, marginTop: 12 }}>
              <h2 style={sectionTitleStyle}>Historial</h2>
              <Anexo15Historial documento={doc} />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
