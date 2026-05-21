import { useEffect, useState } from "react";
import http from "../../api/http";

type Novedad = {
  codigoDocumento?: string;
  estado?: string;
  fecha?: string | null;
  novedadesTexto?: string;
};

function fmt(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fmt(value);
  return date.toLocaleDateString("es-AR");
}

const sectionStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "clamp(14px, 2vw, 20px)",
} as const;

const badgeStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "4px 10px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 800,
} as const;

export default function NovedadesAlojado() {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await http.get("/alojamientos-mi/novedades");
        if (!alive) return;
        setNovedades(Array.isArray(res.data?.novedades) ? res.data.novedades : []);
      } catch (err: any) {
        if (!alive) return;
        setNovedades([]);
        setError(err?.response?.data?.message || "No se pudieron obtener las novedades.");
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
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
      <section style={sectionStyle}>
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>
          Panel ALOJADO
        </p>
        <h1 style={{ margin: 0, color: "#ffffff", fontSize: "clamp(24px, 3vw, 34px)" }}>
          Novedades
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
          Consulta readonly de novedades documentales registradas en ANEXO_23.
        </p>
      </section>

      {loading ? (
        <section style={sectionStyle}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando novedades...</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section style={{ ...sectionStyle, borderColor: "rgba(248,113,113,0.45)" }}>
          <p style={{ margin: 0, color: "#fecaca", fontWeight: 800 }}>{error}</p>
        </section>
      ) : null}

      {!loading && !error ? (
        <section style={sectionStyle}>
          {novedades.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
              No hay novedades registradas.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {novedades.map((item, index) => (
                <article
                  key={`${item.codigoDocumento || "ANEXO_23"}-${item.fecha || index}`}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: 14,
                    background: "rgba(255,255,255,0.045)",
                    display: "grid",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <strong style={{ color: "#ffffff" }}>{fmt(item.codigoDocumento)}</strong>
                    <span style={badgeStyle}>{fmt(item.estado)}</span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: 800 }}>
                    Fecha: {fmtDate(item.fecha)}
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.88)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {fmt(item.novedadesTexto)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
