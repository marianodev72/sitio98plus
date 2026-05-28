import type { Anexo15FormData } from "../../api/anexo15";
import { softCardStyle } from "../../pages/permisionario/uiStyles";

const inputStyle = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  colorScheme: "dark",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  fontWeight: 800,
};

export default function Anexo15Form({
  value,
  onChange,
  readOnly = false,
}: {
  value: Anexo15FormData;
  onChange: (next: Anexo15FormData) => void;
  readOnly?: boolean;
}) {
  const update = (patch: Partial<Anexo15FormData>) => onChange({ ...value, ...patch });
  const textarea = (key: keyof Anexo15FormData, label: string) => (
    <label style={softCardStyle}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={String(value[key] || "")}
        disabled={readOnly}
        onChange={(event) => update({ [key]: event.target.value } as Partial<Anexo15FormData>)}
        rows={5}
        style={{ ...inputStyle, marginTop: 8, resize: "vertical" as const }}
      />
    </label>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <label style={softCardStyle}>
          <span style={labelStyle}>Lugar firma</span>
          <input
            value={value.lugarFirma || ""}
            disabled={readOnly}
            onChange={(event) => update({ lugarFirma: event.target.value })}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </label>
        <label style={softCardStyle}>
          <span style={labelStyle}>Fecha firma</span>
          <input
            type="date"
            value={value.fechaFirma || ""}
            disabled={readOnly}
            onChange={(event) => update({ fechaFirma: event.target.value })}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </label>
      </div>
      {textarea("observaciones", "Observaciones")}
      {textarea("novedades", "Novedades")}
      {textarea("descripcionMejoras", "Descripcion de mejoras")}
      {textarea("detalleComprobantes", "Detalle de comprobantes")}
    </div>
  );
}
