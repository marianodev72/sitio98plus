import type { CSSProperties } from "react";
import { secondaryButtonStyle, primaryButtonStyle } from "../../pages/permisionario/uiStyles";

export type Anexo28Visita = {
  fechaProgramada?: string | null;
  observacion?: string;
  fechaRegistro?: string;
};

export type Anexo28InspectorDatos = {
  emergencia?: boolean;
  correspondeAlojado?: boolean;
  novedadesActaAnterior?: boolean;
  descripcionTrabajo?: string;
  cargoAlojado?: boolean;
  cargoAlcaldia?: boolean;
  razonSeguridad?: boolean;
  razonPreservacion?: boolean;
  razonPresentacion?: boolean;
  observacionesInspector?: string;
  informeTecnico?: string;
  estimacion?: string;
  autorizacion?: string;
  verificacionInspector?: string;
  prioridadInspector?: string;
  decisionInspector?: string;
  motivoRechazo?: string;
  visitasProgramadas?: Anexo28Visita[];
  nuevaVisita?: Anexo28Visita;
  fechaProgramadaTrabajo?: string;
  responsableTrabajo?: string;
  descripcionTecnicaTrabajo?: string;
  trabajoFinalizadoInspector?: boolean;
  fechaFinalizacionInspector?: string;
  observacionFinalInspector?: string;
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  colorScheme: "dark",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  fontWeight: 800,
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(15,23,42,0.42)",
  borderRadius: 10,
  padding: 10,
  minWidth: 0,
};

const sectionTitleStyle: CSSProperties = {
  color: "#fff",
  fontSize: 15,
  fontWeight: 900,
  margin: "4px 0",
};

function boolValue(value: unknown) {
  return value === true;
}

function fmtDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

