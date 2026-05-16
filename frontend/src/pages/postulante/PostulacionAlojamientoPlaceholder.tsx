import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import {
  buttonRowStyle,
  cardStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type Documento = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  datos?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  motivo: string;
  destinoActual: string;
  tipoAlojamientoPreferido: string;
  observaciones: string;
};

const EMPTY_FORM: FormState = {
  motivo: "",
  destinoActual: "",
  tipoAlojamientoPreferido: "",
  observaciones: "",
};

const pageStyle: CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "clamp(12px, 2vw, 24px)",
  color: "#F8FAFC",
  boxSizing: "border-box",
};

const noteStyle: CSSProperties = {
  marginTop: 12,
  color: "rgba(255,255,255,0.76)",
  lineHeight: 1.65,
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(96,165,250,0.36)",
  background: "rgba(37,99,235,0.16)",
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 800,
};

const fieldGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 16,
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "rgba(255,255,255,0.80)",
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  resize: "vertical",
};

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function safe(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function datosToForm(datos: Record<string, unknown> | undefined): FormState {
  return {
    motivo: String(datos?.motivo || ""),
    destinoActual: String(datos?.destinoActual || ""),
    tipoAlojamientoPreferido: String(datos?.tipoAlojamientoPreferido || ""),
    observaciones: String(datos?.observaciones || ""),
  };
}

function formToDatos(form: FormState) {
  return {
    motivo: form.motivo,
    destinoActual: form.destinoActual,
    tipoAlojamientoPreferido: form.tipoAlojamientoPreferido,
    observaciones: form.observaciones,
  };
}

export default function PostulacionAlojamientoPlaceholder() {
  const navigate = useNavigate();

  const [documento, setDocumento] = useState<Documento | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const estado = useMemo(() => up(documento?.estado), [documento?.estado]);
  const isBorrador = estado === "BORRADOR";
  const isEnviado = estado === "ENVIADO";
  const canEdit = !documento || isBorrador;

  function setField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function cargar() {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const listRes = await http.get("/alojamientos-documentos", {
        params: { codigo: "ANEXO_21", limit: 1 },
      });

      const item = Array.isArray(listRes.data?.documentos) ? listRes.data.documentos[0] : null;
      if (!item?._id) {
        setDocumento(null);
        setForm(EMPTY_FORM);
        return;
      }

      const detailRes = await http.get(`/alojamientos-documentos/${item._id}`);
      const detail = detailRes.data?.documento || null;
      setDocumento(detail);
      setForm(datosToForm(detail?.datos));
    } catch {
      setDocumento(null);
      setError("No es posible acceder a la solicitud de alojamiento.");
    } finally {
      setLoading(false);
    }
  }

  async function guardar() {
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const payload = { datos: formToDatos(form) };
      const res = documento?._id
        ? await http.patch(`/alojamientos-documentos/anexo-21/${documento._id}`, payload)
        : await http.post("/alojamientos-documentos/anexo-21", payload);

      const saved = res.data?.documento || null;
      setDocumento(saved);
      setForm(datosToForm(saved?.datos));
      setInfo("Solicitud guardada como borrador.");
    } catch {
      setError("No es posible procesar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function enviar() {
    if (!documento?._id) return;

    setBusy(true);
    setError("");
    setInfo("");

    try {
      const res = await http.post(`/alojamientos-documentos/anexo-21/${documento._id}/enviar`);
      const sent = res.data?.documento || null;
      setDocumento(sent);
      setForm(datosToForm(sent?.datos));
      setInfo("Solicitud enviada. Se encuentra en revision institucional.");
    } catch {
      setError("No es posible procesar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Alojamiento Naval</h1>
        <p style={subtitleStyle}>Cargando solicitud...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Alojamiento Naval</h1>
      <p style={subtitleStyle}>Solicitud de inscripcion para ocupar Alojamiento Naval.</p>

      <section style={{ ...cardStyle, marginTop: 18 }}>
        <span style={badgeStyle}>ANEXO_21</span>

        <p style={noteStyle}>
          Estado actual: <b>{documento ? safe(documento.estado) : "Sin solicitud iniciada"}</b>
          {documento?.estadoInstitucional ? ` / ${documento.estadoInstitucional}` : ""}
        </p>

        {isEnviado ? (
          <p style={noteStyle}>
            La solicitud fue enviada y se encuentra en revision institucional.
          </p>
        ) : null}

        {error ? (
          <div style={{ ...cardStyle, marginTop: 14, borderColor: "rgba(239,68,68,0.34)" }}>
            {error}
          </div>
        ) : null}

        {info ? (
          <div style={{ ...cardStyle, marginTop: 14, borderColor: "rgba(34,197,94,0.34)" }}>
            {info}
          </div>
        ) : null}

        <div style={fieldGridStyle}>
          <label style={labelStyle}>
            Motivo
            <input
              value={form.motivo}
              onChange={(event) => setField("motivo", event.target.value)}
              style={inputStyle}
              disabled={!canEdit || busy}
              maxLength={2000}
            />
          </label>

          <label style={labelStyle}>
            Destino actual
            <input
              value={form.destinoActual}
              onChange={(event) => setField("destinoActual", event.target.value)}
              style={inputStyle}
              disabled={!canEdit || busy}
              maxLength={2000}
            />
          </label>

          <label style={labelStyle}>
            Tipo de alojamiento preferido
            <select
              value={form.tipoAlojamientoPreferido}
              onChange={(event) => setField("tipoAlojamientoPreferido", event.target.value)}
              style={inputStyle}
              disabled={!canEdit || busy}
            >
              <option value="">Seleccionar...</option>
              <option value="C01">C01 - Camarote individual</option>
              <option value="C02">C02 - Camarote doble</option>
              <option value="C03">C03 - Camarote triple</option>
              <option value="C04">C04 - Camarote cuadruple</option>
              <option value="CUSO">CUSO - Cuadra / Sollado</option>
            </select>
          </label>

          <label style={labelStyle}>
            Observaciones
            <textarea
              value={form.observaciones}
              onChange={(event) => setField("observaciones", event.target.value)}
              style={textareaStyle}
              disabled={!canEdit || busy}
              maxLength={2000}
            />
          </label>
        </div>

        <div style={{ ...buttonRowStyle, marginTop: 18 }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => navigate("/app/postulante/postulaciones")}
            disabled={busy}
          >
            Volver a postulaciones
          </button>

          {canEdit ? (
            <button type="button" style={primaryButtonStyle} onClick={guardar} disabled={busy}>
              {documento ? "Guardar borrador" : "Iniciar solicitud"}
            </button>
          ) : null}

          {isBorrador ? (
            <button type="button" style={successButtonStyle} onClick={enviar} disabled={busy}>
              Enviar solicitud
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
