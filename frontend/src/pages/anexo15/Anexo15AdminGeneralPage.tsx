import { useEffect, useState } from "react";
import {
  adminAprobarAnexo15,
  adminDevolverAnexo15,
  descargarPdfAnexo15,
  listarAdminAnexo15,
  obtenerAnexo15,
  type Anexo15Documento,
} from "../../api/anexo15";
import Anexo15Adjuntos from "../../components/anexo15/Anexo15Adjuntos";
import Anexo15Historial from "../../components/anexo15/Anexo15Historial";
import Anexo15Readonly from "../../components/anexo15/Anexo15Readonly";
import {
  badgeStyle,
  buttonRowStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

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

export default function Anexo15AdminGeneralPage() {
  const [docs, setDocs] = useState<Anexo15Documento[]>([]);
  const [selected, setSelected] = useState<Anexo15Documento | null>(null);
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setError("");
    try {
      setDocs(await listarAdminAnexo15());
    } catch {
      setError("No es posible obtener solicitudes.");
    }
  }

  async function abrir(token: string) {
    setSelected(await obtenerAnexo15(token));
    setObservacion("");
  }

  async function aprobar() {
    if (!selected) return;
    setBusy(true);
    try {
      const next = await adminAprobarAnexo15(selected.token, observacion);
      setSelected(next);
      await cargar();
    } catch {
      setError("No es posible finalizar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function devolver() {
    if (!selected) return;
    setBusy(true);
    try {
      const next = await adminDevolverAnexo15(selected.token, observacion);
      setSelected(next);
      await cargar();
    } catch {
      setError("No es posible devolver la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function pdf(preview: boolean) {
    if (!selected) return;
    const res = await descargarPdfAnexo15(selected.token, preview);
    const blob = new Blob([res.data], { type: "application/pdf" });
    if (preview) window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
    else downloadBlob(blob, "ANEXO_15.pdf");
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <section>
      <h1 style={titleStyle}>ANEXO_15</h1>
      <p style={subtitleStyle}>Solicitudes de reintegro para revision ADMIN_GENERAL.</p>
      {error ? <div style={{ ...softCardStyle, marginTop: 12, color: "#fecaca" }}>{error}</div> : null}

      <section style={{ ...softCardStyle, marginTop: 12 }}>
        <h2 style={sectionTitleStyle}>Solicitudes</h2>
        {!docs.length ? <p style={subtitleStyle}>Sin solicitudes para revision.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {docs.map((doc) => (
            <div key={doc.token} style={{ ...softCardStyle, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <strong>{safe(doc.datos?.solicitanteSnapshot?.nombre)}</strong>
                <div style={{ marginTop: 6 }}><span style={badgeStyle}>{doc.estado}</span></div>
              </div>
              <button type="button" style={primaryButtonStyle} onClick={() => abrir(doc.token)}>Ver</button>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <>
          <section style={{ ...softCardStyle, marginTop: 12 }}>
            <h2 style={sectionTitleStyle}>Detalle</h2>
            <Anexo15Readonly documento={selected} />
            <div style={buttonRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={() => pdf(true)}>Vista previa PDF</button>
              <button type="button" style={secondaryButtonStyle} onClick={() => pdf(false)}>Descargar PDF</button>
            </div>
          </section>
          <section style={{ ...softCardStyle, marginTop: 12 }}>
            <h2 style={sectionTitleStyle}>Adjuntos</h2>
            <Anexo15Adjuntos documento={selected} editable={false} onUpdated={setSelected} />
          </section>
          <section style={{ ...softCardStyle, marginTop: 12 }}>
            <h2 style={sectionTitleStyle}>Intervencion ADMIN_GENERAL</h2>
            <textarea
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              rows={4}
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, padding: 10, background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }}
            />
            <div style={buttonRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={devolver} disabled={busy}>Devolver a inspector</button>
              <button type="button" style={primaryButtonStyle} onClick={aprobar} disabled={busy}>Aprobar y finalizar</button>
            </div>
          </section>
          <section style={{ ...softCardStyle, marginTop: 12 }}>
            <h2 style={sectionTitleStyle}>Historial</h2>
            <Anexo15Historial documento={selected} />
          </section>
        </>
      ) : null}
    </section>
  );
}
