// frontend/src/pages/permisionario/HistorialMantenimientos.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarMisMantenimientos,
  urlAdjuntoDownload,
  urlConstancia,
} from "../../api/misMantenimientos";
import { useAuth } from "../../auth/useAuth";

const GENERIC_UI_ERROR = "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v: any) {
  try {
    return new Date(v).toLocaleString("es-AR");
  } catch {
    return "-";
  }
}

export default function HistorialMantenimientos() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [uiError, setUiError] = useState<string | null>(null);

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={{ padding: 24 }}>
        <h2>La página solicitada no está disponible.</h2>
        <p>Por favor, contacte al administrador.</p>
      </div>
    );
  }

  useEffect(() => {
    (async () => {
      try {
        setUiError(null);
        const data = await listarMisMantenimientos();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setUiError(GENERIC_UI_ERROR);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Mantenimientos informados</h2>

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => nav("/app/permisionario/mis-mantenimientos")}>Volver</button>
        <button onClick={() => nav("/app/permisionario/mis-mantenimientos/nuevo")}>
          Cargar nuevo
        </button>
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
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Tipo</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Fecha</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Inspector</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Admin General</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Adjuntos</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 10 }}>Constancia</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it._id}>
                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{it.viviendaDisplay || "-"}</td>
                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{it.tipoMantenimiento || "-"}</td>
                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{fmtDate(it.submittedAt || it.createdAt)}</td>
                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>{it.inspectorDecision || "PENDIENTE"}</td>
                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>
                  {it.isClosed ? "SI Y CERRADO" : (it.adminDecision || "PENDIENTE")}
                </td>
                <td style={{ borderBottom: "1px solid #f2f2f2", padding: 10 }}>
                  {(it.archivos || []).length ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(it.archivos || []).map((a: any) => (
                        <li key={a.fileId}>
                          <a
                            href={urlAdjuntoDownload(it._id, a.fileId)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {a.nombre || "documento.pdf"}
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
              </tr>
            ))}

            {!items.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, opacity: 0.8 }}>
                  Sin mantenimientos cargados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
