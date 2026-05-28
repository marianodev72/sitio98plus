import { useEffect, useState } from "react";
import {
  descargarPdfAnexo15,
  inspectorAprobarAnexo15,
  inspectorDevolverAnexo15,
  listarInspectorAnexo15,
  obtenerAnexo15,
  type Anexo15Documento,
} from "../../api/anexo15";
import Anexo15Adjuntos from "../../components/anexo15/Anexo15Adjuntos";
import Anexo15Historial from "../../components/anexo15/Anexo15Historial";
import Anexo15Readonly from "../../components/anexo15/Anexo15Readonly";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
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

export default function Anexo15InspectorPage() {
  const [docs, setDocs] = useState<Anexo15Documento[]>([]);
  const [selected, setSelected] = useState<Anexo15Documento | null>(null);
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function cargar() {
    setError("");
    try {
      setDocs(await listarInspectorAnexo15());
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
      const next = await inspectorAprobarAnexo15(selected.token, observacion);
      setSelected(next);
      await cargar();
    } catch {
      setError("No es posible aprobar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function devolver() {
    if (!selected) return;
    setBusy(true);
    try {
      const next = await inspectorDevolverAnexo15(selected.token, observacion);
      setSelected(next);
      await cargar();
    } catch {
      setError("No es posible devolver la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function previewPdf() {
    if (!selected) return;
    const res = await descargarPdfAnexo15(selected.token, true);
    window.open(URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })), "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <section style={cardStyle}>
      <h1 style={titleStyle}>ANEXO_15</h1>
      <p style={subtitleStyle}>Bandeja territorial de solicitudes de reintegro.</p>
      {error ? <div style={{ ...softCardStyle, marginTop: 12, color: "#fecaca" }}>{error}</div> : null}

      <section style={{ ...softCardStyle, marginTop: 12 }}>
        <h2 style={sectionTitleStyle}>Solicitudes</h2>
        {!docs.length ? <p style={subtitleStyle}>Sin solicitudes pendientes.</p> : null}
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
              <button type="button" style={secondaryButtonStyle} onClick={previewPdf}>Vista previa PDF</button>
            </div>
          </section>
          <section style={{ ...softCardStyle, marginTop: 12 }}>
            <h2 style={sectionTitleStyle}>Adjuntos</h2>
            <Anexo15Adjuntos documento={selected} editable={false} onUpdated={setSelected} />
          </section>
          <section style={{ ...softCardStyle, marginTop: 12 }}>
            <h2 style={sectionTitleStyle}>Intervencion inspector</h2>
            <textarea
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              rows={4}
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, padding: 10, background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)" }}
            />
            <div style={buttonRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={devolver} disabled={busy}>Devolver a solicitante</button>
              <button type="button" style={primaryButtonStyle} onClick={aprobar} disabled={busy}>Aprobar</button>
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
