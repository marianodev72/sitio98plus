// frontend/src/pages/permisionario/MisLiquidaciones.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type LiqDetalle = {
  cod457?: number;
  cod411?: number;
  etiqueta457?: "DESCUENTO" | "REINTEGRO" | "0";
  etiqueta411?: "DESCUENTO" | "REINTEGRO" | "0";
};

type Liquidacion = {
  _id: string;
  periodo: string;
  principal?: { cod457?: number; cod411?: number };
  reintegros?: { cod457?: number; cod411?: number };
  total?: LiqDetalle;
};

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function apiGet<T>(url: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, { headers, credentials: "include" });
  const isJson = (resp.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await resp.json().catch(() => ({})) : {};

  if (!resp.ok) {
    const msg = (body as any)?.message || "Error interno";
    throw new Error(msg);
  }
  return body as T;
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function badgeStyle(tipo?: string): React.CSSProperties {
  const t = String(tipo || "").toUpperCase().trim();
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 11,
    border: "1px solid rgba(255,255,255,0.1)",
    letterSpacing: "0.04em",
    color: "#fff",
  };

  if (t === "REINTEGRO") return { ...base, background: "rgba(34,197,94,0.18)" };
  if (t === "DESCUENTO") return { ...base, background: "rgba(239,68,68,0.18)" };
  return { ...base, background: "rgba(255,255,255,0.08)" };
}

const styles = {
  page: {
    maxWidth: 1180,
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

  heroTop: {
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

  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  card: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
  } as React.CSSProperties,

  cardTitle: {
    margin: 0,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#fff",
  } as React.CSSProperties,

  alertError: {
    padding: 12,
    border: "1px solid rgba(244,67,54,0.6)",
    background: "rgba(244,67,54,0.12)",
    borderRadius: 12,
    color: "#ffe5e5",
  } as React.CSSProperties,

  emptyState: {
    padding: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.82)",
  } as React.CSSProperties,

  shell: {
    display: "grid",
    gap: 16,
  } as React.CSSProperties,

  periodLine: {
    marginBottom: 14,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
  } as React.CSSProperties,

  tableWrap: {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(255,255,255,0.05)",
  } as React.CSSProperties,

  tableScroller: {
    overflowX: "auto" as const,
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: 720,
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
    verticalAlign: "middle" as const,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  amountCell: {
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    textAlign: "right" as const,
    color: "#fff",
    fontWeight: 700,
  } as React.CSSProperties,

  totalRow: {
    fontWeight: 800,
  } as React.CSSProperties,

  historyList: {
    margin: 0,
    paddingLeft: 18,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 1.7,
  } as React.CSSProperties,

  historyItem: {
    marginBottom: 8,
  } as React.CSSProperties,

  historyMeta: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    marginLeft: 8,
  } as React.CSSProperties,
};

export default function MisLiquidaciones() {
  const navigate = useNavigate();

  const [ultima, setUltima] = useState<Liquidacion | null>(null);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const u = await apiGet<{ liquidacion: Liquidacion | null }>(
          "/api/liquidaciones/mis/ultima"
        );
        const h = await apiGet<{ liquidaciones: Liquidacion[] }>("/api/liquidaciones/mis");

        if (!alive) return;
        setUltima(u.liquidacion || null);
        setHistorial(Array.isArray(h.liquidaciones) ? h.liquidaciones : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Error interno");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <h2 style={styles.title}>Mis liquidaciones</h2>
            <div style={styles.subtitle}>
              Consultá la última liquidación disponible y el historial de períodos anteriores.
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={() => navigate("/app/permisionario")}
              style={styles.secondaryButton}
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      <div style={styles.shell}>
        {loading ? <div style={styles.emptyState}>Cargando información…</div> : null}

        {!loading && error ? (
          <div style={styles.alertError}>
            <b>Alerta:</b> {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Última liquidación</h3>

              {!ultima ? (
                <div style={styles.emptyState}>No hay liquidaciones disponibles.</div>
              ) : (
                <>
                  <div style={styles.periodLine}>
                    <b>Período:</b> {ultima.periodo}
                  </div>

                  <div style={styles.tableWrap}>
                    <div style={styles.tableScroller}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Concepto</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>Cod 457</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>Cod 411</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={styles.td}>Liquidación</td>
                            <td style={styles.amountCell}>
                              {n(ultima.principal?.cod457).toFixed(2)}
                            </td>
                            <td style={styles.amountCell}>
                              {n(ultima.principal?.cod411).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td style={styles.td}>Reintegros</td>
                            <td style={styles.amountCell}>
                              {n(ultima.reintegros?.cod457).toFixed(2)}
                            </td>
                            <td style={styles.amountCell}>
                              {n(ultima.reintegros?.cod411).toFixed(2)}
                            </td>
                          </tr>
                          <tr style={styles.totalRow}>
                            <td style={styles.td}>Total</td>
                            <td style={styles.amountCell}>
                              {n(ultima.total?.cod457).toFixed(2)}{" "}
                              <span style={badgeStyle(ultima.total?.etiqueta457)}>
                                {ultima.total?.etiqueta457 || "0"}
                              </span>
                            </td>
                            <td style={styles.amountCell}>
                              {n(ultima.total?.cod411).toFixed(2)}{" "}
                              <span style={badgeStyle(ultima.total?.etiqueta411)}>
                                {ultima.total?.etiqueta411 || "0"}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Historial</h3>

              {historial.length === 0 ? (
                <div style={styles.emptyState}>No hay liquidaciones anteriores.</div>
              ) : (
                <ul style={styles.historyList}>
                  {historial.map((l) => (
                    <li key={l._id} style={styles.historyItem}>
                      <b>{l.periodo}</b> — Total 457: {n(l.total?.cod457).toFixed(2)}
                      <span style={styles.historyMeta}>({l.total?.etiqueta457 || "0"})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}