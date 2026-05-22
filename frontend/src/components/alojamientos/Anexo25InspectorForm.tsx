import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  badgeStyle,
  softCardStyle,
  subtitleStyle,
} from "../../pages/permisionario/uiStyles";

export type Anexo25Representante = {
  apellidoNombres?: string;
  grado?: string;
  destino?: string;
};

export type Anexo25Datos = {
  gradoAlojado?: string;
  lugarInspeccion?: string;
  fechaInspeccion?: string;
  reparacionesArmada?: string[];
  reparacionesAlojado?: string[];
  representante1?: Anexo25Representante;
  representante2?: Anexo25Representante;
  observacionesInspector?: string;
  lugarFirma?: string;
  fechaFirma?: string;
};

type Props = {
  value: Anexo25Datos;
  onChange: (next: Anexo25Datos) => void;
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

function normalList(value: unknown) {
  const list = Array.isArray(value) ? value.map((item) => String(item || "")) : [];
  return list.length ? list : [""];
}

export default function Anexo25InspectorForm({ value, onChange, onGuardar, readOnly, busy }: Props) {
  const datos = value || {};
  const reparacionesArmada = useMemo(() => normalList(datos.reparacionesArmada), [datos.reparacionesArmada]);
  const reparacionesAlojado = useMemo(() => normalList(datos.reparacionesAlojado), [datos.reparacionesAlojado]);

  function setField<K extends keyof Anexo25Datos>(key: K, val: Anexo25Datos[K]) {
    onChange({ ...datos, [key]: val });
  }

  function setList(key: "reparacionesArmada" | "reparacionesAlojado", index: number, text: string) {
    const list = normalList(datos[key]);
    list[index] = text;
    setField(key, list);
  }

  function addList(key: "reparacionesArmada" | "reparacionesAlojado") {
    setField(key, [...normalList(datos[key]), ""]);
  }

  function removeList(key: "reparacionesArmada" | "reparacionesAlojado", index: number) {
    const next = normalList(datos[key]).filter((_, i) => i !== index);
    setField(key, next.length ? next : [""]);
  }

  function setRep(repKey: "representante1" | "representante2", field: keyof Anexo25Representante, text: string) {
    const curr = datos[repKey] || {};
    setField(repKey, { ...curr, [field]: text });
  }

  function renderList(title: string, key: "reparacionesArmada" | "reparacionesAlojado", list: string[]) {
    return (
      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>{title}</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((item, index) => (
            <div key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <textarea
                value={item}
                onChange={(event) => setList(key, index, event.target.value)}
                disabled={readOnly}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              {!readOnly && list.length > 1 ? (
                <button type="button" style={badgeStyle} onClick={() => removeList(key, index)}>
                  Quitar
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {!readOnly ? (
          <button type="button" style={{ ...badgeStyle, marginTop: 10 }} onClick={() => addList(key)}>
            Agregar item
          </button>
        ) : null}
      </section>
    );
  }

  function renderRep(title: string, key: "representante1" | "representante2") {
    const rep = datos[key] || {};
    return (
      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>{title}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <label>
            <span style={labelStyle}>Apellido y nombres</span>
            <input value={safe(rep.apellidoNombres)} onChange={(e) => setRep(key, "apellidoNombres", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Grado</span>
            <input value={safe(rep.grado)} onChange={(e) => setRep(key, "grado", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Destino</span>
            <input value={safe(rep.destino)} onChange={(e) => setRep(key, "destino", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={softCardStyle}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>ANEXO_25 - Inspeccion previa</h3>
        <p style={subtitleStyle}>Carga tecnica del inspector de alojamientos. No incluye datos sensibles.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          <label>
            <span style={labelStyle}>Grado / escalafon alojado</span>
            <input value={safe(datos.gradoAlojado)} onChange={(e) => setField("gradoAlojado", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Lugar inspeccion</span>
            <input value={safe(datos.lugarInspeccion)} onChange={(e) => setField("lugarInspeccion", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Fecha inspeccion</span>
            <input type="date" value={safe(datos.fechaInspeccion).slice(0, 10)} onChange={(e) => setField("fechaInspeccion", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Lugar firma</span>
            <input value={safe(datos.lugarFirma)} onChange={(e) => setField("lugarFirma", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
          <label>
            <span style={labelStyle}>Fecha firma</span>
            <input type="date" value={safe(datos.fechaFirma).slice(0, 10)} onChange={(e) => setField("fechaFirma", e.target.value)} disabled={readOnly} style={inputStyle} />
          </label>
        </div>
      </section>

      {renderList("Reparaciones y/o mantenimientos a cargo de la alcaldia", "reparacionesArmada", reparacionesArmada)}
      {renderList("Reparaciones y/o mantenimientos a cargo del huesped", "reparacionesAlojado", reparacionesAlojado)}
      {renderRep("Representante 1", "representante1")}
      {renderRep("Representante 2", "representante2")}

      <section style={softCardStyle}>
        <label>
          <span style={labelStyle}>Observaciones del inspector</span>
          <textarea
            value={safe(datos.observacionesInspector)}
            onChange={(e) => setField("observacionesInspector", e.target.value)}
            disabled={readOnly}
            rows={6}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>
      </section>

      {!readOnly ? (
        <button type="button" onClick={onGuardar} disabled={busy} style={{ ...badgeStyle, minHeight: 40, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Guardando..." : "Guardar ANEXO_25"}
        </button>
      ) : null}
    </div>
  );
}
