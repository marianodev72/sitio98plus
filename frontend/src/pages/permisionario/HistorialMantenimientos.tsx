// frontend/src/pages/permisionario/HistorialMantenimientos.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarMisMantenimientos,
  urlAdjuntoDownload,
  urlConstancia,
} from "../../api/misMantenimientos";
import { useAuth } from "../../auth/useAuth";

const GENERIC_UI_ERROR =
  "No es posible procesar su solicitud, contáctese con el Administrador";

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

function badgeStyle(value: string) {
  const v = up(value);
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 42,
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 11,
    border: "1px solid rgba(255,255,255,0.1)",
    letterSpacing: "0.04em",
    color: "#fff",
  } as const;

  if (v === "SI") return { ...base, background: "rgba(34,197,94,0.18)" };
  if (v === "NO") return { ...base, background: "rgba(239,68,68,0.18)" };
  return { ...base, background: "rgba(255,255,255,0.08)" };
}

const styles = {
  page: {
    maxWidth: 1280,
    color: "rgba(255,255,255,0.92)",
  },

  hero: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(11,18,32,0.96))",
    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
    marginBottom: 16,
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#fff",
  },

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
  },

  buttonRow: {
    display: "flex",
    gap: 10,
  },

  primaryButton: {
    border: "1px solid rgba(59,130,246,0.9)",
    background: "rgba(59,130,246,0.9)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },

  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },

  tableWrap: {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(255,255,255,0.05)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1000,
  },

  th: {
    textAlign: "left",
    padding: 12,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },

  td: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  link: {
    color: "#93c5fd",
    textDecoration: "none",
  },

  alert: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(244,67,54,0.6)",
    background: "rgba(244,67,54,0.12)",
  },
};

export default function HistorialMantenimientos() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [uiError, setUiError] = useState<string | null>(null);

  if (up(user?.role) !== "PERMISIONARIO") {
    return <div style={{ padding: 24 }}>Acceso denegado</div>;
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
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Historial de mantenimientos</h2>
            <div style={styles.subtitle}>
              Registro completo de solicitudes informadas.
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button onClick={() => nav("/app/permisionario/mis-mantenimientos")} style={styles.secondaryButton}>
              Volver
            </button>
            <button onClick={() => nav("/app/permisionario/mis-mantenimientos/nuevo")} style={styles.primaryButton}>
              Cargar nuevo
            </button>
          </div>
        </div>
      </div>

      {uiError && <div style={styles.alert}>{uiError}</div>}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Vivienda</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Inspector</th>
              <th style={styles.th}>Admin</th>
              <th style={styles.th}>Adjuntos</th>
              <th style={styles.th}>Constancia</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it._id}>
                <td style={styles.td}>{it.viviendaDisplay}</td>
                <td style={styles.td}>{it.tipoMantenimiento}</td>
                <td style={styles.td}>{fmtDate(it.submittedAt)}</td>

                <td style={styles.td}>
                  <span style={badgeStyle(it.inspectorDecision)}>
                    {it.inspectorDecision}
                  </span>
                </td>

                <td style={styles.td}>
                  <span style={badgeStyle(it.adminDecision)}>
                    {it.isClosed ? "SI Y CERRADO" : it.adminDecision}
                  </span>
                </td>

                <td style={styles.td}>
                  {(it.archivos || []).map((a: any) => (
                    <div key={a.fileId}>
                      <a
                        href={urlAdjuntoDownload(it._id, a.fileId)}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.link}
                      >
                        {a.nombre || "PDF"}
                      </a>
                    </div>
                  ))}
                </td>

                <td style={styles.td}>
                  <a
                    href={urlConstancia(it._id)}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                  >
                    Descargar
                  </a>
                </td>
              </tr>
            ))}

            {!items.length && (
              <tr>
                <td colSpan={7} style={styles.td}>
                  Sin mantenimientos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}