export default function Anexo28InspectorForm({
  value,
  onChange,
  readOnly = false,
  busy = false,
  onGuardar,
  onEnviarRevision,
}: {
  value: Anexo28InspectorDatos;
  onChange: (next: Anexo28InspectorDatos) => void;
  readOnly?: boolean;
  busy?: boolean;
  onGuardar?: () => void;
  onEnviarRevision?: () => void;
}) {
  const update = (patch: Partial<Anexo28InspectorDatos>) => onChange({ ...value, ...patch });
  const nuevaVisita = value.nuevaVisita || {};
  const visitas = Array.isArray(value.visitasProgramadas) ? value.visitasProgramadas : [];

  const checkbox = (key: keyof Anexo28InspectorDatos, label: string) => (
    <label style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center" }}>
      <input
        type="checkbox"
        checked={boolValue(value[key])}
        disabled={readOnly || busy}
        onChange={(event) => update({ [key]: event.target.checked } as Partial<Anexo28InspectorDatos>)}
      />
      <span style={labelStyle}>{label}</span>
    </label>
  );

  const input = (key: keyof Anexo28InspectorDatos, label: string, type = "text") => (
    <label style={cardStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        value={String(value[key] || "")}
        disabled={readOnly || busy}
        onChange={(event) => update({ [key]: event.target.value } as Partial<Anexo28InspectorDatos>)}
        style={{ ...inputStyle, marginTop: 8 }}
      />
    </label>
  );

  const textarea = (key: keyof Anexo28InspectorDatos, label: string, rows = 4) => (
    <label style={cardStyle}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={String(value[key] || "")}
        disabled={readOnly || busy}
        onChange={(event) => update({ [key]: event.target.value } as Partial<Anexo28InspectorDatos>)}
        rows={rows}
        style={{ ...inputStyle, marginTop: 8, resize: "vertical" }}
      />
    </label>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h4 style={sectionTitleStyle}>Bloque tecnico</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {checkbox("emergencia", "Emergencia")}
        {checkbox("correspondeAlojado", "Corresponde al huesped")}
        {checkbox("novedadesActaAnterior", "Novedades acta anterior")}
      </div>
      {textarea("descripcionTrabajo", "Descripcion del trabajo", 6)}

      <h4 style={sectionTitleStyle}>Resolucion inspectiva</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <label style={cardStyle}>
          <span style={labelStyle}>Prioridad</span>
          <select
            value={value.prioridadInspector || ""}
            disabled={readOnly || busy}
            onChange={(event) => update({ prioridadInspector: event.target.value })}
            style={{ ...inputStyle, marginTop: 8 }}
          >
            <option value="" style={{ backgroundColor: "#111827", color: "#fff" }}>Seleccionar</option>
            {["URGENTE", "ALTA", "MEDIA", "BAJA"].map((item) => (
              <option key={item} value={item} style={{ backgroundColor: "#111827", color: "#fff" }}>{item}</option>
            ))}
          </select>
        </label>
        <label style={cardStyle}>
          <span style={labelStyle}>Decision</span>
          <select
            value={value.decisionInspector || ""}
            disabled={readOnly || busy}
            onChange={(event) => update({ decisionInspector: event.target.value })}
            style={{ ...inputStyle, marginTop: 8 }}
          >
            <option value="" style={{ backgroundColor: "#111827", color: "#fff" }}>Seleccionar</option>
            {["APROBADO", "OBSERVADO", "RECHAZADO"].map((item) => (
              <option key={item} value={item} style={{ backgroundColor: "#111827", color: "#fff" }}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      {value.decisionInspector === "RECHAZADO" ? textarea("motivoRechazo", "Motivo rechazo", 3) : null}

      <h4 style={sectionTitleStyle}>Visitas programadas</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <label style={cardStyle}>
          <span style={labelStyle}>Nueva visita</span>
          <input
            type="datetime-local"
            value={nuevaVisita.fechaProgramada || ""}
            disabled={readOnly || busy}
            onChange={(event) => update({ nuevaVisita: { ...nuevaVisita, fechaProgramada: event.target.value } })}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </label>
        <label style={cardStyle}>
          <span style={labelStyle}>Observacion visita</span>
          <input
            value={nuevaVisita.observacion || ""}
            disabled={readOnly || busy}
            onChange={(event) => update({ nuevaVisita: { ...nuevaVisita, observacion: event.target.value } })}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </label>
      </div>
      {visitas.length ? (
        <div style={cardStyle}>
          <span style={labelStyle}>Historial visitas</span>
          <div style={{ display: "grid", gap: 6, marginTop: 8, color: "rgba(255,255,255,0.86)" }}>
            {visitas.map((visita, index) => (
              <div key={`${visita.fechaProgramada || ""}-${index}`}>
                {fmtDate(visita.fechaProgramada)} - {visita.observacion || "Sin observacion"}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <h4 style={sectionTitleStyle}>Programacion de trabajo</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {input("fechaProgramadaTrabajo", "Fecha programada", "datetime-local")}
        {input("responsableTrabajo", "Responsable")}
      </div>
      {textarea("descripcionTecnicaTrabajo", "Descripcion tecnica", 4)}

      <h4 style={sectionTitleStyle}>Encargado / division / administracion</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {checkbox("cargoAlojado", "Con cargo a huesped")}
        {checkbox("cargoAlcaldia", "Con cargo a alcaldia")}
        {checkbox("razonSeguridad", "Razon seguridad")}
        {checkbox("razonPreservacion", "Razon preservacion")}
        {checkbox("razonPresentacion", "Razon presentacion")}
      </div>

      <h4 style={sectionTitleStyle}>Finalizacion / verificacion</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {checkbox("trabajoFinalizadoInspector", "Trabajo finalizado")}
        {input("fechaFinalizacionInspector", "Fecha finalizacion", "datetime-local")}
      </div>
      {textarea("observacionFinalInspector", "Observacion final", 3)}
      {textarea("observacionesInspector", "Observaciones inspector")}
      {textarea("informeTecnico", "Informe tecnico")}
      {textarea("estimacion", "Estimacion", 3)}
      {textarea("autorizacion", "Autorizacion", 3)}
      {textarea("verificacionInspector", "Verificacion inspector", 3)}

      {!readOnly ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onGuardar} disabled={busy} style={secondaryButtonStyle}>
            {busy ? "Guardando..." : "Guardar gestion"}
          </button>
          <button type="button" onClick={onEnviarRevision} disabled={busy} style={primaryButtonStyle}>
            {busy ? "Procesando..." : "Enviar a revision ADMIN_GENERAL"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
