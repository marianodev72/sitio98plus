import type { Anexo15Documento } from "../../api/anexo15";
import { softCardStyle } from "../../pages/permisionario/uiStyles";

function safe(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={softCardStyle}>
      <div style={{ color: "rgba(255,255,255,0.64)", fontSize: 12, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 6, color: "#fff", fontWeight: 800, overflowWrap: "anywhere" }}>{safe(value)}</div>
    </div>
  );
}

export default function Anexo15Readonly({ documento }: { documento: Anexo15Documento }) {
  const datos = documento.datos || {};
  const solicitud = datos.solicitud || {};
  const solicitante = datos.solicitanteSnapshot || {};
  const vivienda = datos.viviendaSnapshot || {};
  const alojamiento = datos.alojamientoSnapshot || {};
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <Field label="Estado" value={documento.estado} />
        <Field label="Solicitante" value={solicitante.nombre} />
        <Field label="Rol" value={solicitante.rol || documento.solicitanteRol} />
        <Field label="Vivienda" value={vivienda.codigo || alojamiento.codigo} />
        <Field label="Barrio / lugar" value={vivienda.barrio || alojamiento.lugar} />
        <Field label="Lugar firma" value={solicitud.lugarFirma} />
        <Field label="Fecha firma" value={solicitud.fechaFirma} />
      </div>
      <Field label="Observaciones" value={solicitud.observaciones} />
      <Field label="Novedades" value={solicitud.novedades} />
      <Field label="Descripcion de mejoras" value={solicitud.descripcionMejoras} />
      <Field label="Detalle de comprobantes" value={solicitud.detalleComprobantes} />
    </div>
  );
}
