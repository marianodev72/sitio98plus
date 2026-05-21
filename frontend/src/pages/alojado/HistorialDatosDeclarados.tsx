import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";

type Item = {
  token: string;
  createdAt?: string | null;
  motivo?: string;
  resumen?: string;
  estado?: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("es-AR");
}

function fmt(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", color: "rgba(255,255,255,0.92)" } as React.CSSProperties,
  hero: {
    padding: 18,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(11,18,32,0.96) 100%)",
    marginBottom: 16,
  } as React.CSSProperties,
  title: { margin: 0, color: "#fff", fontSize: 28, fontWeight: 900 } as React.CSSProperties,
  subtitle: { marginTop: 8, color: "rgba(255,255,255,0.72)", lineHeight: 1.55 } as React.CSSProperties,
  row: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 } as React.CSSProperties,
  card: {
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
  } as React.CSSProperties,
  tableWrap: {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 14,
    overflowX: "auto",
    background: "rgba(255,255,255,0.05)",
  } as React.CSSProperties,
  table: { width: "100%", minWidth: 760, borderCollapse: "collapse" } as React.CSSProperties,
  th: {
    textAlign: "left",
    padding: 12,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.66)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  } as React.CSSProperties,
  td: { padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" } as React.CSSProperties,
  button: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  } as React.CSSProperties,
};

export default function HistorialDatosDeclaradosAlojado() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [openToken, setOpenToken] = useState("");
  const [detalle, setDetalle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        const res = await http.get("/alojamientos-mi/datos-declarados/historial?limit=100");
        if (alive) setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.message || "No se pudo cargar el historial.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function ver(token: string) {
    if (openToken === token) {
      setOpenToken("");
      setDetalle(null);
      return;
    }
    try {
      setOpenToken(token);
      setDetalle(null);
      setLoadingDetalle(true);
      const res = await http.get(`/alojamientos-mi/datos-declarados/historial/${token}`);
      setDetalle(res.data?.item || null);
    } catch (err: any) {
      setDetalle({ error: err?.response?.data?.message || "No se pudo cargar el detalle." });
    } finally {
      setLoadingDetalle(false);
    }
  }

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Historial de datos declarados</h1>
        <p style={styles.subtitle}>Registro auditable de actualizaciones propias del alojado.</p>
        <div style={styles.row}>
          <button type="button" style={styles.button} onClick={() => navigate("/app/alojado/datos")}>
            Volver
          </button>
          <button type="button" style={styles.button} onClick={() => navigate("/app/alojado/datos/actualizar")}>
            Actualizar
          </button>
        </div>
      </section>

      {loading ? <div style={styles.card}>Cargando...</div> : null}
      {error ? <div style={{ ...styles.card, color: "#fecaca" }}>{error}</div> : null}
      {!loading && !error && items.length === 0 ? <div style={styles.card}>Sin actualizaciones registradas.</div> : null}

      {!loading && !error && items.length > 0 ? (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Resumen</th>
                <th style={styles.th}>Motivo</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <>
                  <tr key={item.token}>
                    <td style={styles.td}>{fmtDate(item.createdAt)}</td>
                    <td style={styles.td}>{fmt(item.resumen)}</td>
                    <td style={styles.td}>{fmt(item.motivo)}</td>
                    <td style={styles.td}>{fmt(item.estado)}</td>
                    <td style={styles.td}>
                      <button type="button" style={styles.button} onClick={() => ver(item.token)}>
                        {openToken === item.token ? "Cerrar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                  {openToken === item.token ? (
                    <tr>
                      <td colSpan={5} style={styles.td}>
                        {loadingDetalle ? (
                          "Cargando detalle..."
                        ) : detalle?.error ? (
                          <span style={{ color: "#fecaca" }}>{detalle.error}</span>
                        ) : (
                          <Detalle item={detalle} />
                        )}
                      </td>
                    </tr>
                  ) : null}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Detalle({ item }: { item: any }) {
  const datos = item?.datos || {};
  const base = item?.base || {};
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <strong style={{ color: "#fff" }}>{fmt(item?.resumen)}</strong>
      <Snapshot title="Snapshot anterior" datos={base} />
      <Snapshot title="Snapshot declarado" datos={datos} />
    </div>
  );
}

function Snapshot({ title, datos }: { title: string; datos: any }) {
  const identidad = datos.identidad || {};
  const destino = datos.destino || {};
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <strong style={{ color: "#fff" }}>{title}</strong>
      <div>Apellido: {fmt(identidad.apellido)}</div>
      <div>Nombres: {fmt(identidad.nombres)}</div>
      <div>Genero: {fmt(identidad.genero)}</div>
      <div>Grado / escalafon: {fmt(identidad.gradoEscalafon)}</div>
      <div>Destino actual: {fmt(destino.actual)}</div>
      <div>Destino futuro: {fmt(destino.futuro)}</div>
    </div>
  );
}
