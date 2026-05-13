// frontend/src/components/CrearAnexo09Desde08.tsx
import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";
import Anexo03InspectorForm, {
  Anexo03Datos,
} from "../../../components/anexos/Anexo03InspectorForm";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
  vivienda?: string;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

const pageStyle: CSSProperties = {
  padding: "clamp(16px, 3vw, 28px)",
  display: "grid",
  gap: 14,
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  color: "#f8fafc",
};

const headerPanelStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
  padding: 16,
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.58)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: "clamp(20px, 3vw, 28px)",
  fontWeight: 850,
  lineHeight: 1.18,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.70)",
  fontSize: 13,
  lineHeight: 1.5,
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
  boxShadow: "0 16px 42px rgba(0,0,0,0.20)",
  padding: 16,
  minWidth: 0,
  boxSizing: "border-box",
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const metaItemStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  padding: 12,
  minWidth: 0,
};

const metaLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
  color: "rgba(255,255,255,0.56)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const metaValueStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 13,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
};

const actionBarStyle: CSSProperties = {
  ...cardStyle,
  padding: 12,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
};

const buttonStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  color: "#f8fafc",
  fontWeight: 800,
  padding: "10px 14px",
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "none",
  background: "#16a34a",
};

const alertSuccessStyle: CSSProperties = {
  padding: 12,
  border: "1px solid rgba(34,197,94,0.34)",
  borderRadius: 12,
  background: "rgba(20,83,45,0.22)",
  color: "#bbf7d0",
  fontSize: 13,
  lineHeight: 1.45,
};

const alertErrorStyle: CSSProperties = {
  padding: 12,
  border: "1px solid rgba(239,68,68,0.35)",
  borderRadius: 12,
  background: "rgba(127,29,29,0.24)",
  color: "#fecaca",
  fontSize: 13,
  lineHeight: 1.45,
};

export default function CrearAnexo09Desde08() {
  const { id } = useParams<{ id: string }>(); // id del ANEXO_08
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo08, setAnexo08] = useState<Anexo | null>(null);
  const [datos, setDatos] = useState<Anexo03Datos>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    if (!id) return;

    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      const res = await http.get(`/formularios/${id}`);
      const a = (res.data?.anexo || null) as Anexo | null;

      if (!a || up(a.codigo) !== "ANEXO_08") {
        setError("El documento solicitado no es un ANEXO_08 válido.");
        setAnexo08(null);
        setDatos({});
        return;
      }

      setAnexo08(a);

      const d = a.datos || {};

      const inspectorNombreDefault = `${String(user?.apellido || "")
        .trim()} ${String(user?.nombre || "").trim()}`.trim();

      const permisionarioFromForm =
        (typeof d.permisionarioNombre === "string" &&
          d.permisionarioNombre.trim()) ||
        (typeof d.postulanteNombre === "string" &&
          d.postulanteNombre.trim()) ||
        "";

      const unidadHabitacionalFromForm =
        (typeof d.unidadHabitacional === "string" &&
          d.unidadHabitacional.trim()) ||
        "";

      const direccionFromForm =
        (typeof d.direccionUnidad === "string" &&
          d.direccionUnidad.trim()) ||
        (typeof d.direccion === "string" && d.direccion.trim()) ||
        "";

      const localidadFromForm =
        (typeof d.localidad === "string" && d.localidad.trim()) || "";

      const provinciaFromForm =
        (typeof d.provincia === "string" && d.provincia.trim()) || "";

      setDatos((prev) => ({
        ...prev,
        permisionarioNombre: permisionarioFromForm || prev.permisionarioNombre,
        unidadHabitacional:
          unidadHabitacionalFromForm || prev.unidadHabitacional,
        direccion: direccionFromForm || prev.direccion,
        localidad: localidadFromForm || prev.localidad,
        provincia: provinciaFromForm || prev.provincia,
        inspectorNombre:
          (prev.inspectorNombre && prev.inspectorNombre.trim()) ||
          inspectorNombreDefault ||
          prev.inspectorNombre,
      }));
    } catch (e) {
      console.error("[ANEXO_09] Error cargando ANEXO_08", e);
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
      setAnexo08(null);
      setDatos({});
    } finally {
      setLoading(false);
    }
  }

  async function enviarAnexo09() {
    if (!anexo08) return;

    setBusy(true);
    setError(null);
    setMsg(null);

    try {
      const payload = {
        datos: {
          ...datos,
          derivadoDe: anexo08._id, // lo necesita el backend para enlazar con ANEXO_08
        },
      };

      const res = await http.post("/formularios/ANEXO_09", payload);
      const creado = res.data?.anexo;

      if (creado?._id) {
        setMsg(
          "Acta de entrega (ANEXO_09) creada y enviada correctamente al Permisionario."
        );
        setTimeout(() => {
          navigate("/app/permisionario/mi-barrio/gestiones");
        }, 1500);
      } else {
        setError(
          "No se ha podido procesar su solicitud, contacte al administrador."
        );
      }
    } catch (e) {
      console.error("[ANEXO_09] Error creando ANEXO_09", e);
      setError(
        "No se ha podido procesar su solicitud, contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={alertErrorStyle}>{error}</div>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio/gestiones")}
          style={buttonStyle}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!anexo08) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>No se encontraron datos del ANEXO_08.</div>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio/gestiones")}
          style={buttonStyle}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerPanelStyle}>
        <p style={eyebrowStyle}>Gestiones / ANEXO_09</p>
        <h2 style={titleStyle}>Acta de entrega de vivienda fiscal</h2>
        <p style={subtitleStyle}>
          Generacion institucional desde ANEXO_08 cerrado para remitir al
          Permisionario.
        </p>
      </div>

      {msg ? (
        <div style={alertSuccessStyle}>
          {msg}
        </div>
      ) : null}

      <div style={cardStyle}>
        <div style={metaGridStyle}>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Anexo origen</span>
            <span style={metaValueStyle}>{anexo08._id}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Estado</span>
            <span style={metaValueStyle}>{safe(anexo08.estado)}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Creado</span>
            <span style={metaValueStyle}>{fmtDate(anexo08.createdAt)}</span>
          </div>
          <div style={metaItemStyle}>
            <span style={metaLabelStyle}>Actualizado</span>
            <span style={metaValueStyle}>{fmtDate(anexo08.updatedAt)}</span>
          </div>
        </div>
        <div style={{ ...subtitleStyle, marginTop: 12 }}>
          Este ANEXO_09 se encadena al ANEXO_08 cerrado para la vivienda
          inspeccionada. Será enviado al Permisionario para su conformidad y
          luego a ADMIN_GENERAL para cierre del trámite.
        </div>
      </div>

      <div>
        <Anexo03InspectorForm
          value={datos}
          onChange={setDatos}
          anexoCodigo="09"
          tipoActa="ENTREGA"
        />
      </div>

      <div style={actionBarStyle}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio/gestiones")}
          disabled={busy}
          style={{
            ...buttonStyle,
            opacity: busy ? 0.65 : 1,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Cancelar / Volver
        </button>

        <button
          disabled={busy}
          onClick={enviarAnexo09}
          style={{
            ...primaryButtonStyle,
            opacity: busy ? 0.65 : 1,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Enviar ANEXO 09 al Permisionario
        </button>
      </div>
    </div>
  );
}
