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

type ImportTipo = "PERSONAL" | "VIVIENDAS" | "ALOJAMIENTOS";
type ModoCarga = "TOTAL" | "PARCIAL" | "ACTUALIZACION" | "ALTA_EXCEPCIONAL";
type JobEstado = "PENDIENTE_CONFIRMACION" | "CANCELADO" | "APLICADO" | "FALLIDO" | string;

type JobListItem = {
  jobId: string;
  tipo?: string;
  modoCarga?: ModoCarga | "SIN_MODO" | string;
  modoCargaLegacy?: boolean;
  estado?: JobEstado;
  archivoOriginalNombre?: string;
  warningsCount?: number;
  erroresCount?: number;
  resumen?: Record<string, unknown>;
  appliedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ManualApproval = {
  tipo?: string;
  key?: string;
  motivo?: string;
  approved?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
};

type JobExclusion = {
  tipo?: string;
  code?: string;
  key?: string;
  rowIndex?: number | null;
  matricula?: string;
  dni?: string;
  userId?: string;
  motivo?: string;
  createdBy?: string | null;
  createdAt?: string | null;
  revokedAt?: string | null;
};

type ApplyPlanItem = {
  tipo?: string;
  code?: string;
  key?: string;
  message?: string;
  campo?: string;
  action?: string;
  collection?: string;
  reason?: string;
  field?: string;
  rowIndex?: number | null;
  matricula?: string;
  dni?: string;
  nombre?: string;
  nombreApellido?: string;
  userId?: string;
  flags?: Record<string, unknown>;
  changes?: unknown[];
  preview?: unknown;
  excluded?: boolean;
  exclusion?: JobExclusion;
  grouped?: boolean;
  count?: number;
};

type ApplyPlan = {
  creates?: unknown[];
  updates?: unknown[];
  blocked?: ApplyPlanItem[];
  excluded?: ApplyPlanItem[];
  risks?: ApplyPlanItem[];
  warnings?: unknown[];
  requiresManualReview?: ApplyPlanItem[];
  isLargePlan?: boolean;
  detailsTruncated?: boolean;
  sampleCreates?: unknown[];
  sampleUpdates?: unknown[];
};

type ApplyResult = {
  createsApplied?: number;
  updatesApplied?: number;
  skipped?: number;
  blocked?: number;
  errors?: unknown[];
};

type JobDetail = JobListItem & {
  resumen?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  applyPlan?: ApplyPlan | null;
  applyPlanSummary?: Record<string, unknown> | null;
  manualApprovals?: ManualApproval[];
  exclusions?: JobExclusion[];
  applyResult?: ApplyResult | null;
  appliedBy?: string | null;
  warnings?: unknown[];
  errores?: unknown[];
};

type DryRunResult = {
  ok?: boolean;
  jobId?: string;
  modoCarga?: ModoCarga | string;
  resumen?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  warnings?: unknown[];
  errores?: unknown[];
};

const MAX_ITEMS = 40;
const EXCLUDABLE_PERSONAL_BLOCK_CODES = new Set(["USUARIO_ARCHIVADO_EN_IMPORTACION_PERSONAL"]);
// Fase 1: TOTAL en PERSONAL queda identificado para futura conciliacion de nomina vigente.
const MODOS_CARGA: ModoCarga[] = ["TOTAL", "PARCIAL", "ACTUALIZACION", "ALTA_EXCEPCIONAL"];

function modoCargaLabel(value?: string) {
  const modo = String(value || "").toUpperCase().trim();
  if (modo === "TOTAL") return "Total";
  if (modo === "PARCIAL") return "Parcial";
  if (modo === "ACTUALIZACION") return "Actualizacion";
  if (modo === "ALTA_EXCEPCIONAL") return "Alta excepcional";
  return "Sin modo";
}

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

function arr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function countValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberFromSummary(summary: Record<string, unknown>, key: string) {
  const value = summary[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function approvalToken(item: { tipo?: string; key?: string }) {
  return `${safe(item.tipo, "").toUpperCase()}::${safe(item.key, "")}`;
}

function blockCode(item: ApplyPlanItem) {
  return safe(item.code || item.reason || item.tipo, "").toUpperCase();
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

function groupByTipo(items: ApplyPlanItem[]) {
  const grouped: Record<string, ApplyPlanItem[]> = {};
  for (const item of items) {
    const tipo = safe(item.tipo || item.reason || item.action, "OTRO");
    grouped[tipo] = grouped[tipo] || [];
    grouped[tipo].push(item);
  }
  return grouped;
}

function warningTipo(item: unknown) {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    return safe(record.tipo || record.reason || record.action, "OTRO");
  }
  return "OTRO";
}

function groupWarnings(items: unknown[]) {
  const grouped: Record<string, unknown[]> = {};
  for (const item of items) {
    const tipo = warningTipo(item);
    grouped[tipo] = grouped[tipo] || [];
    grouped[tipo].push(item);
  }
  return grouped;
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
  overflowWrap: "anywhere",
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
  lineHeight: 1.5,
};

const wrapTextStyle: CSSProperties = {
  minWidth: 0,
  maxWidth: "100%",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  whiteSpace: "normal",
};

const applyPlanSectionStyle: CSSProperties = {
  ...softCardStyle,
  minWidth: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const applyPlanListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  minWidth: 0,
  maxHeight: 420,
  overflowY: "auto",
  paddingRight: 4,
};

const applyPlanItemStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.035)",
  padding: 10,
  minWidth: 0,
  display: "grid",
  gap: 8,
  ...wrapTextStyle,
};

const smallLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  color: "rgba(255,255,255,0.66)",
};

const dangerButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(251,191,36,0.42)",
  background: "rgba(180,83,9,0.28)",
  color: "#fef3c7",
  fontWeight: 800,
  cursor: "pointer",
  maxWidth: "100%",
};

export default function BasesMaestras() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<ImportTipo>("PERSONAL");
  const [nuevoModoCarga, setNuevoModoCarga] = useState<ModoCarga | "">("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [submittingDryRun, setSubmittingDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [approvingToken, setApprovingToken] = useState("");
  const [applying, setApplying] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const manualApprovals = useMemo(
    () => (Array.isArray(detail?.manualApprovals) ? detail.manualApprovals : []),
    [detail?.manualApprovals]
  );

  const approvedTokens = useMemo(() => {
    const tokens = new Set<string>();
    manualApprovals.forEach((approval) => {
      if (approval.approved) tokens.add(approvalToken(approval));
    });
    return tokens;
  }, [manualApprovals]);

  const applyPlan = detail?.applyPlan || null;
  const risks = arr(applyPlan?.risks);
  const manualReview = arr(applyPlan?.requiresManualReview);
  const blocked = arr(applyPlan?.blocked);
  const excluded = arr(applyPlan?.excluded);
  const sampleCreates = arr(applyPlan?.sampleCreates || applyPlan?.creates);
  const sampleUpdates = arr(applyPlan?.sampleUpdates || applyPlan?.updates);
  const isLargePlan = Boolean(applyPlan?.isLargePlan || detail?.applyPlanSummary?.isLargePlan);
  const unapprovedRisks = risks.filter((item) => !approvedTokens.has(approvalToken(item)));
  const unapprovedManualReview = manualReview.filter((item) => !approvedTokens.has(approvalToken(item)));
  const errores = arr(detail?.errores);
  const applyResult = detail?.applyResult || null;
  const summary = detail?.resumen || selectedJob?.resumen || {};
  const isAlojamientosJob = safe(detail?.tipo, "").toUpperCase() === "ALOJAMIENTOS";
  const alojamientoClasificaciones = isAlojamientosJob ? (applyPlan as any)?.clasificaciones || null : null;
  const modoCargaActual = safe(detail?.modoCarga || selectedJob?.modoCarga, "SIN_MODO");
  const modoCargaLegacy = Boolean(detail?.modoCargaLegacy || selectedJob?.modoCargaLegacy || modoCargaActual === "SIN_MODO");
  const approvedCount = manualApprovals.filter((approval) => approval.approved).length;
  const createsCount = countValue(detail?.applyPlanSummary?.createsCount);
  const updatesCount = countValue(detail?.applyPlanSummary?.updatesCount);
  const applyBlockReasons = [
    !detail ? "Seleccione un job." : "",
    detail && detail.estado !== "PENDIENTE_CONFIRMACION" ? `Estado incompatible: ${safe(detail.estado)}` : "",
    modoCargaLegacy ? "Job historico sin modo de carga explicito. Requiere nuevo dry-run con modoCarga." : "",
    detail && !applyPlan ? "Falta generar o consultar el apply-plan." : "",
    errores.length > 0 ? `Errores de dry-run pendientes: ${errores.length}` : "",
    blocked.length > 0 ? `Bloqueos no aprobables: ${blocked.length}` : "",
    unapprovedRisks.length > 0 ? `Riesgos sin aprobar: ${unapprovedRisks.length}` : "",
    unapprovedManualReview.length > 0 ? `Revisiones manuales sin aprobar: ${unapprovedManualReview.length}` : "",
  ].filter(Boolean);
  const canApply =
    Boolean(detail) &&
    detail?.estado === "PENDIENTE_CONFIRMACION" &&
    !modoCargaLegacy &&
    errores.length === 0 &&
    blocked.length === 0 &&
    unapprovedRisks.length === 0 &&
    unapprovedManualReview.length === 0 &&
    Boolean(applyPlan);

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

  async function cargarApplyPlan() {
    if (!detail?.jobId) return;
    setLoadingPlan(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const res = await http.get(`/admin/bases-maestras/jobs/${encodeURIComponent(detail.jobId)}/apply-plan`);
      setDetail((curr) =>
        curr
          ? {
              ...curr,
              applyPlan: res.data?.applyPlan || null,
              applyPlanSummary: res.data?.applyPlanSummary || null,
            }
          : curr
      );
      setInfoMsg(res.data?.generated ? "Plan de apply generado y congelado." : "Plan de apply consultado.");
      await cargarDetalle(detail.jobId);
    } catch {
      setErrorMsg("No se pudo consultar el plan de apply. Por favor, contacte al administrador.");
    } finally {
      setLoadingPlan(false);
    }
  }

  async function ejecutarDryRun() {
    if (!archivo) {
      setErrorMsg("Debe seleccionar un archivo .xlsx.");
      return;
    }
    if (!nuevoModoCarga || !MODOS_CARGA.includes(nuevoModoCarga as ModoCarga)) {
      setErrorMsg("Debe seleccionar un modo de carga.");
      return;
    }
    if (!archivo.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMsg("Solo se aceptan archivos .xlsx.");
      return;
    }
    setSubmittingDryRun(true);
    setErrorMsg("");
    setInfoMsg("");
    setDryRunResult(null);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      form.append("modoCarga", nuevoModoCarga);
      const path =
        nuevoTipo === "PERSONAL"
          ? "personal"
          : nuevoTipo === "VIVIENDAS"
          ? "viviendas"
          : "alojamientos";
      const res = await http.post(`/admin/bases-maestras/${path}/dry-run`, form);
      const result = res.data as DryRunResult;
      setDryRunResult(result);
      setInfoMsg("Dry-run generado y persistido como job auditable.");
      await cargarJobs();
      if (result.jobId) await cargarDetalle(result.jobId);
    } catch (err: any) {
      const message = err?.response?.data?.errores?.[0]?.message || "No se pudo procesar el dry-run. Por favor, contacte al administrador.";
      setErrorMsg(message);
    } finally {
      setSubmittingDryRun(false);
    }
  }

  async function aprobarItem(item: ApplyPlanItem) {
    if (!detail?.jobId || !item.tipo || !item.key) {
      setErrorMsg("El riesgo seleccionado no tiene tipo/key aprobable.");
      return;
    }
    const esAgrupado = item.grouped || item.key === "*";
    const motivo = window.prompt(
      `${esAgrupado ? "APROBACION MANUAL AGRUPADA" : "APROBACION MANUAL INDIVIDUAL"}\n\nTipo: ${safe(item.tipo)}\nKey: ${safe(item.key)}${
        esAgrupado ? `\nCantidad: ${safe(item.count)}` : ""
      }\n\nIngrese el motivo institucional documentado:`,
      ""
    );
    if (motivo === null) return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setErrorMsg("El motivo es obligatorio para aprobar un riesgo.");
      return;
    }
    const ok = window.confirm(
      `CONFIRMACION DE APROBACION MANUAL\n\nTipo: ${safe(item.tipo)}\nKey: ${safe(item.key)}\nMotivo: ${motivoLimpio}\n\nLa aprobacion ${
        esAgrupado ? "agrupada" : "individual"
      } queda auditada y descuenta ${esAgrupado ? "este tipo de riesgo/revision manual del plan masivo" : "este riesgo/revision manual"} para el apply.\n\nDesea continuar?`
    );
    if (!ok) return;

    const token = approvalToken(item);
    setApprovingToken(token);
    setErrorMsg("");
    setInfoMsg("");
    try {
      await http.post(`/admin/bases-maestras/jobs/${encodeURIComponent(detail.jobId)}/manual-approval`, {
        tipo: item.tipo,
        key: item.key,
        motivo: motivoLimpio,
      });
      setInfoMsg("Aprobacion manual registrada.");
      await cargarDetalle(detail.jobId);
    } catch (err: any) {
      const message = err?.response?.data?.errores?.[0]?.message || "No se pudo registrar la aprobacion manual. Por favor, contacte al administrador.";
      setErrorMsg(message);
    } finally {
      setApprovingToken("");
    }
  }

  async function excluirItem(item: ApplyPlanItem) {
    if (!detail?.jobId || !item.key) {
      setErrorMsg("El bloqueo seleccionado no tiene key excluible.");
      return;
    }
    const code = blockCode(item);
    if (!EXCLUDABLE_PERSONAL_BLOCK_CODES.has(code)) {
      setErrorMsg("Este bloqueo no es excluible del apply.");
      return;
    }

    const motivo = window.prompt(
      `EXCLUIR DEL APPLY MASIVO\n\nCodigo: ${safe(code)}\nKey: ${safe(item.key)}\nMatricula: ${safe(item.matricula)}\nDNI: ${safe(item.dni)}\nNombre: ${safe(item.nombreApellido || item.nombre)}\n\nIngrese el motivo institucional documentado:`,
      ""
    );
    if (motivo === null) return;
    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 10) {
      setErrorMsg("El motivo de exclusion debe tener al menos 10 caracteres.");
      return;
    }
    const ok = window.confirm(
      `CONFIRMACION DE EXCLUSION\n\nCodigo: ${safe(code)}\nKey: ${safe(item.key)}\nMotivo: ${motivoLimpio}\n\nLa fila sera omitida del apply masivo. No se modificara ni reactivara el usuario archivado.\n\nDesea continuar?`
    );
    if (!ok) return;

    setApprovingToken(`EXCLUDE::${code}::${item.key}`);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const res = await http.post(`/admin/bases-maestras/jobs/${encodeURIComponent(detail.jobId)}/exclusions`, {
        tipo: code,
        code,
        key: item.key,
        motivo: motivoLimpio,
      });
      setInfoMsg("Exclusion registrada. La fila no sera aplicada en el apply masivo.");
      if (res.data?.job) setDetail(res.data.job);
      else await cargarDetalle(detail.jobId);
    } catch (err: any) {
      const message = err?.response?.data?.errores?.[0]?.message || "No se pudo registrar la exclusion.";
      setErrorMsg(message);
    } finally {
      setApprovingToken("");
    }
  }

  async function ejecutarApply() {
    if (!detail?.jobId || !canApply) return;
    const ok = window.confirm(
      `APPLY CONTROLADO TRANSACCIONAL\n\nTipo: ${safe(detail.tipo)}\nModo: ${modoCargaLabel(modoCargaActual)}\nArchivo: ${safe(detail.archivoOriginalNombre)}\nCreates: ${createsCount}\nUpdates: ${updatesCount}\nRiesgos aprobados: ${approvedCount}\nBlocked pendientes: ${blocked.length}\nRiesgos sin aprobar: ${unapprovedRisks.length}\nRevision manual sin aprobar: ${unapprovedManualReview.length}\nErrores: ${errores.length}\n\nLa operacion se ejecutara en transaccion, quedara auditada y no debe usarse para applies masivos sin revision previa.\n\nDesea continuar?`
    );
    if (!ok) return;

    setApplying(true);
    setErrorMsg("");
    setInfoMsg("");
    try {
      const res = await http.post(`/admin/bases-maestras/jobs/${encodeURIComponent(detail.jobId)}/apply`);
      const nextEstado = res.data?.estado || "APLICADO";
      setInfoMsg(nextEstado === "APLICANDO" ? "Apply masivo iniciado. Consulte el detalle para ver el estado." : "Apply ejecutado correctamente.");
      setDetail((curr) =>
        curr
          ? {
              ...curr,
              estado: nextEstado,
              applyResult: res.data?.applyResult || null,
            }
          : curr
      );
      await cargarJobs();
      await cargarDetalle(detail.jobId);
    } catch (err: any) {
      const result = err?.response?.data?.applyResult || null;
      if (result) setDetail((curr) => (curr ? { ...curr, applyResult: result } : curr));
      setErrorMsg("El apply fue bloqueado o no pudo ejecutarse. Revise riesgos, bloqueos y estado del job.");
    } finally {
      setApplying(false);
    }
  }

  function limpiarFiltros() {
    setTipo("");
    setEstado("");
    setTimeout(() => {
      cargarJobs();
    }, 0);
  }

  function renderApplyPlanItems(title: string, items: ApplyPlanItem[], allowApprove: boolean, allowExclude = false) {
    const grouped = groupByTipo(items);
    const entries = Object.entries(grouped);
    if (!entries.length) {
      return (
        <section style={applyPlanSectionStyle}>
          <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>{title}</h3>
          <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13 }}>Sin registros.</div>
        </section>
      );
    }

    return (
      <section style={applyPlanSectionStyle}>
        <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>{title}</h3>
        <div style={applyPlanListStyle}>
          {entries.map(([group, groupItems]) => (
            <div key={group} style={{ display: "grid", gap: 8, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: "#ffffff", ...wrapTextStyle }}>
                {group} ({groupItems.length})
              </div>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                {groupItems.slice(0, MAX_ITEMS).map((item, index) => {
                  const token = approvalToken(item);
                  const approved = approvedTokens.has(token);
                  const code = blockCode(item);
                  const canExclude = allowExclude && EXCLUDABLE_PERSONAL_BLOCK_CODES.has(code) && !item.excluded;
                  const excludingToken = `EXCLUDE::${code}::${item.key}`;
                  return (
                    <div key={`${token}-${index}`} style={applyPlanItemStyle}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "start", minWidth: 0 }}>
                        <div style={{ minWidth: 0, ...wrapTextStyle }}>
                          <div style={{ color: "#ffffff", fontWeight: 800, ...wrapTextStyle }}>{safe(item.tipo || item.reason)}</div>
                          <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12, ...wrapTextStyle }}>Key: {safe(item.key)}</div>
                          {item.excluded ? (
                            <div style={{ color: "#bbf7d0", fontSize: 12, fontWeight: 900, ...wrapTextStyle }}>Excluido del apply</div>
                          ) : null}
                          {item.rowIndex || item.matricula || item.dni || item.nombreApellido || item.userId ? (
                            <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12, ...wrapTextStyle }}>
                              Fila: {safe(item.rowIndex)} - Matricula: {safe(item.matricula)} - DNI: {safe(item.dni)} - Nombre: {safe(item.nombreApellido || item.nombre)} - UserId: {safe(item.userId)}
                            </div>
                          ) : null}
                          {item.grouped || item.count ? (
                            <div style={{ color: "#bfdbfe", fontSize: 12, fontWeight: 800, ...wrapTextStyle }}>
                              Agrupado{item.count ? ` - ${item.count} registros` : ""}
                            </div>
                          ) : null}
                          <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12 }}>
                            {safe(item.message || item.campo || item.field || item.collection)}
                          </div>
                          {item.changes?.length ? (
                            <pre style={{ ...preStyle, marginTop: 6 }}>{compactJson(item.changes)}</pre>
                          ) : null}
                          {item.flags ? (
                            <pre style={{ ...preStyle, marginTop: 6 }}>{compactJson(item.flags)}</pre>
                          ) : null}
                          {item.preview ? (
                            <pre style={{ ...preStyle, marginTop: 6 }}>{compactJson(item.preview)}</pre>
                          ) : null}
                          {item.exclusion ? (
                            <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12, ...wrapTextStyle }}>
                              Motivo exclusion: {safe(item.exclusion.motivo)}
                            </div>
                          ) : null}
                        </div>
                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          {allowApprove ? (
                            <button
                              type="button"
                              style={{ ...secondaryButtonStyle, padding: "7px 10px", alignSelf: "start", whiteSpace: "nowrap", position: "relative", zIndex: 1 }}
                              disabled={approved || approvingToken === token || detail?.estado !== "PENDIENTE_CONFIRMACION"}
                              onClick={() => aprobarItem(item)}
                            >
                              {approved ? "Aprobado" : approvingToken === token ? "Aprobando..." : "Aprobar"}
                            </button>
                          ) : null}
                          {canExclude ? (
                            <button
                              type="button"
                              style={{ ...secondaryButtonStyle, padding: "7px 10px", alignSelf: "start", whiteSpace: "nowrap", position: "relative", zIndex: 1 }}
                              disabled={approvingToken === excludingToken || detail?.estado !== "PENDIENTE_CONFIRMACION"}
                              onClick={() => excluirItem(item)}
                            >
                              {approvingToken === excludingToken ? "Excluyendo..." : "Excluir del apply"}
                            </button>
                          ) : !allowApprove && allowExclude ? (
                            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "right" }}>Bloqueo no excluible</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {groupItems.length > MAX_ITEMS ? (
                  <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                    Se muestran {MAX_ITEMS} de {groupItems.length}. Use backend/auditoria para revisar el resto.
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderWarnings() {
    const warnings = arr(applyPlan?.warnings);
    const grouped = groupWarnings(warnings);
    const entries = Object.entries(grouped);
    return (
      <section style={applyPlanSectionStyle}>
        <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Warnings ({warnings.length})</h3>
        {!entries.length ? (
          <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13 }}>Sin registros.</div>
        ) : (
          <div style={applyPlanListStyle}>
            {entries.map(([group, groupItems]) => (
              <div key={group} style={applyPlanItemStyle}>
                <div style={{ fontWeight: 800, color: "#ffffff", ...wrapTextStyle }}>
                  {group} ({groupItems.length})
                </div>
                <pre style={preStyle}>{compactJson(groupItems.slice(0, MAX_ITEMS))}</pre>
                {groupItems.length > MAX_ITEMS ? (
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.62)", fontSize: 12 }}>
                    Se muestran {MAX_ITEMS} de {groupItems.length}.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderPlanSample(title: string, items: unknown[]) {
    return (
      <section style={applyPlanSectionStyle}>
        <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>{title} ({items.length})</h3>
        {!items.length ? (
          <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13 }}>Sin muestra.</div>
        ) : (
          <div style={applyPlanListStyle}>
            <pre style={preStyle}>{compactJson(items.slice(0, MAX_ITEMS))}</pre>
          </div>
        )}
      </section>
    );
  }

  useEffect(() => {
    cargarJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drySummary = dryRunResult?.resumen || dryRunResult?.summary || {};

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

        {infoMsg ? (
          <div
            style={{
              ...softCardStyle,
              marginBottom: 16,
              border: "1px solid rgba(34,197,94,0.30)",
              background: "rgba(20,83,45,0.18)",
              color: "#bbf7d0",
            }}
          >
            {infoMsg}
          </div>
        ) : null}

        <div style={{ ...cardStyle, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ ...titleStyle, fontSize: 22 }}>Nuevo dry-run</h2>
              <p style={subtitleStyle}>Carga XLSX, validacion backend y preview persistido. No aplica cambios.</p>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label>
              <span style={smallLabelStyle}>Tipo de base</span>
              <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value as ImportTipo)} style={{ ...controlStyle, width: "100%" }}>
                <option value="PERSONAL" style={optionStyle}>Personal autorizado</option>
                <option value="VIVIENDAS" style={optionStyle}>Viviendas</option>
                <option value="ALOJAMIENTOS" style={optionStyle}>Alojamientos</option>
              </select>
            </label>

            <label>
              <span style={smallLabelStyle}>Modo de carga</span>
              <select value={nuevoModoCarga} onChange={(e) => setNuevoModoCarga(e.target.value as ModoCarga | "")} style={{ ...controlStyle, width: "100%" }}>
                <option value="" style={optionStyle}>Seleccionar modo</option>
                <option value="TOTAL" style={optionStyle}>Total</option>
                <option value="PARCIAL" style={optionStyle}>Parcial</option>
                <option value="ACTUALIZACION" style={optionStyle}>Actualizacion</option>
                <option value="ALTA_EXCEPCIONAL" style={optionStyle}>Alta excepcional</option>
              </select>
            </label>

            <label>
              <span style={smallLabelStyle}>Archivo XLSX</span>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                style={{ ...controlStyle, width: "100%" }}
              />
            </label>

            <button type="button" style={primaryButtonStyle} onClick={ejecutarDryRun} disabled={submittingDryRun}>
              {submittingDryRun ? "Procesando..." : "Ejecutar dry-run"}
            </button>
          </div>

          {dryRunResult ? (
            <div style={{ ...softCardStyle, marginTop: 16 }}>
              <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Resultado dry-run</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {["totalFilas", "validas", "invalidas", "nuevos", "actualizados", "warnings", "errores"].map((key) => (
                  <div key={key} style={softCardStyle}>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>{key}</div>
                    <div style={{ color: "#ffffff", fontSize: 20, fontWeight: 800 }}>{numberFromSummary(drySummary, key)}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.78)", fontSize: 13 }}>
                Job: {safe(dryRunResult.jobId)} - Modo: {modoCargaLabel(safe(dryRunResult.modoCarga || drySummary.modoCarga, ""))}
              </div>
            </div>
          ) : null}
        </div>

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
                <option value="ALOJAMIENTOS" style={optionStyle}>Alojamientos</option>
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
                  <th style={thStyle}>Modo</th>
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
                    <td style={tdStyle} colSpan={9}>Cargando jobs...</td>
                  </tr>
                ) : null}
                {!loadingJobs && jobs.length === 0 ? (
                  <tr>
                    <td style={tdStyle} colSpan={9}>Sin jobs para mostrar.</td>
                  </tr>
                ) : null}
                {!loadingJobs && jobs.map((job) => (
                  <tr key={job.jobId}>
                    <td style={tdStyle}>{formatDate(job.createdAt)}</td>
                    <td style={tdStyle}>{safe(job.tipo)}</td>
                    <td style={tdStyle}>
                      <span style={{ ...badgeStyle, borderColor: job.modoCargaLegacy ? "rgba(251,191,36,0.36)" : "rgba(96,165,250,0.34)", color: job.modoCargaLegacy ? "#fde68a" : "#bfdbfe" }}>
                        {modoCargaLabel(job.modoCarga)}
                      </span>
                    </td>
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
              <h2 style={{ ...titleStyle, fontSize: 22 }}>Detalle operativo</h2>
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
            <>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" style={secondaryButtonStyle} onClick={cargarApplyPlan} disabled={loadingPlan}>
                  {loadingPlan ? "Consultando..." : "Generar / ver plan"}
                </button>
                <button type="button" style={dangerButtonStyle} onClick={ejecutarApply} disabled={!canApply || applying}>
                  {applying ? "Aplicando..." : "Aplicar"}
                </button>
              </div>

              {isAlojamientosJob ? (
                <div style={{ ...softCardStyle, marginTop: 12, color: "rgba(255,255,255,0.78)" }}>
                  ALOJAMIENTOS usa apply-plan con validaciones reforzadas. Revise bloqueos, riesgos y aprobaciones
                  manuales antes de aplicar.
                </div>
              ) : null}

              {modoCargaLegacy ? (
                <div style={{ ...softCardStyle, marginTop: 12, border: "1px solid rgba(251,191,36,0.30)", background: "rgba(120,53,15,0.14)", color: "#fde68a" }}>
                  Job historico sin modo de carga explicito. Requiere nuevo dry-run con modoCarga antes de aplicar.
                </div>
              ) : null}

              <section
                style={{
                  ...softCardStyle,
                  marginTop: 12,
                  border: canApply ? "1px solid rgba(34,197,94,0.30)" : "1px solid rgba(251,191,36,0.30)",
                  background: canApply ? "rgba(20,83,45,0.14)" : "rgba(120,53,15,0.14)",
                }}
              >
                <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Estado operativo</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>Modo de carga</div>
                    <div style={{ color: modoCargaLegacy ? "#fde68a" : "#bfdbfe", fontSize: 20, fontWeight: 900 }}>
                      {modoCargaLabel(modoCargaActual)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>Puede aplicar</div>
                    <div style={{ color: canApply ? "#bbf7d0" : "#fde68a", fontSize: 20, fontWeight: 900 }}>
                      {canApply ? "Si" : "No"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>Motivo principal</div>
                    <div style={{ color: "#ffffff", fontWeight: 800 }}>{applyBlockReasons[0] || "Listo para apply controlado"}</div>
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>Aprobaciones</div>
                    <div style={{ color: "#ffffff", fontSize: 20, fontWeight: 900 }}>{approvedCount}</div>
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>Creates / Updates</div>
                    <div style={{ color: "#ffffff", fontSize: 20, fontWeight: 900 }}>{createsCount} / {updatesCount}</div>
                  </div>
                </div>
              </section>

              {!canApply ? (
                <div style={{ ...softCardStyle, marginTop: 12, color: "rgba(255,255,255,0.74)" }}>
                  <div style={{ marginBottom: 8, color: "#fde68a", fontWeight: 800 }}>Apply bloqueado</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {applyBlockReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <section style={applyPlanSectionStyle}>
                  <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Resumen</h3>
                  <pre style={preStyle}>{compactJson(summary)}</pre>
                </section>

                <section style={applyPlanSectionStyle}>
                  <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Apply plan</h3>
                  {isLargePlan ? (
                    <div style={{ color: "#bfdbfe", fontSize: 12, fontWeight: 800, ...wrapTextStyle }}>
                      Plan masivo: se muestran muestras limitadas. Los totales completos estan en el resumen.
                    </div>
                  ) : null}
                  <pre style={preStyle}>{compactJson(detail.applyPlanSummary)}</pre>
                </section>

                {alojamientoClasificaciones ? (
                  <section style={applyPlanSectionStyle}>
                    <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Clasificaciones alojamientos</h3>
                    <pre style={preStyle}>{compactJson(alojamientoClasificaciones)}</pre>
                  </section>
                ) : null}

                <section style={applyPlanSectionStyle}>
                  <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Aprobaciones manuales</h3>
                  {manualApprovals.length ? (
                    <div style={applyPlanListStyle}>
                      {manualApprovals.slice(0, MAX_ITEMS).map((approval, index) => (
                        <div key={`${approval.tipo}-${approval.key}-${index}`} style={applyPlanItemStyle}>
                          <div style={{ fontWeight: 800, color: "#ffffff", ...wrapTextStyle }}>{safe(approval.tipo)}</div>
                          <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 12, ...wrapTextStyle }}>Key: {safe(approval.key)}</div>
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

                <section style={applyPlanSectionStyle}>
                  <h3 style={{ marginTop: 0, color: "#ffffff", fontSize: 16 }}>Apply result</h3>
                  {applyResult ? (
                    <pre style={preStyle}>{compactJson(applyResult)}</pre>
                  ) : (
                    <div style={{ color: "rgba(255,255,255,0.74)", fontSize: 13 }}>Sin resultado de apply.</div>
                  )}
                </section>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                {renderApplyPlanItems("Blocked", blocked, false, true)}
                {renderApplyPlanItems("Excluidos del apply", excluded, false)}
                {renderApplyPlanItems("Risks", risks, true)}
                {renderApplyPlanItems("Revision manual", manualReview, true)}
                {renderWarnings()}
                {isLargePlan ? renderPlanSample("Sample creates", sampleCreates) : null}
                {isLargePlan ? renderPlanSample("Sample updates", sampleUpdates) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
