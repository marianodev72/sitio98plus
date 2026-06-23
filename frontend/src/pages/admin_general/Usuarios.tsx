import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Usuario = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;
  tipoPersonal?: string;
  grupoJerarquico?: string;
  role?: string; // rol base
  permisos?: string[];
  barrioAsignado?: string;
  territoriosAlojamiento?: TerritorioAlojamiento[];
  viviendaLabel?: string;
  alojamientoLabel?: string;
  activo?: boolean;
  bloqueado?: boolean;
  archivado?: boolean;
};

type TerritorioAlojamiento = {
  tipo: "LUGAR";
  valor: string;
};

const ROLES_BASE = ["POSTULANTE", "PERMISIONARIO", "ALOJADO", "ADMIN", "ADMIN_GENERAL"] as const;
const PERMISOS_VALIDOS = ["INSPECTOR", "JEFE_DE_BARRIO", "INSPECTOR_ALOJAMIENTOS"] as const;
const PAGE_SIZE_OPTIONS = [50, 100, 200, 500] as const;

type SortKey =
  | "apellido"
  | "nombre"
  | "email"
  | "dni"
  | "matricula"
  | "tipoPersonal"
  | "role"
  | "barrioAsignado"
  | "activo"
  | "archivadoAt";

type SortDir = "asc" | "desc";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  const text = String(v ?? "").trim();
  if (/^[a-fA-F0-9]{24}$/.test(text)) return "Sin asignar";
  return text || "Sin asignar";
}

function fallback(v: unknown) {
  const text = String(v ?? "").trim();
  if (/^[a-fA-F0-9]{24}$/.test(text)) return "Sin asignar";
  return text || "Sin asignar";
}

function grupoJerarquicoLabel(value: unknown) {
  const grupo = up(value);
  if (grupo === "OF") return "Oficiales";
  if (grupo === "SB_CP") return "Suboficiales / Cabos Principales";
  if (grupo === "CB") return "Cabos";
  if (grupo === "TR") return "Tropa";
  return "No definido";
}

function tipoPersonalLabel(value: unknown) {
  const tipo = up(value);
  if (tipo === "OF") return "Oficial";
  if (tipo === "SO") return "Suboficial";
  return "Sin definir";
}

function isInspectorLike(permisos?: string[]) {
  const list = Array.isArray(permisos) ? permisos.map(up) : [];
  return list.includes("INSPECTOR") || list.includes("JEFE_DE_BARRIO");
}

function hasInspectorAlojamientos(permisos?: string[]) {
  const list = Array.isArray(permisos) ? permisos.map(up) : [];
  return list.includes("INSPECTOR_ALOJAMIENTOS");
}

function territorioKey(t: TerritorioAlojamiento) {
  return `${up(t?.tipo)}:${String(t?.valor || "").trim()}`;
}

function territorioLabel(t: TerritorioAlojamiento) {
  const valor = String(t?.valor || "").trim();
  if (!valor || /^[a-fA-F0-9]{24}$/.test(valor)) return "Sin asignar";
  return up(t?.tipo) === "LUGAR" ? `Lugar: ${valor}` : valor;
}

