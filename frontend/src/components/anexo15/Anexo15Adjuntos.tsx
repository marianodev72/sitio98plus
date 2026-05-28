import type { Anexo15Documento } from "../../api/anexo15";
import { eliminarAdjuntoAnexo15, subirAdjuntoAnexo15 } from "../../api/anexo15";
import { secondaryButtonStyle, softCardStyle, subtitleStyle } from "../../pages/permisionario/uiStyles";

function fmtBytes(value: number) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Anexo15Adjuntos({
  documento,
  editable,
  onUpdated,
}: {
  documento: Anexo15Documento;
  editable: boolean;
  onUpdated: (doc: Anexo15Documento) => void;
}) {
  async function onPick(campo: string, file?: File) {
    if (!file) return;
    const next = await subirAdjuntoAnexo15(documento.token, campo, file);
    onUpdated(next);
  }

  async function eliminar(id: string) {
    const next = await eliminarAdjuntoAnexo15(documento.token, id);
    onUpdated(next);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {editable ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {[
            ["comprobantes", "Comprobantes"],
            ["pdf", "PDF"],
            ["imagenes", "Imagenes"],
          ].map(([campo, label]) => (
            <label key={campo} style={softCardStyle}>
              <span style={{ display: "block", marginBottom: 8, fontWeight: 800 }}>{label}</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(event) => onPick(campo, event.target.files?.[0])}
              />
            </label>
          ))}
        </div>
      ) : null}

      {!documento.adjuntos?.length ? <p style={subtitleStyle}>Sin adjuntos registrados.</p> : null}
      {(documento.adjuntos || []).map((adjunto) => (
        <div key={adjunto.id} style={{ ...softCardStyle, display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <strong>{adjunto.nombreOriginal}</strong>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,0.72)" }}>
              {adjunto.campo} · {adjunto.mime} · {fmtBytes(adjunto.size)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => window.open(`/api/anexo-15/${documento.token}/adjuntos/${adjunto.id}`, "_blank", "noopener,noreferrer")}
            >
              Descargar
            </button>
            {editable ? (
              <button type="button" style={secondaryButtonStyle} onClick={() => eliminar(adjunto.id)}>
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
