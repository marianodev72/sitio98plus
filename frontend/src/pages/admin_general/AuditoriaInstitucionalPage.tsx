// frontend/src/pages/admin_general/AuditoriaInstitucionalPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";

type AuditItem = {
  _id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  requestId?: string;
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

export default function AuditoriaInstitucionalPage() {
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string>("");

  // filtros
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [requestId, setRequestId] = useState("");

  // ✅ calendario
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [data, setData] = useState<AuditResponse | null>(null);
  const [options, setOptions] = useState<AuditOptionsResponse>({
    actions: [],
    actorRoles: [],
    targetTypes: [],
    actorIds: [],
  });

  // usuarios (para label de actorId)
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
      // Reutiliza endpoint existente del panel ADMIN_GENERAL
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
    // inicial
    fetchUsersMini();
    fetchOptions();
    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // paginación
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
    // PDF con mismos filtros aplicados (solo canónicos desde backend)
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
    // prioriza actorIds que existen en options, pero si tenemos user list, mostramos label
    return options.actorIds.map((id) => {
      const u = usersById[id];
      return { id, label: u ? safeLabelUser(u) : id };
    });
  }, [options.actorIds, usersById]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Auditoría Institucional</h2>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
        Acceso exclusivo ADMIN_GENERAL — Solo lectura — Exportación institucional
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {/* action */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>action</span>
          <select value={action} onChange={(e) => setAction(e.target.value)} disabled={loadingOptions}>
            <option value="">(Todas)</option>
            {options.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {/* actorId */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>actorId (usuario)</span>
          <select value={actorId} onChange={(e) => setActorId(e.target.value)} disabled={loadingOptions}>
            <option value="">(Todos)</option>
            {actorIdOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* actorRole */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>actorRole</span>
          <select value={actorRole} onChange={(e) => setActorRole(e.target.value)} disabled={loadingOptions}>
            <option value="">(Todos)</option>
            {options.actorRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        {/* requestId */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>requestId</span>
          <input value={requestId} onChange={(e) => setRequestId(e.target.value)} placeholder="x-request-id" />
        </label>

        {/* targetType */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>targetType</span>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value)} disabled={loadingOptions}>
            <option value="">(Todos)</option>
            {options.targetTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {/* targetId */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>targetId</span>
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="LIST o ID" />
        </label>

        {/* from */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>Desde (createdAt)</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>

        {/* to */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12 }}>Hasta (createdAt)</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button onClick={onApplyFilters} disabled={loading} style={{ padding: "8px 10px" }}>
            Aplicar
          </button>
          <button onClick={onClearFilters} disabled={loading} style={{ padding: "8px 10px" }}>
            Limpiar
          </button>
          <button onClick={onExportPdf} disabled={loading} style={{ padding: "8px 10px" }}>
            Exportar PDF
          </button>
          <button
            onClick={onCorrelateByRequestId}
            disabled={loading || !requestId.trim()}
            style={{ padding: "8px 10px" }}
          >
            Correlacionar requestId
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 12, border: "1px solid #f5c2c2", borderRadius: 8, marginBottom: 16 }}>{error}</div>
      ) : null}

      {loading ? <div style={{ marginBottom: 12 }}>Cargando…</div> : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f7f7" }}>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>createdAt</th>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>actorId</th>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>actorRole</th>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>action</th>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>targetType</th>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>targetId</th>
              <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>requestId</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((it) => (
              <tr key={it._id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 10, fontSize: 12 }}>{formatDateLocal(it.createdAt)}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{it.actorId || ""}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{it.actorRole || ""}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{it.action || ""}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{it.targetType || ""}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{it.targetId || ""}</td>
                <td style={{ padding: 10, fontSize: 12 }}>{it.requestId || ""}</td>
              </tr>
            ))}

            {!loading && (data?.items?.length || 0) === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  Sin resultados
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
          Anterior
        </button>

        <div style={{ fontSize: 12 }}>
          Página {page} / {totalPages} — Total: {total}
        </div>

        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={loading || page >= totalPages}>
          Siguiente
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12 }}>Límite</span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} disabled={loading}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>
    </div>
  );
}
