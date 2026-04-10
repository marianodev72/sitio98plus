// frontend/src/pages/admin_general/AuditoriaInstitucionalPage.tsx
import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import { http } from "../../api/http";
import {
  buttonRowStyle,
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

type AuditItem = {
  _id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  requestId?: string;
  actorNombre?: string;
  targetNombre?: string;
  actionTexto?: string;
};

type AuditResponse = {
  page: number;
  limit: number;
  total: number;
  filtros: Record<string, string>;
  items: AuditItem[];
};

type AuditOptionsResponse = {
  actions: string[];
  actorRoles: string[];
  targetTypes: string[];
  actorIds: string[];
};

type UsuarioMini = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  role?: string;
};

type EstadoAudit = "Normal" | "Atención" | "Crítico";

function formatDateLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR");
}

function safeLabelUser(u: UsuarioMini) {
  const ape = String(u.apellido || "").trim();
  const nom = String(u.nombre || "").trim();
  const email = String(u.email || "").trim();
  const base = `${ape} ${nom}`.trim();
  if (base && email) return `${base} — ${email}`;
  return base || email || u._id;
}

function traducirRol(v?: string) {
  const map: Record<string, string> = {
    ADMIN_GENERAL: "Administrador General",
    ADMIN: "Administrador",
    PERMISIONARIO: "Permisionario",
    POSTULANTE: "Postulante",
    ALOJADO: "Alojado",
    INSPECTOR: "Inspector",
    JEFE_DE_BARRIO: "Jefe de Barrio",
    SISTEMA: "Sistema",
    SYSTEM: "Sistema",
  };

  return map[String(v || "").trim()] || String(v || "—");
}

function traducirAccion(v?: string) {
  const map: Record<string, string> = {
    ADMIN_USERS_LIST: "Consulta de usuarios",
    ADMIN_HOUSES_LIST: "Consulta de viviendas",
    ADMIN_HOUSES_BARRIOS: "Consulta de barrios",
    ADMIN_GESTIONES_LIST: "Consulta de gestiones",
    ADMIN_RESET_PASSWORD: "Reseteo administrativo de clave",
    ADMIN_HOUSES_ELIGIBLE_ASSIGN: "Consulta de elegibilidad de asignación",
    FORM_CREATE: "Creación de formulario",
    FORM_UPDATE: "Actualización de formulario",
    FORM_CLOSE: "Cierre de formulario",
    FORM_VIEW: "Consulta de formulario",
    FORM_CONFORMIDAD: "Registro de formulario de conformidad",
    FORM_CONFORMIDAD_ADMIN: "Intervención administrativa en formulario de conformidad",
    LOGIN_SUCCESS: "Inicio de sesión exitoso",
    LOGIN_FAILED: "Falló el inicio de sesión",
    MFA_REQUIRED: "Se requirió segundo factor",
    MFA_SUCCESS: "Segundo factor validado",
    MFA_FAILED: "Falló la verificación del segundo factor",
    RECOVERY_USED: "Ingreso mediante código de recuperación",
    RECOVERY_FAILED: "Falló el código de recuperación",
    AUTH_LOCKED: "Cuenta bloqueada por seguridad",
    LOGOUT: "Cierre de sesión",
  };

  return map[String(v || "").trim()] || String(v || "—");
}

function traducirEntidad(v?: string) {
  const map: Record<string, string> = {
    User: "Usuario",
    AUTH: "Autenticación",
    Vivienda: "Vivienda",
    FORM: "Formulario",
    FormSubmission: "Formulario",
    Formulario: "Formulario",
    AuditLog: "Auditoría",
  };

  return map[String(v || "").trim()] || String(v || "—");
}

function formatReferencia(v?: string) {
  const s = String(v || "").trim();
  if (!s) return "—";
  if (/^[0-9a-fA-F-]{24,}$/.test(s)) return `…${s.slice(-8)}`;
  return s;
}

function buildEstado(action?: string): { estado: EstadoAudit; color: string } {
  const a = String(action || "").trim();

  if (a === "AUTH_LOCKED") {
    return { estado: "Crítico", color: "#ef4444" };
  }

  if (["LOGIN_FAILED", "MFA_FAILED", "RECOVERY_FAILED"].includes(a)) {
    return { estado: "Atención", color: "#f59e0b" };
  }

  return { estado: "Normal", color: "#22c55e" };
}

