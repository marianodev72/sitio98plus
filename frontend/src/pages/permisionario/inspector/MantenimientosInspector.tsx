// frontend/src/pages/permisionario/inspector/MantenimientosInspector.tsx
import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import http from "../../../api/http";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function hasPerm(user: any, perm: string) {
  const list = Array.isArray(user?.permisos) ? user.permisos : [];
  return list.map((x: any) => up(x)).includes(up(perm));
}

function canSeeInspector(user: any) {
  const role = up(user?.role);
  return role === "INSPECTOR" || (role === "PERMISIONARIO" && hasPerm(user, "INSPECTOR"));
}

function fmtDate(v: any) {
  try {
    return new Date(v).toLocaleString("es-AR");
  } catch {
    return "-";
  }
}

function urlAdjuntoPreview(id: string, fileId: string) {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(fileId)}/preview`;
}
function urlAdjuntoDownload(id: string, fileId: string) {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(fileId)}/download`;
}
function urlConstancia(id: string) {
  return `/api/mis-mantenimientos/${encodeURIComponent(id)}/constancia.pdf`;
}

export default function MantenimientosInspector() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [uiError, setUiError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setUiError(null);
      const res = await http.get("/mis-mantenimientos/inspector/barrio");
      const data = res.data?.mantenimientos || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setUiError(GENERIC_UI_ERROR);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canSeeInspector(user)) {
    return (
      <div style={{ padding: 24, background: "#0b1220", minHeight: "100vh", color: "#eaf0ff" }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 12,
            padding: 16,
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(6px)",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#ffffff" }}>La página solicitada no está disponible.</h2>
          <p style={{ marginBottom: 0, color: "rgba(255,255,255,0.78)" }}>
            Por favor, contacte al administrador.
          </p>
        </div>
      </div>
    );
  }

  async function setDecision(id: string, decision: "SI" | "NO") {
    try {
      setUiError(null);
      setBusyId(id);

      await http.patch(`/mis-mantenimientos/inspector/${encodeURIComponent(id)}/decision`, {
        decision,
      });

      await load();
    } catch {
      setUiError(GENERIC_UI_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  const pageStyle: CSSProperties = {
    padding: 24,
    background: "#0b1220",
    minHeight: "100vh",
    color: "#eaf0ff",
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(6px)",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const successButtonStyle: CSSProperties = {
    ...buttonStyle,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(22,163,74,0.18)",
  };

  const dangerButtonStyle: CSSProperties = {
    ...buttonStyle,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(127,29,29,0.18)",
  };

  const tableWrapStyle: CSSProperties = {
    marginTop: 16,
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    background: "transparent",
  };

  const thStyle: CSSProperties = {
    textAlign: "left",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    padding: 10,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.70)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    padding: 10,
    color: "#ffffff",
    verticalAlign: "top",
  };

  const linkStyle: CSSProperties = {
    color: "#93c5fd",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <div style={pageStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 10, color: "#ffffff" }}>Mantenimientos</h2>

      <div style={cardStyle}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.82)" }}>
          Listado de mantenimientos informados por permisionarios de su barrio. Todas las
          acciones quedan registradas.
        </p>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => nav(-1)} style={buttonStyle}>
            Volver
          </button>
          <button onClick={load} style={buttonStyle}>
            Refrescar
          </button>
        </div>
      </div>

      {uiError ? (
        <div
          style={{
            ...cardStyle,
            marginTop: 16,
            border: "1px solid rgba(239,68,68,0.30)",
            background: "rgba(127,29,29,0.18)",
            color: "#fecaca",
          }}
        >
          {uiError}
        </div>
      ) : null}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Vivienda</th>
              <th style={thStyle}>Permisionario</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Adjuntos</th>
              <th style={thStyle}>Constancia</th>
              <th style={thStyle}>Aprobar</th>
              <th style={thStyle}>Desaprobar</th>
              <th style={thStyle}>Estado Inspector</th>
              <th style={thStyle}>Estado Admin</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => {
              const disabled = busyId === it._id;
              const estadoInspector = it.inspectorDecision || "PENDIENTE";
              const estadoAdmin = it.isClosed ? "SI Y CERRADO" : (it.adminDecision || "PENDIENTE");

              return (
                <tr key={it._id}>
                  <td style={tdStyle}>{it.viviendaDisplay || "-"}</td>
                  <td style={tdStyle}>{it.permisionarioDisplay || "-"}</td>
                  <td style={tdStyle}>{it.tipoMantenimiento || "-"}</td>
                  <td style={tdStyle}>{fmtDate(it.submittedAt || it.createdAt)}</td>

                  <td style={tdStyle}>
                    {(it.archivos || []).length ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {(it.archivos || []).map((a: any) => (
                          <li key={a.fileId} style={{ marginBottom: 4 }}>
                            <a
                              href={urlAdjuntoPreview(it._id, a.fileId)}
                              target="_blank"
                              rel="noreferrer"
                              style={linkStyle}
                            >
                              Preview
                            </a>
                            {" · "}
                            <a
                              href={urlAdjuntoDownload(it._id, a.fileId)}
                              target="_blank"
                              rel="noreferrer"
                              style={linkStyle}
                            >
                              Descargar
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td style={tdStyle}>
                    <a
                      href={urlConstancia(it._id)}
                      target="_blank"
                      rel="noreferrer"
                      style={linkStyle}
                    >
                      Descargar
                    </a>
                  </td>

                  <td style={tdStyle}>
                    <button
                      onClick={() => setDecision(it._id, "SI")}
                      disabled={disabled || it.isClosed}
                      style={successButtonStyle}
                    >
                      Aprobar
                    </button>
                  </td>

                  <td style={tdStyle}>
                    <button
                      onClick={() => setDecision(it._id, "NO")}
                      disabled={disabled || it.isClosed}
                      style={dangerButtonStyle}
                    >
                      Desaprobar
                    </button>
                  </td>

                  <td style={tdStyle}>{estadoInspector}</td>
                  <td style={tdStyle}>{estadoAdmin}</td>
                </tr>
              );
            })}

            {!items.length ? (
              <tr>
                <td colSpan={10} style={{ ...tdStyle, opacity: 0.85 }}>
                  Sin mantenimientos en su barrio.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}