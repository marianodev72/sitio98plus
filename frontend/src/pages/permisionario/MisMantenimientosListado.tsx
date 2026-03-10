//frontend/src/pagges/permisionario/MisMantenimientosListado.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { listarMisMantenimientos, MantenimientoItem } from "../../api/mantenimientos";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function badgeStyle(value: string) {
  const v = up(value);
  const base = { padding: "2px 8px", borderRadius: 999, fontWeight: 800, fontSize: 12, border: "1px solid #e5e5e5" } as const;
  if (v === "SI") return { ...base, background: "#e9ffe9" };
  if (v === "NO") return { ...base, background: "#ffe9e9" };
  return { ...base, background: "#f4f4f4" };
}

function adminBadgeText(item: MantenimientoItem) {
  const d = up(item.adminDecision);
  if (d === "SI" && item.isClosed) return "SI Y CERRADO";
  return d;
}

export default function MisMantenimientosListado() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<MantenimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await listarMisMantenimientos();
        if (!alive) return;
        setItems(list);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || GENERIC_UI_ERROR);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>Mis mantenimientos informados</h2>
          <p style={{ opacity: 0.85 }}>Listado de solicitudes enviadas.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/app/permisionario/mis-mantenimientos/nuevo")}>Cargar</button>
          <button onClick={() => navigate("/app/permisionario/mis-mantenimientos")}>Volver</button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 12, padding: 10, background: "#fff3f3", border: "1px solid #ffd1d1", borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 12, background: "white", border: "1px solid #e5e5e5", borderRadius: 10, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 10 }}>Vivienda</th>
              <th style={{ textAlign: "left", padding: 10 }}>Permisionario</th>
              <th style={{ textAlign: "left", padding: 10 }}>Tipo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Fecha y hora</th>
              <th style={{ textAlign: "left", padding: 10 }}>Aprob. Inspector</th>
              <th style={{ textAlign: "left", padding: 10 }}>Aprob. Admin</th>
              <th style={{ textAlign: "left", padding: 10 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 14, opacity: 0.85 }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 14, opacity: 0.85 }}>No hay mantenimientos informados.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it._id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10, fontWeight: 800 }}>{it.viviendaDisplay}</td>
                  <td style={{ padding: 10 }}>{it.permisionarioDisplay}</td>
                  <td style={{ padding: 10 }}>{it.tipoMantenimiento}</td>
                  <td style={{ padding: 10 }}>{new Date(it.submittedAt).toLocaleString()}</td>
                  <td style={{ padding: 10 }}><span style={badgeStyle(it.inspectorDecision)}>{it.inspectorDecision}</span></td>
                  <td style={{ padding: 10 }}><span style={badgeStyle(adminBadgeText(it))}>{adminBadgeText(it)}</span></td>
                  <td style={{ padding: 10 }}>
                    <button onClick={() => navigate(`/app/permisionario/mis-mantenimientos/${it._id}`)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
