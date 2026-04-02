//frontend/src/pagges/permisionario/MisMantenimientosDetalle.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMantenimiento,
  MantenimientoItem,
  urlConstanciaPdf,
  urlDownloadAdjunto,
  urlPreviewAdjunto,
} from "../../api/mantenimientos";

const GENERIC_UI_ERROR =
  "No es posible procesar su solicitud, contáctese con el Administrador";

function badgeStyle(value: string) {
  const v = String(value || "").toUpperCase().trim();
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
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

  shell: {
    display: "grid",
    gap: 16,
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

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  } as React.CSSProperties,

  infoBox: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.58)",
    marginBottom: 6,
  } as React.CSSProperties,

  value: {
    fontSize: 15,
    fontWeight: 700,
    color: "rgba(255,255,255,0.95)",
    lineHeight: 1.45,
    wordBreak: "break-word" as const,
  } as React.CSSProperties,

  fullWidth: {
    gridColumn: "1 / -1",
  } as React.CSSProperties,

  buttonRow: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
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
    background: "rgba(244,67,54,0.12)",
    border: "1px solid rgba(244,67,54,0.6)",
    borderRadius: 12,
    color: "#ffe5e5",
  } as React.CSSProperties,

  emptyState: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
  } as React.CSSProperties,

  tableWrap: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  tableScroller: {
    overflowX: "auto" as const,
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: 760,
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
    color: "rgba(255,255,255,0.92)",
    verticalAlign: "top" as const,
  } as React.CSSProperties,

  stack: {
    display: "grid",
    gap: 8,
  } as React.CSSProperties,

  itemCard: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  itemTitle: {
    color: "#fff",
    fontWeight: 700,
    lineHeight: 1.45,
  } as React.CSSProperties,

  itemMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
    marginTop: 4,
    lineHeight: 1.5,
  } as React.CSSProperties,
};

export default function MisMantenimientosDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState<MantenimientoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const d = await getMantenimiento(id);
        if (!alive) return;
        setItem(d);
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
  }, [id]);

  function openPreview(fileId: string) {
    if (!id) return;
    window.open(urlPreviewAdjunto(id, fileId), "_blank", "noopener,noreferrer");
  }

  function download(fileId: string) {
    if (!id) return;
    window.location.href = urlDownloadAdjunto(id, fileId);
  }

  function descargarConstancia() {
    if (!id) return;
    window.location.href = urlConstanciaPdf(id);
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Detalle de mantenimiento</h2>
            <div style={styles.subtitle}>
              Consulta de la solicitud enviada, su documentación adjunta y el historial de
              intervenciones institucionales.
            </div>
          </div>

          <div>
            <button onClick={() => navigate(-1)} style={styles.secondaryButton}>
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

      {loading ? (
        <div style={styles.card}>
          <div style={styles.emptyState}>Cargando…</div>
        </div>
      ) : !item ? (
        <div style={styles.card}>
          <div style={styles.emptyState}>No disponible.</div>
        </div>
      ) : (
        <div style={styles.shell}>
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Resumen</h3>

            <div style={styles.summaryGrid}>
              <div style={styles.infoBox}>
                <div style={styles.label}>Vivienda</div>
                <div style={styles.value}>{item.viviendaDisplay}</div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.label}>Permisionario</div>
                <div style={styles.value}>{item.permisionarioDisplay}</div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.label}>Tipo</div>
                <div style={styles.value}>{item.tipoMantenimiento}</div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.label}>Enviado</div>
                <div style={styles.value}>
                  {new Date(item.submittedAt).toLocaleString()}
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.label}>Inspector</div>
                <div>
                  <span style={badgeStyle(item.inspectorDecision)}>
                    {item.inspectorDecision}
                  </span>
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.label}>Admin</div>
                <div>
                  <span style={badgeStyle(item.adminDecision)}>
                    {item.adminDecision === "SI" && item.isClosed
                      ? "SI Y CERRADO"
                      : item.adminDecision}
                  </span>
                </div>
              </div>

              <div style={{ ...styles.infoBox, ...styles.fullWidth }}>
                <div style={styles.label}>Técnico interviniente</div>
                <div style={styles.value}>{item.tecnicoInterviniente || "—"}</div>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={descargarConstancia} style={styles.primaryButton}>
                Descargar constancia (PDF)
              </button>
            </div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Adjuntos</h3>

            {item.adjuntos?.length ? (
              <div style={styles.tableWrap}>
                <div style={styles.tableScroller}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Archivo</th>
                        <th style={styles.th}>Tamaño</th>
                        <th style={styles.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.adjuntos.map((a) => (
                        <tr key={String(a.fileId)}>
                          <td style={styles.td}>{a.nombre || "documento.pdf"}</td>
                          <td style={styles.td}>
                            {Math.round((a.size || 0) / 1024)} KB
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                onClick={() => openPreview(String(a.fileId))}
                                style={styles.smallButton}
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => download(String(a.fileId))}
                                style={styles.smallButton}
                              >
                                Descargar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>No hay adjuntos.</div>
            )}
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Historial de intervenciones</h3>

            {item.intervenciones?.length ? (
              <div style={styles.stack}>
                {item.intervenciones.map((h, idx) => (
                  <div key={idx} style={styles.itemCard}>
                    <div style={styles.itemTitle}>
                      <b>{h.actorRole}</b> — {h.actorNombre}
                    </div>
                    <div style={styles.itemMeta}>
                      {new Date(h.fecha).toLocaleString()} — {h.accion} ({h.resultado})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>Sin intervenciones registradas.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}