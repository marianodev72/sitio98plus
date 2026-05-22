import type { CSSProperties } from "react";

export type Anexo28PedidoDatos = {
  solicitaCambio?: boolean;
  solicitaReparacion?: boolean;
  solicitaVerificacion?: boolean;
  solicitaProvision?: boolean;
  descripcionSolicitud?: string;
  lugarFirma?: string;
  fechaFirma?: string;
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

export default function Anexo28PedidoForm({
  value,
  onChange,
  readOnly = false,
}: {
  value: Anexo28PedidoDatos;
  onChange: (next: Anexo28PedidoDatos) => void;
  readOnly?: boolean;
}) {
  const update = (patch: Partial<Anexo28PedidoDatos>) => onChange({ ...value, ...patch });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        {[
          ["solicitaCambio", "Cambio"],
          ["solicitaReparacion", "Reparacion"],
          ["solicitaVerificacion", "Verificacion"],
          ["solicitaProvision", "Provision"],
        ].map(([key, label]) => (
          <label key={key} style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={boolValue((value as any)[key])}
              disabled={readOnly}
              onChange={(event) => update({ [key]: event.target.checked } as Partial<Anexo28PedidoDatos>)}
            />
            <span style={labelStyle}>{label}</span>
          </label>
        ))}
      </div>

      <label style={cardStyle}>
        <span style={labelStyle}>Descripcion de lo solicitado</span>
        <textarea
          value={value.descripcionSolicitud || ""}
          disabled={readOnly}
          onChange={(event) => update({ descripcionSolicitud: event.target.value })}
          rows={7}
          style={{ ...inputStyle, marginTop: 8, resize: "vertical" }}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <label style={cardStyle}>
          <span style={labelStyle}>Lugar firma</span>
          <input
            value={value.lugarFirma || ""}
            disabled={readOnly}
            onChange={(event) => update({ lugarFirma: event.target.value })}
            style={{ ...inputStyle, marginTop: 8 }}
          />
        </label>
        <label style={cardStyle}>
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
    </div>
  );
}
