import React, { useEffect, useState } from "react";

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

export default function MisLiquidaciones() {
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
        const h = await apiGet<{ liquidaciones: Liquidacion[] }>(
          "/api/liquidaciones/mis"
        );

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
    <div style={{ padding: 24 }}>
      <h2>Mis liquidaciones</h2>

      {loading ? <p>Cargando información…</p> : null}

      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #d33", borderRadius: 8 }}>
          <b>Alerta:</b> {error}
        </div>
      ) : null}

      {/* ÚLTIMA */}
      <div style={{ marginTop: 16, padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>Última liquidación</h3>

        {!ultima ? (
          <p>No hay liquidaciones disponibles.</p>
        ) : (
          <>
            <p>
              <b>Período:</b> {ultima.periodo}
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f6f6f6" }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Concepto</th>
                  <th style={{ padding: 8, textAlign: "right" }}>Cod 457</th>
                  <th style={{ padding: 8, textAlign: "right" }}>Cod 411</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: 8 }}>Liquidación</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {n(ultima.principal?.cod457).toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {n(ultima.principal?.cod411).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: 8 }}>Reintegros</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {n(ultima.reintegros?.cod457).toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {n(ultima.reintegros?.cod411).toFixed(2)}
                  </td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ padding: 8 }}>Total</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {n(ultima.total?.cod457).toFixed(2)}{" "}
                    <span style={{ opacity: 0.7 }}>({ultima.total?.etiqueta457})</span>
                  </td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {n(ultima.total?.cod411).toFixed(2)}{" "}
                    <span style={{ opacity: 0.7 }}>({ultima.total?.etiqueta411})</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* HISTORIAL */}
      <div style={{ marginTop: 20, padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>Historial</h3>

        {historial.length === 0 ? (
          <p>No hay liquidaciones anteriores.</p>
        ) : (
          <ul>
            {historial.map((l) => (
              <li key={l._id}>
                {l.periodo} — Total 457: {n(l.total?.cod457).toFixed(2)}{" "}
                ({l.total?.etiqueta457})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
