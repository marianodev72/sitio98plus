//frontend/src/pagges/permisionario/MisMantenimientosListado.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { listarMisMantenimientos, MantenimientoItem } from "../../api/mantenimientos";

const GENERIC_UI_ERROR =
  "No es posible procesar su solicitud, contáctese con el Administrador";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
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

  if (v === "SI") {
    return { ...base, background: "rgba(34,197,94,0.18)" };
  }
  if (v === "NO") {
    return { ...base, background: "rgba(239,68,68,0.18)" };
  }
  return { ...base, background: "rgba(255,255,255,0.08)" };
}

function adminBadgeText(item: MantenimientoItem) {
  const d = up(item.adminDecision);
  if (d === "SI" && item.isClosed) return "SI Y CERRADO";
  return d;
}

const styles = {
  page: {
    maxWidth: 1280,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  denied: {
    padding: 32,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  hero: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
    marginBottom: 16,
  } as React.CSSProperties,

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "flex-start",
  } as React.CSSProperties,

  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#ffffff",
  } as React.CSSProperties,

  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 1.55,
    maxWidth: 900,
  } as React.CSSProperties,

  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
    alignItems: "center",
  } as React.CSSProperties,

  primaryButton: {
    border: "1px solid rgba(59,130,246,0.9)",
    background: "linear-gradient(180deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37,99,235,0.28)",
  } as React.CSSProperties,

  secondaryButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  smallButton: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  alertError: {
    marginTop: 12,
    padding: 12,
    border: "1px solid rgba(244,67,54,0.6)",
    background: "rgba(244,67,54,0.12)",
    borderRadius: 12,
    color: "#ffe5e5",
  } as React.CSSProperties,

  tableWrap: {
    marginTop: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  } as React.CSSProperties,

  tableScroller: {
    overflowX: "auto" as const,
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: 1040,
  } as React.CSSProperties,

  th: {
    textAlign: "left" as const,
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.6)",
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  td: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top" as const,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  subtleText: {
    color: "rgba(255,255,255,0.74)",
    lineHeight: 1.45,
  } as React.CSSProperties,

  strongCell: {
    color: "#fff",
    fontWeight: 800,
  } as React.CSSProperties,

  emptyState: {
    padding: 14,
    color: "rgba(255,255,255,0.72)",
  } as React.CSSProperties,
};

export default function MisMantenimientosListado() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<MantenimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (up(user?.role) !== "PERMISIONARIO") {
    return (
      <div style={styles.denied}>
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
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Mis mantenimientos informados</h2>
            <div style={styles.subtitle}>
              Consultá el listado de solicitudes enviadas, su fecha de carga y el estado de revisión
              por inspector y administración.
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button
              onClick={() => navigate("/app/permisionario/mis-mantenimientos/nuevo")}
              style={styles.primaryButton}
            >
              Cargar
            </button>
            <button
              onClick={() => navigate("/app/permisionario/mis-mantenimientos")}
              style={styles.secondaryButton}
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div style={styles.alertError}>
          <b>Error:</b> {error}
        </div>
      ) : null}

      <div style={styles.tableWrap}>
        <div style={styles.tableScroller}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Vivienda</th>
                <th style={styles.th}>Permisionario</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Fecha y hora</th>
                <th style={styles.th}>Aprob. Inspector</th>
                <th style={styles.th}>Aprob. Admin</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={styles.emptyState}>
                    Cargando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyState}>
                    No hay mantenimientos informados.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it._id}>
                    <td style={{ ...styles.td, ...styles.strongCell }}>{it.viviendaDisplay}</td>
                    <td style={{ ...styles.td, ...styles.subtleText }}>{it.permisionarioDisplay}</td>
                    <td style={styles.td}>{it.tipoMantenimiento}</td>
                    <td style={{ ...styles.td, ...styles.subtleText }}>
                      {new Date(it.submittedAt).toLocaleString()}
                    </td>
                    <td style={styles.td}>
                      <span style={badgeStyle(it.inspectorDecision)}>{it.inspectorDecision}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={badgeStyle(adminBadgeText(it))}>{adminBadgeText(it)}</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() =>
                          navigate(`/app/permisionario/mis-mantenimientos/${it._id}`)
                        }
                        style={styles.smallButton}
                      >
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
    </div>
  );
}