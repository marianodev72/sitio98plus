import type { CSSProperties } from "react";

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

function boolValue(value: unknown) {
  return value === true;
}

export default function Anexo28InspectorForm({
  value,
  onChange,
  readOnly = false,
}: {
  value: Anexo28InspectorDatos;
  onChange: (next: Anexo28InspectorDatos) => void;
  readOnly?: boolean;
}) {
  const update = (patch: Partial<Anexo28InspectorDatos>) => onChange({ ...value, ...patch });
  const checkbox = (key: keyof Anexo28InspectorDatos, label: string) => (
    <label style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center" }}>
      <input
        type="checkbox"
        checked={boolValue(value[key])}
        disabled={readOnly}
        onChange={(event) => update({ [key]: event.target.checked } as Partial<Anexo28InspectorDatos>)}
      />
      <span style={labelStyle}>{label}</span>
    </label>
  );
  const textarea = (key: keyof Anexo28InspectorDatos, label: string, rows = 4) => (
    <label style={cardStyle}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={String(value[key] || "")}
        disabled={readOnly}
        onChange={(event) => update({ [key]: event.target.value } as Partial<Anexo28InspectorDatos>)}
        rows={rows}
        style={{ ...inputStyle, marginTop: 8, resize: "vertical" }}
      />
    </label>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {checkbox("emergencia", "Emergencia")}
        {checkbox("correspondeAlojado", "Corresponde al huesped")}
        {checkbox("novedadesActaAnterior", "Novedades acta anterior")}
      </div>
      {textarea("descripcionTrabajo", "Descripcion del trabajo", 6)}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {checkbox("cargoAlojado", "Con cargo a huesped")}
        {checkbox("cargoAlcaldia", "Con cargo a alcaldia")}
        {checkbox("razonSeguridad", "Razon seguridad")}
        {checkbox("razonPreservacion", "Razon preservacion")}
        {checkbox("razonPresentacion", "Razon presentacion")}
      </div>

      {textarea("observacionesInspector", "Observaciones")}
      {textarea("informeTecnico", "Informe tecnico")}
      {textarea("estimacion", "Estimacion", 3)}
      {textarea("autorizacion", "Autorizacion", 3)}
      {textarea("verificacionInspector", "Verificacion inspector", 3)}
    </div>
  );
}
