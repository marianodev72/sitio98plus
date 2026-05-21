import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { http } from "../../api/http";
import {
  badgeStyle,
  metaStyle,
  sectionTitleStyle,
  softCardStyle,
} from "../../pages/permisionario/uiStyles";

type Documento = {
  _id: string;
  estado?: string;
  datos?: Record<string, any>;
};

type Props = {
  documento: Documento;
  onUpdated: () => Promise<void> | void;
};

function up(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function initialForm(datos: Record<string, any> = {}) {
  return {
    novedadesTexto: String(datos.novedadesTexto || ""),
    observacionesInspector: String(datos.observacionesInspector || ""),
    lugarFirma: String(datos.lugarFirma || datos.lugar || ""),
    fechaFirma: String(datos.fechaFirma || "").slice(0, 10),
  };
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
  gap: 10,
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  marginBottom: 5,
};

const controlStyle: CSSProperties = {
  width: "100%",
  minHeight: 38,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  background: "rgba(15,23,42,0.72)",
  color: "#fff",
  padding: "8px 10px",
};

function TextAreaField({
  disabled,
  label,
  value,
  onChange,
}: {
  disabled: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        style={{ ...controlStyle, resize: "vertical", opacity: disabled ? 0.75 : 1 }}
      />
    </label>
  );
}

export default function Anexo24InspectorForm({ documento, onUpdated }: Props) {
  const editable = up(documento.estado) === "BORRADOR";
  const [form, setForm] = useState(() => initialForm(documento.datos || {}));
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(initialForm(documento.datos || {}));
  }, [documento._id, documento.datos]);

  const payload = useMemo(
    () => ({
      novedadesTexto: form.novedadesTexto,
      observacionesInspector: form.observacionesInspector,
      lugarFirma: form.lugarFirma,
      fechaFirma: form.fechaFirma,
    }),
    [form]
  );

  async function guardar() {
    if (!editable) return;
    setSaving(true);
    setMessage("");
    try {
      await http.patch(`/alojamientos-documentos/anexo-24/${documento._id}`, payload);
      setMessage("Borrador guardado.");
      await onUpdated();
    } catch {
      setMessage("No fue posible guardar el borrador.");
    } finally {
      setSaving(false);
    }
  }

  async function enviar() {
    if (!editable) return;
    const ok = window.confirm("Se enviara el ANEXO_24 a revision administrativa. Continuar?");
    if (!ok) return;

    setSending(true);
    setMessage("");
    try {
      await http.patch(`/alojamientos-documentos/anexo-24/${documento._id}`, payload);
      await http.post(`/alojamientos-documentos/anexo-24/${documento._id}/enviar`);
      setMessage("ANEXO_24 enviado a revision.");
      await onUpdated();
    } catch {
      setMessage("No fue posible enviar el ANEXO_24.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{ ...softCardStyle, marginTop: 16 }}>
      <h3 style={sectionTitleStyle}>Planilla ampliacion de novedades</h3>
      <p style={metaStyle}>
        Formulario operativo del inspector. El anexo queda editable solo mientras esta en BORRADOR.
      </p>

      <div style={{ ...softCardStyle, marginTop: 14 }}>
        <h4 style={sectionTitleStyle}>A. Novedades adicionales</h4>
        <TextAreaField
          disabled={!editable}
          label="Novedades adicionales"
          value={form.novedadesTexto}
          onChange={(value) => setForm((current) => ({ ...current, novedadesTexto: value }))}
        />
      </div>

      <div style={{ ...softCardStyle, marginTop: 14 }}>
        <h4 style={sectionTitleStyle}>B. Observaciones del inspector</h4>
        <TextAreaField
          disabled={!editable}
          label="Observaciones"
          value={form.observacionesInspector}
          onChange={(value) => setForm((current) => ({ ...current, observacionesInspector: value }))}
        />
      </div>

      <div style={{ ...softCardStyle, marginTop: 14 }}>
        <h4 style={sectionTitleStyle}>C. Lugar y fecha</h4>
        <div style={gridStyle}>
          <label>
            <span style={labelStyle}>Lugar</span>
            <input
              disabled={!editable}
              value={form.lugarFirma}
              onChange={(event) => setForm((current) => ({ ...current, lugarFirma: event.target.value }))}
              style={{ ...controlStyle, opacity: editable ? 1 : 0.75 }}
            />
          </label>
          <label>
            <span style={labelStyle}>Fecha</span>
            <input
              type="date"
              disabled={!editable}
              value={form.fechaFirma}
              onChange={(event) => setForm((current) => ({ ...current, fechaFirma: event.target.value }))}
              style={{ ...controlStyle, opacity: editable ? 1 : 0.75 }}
            />
          </label>
        </div>
      </div>

      {message && <div style={{ ...softCardStyle, marginTop: 14 }}>{message}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          disabled={!editable || saving || sending}
          onClick={guardar}
          style={{
            ...badgeStyle,
            minHeight: 38,
            cursor: !editable || saving || sending ? "not-allowed" : "pointer",
            opacity: !editable || saving || sending ? 0.65 : 1,
          }}
        >
          {saving ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          type="button"
          disabled={!editable || saving || sending}
          onClick={enviar}
          style={{
            ...badgeStyle,
            minHeight: 38,
            cursor: !editable || saving || sending ? "not-allowed" : "pointer",
            opacity: !editable || saving || sending ? 0.65 : 1,
          }}
        >
          {sending ? "Enviando..." : "Enviar a revision"}
        </button>
      </div>
    </section>
  );
}
