import type { Anexo15Documento } from "../../api/anexo15";
import { softCardStyle, subtitleStyle } from "../../pages/permisionario/uiStyles";

function safe(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("es-AR");
}

export default function Anexo15Historial({ documento }: { documento: Anexo15Documento }) {
  const historial = Array.isArray(documento.historialEstados) ? documento.historialEstados : [];
  const intervenciones = Array.isArray(documento.intervenciones) ? documento.intervenciones : [];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {!historial.length && !intervenciones.length ? <p style={subtitleStyle}>Sin historial registrado.</p> : null}
      {historial.map((item, index) => (
        <div key={`h-${index}`} style={softCardStyle}>
          <strong>{safe(item.estadoAnterior)} - {safe(item.estadoNuevo)}</strong>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.72)" }}>{fmtDate(item.fecha)}</div>
          <div style={{ marginTop: 4 }}>{safe(item.actor?.nombre)} · {safe(item.actor?.rol)}</div>
          <div style={{ marginTop: 4 }}>{safe(item.observacion)}</div>
        </div>
      ))}
      {intervenciones.map((item, index) => (
        <div key={`i-${index}`} style={softCardStyle}>
          <strong>{safe(item.tipo)} · {safe(item.resultado)}</strong>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.72)" }}>{fmtDate(item.fecha)}</div>
          <div style={{ marginTop: 4 }}>{safe(item.actor?.nombre)} · {safe(item.actor?.rol)}</div>
          <div style={{ marginTop: 4 }}>{safe(item.observacion)}</div>
        </div>
      ))}
    </div>
  );
}
