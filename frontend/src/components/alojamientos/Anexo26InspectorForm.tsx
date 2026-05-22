import type { CSSProperties } from "react";
import {
  badgeStyle,
  softCardStyle,
  subtitleStyle,
} from "../../pages/permisionario/uiStyles";

type SiNo = "" | "SI" | "NO";
type Estado = "" | "MB" | "B" | "R" | "M";

export type Anexo26Datos = {
  gradoAlojado?: string;
  lugarEntrega?: string;
  fechaEntrega?: string;
  material?: Record<string, SiNo>;
  documentacion?: Record<string, SiNo>;
  medidores?: Record<string, string>;
  estadoSistemas?: Record<string, Estado>;
  novedadesTexto?: string;
  observacionesInspector?: string;
  proximoDestinoAlojado?: string;
  lugarFirma?: string;
  fechaFirma?: string;
  horaFirma?: string;
};

type Props = {
  value: Anexo26Datos;
  onChange: (next: Anexo26Datos) => void;
  onGuardar: () => void | Promise<void>;
  readOnly?: boolean;
  busy?: boolean;
};

function safe(value: unknown) {
  return String(value ?? "");
}

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  boxSizing: "border-box",
  colorScheme: "dark",
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.64)",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 6,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10,
};

const materialRows = [
  ["llavesEdificio", "Llaves edificio"],
  ["llavesAlojamiento", "Llaves alojamiento"],
  ["llavesBaulera", "Llaves baulera"],
  ["llaveTerraza", "Llave terraza"],
  ["llaveCochera", "Llave cochera"],
  ["inventarioMuebles", "Muebles/enseres/inventario"],
  ["lineaTelefonica", "Linea telefonica"],
];

const documentacionRows = [
  ["reglamentoAlojamientos", "Reglamento alojamientos"],
  ["guiaTelefonica", "Guia telefonica"],
  ["reglamentoCopropiedad", "Reglamento copropiedad"],
];

const medidorRows = [
  ["gas_m3", "Gas"],
  ["agua_m3", "Agua"],
  ["luz_kws", "Luz"],
];

const estadoRows = [
  ["agua", "Agua"],
  ["cloacas", "Cloacas"],
  ["electricidad", "Electricidad"],
  ["gas", "Gas"],
  ["pluviales", "Pluviales"],
  ["telefono", "Telefono"],
  ["aberturas", "Aberturas"],
  ["albanileria", "Albanileria"],
  ["alfombras", "Alfombras"],
  ["antenaTv", "Antena TV"],
  ["calefactorEstufa", "Calefactor / estufa"],
  ["calefonTermotanque", "Calefon / termotanque"],
  ["carpinteria", "Carpinteria"],
  ["cerrajeria", "Cerrajeria"],
  ["cocina", "Cocina"],
  ["desinfeccion", "Desinfeccion"],
  ["herrajes", "Herrajes"],
  ["limpieza", "Limpieza"],
  ["lustrado", "Lustrado"],
  ["parquesJardines", "Parques y jardines"],
  ["pintura", "Pintura"],
  ["pisos", "Pisos"],
  ["porteroElectrico", "Portero electrico"],
  ["sanitarios", "Sanitarios"],
  ["vidrios", "Vidrios"],
  ["estadoGeneral", "Estado general"],
];

export default function Anexo26InspectorForm({ value, onChange, onGuardar, readOnly, busy }: Props) {
  const datos = value || {};

  function setField<K extends keyof Anexo26Datos>(key: K, val: Anexo26Datos[K]) {
    onChange({ ...datos, [key]: val });
  }

  function setNested(group: "material" | "documentacion" | "medidores" | "estadoSistemas", key: string, val: string) {
    setField(group, { ...(datos[group] || {}), [key]: val } as any);
  }

  function renderSiNo(title: string, group: "material" | "documentacion", rows: string[][]) {
    return (
      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>{title}</h3>
        <div style={gridStyle}>
          {rows.map(([key, label]) => (
            <label key={key}>
              <span style={labelStyle}>{label}</span>
              <select
                value={safe(datos[group]?.[key])}
                disabled={readOnly}
                onChange={(e) => setNested(group, key, e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleccionar</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </label>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>ANEXO_26 - Acta de entrega</h3>
        <p style={subtitleStyle}>Carga tecnica del inspector de alojamientos. No incluye datos sensibles.</p>
        <div style={gridStyle}>
          <label>
            <span style={labelStyle}>Grado / escalafon alojado</span>
            <input value={safe(datos.gradoAlojado)} onChange={(e) => setField("gradoAlojado", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Lugar entrega</span>
            <input value={safe(datos.lugarEntrega)} onChange={(e) => setField("lugarEntrega", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Fecha entrega</span>
            <input type="date" value={safe(datos.fechaEntrega).slice(0, 10)} onChange={(e) => setField("fechaEntrega", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Proximo destino</span>
            <input value={safe(datos.proximoDestinoAlojado)} onChange={(e) => setField("proximoDestinoAlojado", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Lugar firma</span>
            <input value={safe(datos.lugarFirma)} onChange={(e) => setField("lugarFirma", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Fecha firma</span>
            <input type="date" value={safe(datos.fechaFirma).slice(0, 10)} onChange={(e) => setField("fechaFirma", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Hora firma</span>
            <input type="time" value={safe(datos.horaFirma)} onChange={(e) => setField("horaFirma", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
        </div>
      </section>

      {renderSiNo("Material", "material", materialRows)}
      {renderSiNo("Documentacion", "documentacion", documentacionRows)}

      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>Medidores</h3>
        <div style={gridStyle}>
          {medidorRows.map(([key, label]) => (
            <label key={key}>
              <span style={labelStyle}>{label}</span>
              <input value={safe(datos.medidores?.[key])} onChange={(e) => setNested("medidores", key, e.target.value)} disabled={readOnly} style={inputStyle} />
            </label>
          ))}
        </div>
      </section>

      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>Estado de sistemas y elementos</h3>
        <div style={gridStyle}>
          {estadoRows.map(([key, label]) => (
            <label key={key}>
              <span style={labelStyle}>{label}</span>
              <select
                value={safe(datos.estadoSistemas?.[key])}
                disabled={readOnly}
                onChange={(e) => setNested("estadoSistemas", key, e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleccionar</option>
                <option value="MB">MB</option>
                <option value="B">B</option>
                <option value="R">R</option>
                <option value="M">M</option>
              </select>
            </label>
          ))}
        </div>
      </section>

      <section style={softCardStyle}>
        <label>
          <span style={labelStyle}>Novedades</span>
          <textarea value={safe(datos.novedadesTexto)} onChange={(e) => setField("novedadesTexto", e.target.value)} disabled={readOnly} rows={6} style={{ ...inputStyle, resize: "vertical" }} />
        </label>
      </section>

      <section style={softCardStyle}>
        <label>
          <span style={labelStyle}>Observaciones del inspector</span>
          <textarea value={safe(datos.observacionesInspector)} onChange={(e) => setField("observacionesInspector", e.target.value)} disabled={readOnly} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
        </label>
      </section>

      {!readOnly ? (
        <button type="button" onClick={onGuardar} disabled={busy} style={{ ...badgeStyle, minHeight: 40, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Guardando..." : "Guardar ANEXO_26"}
        </button>
      ) : null}
    </div>
  );
}
