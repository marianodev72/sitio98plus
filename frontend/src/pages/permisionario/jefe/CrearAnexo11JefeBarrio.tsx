// frontend/src/pages/permisionario/jefe/CrearAnexo11JefeBarrio.tsx
import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}
function hasPermiso(user: any, permiso: string) {
  const list = Array.isArray((user as any)?.permisos) ? (user as any).permisos : [];
  return list.map(up).includes(up(permiso));
}

export default function CrearAnexo11JefeBarrio() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const esJefe = role === "PERMISIONARIO" && hasPermiso(user, "JEFE_DE_BARRIO");

  const [ubicacion, setUbicacion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const pageStyle: CSSProperties = {
    width: "100%",
    maxWidth: 900,
    color: "#E5E7EB",
    boxSizing: "border-box",
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 12,
    boxSizing: "border-box",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontWeight: 700,
    color: "#F8FAFC",
    marginBottom: 6,
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

  const neutralButtonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const primaryButtonStyle: CSSProperties = {
    ...neutralButtonStyle,
    background: "rgba(59,130,246,0.20)",
    fontWeight: 800,
  };

  const errorStyle: CSSProperties = {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(127,29,29,0.18)",
    color: "#FCA5A5",
  };

  const okStyle: CSSProperties = {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(22,163,74,0.18)",
    color: "#86EFAC",
  };

  if (!esJefe) {
    return (
      <div style={{ padding: 24 }}>
        La página solicitada no está disponible. Por favor, contacte al administrador.
      </div>
    );
  }

  async function crear() {
    setError("");
    setOk("");

    if (!ubicacion.trim()) return setError("Completá la ubicación del espacio común.");
    if (!detalle.trim()) return setError("Completá el detalle del pedido.");

    setBusy(true);
    try {
      const datos = {
        esEspacioComun: true,
        ubicacionEspacioComun: ubicacion.trim(),
        detallePedido: detalle.trim(),
        promotorTipo: "JEFE_DE_BARRIO",
        promotorNombre: `${String((user as any)?.apellido || "").trim()} ${String((user as any)?.nombre || "").trim()}`.trim(),
      };

      const res = await http.post("/formularios/ANEXO_11", { datos });
      const created = res.data?.anexo || res.data?.formulario;

      if (created?._id) {
        setOk("ANEXO 11 creado correctamente.");
        navigate("/app/permisionario/mi-barrio-jefe/gestiones", { replace: true });
      } else {
        setError("No se pudo crear el ANEXO 11. Contacte al administrador.");
      }
    } catch (e: any) {
      console.error("[JEFE][ANEXO_11] Error creando", e);
      setError(e?.response?.data?.message || "No se pudo crear el ANEXO 11. Contacte al administrador.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 12, color: "#F8FAFC" }}>
        Nuevo ANEXO 11 — Espacio común
      </h2>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {ok ? <div style={okStyle}>{ok}</div> : null}

      <div style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Ubicación del espacio común</label>
          <input
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            style={controlStyle}
            disabled={busy}
            placeholder="Ej: Plaza / SUM / pasillo / bomba de agua…"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Detalle del pedido</label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={5}
            style={controlStyle}
            disabled={busy}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/app/permisionario/mi-barrio-jefe")}
            disabled={busy}
            style={neutralButtonStyle}
          >
            Cancelar
          </button>
          <button onClick={crear} disabled={busy} style={primaryButtonStyle}>
            {busy ? "Creando…" : "Crear ANEXO 11"}
          </button>
        </div>
      </div>
    </div>
  );
}