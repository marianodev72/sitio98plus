import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { http } from "../../api/http";
import {
  badgeStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type JobEstado = "PENDIENTE_CONFIRMACION" | "CANCELADO" | "APLICADO" | "FALLIDO" | string;

type JobListItem = {
  jobId: string;
  tipo?: string;
  estado?: JobEstado;
  archivoOriginalNombre?: string;
  warningsCount?: number;
  erroresCount?: number;
  resumen?: Record<string, unknown>;
  appliedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type JobDetail = JobListItem & {
  resumen?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  applyPlanSummary?: Record<string, unknown> | null;
  manualApprovals?: ManualApproval[];
  applyResult?: ApplyResult | null;
  appliedBy?: string | null;
  warnings?: unknown[];
  errores?: unknown[];
};

type ManualApproval = {
  tipo?: string;
  key?: string;
  motivo?: string;
  approved?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
};

type ApplyResult = {
  createsApplied?: number;
  updatesApplied?: number;
  skipped?: number;
  blocked?: number;
  errors?: unknown[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function safe(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function countValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function estadoTone(estado?: string): CSSProperties {
  const e = String(estado || "").toUpperCase().trim();
  if (e === "APLICADO") return { borderColor: "rgba(34,197,94,0.34)", color: "#bbf7d0" };
  if (e === "FALLIDO") return { borderColor: "rgba(248,113,113,0.36)", color: "#fecaca" };
  if (e === "CANCELADO") return { borderColor: "rgba(148,163,184,0.32)", color: "#e5e7eb" };
  return { borderColor: "rgba(251,191,36,0.36)", color: "#fde68a" };
}

function compactJson(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) {
    return "Sin datos";
  }
  return JSON.stringify(value, null, 2);
}

const controlStyle: CSSProperties = {
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  boxSizing: "border-box",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
};

const thStyle: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 12,
  color: "rgba(255,255,255,0.64)",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
  verticalAlign: "top",
};

const preStyle: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
  lineHeight: 1.5,
};

export default function BasesMaestras() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  async function cargarJobs() {
    setLoadingJobs(true);
    setErrorMsg("");
    try {
      const params: Record<string, string | number> = { page: 1, limit: 50 };
      if (tipo) params.tipo = tipo;
      if (estado) params.estado = estado;
      const res = await http.get("/admin/bases-maestras/jobs", { params });
      const items = Array.isArray(res.data?.items) ? (res.data.items as JobListItem[]) : [];
      setJobs(items);
      if (selectedJobId && !items.some((job) => job.jobId === selectedJobId)) {
        setSelectedJobId("");
        setDetail(null);
      }
    } catch {
      setJobs([]);
      setDetail(null);
      setErrorMsg("La pagina solicitada no esta disponible. Por favor, contacte al administrador.");
    } finally {
      setLoadingJobs(false);
    }
  }

  async function cargarDetalle(jobId: string) {
    setSelectedJobId(jobId);
    setLoadingDetail(true);
    setErrorMsg("");
    try {
      const res = await http.get(`/admin/bases-maestras/jobs/${encodeURIComponent(jobId)}`);
      setDetail(res.data?.job || null);
    } catch {
      setDetail(null);
      setErrorMsg("No se pudo consultar el detalle del job. Por favor, contacte al administrador.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function limpiarFiltros() {
    setTipo("");
    setEstado("");
    setTimeout(() => {
      cargarJobs();
    }, 0);
  }

  useEffect(() => {
    cargarJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = detail?.resumen || selectedJob?.resumen || {};
  const manualApprovals = Array.isArray(detail?.manualApprovals) ? detail.manualApprovals : [];
  const applyResult = detail?.applyResult || null;

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Bases maestras</h1>
          <p style={subtitleStyle}>
            Carga, validacion y aplicacion controlada de bases institucionales.
          </p>
        </div>

        {errorMsg ? (
          <div
            style={{
              ...softCardStyle,
              marginBottom: 16,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(127,29,29,0.18)",
              color: "#fecaca",
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ ...titleStyle, fontSize: 22 }}>Jobs de importacion</h2>
              <p style={subtitleStyle}>Historial operativo de dry-runs y applies registrados.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={controlStyle}>
                <option value="" style={optionStyle}>Todos los tipos</option>
                <option value="PERSONAL" style={optionStyle}>Personal</option>
                <option value="VIVIENDAS" style={optionStyle}>Viviendas</option>
              </select>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={controlStyle}>
                <option value="" style={optionStyle}>Todos los estados</option>
                <option value="PENDIENTE_CONFIRMACION" style={optionStyle}>Pendiente</option>
                <option value="APLICADO" style={optionStyle}>Aplicado</option>
                <option value="CANCELADO" style={optionStyle}>Cancelado</option>
                <option value="FALLIDO" style={optionStyle}>Fallido</option>
              </select>
              <button type="button" style={primaryButtonStyle} onClick={cargarJobs} disabled={loadingJobs}>
                {loadingJobs ? "Cargando..." : "Actualizar"}
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={limpiarFiltros} disabled={loadingJobs}>
                Limpiar
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Archivo</th>
                  <th style={thStyle}>Warnings</th>
                  <th style={thStyle}>Errores</th>
                  <th style={thStyle}>Aplicado</th>
                  <th style={thStyle}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {loadingJobs ? (
                  <tr>
                    <td style={tdStyle} colSpan={8}>Cargando jobs...</td>
                  </tr>
                ) : null}
                {!loadingJobs && jobs.length === 0 ? (
                  <tr>
                    <td style={tdStyle} colSpan={8}>Sin jobs para mostrar.</td>
                  </tr>
                ) : null}
                {!loadingJobs && jobs.map((job) => (
                  <tr key={job.jobId}>
                    <td style={tdStyle}>{formatDate(job.createdAt)}</td>
                    <td style={tdStyle}>{safe(job.tipo)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...badgeStyle, ...estadoTone(job.estado) }}>{safe(job.estado)}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>{safe(job.archivoOriginalNombre)}</td>
                    <td style={tdStyle}>{countValue(job.warningsCount)}</td>
                    <td style={tdStyle}>{countValue(job.erroresCount)}</td>
                    <td style={tdStyle}>{formatDate(job.appliedAt)}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={{ ...secondaryButtonStyle, padding: "7px 10px" }}
                        onClick={() => cargarDetalle(job.jobId)}
                        disabled={loadingDetail && selectedJobId === job.jobId}
                      >
                        {loadingDetail && selectedJobId === job.jobId ? "Cargando..." : "Ver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ ...titleStyle, fontSize: 22 }}>Detalle readonly</h2>
              <p style={subtitleStyle}>
                {detail ? `Job ${detail.jobId}` : "Seleccione un job para consultar su preview persistido."}
              </p>
            </div>
            {detail?.estado ? (
              <span style={{ ...badgeStyle, ...estadoTone(detail.estado), alignSelf: "flex-start" }}>
                {detail.estado}
              </span>
            ) : null}
          </div>

          {!detail && !loadingDetail ? (
            <div style={{ ...softCardStyle, marginTop: 16, color: "rgba(255,255,255,0.78)" }}>
              No hay detalle seleccionado.
            </div>
          ) : null}

          {loadingDetail ? (
            <div style={{ ...softCardStyle, marginTop: 16, color: "rgba(255,255,255,0.78)" }}>
              Cargando detalle...
            </div>
          ) : null}

          {detail ? (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              <section style={softCardStyle}>
                <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Resumen</h3>
                <pre style={preStyle}>{compactJson(summary)}</pre>
              </section>

              <section style={softCardStyle}>
                <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Apply plan</h3>
                <pre style={preStyle}>{compactJson(detail.applyPlanSummary)}</pre>
              </section>

              <section style={softCardStyle}>
                <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Aprobaciones manuales</h3>
                {manualApprovals.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {manualApprovals.map((approval, index) => (
                      <div key={`${approval.tipo}-${approval.key}-${index}`} style={{ ...softCardStyle, padding: 10 }}>
                        <div style={{ fontWeight: 800, color: "#ffffff" }}>{safe(approval.tipo)}</div>
                        <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12 }}>Key: {safe(approval.key)}</div>
                        <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12 }}>
                          Motivo: {safe(approval.motivo)}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>
                          {formatDate(approval.approvedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13 }}>Sin aprobaciones registradas.</div>
                )}
              </section>

              <section style={softCardStyle}>
                <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Apply result</h3>
                {applyResult ? (
                  <pre style={preStyle}>{compactJson(applyResult)}</pre>
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13 }}>Sin resultado de apply.</div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
