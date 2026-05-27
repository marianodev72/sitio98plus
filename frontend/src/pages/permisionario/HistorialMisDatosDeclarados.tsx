// frontend/src/pages/permisionario/HistorialMisDatosDeclarados.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

function fmtFecha(ts?: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-AR");
  } catch {
    return "—";
  }
}

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
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

  buttonRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
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
  } as React.CSSProperties,

  shell: {
    display: "grid",
    gap: 16,
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

  tableWrap: {
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
    minWidth: 900,
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
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.45,
  } as React.CSSProperties,

  detailRow: {
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  detailCell: {
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  } as React.CSSProperties,

  loadingBox: {
    color: "rgba(255,255,255,0.78)",
  } as React.CSSProperties,

  detailGrid: {
    display: "grid",
    gap: 12,
  } as React.CSSProperties,

  detailMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
  } as React.CSSProperties,

  card: {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
  } as React.CSSProperties,

  cardTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  kvGrid: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 10,
  } as React.CSSProperties,

  kvLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.6)",
  } as React.CSSProperties,

  kvValue: {
    color: "rgba(255,255,255,0.94)",
    lineHeight: 1.5,
  } as React.CSSProperties,

  stack: {
    display: "grid",
    gap: 8,
  } as React.CSSProperties,

  itemCard: {
    padding: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
  } as React.CSSProperties,

  itemMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
    marginTop: 4,
    lineHeight: 1.45,
  } as React.CSSProperties,
};

export default function HistorialMisDatosDeclarados() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    setOpenId(null);
    setDetalle(null);

    try {
      const res = await http.get("/formularios/mis-datos-declarados/historial?limit=100");
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e: any) {
      setItems([]);
      setError(e?.response?.data?.message || "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }

  async function verItem(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetalle(null);
      return;
    }

    setOpenId(id);
    setDetalle(null);
    setLoadingDetalle(true);

    try {
      const res = await http.get(`/formularios/mis-datos-declarados/${id}`);
      setDetalle(res.data?.item || null);
    } catch (e: any) {
      setDetalle({ _error: e?.response?.data?.message || "No se pudo cargar el detalle." });
    } finally {
      setLoadingDetalle(false);
    }
  }

  function descargarPdf(id: string) {
    window.open(`/api/formularios/mis-datos-declarados/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.title}>Historial de actualizaciones</h2>
            <div style={styles.subtitle}>
              Registro auditable de modificaciones realizadas por el permisionario.
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button
              onClick={() => navigate("/app/permisionario/mis-datos")}
              style={styles.secondaryButton}
            >
              Volver
            </button>
            <button
              onClick={() => navigate("/app/permisionario/mis-datos/actualizar")}
              style={styles.primaryButton}
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div style={styles.shell}>
        {loading ? <div style={styles.emptyState}>Cargando…</div> : null}

        {error ? (
          <div style={styles.alertError}>
            <b>Error:</b> {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div style={styles.emptyState}>Sin actualizaciones registradas.</div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div style={styles.tableWrap}>
            <div style={styles.tableScroller}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: 220 }}>Fecha</th>
                    <th style={styles.th}>Resumen</th>
                    <th style={styles.th}>Motivo</th>
                    <th style={{ ...styles.th, width: 180 }}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((it) => {
                    const id = String(it?._id || "");
                    const isOpen = openId === id;

                    return (
                      <>
                        <tr key={id}>
                          <td style={styles.td}>{fmtFecha(it?.createdAt)}</td>
                          <td style={{ ...styles.td, ...styles.subtleText }}>
                            {it?.resumen || "—"}
                          </td>
                          <td style={{ ...styles.td, ...styles.subtleText }}>
                            {it?.motivo || "—"}
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => verItem(id)} style={styles.smallButton}>
                                {isOpen ? "Cerrar" : "Ver"}
                              </button>
                              <button onClick={() => descargarPdf(id)} style={styles.smallButton}>
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isOpen ? (
                          <tr style={styles.detailRow}>
                            <td colSpan={4} style={styles.detailCell}>
                              {loadingDetalle ? (
                                <div style={styles.loadingBox}>Cargando detalle…</div>
                              ) : detalle?._error ? (
                                <div style={styles.alertError}>
                                  <b>Error:</b> {detalle._error}
                                </div>
                              ) : (
                                <DetalleMisDatos item={detalle} />
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetalleMisDatos({ item }: { item: any }) {
  const d =
    item?.datosActualizados && typeof item.datosActualizados === "object"
      ? item.datosActualizados
      : item?.datos && typeof item.datos === "object"
        ? item.datos
        : {};

  const convivientes = safeArray(d?.convivientes);
  const mascotas = safeArray(d?.mascotas);

  return (
    <div style={styles.detailGrid}>
      <div style={styles.detailMeta}>
        <b>ID:</b> {String(item?._id || "—")} &nbsp;|&nbsp; <b>Fecha:</b>{" "}
        {item?.createdAt ? new Date(item.createdAt).toLocaleString("es-AR") : "—"}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Datos personales y destino</h3>
        <div style={styles.kvGrid}>
          <div style={styles.kvLabel}>Apellido</div>
          <div style={styles.kvValue}>{d.apellido || "—"}</div>

          <div style={styles.kvLabel}>Nombres</div>
          <div style={styles.kvValue}>{d.nombres || "—"}</div>

          <div style={styles.kvLabel}>Grado / Escalafón</div>
          <div style={styles.kvValue}>{d.gradoEscalafon || "—"}</div>

          <div style={styles.kvLabel}>Matrícula</div>
          <div style={styles.kvValue}>{d.matricula || "—"}</div>

          <div style={styles.kvLabel}>Años de servicio</div>
          <div style={styles.kvValue}>{d.aniosServicioRecibo || "—"}</div>

          <div style={styles.kvLabel}>Destino (lugar de trabajo)</div>
          <div style={styles.kvValue}>{d.destinoActual || "—"}</div>

          <div style={styles.kvLabel}>Teléfono de contacto</div>
          <div style={styles.kvValue}>{d.telefonoActual || "—"}</div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Grupo conviviente / familiar</h3>
        {convivientes.length === 0 ? (
          <div style={styles.subtleText}>(sin datos)</div>
        ) : (
          <div style={styles.stack}>
            {convivientes.map((c: any, idx: number) => (
              <div key={idx} style={styles.itemCard}>
                <div style={{ color: "#fff", fontWeight: 700 }}>
                  <b>{idx + 1}.</b>{" "}
                  {[c.parentesco, c.apellido, c.nombre].filter(Boolean).join(" — ") || "(registro)"}
                </div>
                <div style={styles.itemMeta}>
                  {c.dni ? <>DNI: {c.dni} &nbsp; </> : null}
                  {c.edad ? <>Edad: {c.edad} &nbsp; </> : null}
                  {c.observaciones ? <>Obs: {c.observaciones}</> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Mascotas</h3>
        {mascotas.length === 0 ? (
          <div style={styles.subtleText}>(sin datos)</div>
        ) : (
          <div style={styles.stack}>
            {mascotas.map((m: any, idx: number) => (
              <div key={idx} style={styles.itemCard}>
                <div style={{ color: "#fff", fontWeight: 700 }}>
                  <b>{idx + 1}.</b> {[m.tipo, m.nombre].filter(Boolean).join(" — ") || "(registro)"}
                </div>
                {m.observaciones ? (
                  <div style={styles.itemMeta}>Obs: {m.observaciones}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
