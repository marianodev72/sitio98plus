// frontend/src/pages/permisionario/jefe/CrearAnexo11JefeBarrio.tsx
import { useState } from "react";
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
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ marginTop: 0 }}>Nuevo ANEXO 11 — Espacio común</h2>

      {error ? <div style={{ marginBottom: 12, color: "crimson" }}>{error}</div> : null}
      {ok ? <div style={{ marginBottom: 12, color: "green" }}>{ok}</div> : null}

      <div style={{ border: "1px solid #ddd", background: "white", padding: 12, borderRadius: 8 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontWeight: 700 }}>Ubicación del espacio común</label>
          <input
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            disabled={busy}
            placeholder="Ej: Plaza / SUM / pasillo / bomba de agua…"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontWeight: 700 }}>Detalle del pedido</label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={5}
            style={{ width: "100%", padding: 8 }}
            disabled={busy}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/app/permisionario/mi-barrio-jefe")} disabled={busy}>
            Cancelar
          </button>
          <button onClick={crear} disabled={busy} style={{ fontWeight: 800 }}>
            {busy ? "Creando…" : "Crear ANEXO 11"}
          </button>
        </div>
      </div>
    </div>
  );
}
