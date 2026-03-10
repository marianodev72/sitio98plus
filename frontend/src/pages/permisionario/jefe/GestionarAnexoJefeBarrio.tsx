// frontend/src/pages/permisionario/jefe/GestionarAnexoJefeBarrio.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";
import Anexo04Vista from "../../../components/anexos/Anexo04Vista";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safeMsg(e: any) {
  return (
    e?.response?.data?.message ||
    "No se pudo guardar. Por favor, contacte al administrador."
  );
}

export default function GestionarAnexoJefeBarrio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const [observaciones, setObservaciones] = useState<string>("");

  const isJefe = useMemo(() => {
    const roleBase = up(user?.role);
    const permisos: string[] = Array.isArray((user as any)?.permisos) ? (user as any).permisos : [];
    return roleBase === "PERMISIONARIO" && permisos.map(up).includes("JEFE_DE_BARRIO");
  }, [user]);

  useEffect(() => {
    if (!id) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await http.get(`/formularios/${id}`);
      const a = res?.data?.anexo as Anexo | undefined;
      if (!a) {
        setAnexo(null);
        setErr("La página solicitada no está disponible.");
        return;
      }
      setAnexo(a);
      const obs = String(a?.datos?.observacionesJefeBarrio || "").toString();
      setObservaciones(obs);
    } catch (e) {
      console.error("[JEFE][ANEXO] Error cargando", e);
      setAnexo(null);
      setErr("La página solicitada no está disponible.");
    } finally {
      setLoading(false);
    }
  }

  async function guardarObservaciones() {
    if (!anexo?._id) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      // Backend acepta observacionesJefeBarrio y también observaciones (compat).
      await http.patch(`/formularios/${anexo._id}/anexo-04/observaciones`, {
        observacionesJefeBarrio: observaciones,
      });
      setMsg("Observaciones guardadas.");
      await cargar();
    } catch (e: any) {
      console.error("[JEFE][ANEXO_04] Error guardar observaciones", e);
      setErr(safeMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function darConformidad() {
    if (!anexo?._id) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      // Observaciones son opcionales; backend valida territorial y acceso.
      await http.post(`/formularios/${anexo._id}/conformidad-jefe-04`, {
        observacionesJefeBarrio: observaciones,
      });
      setMsg("Conformidad registrada.");
      await cargar();
    } catch (e: any) {
      console.error("[JEFE][ANEXO_04] Error conformidad", e);
      setErr(safeMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // Fail-closed UX (backend siempre valida igual)
  if (!user || !isJefe) {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (!anexo) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")}>Volver</button>
        {err && <div style={{ marginTop: 12, color: "#b71c1c" }}>{err}</div>}
      </div>
    );
  }

  const codigo = up(anexo.codigo);

  // Esta pantalla es para gestionar ANEXO_04 en el subpanel del JEFE.
  if (codigo !== "ANEXO_04") {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")}>Volver</button>
        <div style={{ marginTop: 12, color: "#b71c1c" }}>
          La página solicitada no está disponible.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")} disabled={busy}>
        Volver
      </button>

      <h2 style={{ marginTop: 14 }}>Gestión — ANEXO_04</h2>

      {err && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #f44336", background: "#ffebee" }}>
          {err}
        </div>
      )}
      {msg && !err && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #4caf50", background: "#e8f5e9" }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Anexo04Vista datos={anexo.datos} />
      </div>

      {/* Observaciones + conformidad (solo JEFE) */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 12, background: "#fff" }}>
        <h4 style={{ marginTop: 0 }}>Observaciones (JEFE DE BARRIO)</h4>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          placeholder="(Opcional) Observaciones del Jefe de Barrio…"
          disabled={busy}
        />
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={guardarObservaciones} disabled={busy}>
            {busy ? "Guardando…" : "Guardar observaciones"}
          </button>
          <button onClick={darConformidad} disabled={busy}>
            {busy ? "Enviando…" : "Dar conformidad"}
          </button>
          <button onClick={cargar} disabled={busy}>
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
