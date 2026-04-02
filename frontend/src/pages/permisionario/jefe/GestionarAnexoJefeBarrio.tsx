import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

  const pageStyle: CSSProperties = {
    padding: 24,
    color: "#E5E7EB",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const cardStyle: CSSProperties = {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxSizing: "border-box",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const primaryButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: "rgba(59,130,246,0.20)",
    fontWeight: 800,
  };

  const controlStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const errorStyle: CSSProperties = {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(127,29,29,0.18)",
    color: "#FCA5A5",
  };

  const okStyle: CSSProperties = {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(22,163,74,0.18)",
    color: "#86EFAC",
  };

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
      <div style={{ padding: 24, color: "#CBD5E1" }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (!anexo) {
    return (
      <div style={pageStyle}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")} style={buttonStyle}>
          Volver
        </button>
        {err && <div style={errorStyle}>{err}</div>}
      </div>
    );
  }

  const codigo = up(anexo.codigo);

  if (codigo !== "ANEXO_04") {
    return (
      <div style={pageStyle}>
        <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")} style={buttonStyle}>
          Volver
        </button>
        <div style={errorStyle}>La página solicitada no está disponible.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        onClick={() => navigate("/app/permisionario/mi-barrio-jefe")}
        disabled={busy}
        style={buttonStyle}
      >
        Volver
      </button>

      <h2 style={{ marginTop: 14, marginBottom: 12, color: "#F8FAFC" }}>
        Gestión — ANEXO_04
      </h2>

      {err && <div style={errorStyle}>{err}</div>}
      {msg && !err && <div style={okStyle}>{msg}</div>}

      <div style={{ marginTop: 14 }}>
        <Anexo04Vista datos={anexo.datos} />
      </div>

      <div style={cardStyle}>
        <h4 style={{ marginTop: 0, marginBottom: 10, color: "#F8FAFC" }}>
          Observaciones (JEFE DE BARRIO)
        </h4>

        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={5}
          style={controlStyle}
          placeholder="(Opcional) Observaciones del Jefe de Barrio…"
          disabled={busy}
        />

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={guardarObservaciones} disabled={busy} style={buttonStyle}>
            {busy ? "Guardando…" : "Guardar observaciones"}
          </button>

          <button onClick={darConformidad} disabled={busy} style={primaryButtonStyle}>
            {busy ? "Enviando…" : "Dar conformidad"}
          </button>

          <button onClick={cargar} disabled={busy} style={buttonStyle}>
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}