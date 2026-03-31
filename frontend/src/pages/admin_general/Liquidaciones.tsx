import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type TipoLiq = "PRINCIPAL" | "DESCUENTOS" | "REINTEGROS";

type PendientePreview = {
  mr?: string;
  apellidoNombre?: string;
  vivienda?: string;
  grado?: string;
  cod457?: number;
  cod411?: number;
  motivo?: string;
  fila?: number;
};

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
  pendientes?: PendientePreview[];
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
  const [qPendientes, setQPendientes] = useState("");
  const [filtroViviendaPendiente, setFiltroViviendaPendiente] = useState("");
  const [pendienteActivo, setPendienteActivo] = useState<PendientePreview | null>(null);
  const [mrCorregido, setMrCorregido] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const tituloTipo = useMemo(() => {
    if (tipo === "PRINCIPAL") return "LIQUIDACIÓN ALQUILERES Y ALOJAMIENTOS";
    if (tipo === "DESCUENTOS") return "DESCUENTOS PARTICULARES";
    return "REINTEGROS PARTICULARES";
  }, [tipo]);

const pendientesRows = useMemo(() => {
  return Array.isArray(preview?.pendientes) ? preview.pendientes : [];
}, [preview]);

const viviendasPendientes = useMemo(() => {
  const set = new Set<string>();
  pendientesRows.forEach((p) => {
    const v = String(p.vivienda || "").trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}, [pendientesRows]);

const pendientesFiltrados = useMemo(() => {
  const q = qPendientes.trim().toLowerCase();

  return pendientesRows.filter((p) => {
    if (filtroViviendaPendiente && String(p.vivienda || "") !== filtroViviendaPendiente) {
      return false;
    }

    if (!q) return true;

    const blob = [
      p.mr,
      p.apellidoNombre,
      p.vivienda,
      p.motivo,
      p.fila,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return blob.includes(q);
  });
}, [pendientesRows, qPendientes, filtroViviendaPendiente]);

function descargarPendientesCSV() {
  if (!pendientesRows.length) return;

  const lines = [
    ["MR", "APELLIDO Y NOMBRE", "VIVIENDA", "FILA", "MOTIVO"].join(";"),
    ...pendientesFiltrados.map((p) =>
      [
        String(p.mr || "").replaceAll(";", ","),
        String(p.apellidoNombre || "").replaceAll(";", ","),
        String(p.vivienda || "").replaceAll(";", ","),
        String(p.fila ?? ""),
        String(p.motivo || "").replaceAll(";", ","),
      ].join(";")
    ),
  ];

  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pendientes_${periodo}_${tipo.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
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
      setQPendientes("");
      setFiltroViviendaPendiente("");

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
      console.log("CONFIRMAR:", periodo, tipo, preview.loteId);
        const data = await apiFetch(`/api/liquidaciones/${periodo}/${tipo}/confirmar`, {
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

async function resolverPendiente() {
  resetMsg();

  if (!preview?.loteId || !pendienteActivo) {
    setError("No hay pendiente seleccionado.");
    return;
  }

  if (!mrCorregido.trim()) {
    setError(""); // limpiar
// podés agregar un estado de "success" si querés, o un toast
alert("Pendiente resuelto y liquidación creada");
    return;
  }

  setLoadingConfirm(true);
  try {
    const data = await apiFetch<{
      message: string;
      loteId: string;
      resumen: PreviewResp["resumen"];
      pendientes: PendientePreview[];
    }>("/api/liquidaciones/particulares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loteId: preview.loteId,
        mrOriginal: pendienteActivo.mr || "",
        mrCorregido: mrCorregido.trim(),
        fila: pendienteActivo.fila,
      }),
    });

    setPreview((curr) =>
      curr
        ? {
            ...curr,
            resumen: data.resumen || curr.resumen,
            pendientes: Array.isArray(data.pendientes) ? data.pendientes : curr.pendientes,
            pendientesCount: Array.isArray(data.pendientes) ? data.pendientes.length : curr.pendientesCount,
          }
        : curr
    );

    setPendienteActivo(null);
    setMrCorregido("");
  } catch (err: any) {
    setError(err?.message || "No fue posible resolver el pendiente.");
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

    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 18,
      }}
    >
      <Link
        to="/app/admin-general/liquidaciones-consulta"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          borderRadius: 8,
          textDecoration: "none",
          border: "1px solid #475569",
          background: "#1E293B",
          color: "#F8FAFC",
          fontWeight: 700,
        }}
      >
        Consultar liquidaciones enviadas
      </Link>
<Link
  to="/app/admin-general/liquidaciones-resumen"
  style={{
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    border: "1px solid #475569",
    background: "#334155",
    color: "#F8FAFC",
    fontWeight: 700,
  }}
>
  Ver resumen operativo
</Link>
    </div>

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

          {Array.isArray(preview.pendientes) && preview.pendientes.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  marginBottom: 12,
                  padding: "12px 14px",
                  border: "1px solid #d9a441",
                  borderRadius: 8,
                  background: "rgba(217,164,65,0.10)",
                }}
              >
                <b>Alerta operativa:</b> se detectaron <b>{preview.pendientes.length}</b> registros no vinculados.
                Requieren resolución manual o carga particular.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <input
                  value={qPendientes}
                  onChange={(e) => setQPendientes(e.target.value)}
                  placeholder="Buscar por MR, apellido y nombre, vivienda o motivo"
                  style={{ padding: "8px 10px", minWidth: 280 }}
                />

                <select
                  value={filtroViviendaPendiente}
                  onChange={(e) => setFiltroViviendaPendiente(e.target.value)}
                  style={{ padding: "8px 10px", minWidth: 180 }}
                >
                  <option value="">Todas las viviendas</option>
                  {viviendasPendientes.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                <button onClick={descargarPendientesCSV} style={{ padding: "8px 12px" }}>
                  Descargar pendientes (CSV)
                </button>
              </div>

              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                Pendientes detectados ({pendientesFiltrados.length}
                {pendientesFiltrados.length !== pendientesRows.length ? ` de ${pendientesRows.length}` : ""})
              </div>

              <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>MR</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Apellido y Nombre</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Vivienda</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Fila</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Motivo</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesFiltrados.map((p, idx) => (
                      <tr key={`${p.mr || "mr"}-${p.fila || idx}-${idx}`}>
                        <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>{p.mr || "—"}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>{p.apellidoNombre || "—"}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>{p.vivienda || "—"}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>{p.fila ?? "—"}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>{p.motivo || "—"}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                          <button
                            onClick={() => {
                              setPendienteActivo(p);
                              setMrCorregido(String(p.mr || ""));
                            }}
                            style={{ padding: "6px 10px" }}
                          >
                            Resolver
                          </button>
                        </td>
                      </tr>
                    ))}

                    {pendientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 10, opacity: 0.8 }}>
                          No hay pendientes para los filtros aplicados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            Nota: si hay pendientes, luego los cargás por “cargas particulares” (lo hacemos en el siguiente paso de UI
            si querés).
          </p>
        </div>
      ) : (
        <p style={{ marginTop: 10, opacity: 0.85 }}>Todavía no hay vista previa.</p>
      )}
    </div>

    {pendienteActivo ? (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "#0b1220",
            padding: 20,
            borderRadius: 10,
            width: 420,
            maxWidth: "92vw",
            border: "1px solid #2a3a5a",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Resolver pendiente</h3>

          <div style={{ marginBottom: 10 }}>
            <b>MR:</b> {pendienteActivo.mr || "—"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Apellido y Nombre:</b> {pendienteActivo.apellidoNombre || "—"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Vivienda:</b> {pendienteActivo.vivienda || "—"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Grado:</b> {pendienteActivo.grado || "—"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Cód. 457:</b> {pendienteActivo.cod457 ?? 0}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Cód. 411:</b> {pendienteActivo.cod411 ?? 0}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Fila:</b> {pendienteActivo.fila ?? "—"}
          </div>

          <div style={{ marginBottom: 14 }}>
            <b>Motivo:</b> {pendienteActivo.motivo || "—"}
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>MR corregido</label>
            <input
              value={mrCorregido}
              onChange={(e) => setMrCorregido(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", marginTop: 4 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button
              onClick={resolverPendiente}
              disabled={loadingConfirm}
              style={{ padding: "8px 12px" }}
            >
              {loadingConfirm ? "Resolviendo…" : "Resolver"}
            </button>

            <button
              onClick={() => {
                setPendienteActivo(null);
                setMrCorregido("");
              }}
              style={{ padding: "8px 12px" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    ) : null}
  </div>
);
}
