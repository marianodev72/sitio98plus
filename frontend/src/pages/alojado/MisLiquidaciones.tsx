import { useEffect, useState } from "react";
import http from "../../api/http";

type Montos = {
  cod457?: number;
  cod411?: number;
};

type Total = Montos & {
  etiqueta457?: string;
  etiqueta411?: string;
};

type Liquidacion = {
  periodo: string;
  estado?: string;
  fecha?: string | null;
  conceptos?: {
    principal?: Montos;
    descuentosParticulares?: Montos;
    reintegrosParticulares?: Montos;
  };
  total?: Total;
};

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function money(value: unknown) {
  return n(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

function badgeStyle(tipo?: string) {
  const t = String(tipo || "").toUpperCase().trim();
  const base = {
    display: "inline-flex",
    justifyContent: "center",
    minWidth: 88,
    padding: "4px 9px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#ffffff",
  } as const;

  if (t === "REINTEGRO") return { ...base, background: "rgba(34,197,94,0.18)" };
  if (t === "DESCUENTO") return { ...base, background: "rgba(239,68,68,0.18)" };
  return { ...base, background: "rgba(255,255,255,0.08)" };
}

const sectionStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "clamp(14px, 2vw, 20px)",
} as const;

const tableWrapStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  overflow: "hidden",
  background: "rgba(255,255,255,0.04)",
} as const;

const thStyle = {
  padding: 12,
  textAlign: "left",
  color: "rgba(255,255,255,0.65)",
  fontSize: 11,
  textTransform: "uppercase",
  fontWeight: 900,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
} as const;

const tdStyle = {
  padding: 12,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.92)",
  verticalAlign: "middle",
} as const;

function ConceptosTable({ liquidacion }: { liquidacion: Liquidacion }) {
  const conceptos = liquidacion.conceptos || {};
  const total = liquidacion.total || {};

  return (
    <div style={tableWrapStyle}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 650, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Concepto</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cod 457</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Cod 411</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Liquidacion principal</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {money(conceptos.principal?.cod457)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {money(conceptos.principal?.cod411)}
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>Descuentos particulares</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {money(conceptos.descuentosParticulares?.cod457)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {money(conceptos.descuentosParticulares?.cod411)}
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>Reintegros particulares</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {money(conceptos.reintegrosParticulares?.cod457)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                {money(conceptos.reintegrosParticulares?.cod411)}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 900 }}>Total</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 900 }}>
                {money(total.cod457)} <span style={badgeStyle(total.etiqueta457)}>{fmt(total.etiqueta457)}</span>
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 900 }}>
                {money(total.cod411)} <span style={badgeStyle(total.etiqueta411)}>{fmt(total.etiqueta411)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MisLiquidacionesAlojado() {
  const [ultima, setUltima] = useState<Liquidacion | null>(null);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const [ultimaRes, historialRes] = await Promise.all([
          http.get("/alojamientos-mi/liquidaciones/ultima"),
          http.get("/alojamientos-mi/liquidaciones"),
        ]);
        if (!alive) return;
        setUltima(ultimaRes.data?.liquidacion || null);
        setLiquidaciones(Array.isArray(historialRes.data?.liquidaciones) ? historialRes.data.liquidaciones : []);
      } catch (err: any) {
        if (!alive) return;
        setUltima(null);
        setLiquidaciones([]);
        setError(err?.response?.data?.message || "No se pudieron obtener las liquidaciones.");
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
          Mis liquidaciones
        </h1>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", lineHeight: 1.6 }}>
          Consulta readonly de liquidaciones propias disponibles.
        </p>
      </section>

      {loading ? (
        <section style={sectionStyle}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>Consultando liquidaciones...</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section style={{ ...sectionStyle, borderColor: "rgba(248,113,113,0.45)" }}>
          <p style={{ margin: 0, color: "#fecaca", fontWeight: 800 }}>{error}</p>
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>Ultima liquidacion</h2>
            {!ultima ? (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
                No hay liquidaciones disponibles.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <strong style={{ color: "#ffffff" }}>Periodo {fmt(ultima.periodo)}</strong>
                  <span style={badgeStyle(ultima.estado)}>{fmt(ultima.estado)}</span>
                  <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>
                    Actualizado: {fmtDate(ultima.fecha)}
                  </span>
                </div>
                <ConceptosTable liquidacion={ultima} />
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <h2 style={{ margin: "0 0 12px", color: "#ffffff", fontSize: 18 }}>Historial</h2>
            {liquidaciones.length === 0 ? (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.76)" }}>
                No hay liquidaciones registradas.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {liquidaciones.map((item) => (
                  <div
                    key={`${item.periodo}-${item.fecha || ""}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(255,255,255,0.045)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <strong style={{ color: "#ffffff" }}>Periodo {fmt(item.periodo)}</strong>
                      <span style={badgeStyle(item.estado)}>{fmt(item.estado)}</span>
                      <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>
                        Actualizado: {fmtDate(item.fecha)}
                      </span>
                    </div>
                    <ConceptosTable liquidacion={item} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