export default function UsuariosAdminGeneral() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // filtros
  const [filtroQ, setFiltroQ] = useState("");
  const [filtroRole, setFiltroRole] = useState<string>("");
  const [filtroPermiso, setFiltroPermiso] = useState<string>("");
  const [filtroBarrio, setFiltroBarrio] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "true" | "false">("todos");
  const [filtroArchivado, setFiltroArchivado] = useState<"false" | "true" | "todos">("false");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(100);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [sortBy, setSortBy] = useState<SortKey>("apellido");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // barrios disponibles para combo
  const [barrios, setBarrios] = useState<string[]>([]);
  const [loadingBarrios, setLoadingBarrios] = useState(false);
  const [territoriosAlojamiento, setTerritoriosAlojamiento] = useState<TerritorioAlojamiento[]>([]);
  const [loadingTerritoriosAlojamiento, setLoadingTerritoriosAlojamiento] = useState(false);

  // draft barrio por usuario (edición local)
  const [barrioDraft, setBarrioDraft] = useState<Record<string, string>>({});
  const [territorioAlojamientoDraft, setTerritorioAlojamientoDraft] = useState<Record<string, string[]>>({});

  const { user, refresh } = useAuth();
  const myId = String(user?._id || "");

  function clearMessages() {
    setError("");
    setInfo("");
  }

  async function cargarBarrios() {
    try {
      setLoadingBarrios(true);
      const res = await http.get("/viviendas/barrios");
      const list = Array.isArray(res.data?.barrios) ? (res.data.barrios as string[]) : [];
      setBarrios(list);
    } catch {
      // No rompemos la pantalla; sólo dejamos vacío
      setBarrios([]);
    } finally {
      setLoadingBarrios(false);
    }
  }

  async function cargarTerritoriosAlojamiento() {
    try {
      setLoadingTerritoriosAlojamiento(true);
      const res = await http.get("/alojamientos-navales/territorios");
      const list = Array.isArray(res.data?.territorios)
        ? (res.data.territorios as TerritorioAlojamiento[])
        : [];
      setTerritoriosAlojamiento(
        list.filter((t) => up(t?.tipo) === "LUGAR" && String(t?.valor || "").trim())
      );
    } catch {
      setTerritoriosAlojamiento([]);
    } finally {
      setLoadingTerritoriosAlojamiento(false);
    }
  }

  async function cargar() {
    setLoading(true);
    clearMessages();
    try {
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      if (filtroQ.trim()) params.q = filtroQ.trim();
      if (filtroRole) params.role = filtroRole;
      if (filtroPermiso) params.permiso = filtroPermiso;
      if (filtroBarrio) params.barrio = filtroBarrio;

      if (filtroActivo !== "todos") params.activo = filtroActivo;
      if (filtroArchivado !== "todos") params.archivado = filtroArchivado;

      params.sortBy = sortBy;
      params.sortDir = sortDir;

      const res = await http.get("/users/admin-list", { params });
      const list = Array.isArray(res.data?.usuarios) ? (res.data.usuarios as Usuario[]) : [];
      const nextTotal = Number(res.data?.total);
      const nextPage = Number(res.data?.page);
      const nextLimit = Number(res.data?.limit);
      const nextTotalPages = Number(res.data?.totalPages);

      setUsuarios(list);
      setTotal(Number.isFinite(nextTotal) ? nextTotal : list.length);
      setPage(Number.isFinite(nextPage) && nextPage > 0 ? nextPage : page);
      setLimit(Number.isFinite(nextLimit) && nextLimit > 0 ? nextLimit : limit);
      setTotalPages(Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1);

      // sincronizar drafts de barrio
      setBarrioDraft((curr) => {
        const next = { ...curr };
        list.forEach((u) => {
          if (next[u._id] === undefined) next[u._id] = String(u.barrioAsignado || "");
        });
        return next;
      });

      setTerritorioAlojamientoDraft((curr) => {
        const next = { ...curr };
        list.forEach((u) => {
          if (next[u._id] === undefined) {
            const asignados = Array.isArray(u.territoriosAlojamiento)
              ? u.territoriosAlojamiento
              : [];
            next[u._id] = asignados
              .filter((t) => up(t?.tipo) === "LUGAR" && String(t?.valor || "").trim())
              .map((t) => territorioKey({ tipo: "LUGAR", valor: String(t.valor || "").trim() }));
          }
        });
        return next;
      });
    } catch (e) {
      setUsuarios([]);
      setTotal(0);
      setTotalPages(1);
      setError("No se pudieron cargar los usuarios. Por favor, intente nuevamente o contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshIfSelf(editedUserId: string) {
    if (myId && editedUserId === myId) {
      try {
        await refresh();
      } catch {
        // si falla, dejamos que el flujo normal de auth del sistema lo maneje
      }
    }
  }

  async function cambiarRol(userId: string, role: string) {
    clearMessages();
    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/role`, { role });
      setInfo("Rol base actualizado.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo cambiar el rol base. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function setPermisos(userId: string, permisos: string[]) {
    clearMessages();
    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/permisos`, { permisos });
      setInfo("Permisos actualizados.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudieron actualizar los permisos. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function guardarBarrio(userId: string) {
    clearMessages();
    const b = String(barrioDraft[userId] || "").trim();
    if (!b) {
      setError("Debe seleccionar un barrio para asignar.");
      return;
    }

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/barrio`, { barrio: b });
      setInfo("Barrio asignado correctamente.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo asignar el barrio. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function guardarTerritoriosAlojamiento(userId: string) {
    clearMessages();
    const selected = territorioAlojamientoDraft[userId] || [];
    const selectedSet = new Set(selected);
    const territorios = territoriosAlojamiento.filter((t) => selectedSet.has(territorioKey(t)));

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/territorios-alojamiento`, { territorios });
      setInfo("Territorios de Alojamientos asignados correctamente.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudieron asignar los territorios de Alojamientos. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function cambiarActivo(userId: string, nextActivo: boolean) {
    clearMessages();
    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/activo`, { activo: nextActivo });
      setInfo("Estado de actividad actualizado.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo actualizar el estado del usuario. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function cambiarBloqueo(userId: string, nextBloqueado: boolean) {
    clearMessages();
    if (userId === myId) {
      setError("No es posible modificar el bloqueo del usuario con el que está autenticado.");
      return;
    }

    const accion = nextBloqueado ? "bloquear" : "desbloquear";
    const ok = window.confirm(`Va a ${accion} al usuario seleccionado.\n\n¿Desea continuar?`);
    if (!ok) return;

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/bloqueo`, {
        bloqueado: nextBloqueado,
        observacion: nextBloqueado
          ? "Bloqueo manual por ADMIN_GENERAL"
          : "Desbloqueo manual por ADMIN_GENERAL",
      });
      setInfo(nextBloqueado ? "Usuario bloqueado correctamente." : "Usuario desbloqueado correctamente.");
      await cargar();
    } catch (e: any) {
      const message =
        String(e?.response?.data?.message || "").trim() ||
        "No se pudo actualizar el bloqueo del usuario. Si el problema persiste, contacte al administrador.";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(userId: string) {
  clearMessages();

  const confirm = window.confirm(
    "Va a generar una contraseña temporal para este usuario.\n\n¿Desea continuar?"
  );
  if (!confirm) return;

  const adminPassword = window.prompt(
    "Para continuar, ingrese su contraseña de ADMIN GENERAL:",
    ""
  );
  if (adminPassword === null) return;

  const trimmedAdminPassword = adminPassword.trim();
  if (!trimmedAdminPassword) {
    setError("Debe ingresar su contraseña para confirmar la operación.");
    return;
  }

  const observacion = "Reset manual de contraseña por ADMIN_GENERAL";

  setBusyId(userId);
  try {
    const res = await http.post(`/users/${userId}/reset-password`, {
      adminPassword: trimmedAdminPassword,
      observacion,
    });

    const tempPassword = String(res.data?.tempPassword || "").trim();
    setInfo("Contraseña temporal generada correctamente.");

    if (tempPassword) {
      window.alert(
        `Contraseña temporal generada:\n\n${tempPassword}\n\nPor favor, entréguesela al usuario por un canal seguro.`
      );
    } else {
      window.alert(
        "La contraseña temporal fue generada, pero no se pudo mostrar el valor.\nPor favor, contacte al administrador."
      );
    }

    await cargar();
    await refreshIfSelf(userId);
  } catch (e: any) {
    const message =
      String(e?.response?.data?.message || "").trim() ||
      "No se pudo resetear la contraseña. Si el problema persiste, contacte al administrador.";

    setError(message);
  } finally {
    setBusyId(null);
  }
}

  async function archivar(userId: string) {
    clearMessages();
    if (userId === myId) {
      setError("No es posible archivar el usuario con el que está autenticado.");
      return;
    }

    const ok = window.confirm(
      "Va a archivar al usuario seleccionado.\n\nEl usuario no podrá seguir utilizando el sistema.\n\n¿Desea continuar?"
    );
    if (!ok) return;

    const motivo = window.prompt("Ingrese el motivo institucional del archivo del usuario:", "");
    if (motivo === null) return; // cancelado

    setBusyId(userId);
    try {
      await http.post(`/users/${userId}/archive`, { motivo: motivo || "" });
      setInfo("Usuario archivado correctamente.");
      await cargar();
    } catch {
      setError("No se pudo archivar el usuario. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleSort(key: SortKey) {
    setPage(1);
    setSortBy((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  }

  useEffect(() => {
    cargarBarrios();
    cargarTerritoriosAlojamiento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroQ, filtroRole, filtroPermiso, filtroBarrio, filtroActivo, filtroArchivado, sortBy, sortDir, page, limit]);

  const rows = useMemo(() => usuarios || [], [usuarios]);
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

const controlStyle: CSSProperties = {
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

if (loading) return <p style={{ color: "#E5E7EB" }}>Cargando usuarios…</p>;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        color: "#E5E7EB",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginBottom: 16, color: "#F8FAFC", fontSize: 28 }}>
        Usuarios – ADMIN GENERAL
      </h1>

      {/* Mensajes institucionales */}
      {error && (
        <p
          style={{
            fontWeight: 700,
            color: "#FCA5A5",
            background: "#3F1113",
            border: "1px solid #7F1D1D",
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}
      {info && (
        <p
          style={{
            fontWeight: 700,
            color: "#86EFAC",
            background: "#0F2A1B",
            border: "1px solid #166534",
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {info}
        </p>
      )}

      {/* Filtros */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          border: "1px solid #334155",
          borderRadius: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          background: "#0F172A",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#E5E7EB" }}>
            Búsqueda (apellido, nombre, email, DNI, matrícula):{" "}
            <input
              type="text"
              value={filtroQ}
              onChange={(e) => {
                setFiltroQ(e.target.value);
                setPage(1);
              }}
              style={{
                width: 260,
                padding: "10px 12px",
                fontSize: 14,
                color: "#F8FAFC",
                background: "#111827",
                border: "1px solid #475569",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
            />
          </label>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#E5E7EB" }}>
            Rol base:{" "}
            <select
  value={filtroRole}
  onChange={(e) => {
    setFiltroRole(e.target.value);
    setPage(1);
  }}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    Todos
  </option>
  {ROLES_BASE.map((r) => (
    <option key={r} value={r} style={optionStyle}>
      {r}
    </option>
  ))}
</select>
          </label>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#E5E7EB" }}>
            Permiso:{" "}
            <select
  value={filtroPermiso}
  onChange={(e) => {
    setFiltroPermiso(e.target.value);
    setPage(1);
  }}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    Todos
  </option>
  {PERMISOS_VALIDOS.map((p) => (
    <option key={p} value={p} style={optionStyle}>
      {p}
    </option>
  ))}
</select>
          </label>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#E5E7EB" }}>
            Barrio:{" "}
            <select
  value={filtroBarrio}
  onChange={(e) => {
    setFiltroBarrio(e.target.value);
    setPage(1);
  }}
  disabled={loadingBarrios}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    Todos
  </option>
  {barrios.map((b) => (
    <option key={b} value={b} style={optionStyle}>
      {b}
    </option>
  ))}
</select>
          </label>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#E5E7EB" }}>
            Activo:{" "}
            <select
  value={filtroActivo}
  onChange={(e) => {
    setFiltroActivo(e.target.value as "todos" | "true" | "false");
    setPage(1);
  }}
  style={selectStyle}
>
  <option value="todos" style={optionStyle}>
    Todos
  </option>
  <option value="true" style={optionStyle}>
    Solo activos
  </option>
  <option value="false" style={optionStyle}>
    Solo inactivos
  </option>
</select>
          </label>
        </div>

        <div>
          <label style={{ fontSize: 14, fontWeight: 600, color: "#E5E7EB" }}>
            Archivado:{" "}
            <select
  value={filtroArchivado}
  onChange={(e) => {
    setFiltroArchivado(e.target.value as "todos" | "true" | "false");
    setPage(1);
  }}
  style={selectStyle}
>
  <option value="false" style={optionStyle}>
    No archivados
  </option>
  <option value="true" style={optionStyle}>
    Solo archivados
  </option>
  <option value="todos" style={optionStyle}>
    Todos
  </option>
</select>
          </label>
        </div>

        <div style={{ alignSelf: "flex-end" }}>
          <button
            onClick={cargar}
            style={{
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 700,
              color: "#F8FAFC",
              background: "#1E293B",
              border: "1px solid #475569",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Aplicar filtros / Recargar
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          color: "#CBD5E1",
          fontSize: 14,
        }}
      >
        <div style={{ fontWeight: 700 }}>
          Mostrando {rows.length} de {total} usuarios
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700 }}>
            PÃ¡gina {safePage} de {safeTotalPages}
          </span>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            Por pÃ¡gina:
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={selectStyle}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} style={optionStyle}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((curr) => Math.max(1, curr - 1))}
            style={{
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 700,
              color: "#F8FAFC",
              background: safePage <= 1 ? "#334155" : "#1E293B",
              border: "1px solid #475569",
              borderRadius: 8,
              cursor: safePage <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Anterior
          </button>

          <button
            type="button"
            disabled={safePage >= safeTotalPages}
            onClick={() => setPage((curr) => Math.min(safeTotalPages, curr + 1))}
            style={{
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 700,
              color: "#F8FAFC",
              background: safePage >= safeTotalPages ? "#334155" : "#1E293B",
              border: "1px solid #475569",
              borderRadius: 8,
              cursor: safePage >= safeTotalPages ? "not-allowed" : "pointer",
            }}
          >
            Siguiente
          </button>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          border: "1px solid #334155",
          borderRadius: 10,
          background: "#020817",
        }}
      >
        <table
          border={1}
          cellPadding={6}
          cellSpacing={0}
          style={{
            width: "100%",
            minWidth: 2000,
            borderCollapse: "collapse",
            background: "#020817",
            color: "#E5E7EB",
          }}
        >
          <thead>
            <tr style={{ background: "#0F172A" }}>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("apellido")}
                title="Ordenar por apellido"
              >
                Apellido y Nombre {sortBy === "apellido" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("email")}
                title="Ordenar por email"
              >
                Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("dni")}
                title="Ordenar por DNI"
              >
                DNI {sortBy === "dni" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("matricula")}
                title="Ordenar por matrícula"
              >
                Matrícula {sortBy === "matricula" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("tipoPersonal")}
                title="Ordenar por tipo de personal"
              >
                Tipo personal {sortBy === "tipoPersonal" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
              >
                Grupo jerarquico
              </th>
              <th
  style={{
    cursor: "pointer",
    padding: "12px 14px",
    fontSize: 14,
    border: "1px solid #334155",
    color: "#F8FAFC",
    whiteSpace: "nowrap",
  }}
  onClick={() => toggleSort("role")}
  title="Ordenar por rol base"
>
  Rol base {sortBy === "role" ? (sortDir === "asc" ? "▲" : "▼") : ""}
</th>

<th
  style={{
    padding: "12px 14px",
    fontSize: 14,
    border: "1px solid #334155",
    color: "#F8FAFC",
    whiteSpace: "nowrap",
  }}
>
  Vivienda
</th>

<th
  style={{
    padding: "12px 14px",
    fontSize: 14,
    border: "1px solid #334155",
    color: "#F8FAFC",
    whiteSpace: "nowrap",
  }}
>
  Alojamiento / Plaza
</th>

<th
  style={{
    padding: "12px 14px",
    fontSize: 14,
    border: "1px solid #334155",
    color: "#F8FAFC",
    whiteSpace: "nowrap",
  }}
>
  Permisos
</th>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("barrioAsignado")}
                title="Ordenar por barrio"
              >
                Barrio {sortBy === "barrioAsignado" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
              >
                Territorios Alojamientos
              </th>
              <th
                style={{
                  cursor: "pointer",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
                onClick={() => toggleSort("activo")}
                title="Ordenar por activo"
              >
                Activo {sortBy === "activo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
              >
                Bloqueo
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1px solid #334155",
                  color: "#F8FAFC",
                  whiteSpace: "nowrap",
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
  {rows.map((u) => {
    const busy = busyId === u._id;
    const permisos = Array.isArray(u.permisos) ? u.permisos.map(up) : [];
    const habilitaBarrio = isInspectorLike(permisos);
    const habilitaAlojamientos = hasInspectorAlojamientos(permisos);
    const draft = barrioDraft[u._id] ?? String(u.barrioAsignado || "");
    const territoriosDraft = territorioAlojamientoDraft[u._id] || [];

    return (
      <tr key={u._id} style={{ background: "#020817" }}>
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          {fallback(u.apellido)} {fallback(u.nombre)}
        </td>
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          {fallback(u.email)}
        </td>
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          {fallback(u.dni)}
        </td>
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          {fallback(u.matricula)}
        </td>
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          {tipoPersonalLabel(u.tipoPersonal)}
        </td>
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          {grupoJerarquicoLabel(u.grupoJerarquico)}
        </td>

        {/* ROL */}
        <td style={{ padding: "12px 14px", border: "1px solid #334155", fontSize: 14 }}>
          <select
  value={u.role || ""}
  onChange={(e) => cambiarRol(u._id, e.target.value)}
  disabled={busy}
  style={{ ...selectStyle, minWidth: 160 }}
>
  <option value="" style={optionStyle}>
    (sin rol)
  </option>
  {ROLES_BASE.map((r) => (
    <option key={r} value={r} style={optionStyle}>
      {r}
    </option>
  ))}
</select>
        </td>

        {/* 👇 NUEVA COLUMNA VIVIENDA */}
        <td
          style={{
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          {fallback(u.viviendaLabel)}
        </td>

        <td
          style={{
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          {fallback(u.alojamientoLabel)}
        </td>

        {/* PERMISOS */}
        <td
          style={{
            whiteSpace: "nowrap",
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
          }}
        >
          {PERMISOS_VALIDOS.map((p) => {
            const checked = permisos.includes(p);
            return (
              <label key={p} style={{ marginRight: 14 }}>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? Array.from(new Set([...permisos, p]))
                      : permisos.filter((x) => x !== p);
                    setPermisos(u._id, next);
                  }}
                />{" "}
                {p}
              </label>
            );
          })}
        </td>

        <td
          style={{
            whiteSpace: "nowrap",
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
          }}
        >
          {habilitaBarrio ? (
            <>
              <select
  value={draft}
  onChange={(e) =>
    setBarrioDraft((curr) => ({ ...curr, [u._id]: e.target.value }))
  }
  disabled={busy || loadingBarrios}
  style={{ ...selectStyle, minWidth: 160 }}
>
  <option value="" style={optionStyle}>
    Seleccionar
  </option>
  {barrios.map((b) => (
    <option key={b} value={b} style={optionStyle}>
      {b}
    </option>
  ))}
</select>{" "}
              <button
                disabled={busy || loadingBarrios}
                onClick={() => guardarBarrio(u._id)}
                style={{
                  padding: "9px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#F8FAFC",
                  background: "#1E293B",
                  border: "1px solid #475569",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
            </>
          ) : (
            "—"
          )}
        </td>

        <td
          style={{
            whiteSpace: "nowrap",
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
          }}
        >
          {habilitaAlojamientos ? (
            <>
              <select
                multiple
                size={Math.min(Math.max(territoriosAlojamiento.length, 2), 4)}
                value={territoriosDraft}
                onChange={(e) => {
                  const selected = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
                  setTerritorioAlojamientoDraft((curr) => ({ ...curr, [u._id]: selected }));
                }}
                disabled={busy || loadingTerritoriosAlojamiento}
                style={{ ...selectStyle, minWidth: 220, minHeight: 74 }}
              >
                {territoriosAlojamiento.map((t) => (
                  <option key={territorioKey(t)} value={territorioKey(t)} style={optionStyle}>
                    {territorioLabel(t)}
                  </option>
                ))}
              </select>{" "}
              <button
                disabled={busy || loadingTerritoriosAlojamiento}
                onClick={() => guardarTerritoriosAlojamiento(u._id)}
                style={{
                  padding: "9px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#F8FAFC",
                  background: "#1E293B",
                  border: "1px solid #475569",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
            </>
          ) : (
            "Sin asignar"
          )}
        </td>

        <td
          style={{
            textAlign: "center",
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
          }}
        >
          <button
            disabled={busy}
            onClick={() => cambiarActivo(u._id, !(u.activo !== false))}
            style={{
              padding: "9px 12px",
              fontSize: 14,
              fontWeight: 700,
              color: "#F8FAFC",
              background: "#1E293B",
              border: "1px solid #475569",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {u.activo === false ? "Marcar activo" : "Marcar inactivo"}
          </button>
        </td>

        <td
          style={{
            textAlign: "center",
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              display: "inline-block",
              marginRight: 8,
              padding: "4px 8px",
              borderRadius: 999,
              fontWeight: 800,
              color: u.bloqueado ? "#FCA5A5" : "#86EFAC",
              background: u.bloqueado ? "#3F1113" : "#0F2A1B",
              border: u.bloqueado ? "1px solid #7F1D1D" : "1px solid #166534",
            }}
          >
            {u.bloqueado ? "Bloqueado" : "Sin bloqueo"}
          </span>
          {u.bloqueado ? (
            <button
              disabled={busy || u._id === myId}
              onClick={() => cambiarBloqueo(u._id, false)}
              style={{
                padding: "9px 12px",
                fontSize: 14,
                fontWeight: 700,
                color: "#F8FAFC",
                background: "#1E293B",
                border: "1px solid #475569",
                borderRadius: 8,
                cursor: busy || u._id === myId ? "not-allowed" : "pointer",
              }}
            >
              Desbloquear
            </button>
          ) : (
            <button
              disabled={busy || u._id === myId}
              onClick={() => cambiarBloqueo(u._id, true)}
              style={{
                padding: "9px 12px",
                fontSize: 14,
                fontWeight: 700,
                color: "#F8FAFC",
                background: "#3F1D1D",
                border: "1px solid #7F1D1D",
                borderRadius: 8,
                cursor: busy || u._id === myId ? "not-allowed" : "pointer",
              }}
            >
              Bloquear
            </button>
          )}
        </td>

        <td
          style={{
            whiteSpace: "nowrap",
            padding: "12px 14px",
            border: "1px solid #334155",
            fontSize: 14,
          }}
        >
          <button
            disabled={busy}
            onClick={() => resetPassword(u._id)}
            style={{
              marginRight: 8,
              padding: "9px 12px",
              fontSize: 14,
              fontWeight: 700,
              color: "#F8FAFC",
              background: "#1E293B",
              border: "1px solid #475569",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Resetear clave
          </button>
          <button
            disabled={busy || u._id === myId}
            onClick={() => archivar(u._id)}
            style={{
              padding: "9px 12px",
              fontSize: 14,
              fontWeight: 700,
              color: "#F8FAFC",
              background: "#3F1D1D",
              border: "1px solid #7F1D1D",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Archivar
          </button>
        </td>
      </tr>
    );
  })}

  {rows.length === 0 && (
    <tr>
      <td
        colSpan={15}
        style={{
          textAlign: "center",
          padding: 16,
          border: "1px solid #334155",
          fontSize: 14,
          color: "#CBD5E1",
        }}
      >
        No hay usuarios para los filtros seleccionados.
      </td>
    </tr>
  )}
</tbody>
        </table>
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          onClick={cargar}
          style={{
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 700,
            color: "#F8FAFC",
            background: "#1E293B",
            border: "1px solid #475569",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </div>

      {/* Nota: el alta (creación) de usuarios la conectamos cuando revisemos juntos el endpoint exacto de backend que quieras usar. */}
    </div>
  );
}
