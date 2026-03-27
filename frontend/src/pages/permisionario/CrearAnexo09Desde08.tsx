// frontend/src/components/CrearAnexo09Desde08.tsx
import { useEffect, useState } from "react";
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
    return <div style={{ padding: 24 }}>Cargando…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12, color: "crimson" }}>{error}</div>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio/gestiones")}
        >
          Volver
        </button>
      </div>
    );
  }

  if (!anexo08) {
    return (
      <div style={{ padding: 24 }}>
        <p>No se encontraron datos del ANEXO_08.</p>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio/gestiones")}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Acta de entrega de vivienda fiscal (ANEXO 09)</h2>

      {msg ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #4caf50",
            background: "#e8f5e9",
          }}
        >
          {msg}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 10,
          marginBottom: 16,
          background: "#f7f7f7",
          fontSize: 13,
        }}
      >
        <div>
          <b>Anexo origen (ANEXO_08):</b> {anexo08._id}
        </div>
        <div>
          <b>Estado:</b> {safe(anexo08.estado)}
        </div>
        <div>
          <b>Creado:</b> {fmtDate(anexo08.createdAt)}
        </div>
        <div>
          <b>Actualizado:</b> {fmtDate(anexo08.updatedAt)}
        </div>
        <div style={{ marginTop: 6, fontStyle: "italic" }}>
          Este ANEXO_09 se encadena al ANEXO_08 cerrado para la vivienda
          inspeccionada. Será enviado al Permisionario para su conformidad y
          luego a ADMIN_GENERAL para cierre del trámite.
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Anexo03InspectorForm
          value={datos}
          onChange={setDatos}
          anexoCodigo="09"
          tipoActa="ENTREGA"
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/app/permisionario/mi-barrio/gestiones")}
          disabled={busy}
        >
          Cancelar / Volver
        </button>

        <button
          disabled={busy}
          onClick={enviarAnexo09}
          style={{ fontWeight: 700 }}
        >
          Enviar ANEXO 09 al Permisionario
        </button>
      </div>
    </div>
  );
}