export default function AuditoriaInstitucionalPage() {
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string>("");

  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"" | EstadoAudit>("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [data, setData] = useState<AuditResponse | null>(null);
  const [options, setOptions] = useState<AuditOptionsResponse>({
    actions: [],
    actorRoles: [],
    targetTypes: [],
    actorIds: [],
  });

  const [usersById, setUsersById] = useState<Record<string, UsuarioMini>>({});

  const appliedParams = useMemo(
    () => ({
      page,
      limit,
      action: action || undefined,
      actorId: actorId || undefined,
      actorRole: actorRole || undefined,
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      requestId: requestId || undefined,
      from: from || undefined,
      to: to || undefined,
      sortBy: "createdAt",
      sortDir: "desc",
    }),
    [page, limit, action, actorId, actorRole, targetType, targetId, requestId, from, to]
  );

  async function fetchAudit() {
    setLoading(true);
    setError("");
    try {
      const res = await http.get<AuditResponse>("/admin/audit", { params: appliedParams });
      setData(res.data);
    } catch {
      setData(null);
      setError("Recurso no disponible");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOptions() {
    setLoadingOptions(true);
    try {
      const res = await http.get<AuditOptionsResponse>("/admin/audit/options", {
        params: { from: from || undefined, to: to || undefined, limit: 200 },
      });
      setOptions(res.data);
    } catch {
      setOptions({ actions: [], actorRoles: [], targetTypes: [], actorIds: [] });
    } finally {
      setLoadingOptions(false);
    }
  }

  async function fetchUsersMini() {
    try {
      const res = await http.get("/users/admin-list", {
        params: {
          sortBy: "apellido",
          sortDir: "asc",
          archivado: "todos",
        },
      });

      const list = Array.isArray(res.data?.usuarios) ? (res.data.usuarios as UsuarioMini[]) : [];
      const map: Record<string, UsuarioMini> = {};
      list.forEach((u) => {
        if (u && u._id) map[String(u._id)] = u;
      });
      setUsersById(map);
    } catch {
      setUsersById({});
    }
  }

  useEffect(() => {
    fetchUsersMini();
    fetchOptions();
    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  function onApplyFilters() {
    setPage(1);
    fetchOptions();
    fetchAudit();
  }

  function onClearFilters() {
    setAction("");
    setActorId("");
    setActorRole("");
    setTargetType("");
    setTargetId("");
    setRequestId("");
    setEstadoFiltro("");
    setFrom("");
    setTo("");
    setPage(1);

    setTimeout(() => {
      fetchOptions();
      fetchAudit();
    }, 0);
  }

  async function onCorrelateByRequestId() {
    const rid = requestId.trim();
    if (!rid) return;

    setLoading(true);
    setError("");
    try {
      const res = await http.get<AuditResponse>(`/admin/audit/request/${encodeURIComponent(rid)}`, {
        params: { page, limit, sortBy: "createdAt", sortDir: "desc" },
      });
      setData(res.data);
    } catch {
      setData(null);
      setError("Recurso no disponible");
    } finally {
      setLoading(false);
    }
  }

  function onExportPdf() {
    const sp = new URLSearchParams();
    Object.entries(appliedParams).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (!s) return;
      sp.set(k, s);
    });
    window.open(`/api/admin/audit/export/pdf?${sp.toString()}`, "_blank", "noopener,noreferrer");
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  const actorIdOptions = useMemo(() => {
    return options.actorIds.map((id) => {
      const u = usersById[id];
      return { id, label: u ? safeLabelUser(u) : id };
    });
  }, [options.actorIds, usersById]);

  const visibleItems = useMemo(() => {
    const base = data?.items || [];
    if (!estadoFiltro) return base;

    return base.filter((it) => buildEstado(it.action).estado === estadoFiltro);
  }, [data?.items, estadoFiltro]);

  const controlStyle: CSSProperties = {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    fontSize: 14,
    minHeight: 42,
    boxSizing: "border-box",
  };

  const selectStyle: CSSProperties = {
    ...controlStyle,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#ffffff",
  };

  const optionStyle: CSSProperties = {
    backgroundColor: "#1f2937",
    color: "#ffffff",
  };

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: 10,
    fontSize: 12,
    color: "#ffffff",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top",
  };

  const smallLabelStyle: CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.62)",
    marginBottom: 6,
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Auditoría Institucional</h2>
          <p style={subtitleStyle}>
            Acceso exclusivo ADMIN_GENERAL — Solo lectura — Exportación institucional
          </p>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              ...softCardStyle,
              marginBottom: 16,
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Acción</span>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                disabled={loadingOptions}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  (Todas)
                </option>
                {options.actions.map((a) => (
                  <option key={a} value={a} style={optionStyle}>
                    {traducirAccion(a)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Usuario</span>
              <select
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                disabled={loadingOptions}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  (Todos)
                </option>
                {actorIdOptions.map((o) => (
                  <option key={o.id} value={o.id} style={optionStyle}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Rol</span>
              <select
                value={actorRole}
                onChange={(e) => setActorRole(e.target.value)}
                disabled={loadingOptions}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  (Todos)
                </option>
                {options.actorRoles.map((r) => (
                  <option key={r} value={r} style={optionStyle}>
                    {traducirRol(r)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>ID de operación</span>
              <input
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="x-request-id"
                style={controlStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Entidad</span>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                disabled={loadingOptions}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  (Todas)
                </option>
                {options.targetTypes.map((t) => (
                  <option key={t} value={t} style={optionStyle}>
                    {traducirEntidad(t)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Referencia</span>
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="LIST o ID"
                style={controlStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Estado</span>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as "" | EstadoAudit)}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>
                  (Todos)
                </option>
                <option value="Normal" style={optionStyle}>
                  Normal
                </option>
                <option value="Atención" style={optionStyle}>
                  Atención
                </option>
                <option value="Crítico" style={optionStyle}>
                  Crítico
                </option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Desde</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={controlStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={smallLabelStyle}>Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={controlStyle}
              />
            </label>

            <div style={{ gridColumn: "1 / -1", ...buttonRowStyle, marginTop: 4 }}>
              <button onClick={onApplyFilters} disabled={loading} style={primaryButtonStyle}>
                Aplicar
              </button>
              <button onClick={onClearFilters} disabled={loading} style={secondaryButtonStyle}>
                Limpiar
              </button>
              <button onClick={onExportPdf} disabled={loading} style={secondaryButtonStyle}>
                Exportar PDF
              </button>
              <button
                onClick={onCorrelateByRequestId}
                disabled={loading || !requestId.trim()}
                style={secondaryButtonStyle}
              >
                Correlacionar operación
              </button>
            </div>
          </div>

          {error ? (
            <div
              style={{
                ...softCardStyle,
                padding: 12,
                border: "1px solid rgba(239,68,68,0.30)",
                background: "rgba(127,29,29,0.18)",
                color: "#fecaca",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          ) : null}

          {loading ? (
            <div style={{ ...softCardStyle, marginBottom: 12, color: "rgba(255,255,255,0.78)" }}>
              Cargando…
            </div>
          ) : null}

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              overflow: "hidden",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha y hora</th>
                  <th style={thStyle}>Actor</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Evento</th>
                  <th style={thStyle}>Objeto</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Operación</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((it) => {
                  const evento = it.actionTexto || traducirAccion(it.action);
                  const { estado, color } = buildEstado(it.action);

                  const objeto =
                    it.targetNombre ||
                    (it.targetType === "AUTH"
                      ? "Acceso de usuario"
                      : traducirEntidad(it.targetType));

                  const operacion = it.requestId
                    ? `OP-${formatReferencia(it.requestId)}`
                    : it._id
                    ? `LOG-${formatReferencia(it._id)}`
                    : "—";

                  return (
                    <tr key={it._id}>
                      <td style={tdStyle}>{formatDateLocal(it.createdAt)}</td>

                      <td style={tdStyle}>
                        {it.actorNombre
                          ? it.actorNombre
                          : it.actorId
                          ? usersById[it.actorId]
                            ? safeLabelUser(usersById[it.actorId])
                            : it.actorId
                          : "Sistema"}
                      </td>

                      <td style={tdStyle}>{traducirRol(it.actorRole)}</td>

                      <td style={{ ...tdStyle, fontWeight: 500 }}>{evento}</td>

                      <td style={tdStyle}>{objeto}</td>

                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: `${color}22`,
                            color,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {estado}
                        </span>
                      </td>

                      <td style={tdStyle}>{operacion}</td>
                    </tr>
                  );
                })}

                {!loading && visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, opacity: 0.8 }}>
                      Sin resultados
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              style={secondaryButtonStyle}
            >
              Anterior
            </button>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)" }}>
              Página {page} / {totalPages} — Total: {total}
              {estadoFiltro ? ` — Estado: ${estadoFiltro}` : ""}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              style={secondaryButtonStyle}
            >
              Siguiente
            </button>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>Límite</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
                style={selectStyle}
              >
                <option value={25} style={optionStyle}>
                  25
                </option>
                <option value={50} style={optionStyle}>
                  50
                </option>
                <option value={100} style={optionStyle}>
                  100
                </option>
                <option value={200} style={optionStyle}>
                  200
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}