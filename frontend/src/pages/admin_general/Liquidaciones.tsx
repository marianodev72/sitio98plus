import React, { useEffect, useMemo, useRef, useState } from "react";

type TipoLiq = "PRINCIPAL" | "DESCUENTOS" | "REINTEGROS";

type PreviewResp = {
  loteId: string;
  periodo: string;
  tipo: TipoLiq;
  estado: string;
  resumen?: {
    filas?: number;
    asignadas?: number;
    pendientes?: number;
    duplicadas?: number;
    invalidas?: number;
  };
  pendientesCount?: number;
};

type ConfirmarResp = {
  message: string;
  periodo: string;
  tipo: TipoLiq;
  asignadas: number;
  pendientes: number;
};

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  // fail-closed: mensaje genérico
  const isJson = (resp.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await resp.json().catch(() => ({})) : await resp.text().catch(() => "");

  if (!resp.ok) {
    const msg =
      (body && typeof body === "object" && (body.message || body.error)) ||
      (typeof body === "string" && body) ||
      "Error interno";
    throw new Error(String(msg));
  }

  return body as T;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function defaultPeriodoYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export default function LiquidacionesAdminGeneral() {
  const [periodo, setPeriodo] = useState<string>(defaultPeriodoYYYYMM());
  const [tipo, setTipo] = useState<TipoLiq>("PRINCIPAL");

  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [error, setError] = useState<string>("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const tituloTipo = useMemo(() => {
    if (tipo === "PRINCIPAL") return "LIQUIDACIÓN ALQUILERES Y ALOJAMIENTOS";
    if (tipo === "DESCUENTOS") return "DESCUENTOS PARTICULARES";
    return "REINTEGROS PARTICULARES";
  }, [tipo]);

  function resetMsg() {
    setError("");
  }

  function pedirArchivo() {
    resetMsg();
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.click();
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    resetMsg();
    const f = e.target.files?.[0];
    if (!f) return;

    setLoading(true);
    setPreview(null);

    try {
      const fd = new FormData();
      fd.append("file", f);

      const url = `/api/liquidaciones/${encodeURIComponent(periodo)}/${encodeURIComponent(tipo)}/preview`;
      const data = await apiFetch<PreviewResp>(url, {
        method: "POST",
        body: fd,
      });

      setPreview(data);
    } catch (err: any) {
      setError(err?.message || "Error interno");
    } finally {
      setLoading(false);
    }
  }

  async function confirmarEnvio() {
    resetMsg();
    if (!preview?.loteId) {
      setError("No hay vista previa para confirmar.");
      return;
    }

    const ok = window.confirm(
      `Confirmación final:\n\nSe enviará ${tituloTipo} ${periodo} a los usuarios.\n\n¿Confirmar ahora?`
    );
    if (!ok) return;

    setLoadingConfirm(true);
    try {
      const data = await apiFetch<ConfirmarResp>("/api/liquidaciones/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: preview.loteId }),
      });

      // refrescamos preview con estado ya confirmado (mínimo)
      setPreview((p) =>
        p
          ? {
              ...p,
              estado: "CONFIRMADA",
              resumen: {
                ...(p.resumen || {}),
                asignadas: data.asignadas,
                pendientes: data.pendientes,
              },
            }
          : p
      );
    } catch (err: any) {
      setError(err?.message || "Error interno");
    } finally {
      setLoadingConfirm(false);
    }
  }

  // UI simple, sin exponer nada sensible
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0 }}>Liquidaciones</h2>
      <p style={{ marginTop: 8, opacity: 0.9 }}>
        Carga mensual: vista previa → confirmación. (ADMIN_GENERAL)
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Período (YYYY-MM)</label>
          <input
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value.trim())}
            placeholder="2026-01"
            style={{ padding: "8px 10px", minWidth: 140 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8 }}>Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoLiq)}
            style={{ padding: "8px 10px", minWidth: 260 }}
          >
            <option value="PRINCIPAL">LIQUIDACIÓN ALQUILERES Y ALOJAMIENTOS</option>
            <option value="DESCUENTOS">DESCUENTOS PARTICULARES</option>
            <option value="REINTEGROS">REINTEGROS PARTICULARES</option>
          </select>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={pedirArchivo} disabled={loading || loadingConfirm} style={{ padding: "8px 12px" }}>
            Cargar CSV (vista previa)
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            onClick={confirmarEnvio}
            disabled={!preview?.loteId || loading || loadingConfirm}
            style={{ padding: "8px 12px" }}
          >
            {loadingConfirm ? "Confirmando…" : "Confirmar envío"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileSelected}
          style={{ display: "none" }}
        />
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #d33", borderRadius: 8 }}>
          <b>Alerta:</b> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 18, padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
          <b>{tituloTipo}</b>
          <span style={{ opacity: 0.85 }}>{periodo}</span>
          <span style={{ opacity: 0.7 }}>|</span>
          <span style={{ opacity: 0.85 }}>Estado: {preview?.estado || "—"}</span>
        </div>

        {loading ? <p style={{ marginTop: 10 }}>Procesando vista previa…</p> : null}

        {preview ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              <div>
                <b>LoteId:</b> {preview.loteId}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>Filas</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {preview.resumen?.filas ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>Asignadas</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {preview.resumen?.asignadas ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>Pendientes</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {preview.resumen?.pendientes ?? preview.pendientesCount ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>Duplicadas</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {preview.resumen?.duplicadas ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 8 }}>Inválidas</td>
                    <td style={{ padding: 8 }}>{preview.resumen?.invalidas ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
              Nota: si hay pendientes, luego los cargás por “cargas particulares” (lo hacemos en el siguiente paso de UI
              si querés).
            </p>
          </div>
        ) : (
          <p style={{ marginTop: 10, opacity: 0.85 }}>Todavía no hay vista previa.</p>
        )}
      </div>
    </div>
  );
}
