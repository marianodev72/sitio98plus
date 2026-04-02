//frontend/src/pages/admin_general/MantenimientosAdminGeneral.tsx
import React, { useEffect, useState, type CSSProperties } from "react";
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
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "../permisionario/uiStyles";

const GENERIC_UI_ERROR =
  "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function badgeStyle(value: string) {
  const v = up(value);
  const base = {
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
  } as const;

  if (v === "SI") return { ...base, background: "rgba(22,163,74,0.18)" };
  if (v === "NO") return { ...base, background: "rgba(239,68,68,0.18)" };
  return { ...base, background: "rgba(255,255,255,0.05)" };
}

export default function MantenimientosAdminGeneral() {
  const { user } = useAuth();

  if (up(user?.role) !== "ADMIN_GENERAL") {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>La página solicitada no está disponible.</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>
              Por favor, contacte al administrador.
            </p>
          </div>
        </div>
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
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function getAdjuntos(it: any) {
    const a = (it?.archivos || it?.adjuntos || []) as Array<{
      fileId: string;
      nombre: string;
      mimetype: string;
      size: number;
    }>;
    return Array.isArray(a) ? a : [];
  }

  const controlStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#F8FAFC",
  fontSize: 14,
  minHeight: 42,
  boxSizing: "border-box",
  width: "100%",
};

const selectStyle: CSSProperties = {
  ...controlStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#ffffff",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: "12px 10px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.70)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: "12px 10px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    verticalAlign: "top",
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={titleStyle}>Mantenimientos — Admin General</h2>
              <p style={subtitleStyle}>Vista global con filtros y acciones administrativas.</p>
            </div>
            <div style={buttonRowStyle}>
              <button type="button" onClick={load} disabled={loading} style={primaryButtonStyle}>
                {loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...softCardStyle, marginBottom: 16 }}>
            <h3 style={{ ...sectionTitleStyle, marginBottom: 10 }}>Filtros</h3>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <input
                placeholder="Barrio"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                style={controlStyle}
              />
              <input
                placeholder="Vivienda"
                value={vivienda}
                onChange={(e) => setVivienda(e.target.value)}
                style={controlStyle}
              />
              <input
                placeholder="Permisionario"
                value={permisionario}
                onChange={(e) => setPermisionario(e.target.value)}
                style={controlStyle}
              />

              <select
  value={inspectorDecision}
  onChange={(e) => setInspectorDecision(e.target.value as any)}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    Inspector: (todos)
  </option>
  <option value="PENDIENTE" style={optionStyle}>
    Inspector: PENDIENTE
  </option>
  <option value="SI" style={optionStyle}>
    Inspector: SI
  </option>
  <option value="NO" style={optionStyle}>
    Inspector: NO
  </option>
</select>

              <select
  value={adminDecision}
  onChange={(e) => setAdminDecision(e.target.value as any)}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    Admin: (todos)
  </option>
  <option value="PENDIENTE" style={optionStyle}>
    Admin: PENDIENTE
  </option>
  <option value="SI" style={optionStyle}>
    Admin: SI
  </option>
  <option value="NO" style={optionStyle}>
    Admin: NO
  </option>
</select>
              <select
  value={isClosed}
  onChange={(e) => setIsClosed(e.target.value as any)}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    Cerrado: (todos)
  </option>
  <option value="true" style={optionStyle}>
    Cerrado: SI
  </option>
  <option value="false" style={optionStyle}>
    Cerrado: NO
  </option>
</select>
            </div>

            <div style={{ ...buttonRowStyle, marginTop: 12 }}>
              <button type="button" onClick={load} style={primaryButtonStyle}>
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  setBarrio("");
                  setVivienda("");
                  setPermisionario("");
                  setInspectorDecision("");
                  setAdminDecision("");
                  setIsClosed("");
                }}
                style={secondaryButtonStyle}
              >
                Limpiar
              </button>
            </div>
          </div>

          {error ? (
            <div
              style={{
                ...softCardStyle,
                marginBottom: 12,
                border: "1px solid rgba(239,68,68,0.30)",
                background: "rgba(127,29,29,0.18)",
                color: "#fecaca",
              }}
            >
              <b>Error:</b> {error}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                  <th style={thStyle}>Vivienda</th>
                  <th style={thStyle}>Permisionario</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Fecha/Hora</th>
                  <th style={thStyle}>Inspector</th>
                  <th style={thStyle}>Admin</th>
                  <th style={thStyle}>Cierre</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, opacity: 0.85 }}>
                      Cargando…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, opacity: 0.85 }}>
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  items.map((it: any) => {
                    const adj = getAdjuntos(it);
                    return (
                      <tr key={it._id}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{it.viviendaDisplay}</td>
                        <td style={tdStyle}>{it.permisionarioDisplay}</td>
                        <td style={tdStyle}>{it.tipoMantenimiento}</td>
                        <td style={tdStyle}>{new Date(it.submittedAt).toLocaleString()}</td>
                        <td style={tdStyle}>
                          <span style={badgeStyle(it.inspectorDecision)}>{it.inspectorDecision}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={badgeStyle(it.adminDecision)}>
                            {it.adminDecision === "SI" && it.isClosed ? "SI Y CERRADO" : it.adminDecision}
                          </span>
                        </td>
                        <td style={tdStyle}>{it.isClosed ? "CERRADO" : "—"}</td>

                        <td style={tdStyle}>
                          <div style={{ ...buttonRowStyle, marginTop: 0 }}>
                            <button
                              type="button"
                              onClick={() => openInNewTab(urlConstanciaPdf(it._id))}
                              style={secondaryButtonStyle}
                            >
                              Constancia
                            </button>

                            {adj.map((a) => (
                              <React.Fragment key={a.fileId}>
                                <button
                                  type="button"
                                  onClick={() => openInNewTab(urlPreviewAdjunto(it._id, a.fileId))}
                                  title={a.nombre}
                                  style={secondaryButtonStyle}
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openInNewTab(urlDownloadAdjunto(it._id, a.fileId))}
                                  title={a.nombre}
                                  style={secondaryButtonStyle}
                                >
                                  Descargar
                                </button>
                              </React.Fragment>
                            ))}

                            <button
                              type="button"
                              onClick={() => decide(it._id, "SI")}
                              style={successButtonStyle}
                            >
                              Admin SI
                            </button>
                            <button
                              type="button"
                              onClick={() => decide(it._id, "NO")}
                              style={secondaryButtonStyle}
                            >
                              Admin NO
                            </button>
                            <button
                              type="button"
                              onClick={() => cerrar(it._id)}
                              style={primaryButtonStyle}
                            >
                              Cerrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}