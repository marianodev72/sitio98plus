//frontend/src/pages/admin_general/MantenimientosAdminGeneral.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  listarMantenimientosAdmin,
  decisionAdmin,
  cierreAdmin,
  MantenimientoItem,
  Decision,
  urlConstanciaPdf,
  urlPreviewAdjunto,
  urlDownloadAdjunto,
} from "../../api/mantenimientos";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function badgeStyle(value: string) {
  const v = up(value);
  const base = {
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    border: "1px solid #e5e5e5",
  } as const;
  if (v === "SI") return { ...base, background: "#e9ffe9" };
  if (v === "NO") return { ...base, background: "#ffe9e9" };
  return { ...base, background: "#f4f4f4" };
}

export default function MantenimientosAdminGeneral() {
  const { user } = useAuth();

  if (up(user?.role) !== "ADMIN_GENERAL") {
    return (
      <div style={{ padding: 32 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  const [items, setItems] = useState<MantenimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [barrio, setBarrio] = useState("");
  const [vivienda, setVivienda] = useState("");
  const [permisionario, setPermisionario] = useState("");
  const [inspectorDecision, setInspectorDecision] = useState<Decision | "">("");
  const [adminDecision, setAdminDecision] = useState<Decision | "">("");
  const [isClosed, setIsClosed] = useState<"" | "true" | "false">("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await listarMantenimientosAdmin({
        barrio: barrio || undefined,
        vivienda: vivienda || undefined,
        permisionario: permisionario || undefined,
        inspectorDecision: (inspectorDecision || undefined) as any,
        adminDecision: (adminDecision || undefined) as any,
        isClosed: (isClosed || undefined) as any,
      });
      setItems(list);
    } catch (e: any) {
      setError(e?.message || GENERIC_UI_ERROR);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, d: "SI" | "NO") {
    const ok = window.confirm(`¿Confirmás marcar ADMIN como ${d}?`);
    if (!ok) return;

    setError("");
    try {
      await decisionAdmin(id, d);
      await load();
    } catch (e: any) {
      setError(e?.message || GENERIC_UI_ERROR);
    }
  }

  async function cerrar(id: string) {
    const ok = window.confirm("¿Confirmás CERRAR administrativamente este mantenimiento?");
    if (!ok) return;

    setError("");
    try {
      await cierreAdmin(id);
      await load();
    } catch (e: any) {
      setError(e?.message || GENERIC_UI_ERROR);
    }
  }

  function openInNewTab(url: string) {
    // navegación directa a /api para que NO lo capture React Router
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function getAdjuntos(it: any) {
    // Backend: "archivos". Legacy front: "adjuntos".
    const a = (it?.archivos || it?.adjuntos || []) as Array<{
      fileId: string;
      nombre: string;
      mimetype: string;
      size: number;
    }>;
    return Array.isArray(a) ? a : [];
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>Mantenimientos — Admin General</h2>
          <p style={{ opacity: 0.85 }}>Vista global con filtros y acciones administrativas.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={load} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, background: "white", border: "1px solid #e5e5e5", borderRadius: 10, padding: 14 }}>
        <b>Filtros</b>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <input placeholder="Barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)} />
          <input placeholder="Vivienda" value={vivienda} onChange={(e) => setVivienda(e.target.value)} />
          <input placeholder="Permisionario" value={permisionario} onChange={(e) => setPermisionario(e.target.value)} />

          <select value={inspectorDecision} onChange={(e) => setInspectorDecision(e.target.value as any)}>
            <option value="">Inspector: (todos)</option>
            <option value="PENDIENTE">Inspector: PENDIENTE</option>
            <option value="SI">Inspector: SI</option>
            <option value="NO">Inspector: NO</option>
          </select>

          <select value={adminDecision} onChange={(e) => setAdminDecision(e.target.value as any)}>
            <option value="">Admin: (todos)</option>
            <option value="PENDIENTE">Admin: PENDIENTE</option>
            <option value="SI">Admin: SI</option>
            <option value="NO">Admin: NO</option>
          </select>

          <select value={isClosed} onChange={(e) => setIsClosed(e.target.value as any)}>
            <option value="">Cerrado: (todos)</option>
            <option value="true">Cerrado: SI</option>
            <option value="false">Cerrado: NO</option>
          </select>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button type="button" onClick={load}>Aplicar</button>
          <button
            type="button"
            onClick={() => {
              setBarrio(""); setVivienda(""); setPermisionario("");
              setInspectorDecision(""); setAdminDecision(""); setIsClosed("");
            }}
          >
            Limpiar
          </button>
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
              <th style={{ textAlign: "left", padding: 10 }}>Fecha/Hora</th>
              <th style={{ textAlign: "left", padding: 10 }}>Inspector</th>
              <th style={{ textAlign: "left", padding: 10 }}>Admin</th>
              <th style={{ textAlign: "left", padding: 10 }}>Cierre</th>
              <th style={{ textAlign: "left", padding: 10 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 14, opacity: 0.85 }}>Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 14, opacity: 0.85 }}>Sin resultados.</td></tr>
            ) : (
              items.map((it: any) => {
                const adj = getAdjuntos(it);
                return (
                  <tr key={it._id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 10, fontWeight: 800 }}>{it.viviendaDisplay}</td>
                    <td style={{ padding: 10 }}>{it.permisionarioDisplay}</td>
                    <td style={{ padding: 10 }}>{it.tipoMantenimiento}</td>
                    <td style={{ padding: 10 }}>{new Date(it.submittedAt).toLocaleString()}</td>
                    <td style={{ padding: 10 }}>
                      <span style={badgeStyle(it.inspectorDecision)}>{it.inspectorDecision}</span>
                    </td>
                    <td style={{ padding: 10 }}>
                      <span style={badgeStyle(it.adminDecision)}>
                        {it.adminDecision === "SI" && it.isClosed ? "SI Y CERRADO" : it.adminDecision}
                      </span>
                    </td>
                    <td style={{ padding: 10 }}>{it.isClosed ? "CERRADO" : "—"}</td>

                    <td style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => openInNewTab(urlConstanciaPdf(it._id))}>
                        Constancia
                      </button>

                      {adj.map((a) => (
                        <React.Fragment key={a.fileId}>
                          <button
                            type="button"
                            onClick={() => openInNewTab(urlPreviewAdjunto(it._id, a.fileId))}
                            title={a.nombre}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => openInNewTab(urlDownloadAdjunto(it._id, a.fileId))}
                            title={a.nombre}
                          >
                            Descargar
                          </button>
                        </React.Fragment>
                      ))}

                      <button type="button" onClick={() => decide(it._id, "SI")}>Admin SI</button>
                      <button type="button" onClick={() => decide(it._id, "NO")}>Admin NO</button>
                      <button type="button" onClick={() => cerrar(it._id)}>Cerrar</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
