// frontend/src/pages/permisionario/MisServicios.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";

type Servicio = {
  _id: string;
  viviendaCodigo: string;
  periodo: string;
  alertaActiva: boolean;
  leidoPorUsuario: boolean;
  fechaLectura?: string;
};

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

  card: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
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
    verticalAlign: "top" as const,
    color: "rgba(255,255,255,0.92)",
  } as React.CSSProperties,

  strongCell: {
    color: "#fff",
    fontWeight: 800,
  } as React.CSSProperties,

  subtleText: {
    color: "rgba(255,255,255,0.74)",
    lineHeight: 1.45,
  } as React.CSSProperties,

  statusBadge: (pending: boolean): React.CSSProperties => ({
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
    background: pending ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.18)",
  }),

  buttonRow: {
    display: "flex",
    gap: 8,
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
};

export default function MisServicios() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await http.get("/servicios/mis-servicios");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function abrirServicio(id: string) {
    try {
      await http.patch(`/servicios/${id}/marcar-leido`);
      window.open(`/api/servicios/${id}/pdf`, "_blank", "noopener");
      cargar();
    } catch {
      setError(true);
    }
  }

  function descargarServicio(id: string) {
    window.open(`/api/servicios/${id}/pdf`, "_blank", "noopener");
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h2 style={styles.title}>Mis Servicios</h2>
        <div style={styles.subtitle}>
          Consultá los servicios disponibles para tu vivienda, visualizá su estado y accedé al PDF
          correspondiente.
        </div>
      </div>

      {loading ? <div style={styles.emptyState}>Cargando…</div> : null}

      {!loading && error ? (
        <div style={styles.alertError}>
          No es posible procesar su solicitud, contáctese con el Administrador
        </div>
      ) : null}

      {!loading && !error && !items.length ? (
        <div style={styles.emptyState}>No hay servicios para mostrar.</div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <section style={styles.card}>
          <div style={{ ...styles.buttonRow, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => navigate("/app/permisionario")}
              style={styles.secondaryButton}
            >
              Volver
            </button>
            <button type="button" onClick={cargar} style={styles.primaryButton}>
              Recargar
            </button>
          </div>

          <div style={styles.tableWrap}>
            <div style={styles.tableScroller}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Vivienda</th>
                    <th style={styles.th}>Período</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s._id}>
                      <td style={{ ...styles.td, ...styles.strongCell }}>{s.viviendaCodigo}</td>
                      <td style={{ ...styles.td, ...styles.subtleText }}>{s.periodo}</td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge(!!s.alertaActiva)}>
                          {s.alertaActiva ? "Pendiente" : "Leído"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.buttonRow}>
                          <button
                            type="button"
                            onClick={() => abrirServicio(s._id)}
                            style={styles.smallButton}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => descargarServicio(s._id)}
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
        </section>
      ) : null}
    </div>
  );
}