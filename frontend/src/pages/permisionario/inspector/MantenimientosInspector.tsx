// frontend/src/pages/permisionario/inspector/MantenimientosInspector.tsx
import { useEffect, useState } from "react";
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
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
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

  return (
    <div style={{ padding: 24 }}>
      <h2>Mantenimientos</h2>

      <p style={{ opacity: 0.85 }}>
        Listado de mantenimientos informados por permisionarios de su barrio. Todas las acciones quedan registradas.
      </p>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => nav(-1)}>Volver</button>
        <button onClick={load}>Refrescar</button>
      </div>

      {uiError ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          {uiError}
        </div>
      ) : null}

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Vivienda</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Permisionario</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Tipo</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Fecha</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Adjuntos</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Constancia</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Aprobar</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Desaprobar</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Estado Inspector</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Estado Admin</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => {
              const disabled = busyId === it._id;
              const estadoInspector = it.inspectorDecision || "PENDIENTE";
              const estadoAdmin = it.isClosed ? "SI Y CERRADO" : (it.adminDecision || "PENDIENTE");

              return (
                <tr key={it._id}>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{it.viviendaDisplay || "-"}</td>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{it.permisionarioDisplay || "-"}</td>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{it.tipoMantenimiento || "-"}</td>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{fmtDate(it.submittedAt || it.createdAt)}</td>

                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>
                    {(it.archivos || []).length ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {(it.archivos || []).map((a: any) => (
                          <li key={a.fileId}>
                            <a href={urlAdjuntoPreview(it._id, a.fileId)} target="_blank" rel="noreferrer">
                              Preview
                            </a>
                            {" · "}
                            <a href={urlAdjuntoDownload(it._id, a.fileId)} target="_blank" rel="noreferrer">
                              Descargar
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>
                    <a href={urlConstancia(it._id)} target="_blank" rel="noreferrer">
                      Descargar
                    </a>
                  </td>

                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>
                    <button onClick={() => setDecision(it._id, "SI")} disabled={disabled || it.isClosed}>
                      Aprobar
                    </button>
                  </td>

                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>
                    <button onClick={() => setDecision(it._id, "NO")} disabled={disabled || it.isClosed}>
                      Desaprobar
                    </button>
                  </td>

                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{estadoInspector}</td>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{estadoAdmin}</td>
                </tr>
              );
            })}

            {!items.length ? (
              <tr>
                <td colSpan={10} style={{ padding: 12, opacity: 0.8 }}>
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
