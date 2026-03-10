// frontend/src/pages/admin_general/Usuarios.tsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Usuario = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;

  role?: string; // rol base
  permisos?: string[];

  barrioAsignado?: string;

  // ✅ Asignación administrativa (espera / reserva). No es ocupación real.
  viviendaAsignada?: string;

  activo?: boolean;
  archivado?: boolean;

  // opcional
  createdAt?: string;
};

const ROLES_BASE = ["POSTULANTE", "PERMISIONARIO", "ALOJADO", "ADMIN", "ADMIN_GENERAL"] as const;
const PERMISOS_VALIDOS = ["INSPECTOR", "JEFE_DE_BARRIO"] as const;

type SortKey =
  | "apellido"
  | "nombre"
  | "email"
  | "dni"
  | "matricula"
  | "role"
  | "barrioAsignado"
  | "activo"
  | "archivadoAt";

type SortDir = "asc" | "desc";

type ViewMode = "usuarios" | "registros";

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function isInspectorLike(permisos?: string[]) {
  const list = Array.isArray(permisos) ? permisos.map(up) : [];
  return list.includes("INSPECTOR") || list.includes("JEFE_DE_BARRIO");
}

// ✅ Normaliza respuesta de /viviendas/codigos a string[]
function normalizeCodigosPayload(payload: any): string[] {
  if (Array.isArray(payload)) {
    return payload.map((x) => String(x || "").trim()).filter(Boolean);
  }

  const list = Array.isArray(payload?.codigos) ? payload.codigos : [];
  if (!Array.isArray(list)) return [];

  const codigos = list
    .map((item: any) => {
      if (typeof item === "string" || typeof item === "number") return String(item).trim();
      if (item && typeof item === "object") {
        const c = item.codigo ?? item.value ?? item.label;
        return String(c || "").trim();
      }
      return "";
    })
    .filter(Boolean);

  return codigos;
}

export default function UsuariosAdminGeneral() {
  const [viewMode, setViewMode] = useState<ViewMode>("usuarios");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // ✅ MIS DATOS DECLARADOS (modal)
  const [openDatosUser, setOpenDatosUser] = useState<Usuario | null>(null);
  const [ultimoDeclarado, setUltimoDeclarado] = useState<any | null>(null);
  const [historialDeclarado, setHistorialDeclarado] = useState<any[]>([]);
  const [loadingUltimo, setLoadingUltimo] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // filtros
  const [filtroQ, setFiltroQ] = useState("");
  const [filtroRole, setFiltroRole] = useState<string>("");
  const [filtroPermiso, setFiltroPermiso] = useState<string>("");
  const [filtroBarrio, setFiltroBarrio] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "true" | "false">("todos");
  const [filtroArchivado, setFiltroArchivado] = useState<"false" | "true" | "todos">("false");

  const [sortBy, setSortBy] = useState<SortKey>("apellido");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // barrios disponibles para combo
  const [barrios, setBarrios] = useState<string[]>([]);
  const [loadingBarrios, setLoadingBarrios] = useState(false);

  // viviendas disponibles por barrio (códigos humanos AB-xxx)
  const [viviendasPorBarrio, setViviendasPorBarrio] = useState<Record<string, string[]>>({});
  const [loadingViviendas, setLoadingViviendas] = useState(false);

  // drafts por usuario (edición local)
  const [barrioDraft, setBarrioDraft] = useState<Record<string, string>>({});
  const [viviendaDraft, setViviendaDraft] = useState<Record<string, string>>({});

  const { user, refresh } = useAuth();
  const myId = String(user?._id || "");

  function clearMessages() {
    setError("");
    setInfo("");
  }

  // ✅ Abrir modal + cargar último + historial
  async function verDatosDeclarados(u: Usuario) {
    clearMessages();

    const userId = String(u?._id || "");
    if (!userId) return;

    setOpenDatosUser(u);
    setUltimoDeclarado(null);
    setHistorialDeclarado([]);

    // 1) Último
    setLoadingUltimo(true);
    try {
      const res = await http.get(`/formularios/mis-datos-declarados/usuario/${userId}/ultimo`);
      setUltimoDeclarado(res.data?.item || null);
    } catch {
      setUltimoDeclarado(null);
      setError("No se pudo cargar el último registro de datos declarados.");
    } finally {
      setLoadingUltimo(false);
    }

    // 2) Historial
    setLoadingHistorial(true);
    try {
      const res = await http.get(`/formularios/mis-datos-declarados/usuario/${userId}/historial`, {
        params: { limit: 100 },
      });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setHistorialDeclarado(items);
    } catch {
      setHistorialDeclarado([]);
      setError("No se pudo cargar el historial de datos declarados.");
    } finally {
      setLoadingHistorial(false);
    }
  }

  function cerrarModalDatosDeclarados() {
    setOpenDatosUser(null);
    setUltimoDeclarado(null);
    setHistorialDeclarado([]);
    setLoadingUltimo(false);
    setLoadingHistorial(false);
  }

  function descargarPdfDeclarado(itemId: string) {
    if (!itemId) return;
    window.open(`/api/formularios/mis-datos-declarados/${itemId}/pdf`, "_blank");
  }

  function verPdfDeclarado(itemId: string) {
    window.open(`/api/formularios/mis-datos-declarados/${itemId}/pdf/preview`, "_blank");
  }

  async function cargarBarrios() {
    try {
      setLoadingBarrios(true);
      const res = await http.get("/viviendas/barrios");
      const list = Array.isArray(res.data?.barrios) ? (res.data.barrios as string[]) : [];
      setBarrios(list);
    } catch {
      setBarrios([]);
    } finally {
      setLoadingBarrios(false);
    }
  }

  async function cargarViviendasParaBarrio(barrio: string) {
    const b = String(barrio || "").trim();
    if (!b) return;

    if (Array.isArray(viviendasPorBarrio[b]) && viviendasPorBarrio[b].length > 0) return;

    try {
      setLoadingViviendas(true);
      const res = await http.get("/viviendas/codigos", { params: { barrio: b } });
      const codigos = normalizeCodigosPayload(res.data);
      setViviendasPorBarrio((curr) => ({ ...curr, [b]: codigos }));
    } catch {
      setViviendasPorBarrio((curr) => ({ ...curr, [b]: [] }));
    } finally {
      setLoadingViviendas(false);
    }
  }

  async function cargar() {
    setLoading(true);
    clearMessages();
    try {
      const params: Record<string, string> = {};

            // ✅ Modo Registros: pendientes institucionales (POSTULANTE + activo=false + no archivado)
      // No inventamos flags: el backend ya filtra por role/activo/archivado en buildFiltro().
      if (viewMode === "registros") {
        params.role = "POSTULANTE";
        params.activo = "false";
        params.archivado = "false";
        params.sortBy = "apellido";
        params.sortDir = "asc";
      } else {
        if (filtroQ.trim()) params.q = filtroQ.trim();
        if (filtroRole) params.role = filtroRole;
        if (filtroPermiso) params.permiso = filtroPermiso;
        if (filtroBarrio) params.barrio = filtroBarrio;

        if (filtroActivo !== "todos") params.activo = filtroActivo;
        if (filtroArchivado !== "todos") params.archivado = filtroArchivado;

        params.sortBy = sortBy;
        params.sortDir = sortDir;
      }

      const res = await http.get("/users/admin-list", { params });
      const list = Array.isArray(res.data?.usuarios) ? (res.data.usuarios as Usuario[]) : [];
      setUsuarios(list);

      // drafts solo tienen sentido en modo usuarios
      if (viewMode === "usuarios") {
        setBarrioDraft((curr) => {
          const next = { ...curr };
          list.forEach((u) => {
            if (next[u._id] === undefined) next[u._id] = String(u.barrioAsignado || "");
          });
          return next;
        });

        setViviendaDraft((curr) => {
          const next = { ...curr };
          list.forEach((u) => {
            if (next[u._id] === undefined) next[u._id] = String(u.viviendaAsignada || "");
          });
          return next;
        });

        const barriosEnLista = Array.from(new Set(list.map((u) => String(u.barrioAsignado || "").trim()).filter(Boolean)));
        for (const b of barriosEnLista) {
          cargarViviendasParaBarrio(b);
        }
      }
    } catch {
      setUsuarios([]);
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
        //
      }
    }
  }

    // ─────────────────────────────────────────────
  // ✅ Acciones ADMIN_GENERAL sobre REGISTROS (pendientes)
  // ─────────────────────────────────────────────
  async function aprobarRegistro(userId: string) {
    clearMessages();

    const obs = window.prompt("Observación institucional (obligatoria) para APROBAR registro:", "");
    if (obs === null) return;
    if (!String(obs).trim()) {
      setError("La observación institucional es obligatoria.");
      return;
    }

    setBusyId(userId);
    try {
      // ✅ Backend existente: PATCH /api/users/:id/activo
      await http.patch(`/users/${userId}/activo`, {
        activo: true,
        observacion: String(obs).trim(),
      });

      setInfo("Registro aprobado correctamente.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("Su solicitud no ha podido ser procesada, contacte al Administrador");
    } finally {
      setBusyId(null);
    }
  }

  async function desaprobarRegistro(userId: string) {
    clearMessages();

    const obs = window.prompt("Observación institucional (obligatoria) para DESAPROBAR registro:", "");
    if (obs === null) return;
    if (!String(obs).trim()) {
      setError("La observación institucional es obligatoria.");
      return;
    }

    setBusyId(userId);
    try {
      // ✅ Backend existente: POST /api/users/:id/archive
      // Esto deja al usuario fuera del sistema (archivado=true, activo=false, bloqueado=true).
      await http.post(`/users/${userId}/archive`, { motivo: String(obs).trim() });

      setInfo("Registro desaprobado correctamente.");
      await cargar();
    } catch {
      setError("Su solicitud no ha podido ser procesada, contacte al Administrador");
    } finally {
      setBusyId(null);
    }
  }

  // ─────────────────────────────────────────────
  // ✅ Acciones ADMIN_GENERAL sobre USUARIOS (existente)
  // ─────────────────────────────────────────────
  async function cambiarRol(userId: string, role: string, row?: Usuario) {
    clearMessages();

    const nextRole = up(role);
    const permisos = Array.isArray(row?.permisos) ? row!.permisos!.map(up) : [];
    const draftBarrio = String(barrioDraft[userId] || row?.barrioAsignado || "").trim();

    if (nextRole === "PERMISIONARIO" && isInspectorLike(permisos) && !draftBarrio) {
      setError("Para asignar PERMISIONARIO con permisos territoriales debe indicar el barrio y guardarlo.");
      return;
    }

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/role`, { role: nextRole });
      setInfo("Rol base actualizado.");

      if (nextRole === "PERMISIONARIO" && draftBarrio) {
        cargarViviendasParaBarrio(draftBarrio);
      }

      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo cambiar el rol base. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function setPermisos(userId: string, permisos: string[], row?: Usuario) {
    clearMessages();

    const role = up(row?.role);
    const draftBarrio = String(barrioDraft[userId] || row?.barrioAsignado || "").trim();

    if (role === "PERMISIONARIO" && isInspectorLike(permisos) && !draftBarrio) {
      setError("Para asignar permisos territoriales debe indicar el barrio y guardarlo.");
      return;
    }

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/permisos`, { permisos });
      setInfo("Permisos actualizados.");

      if (role === "PERMISIONARIO" && isInspectorLike(permisos) && draftBarrio) {
        cargarViviendasParaBarrio(draftBarrio);
      }

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

      cargarViviendasParaBarrio(b);

      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo asignar el barrio. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function guardarVivienda(userId: string, row?: Usuario) {
    clearMessages();

    const role = up(row?.role);
    if (role !== "PERMISIONARIO") {
      setError("Solo se puede asignar vivienda a usuarios con rol PERMISIONARIO.");
      return;
    }

    const barrioActual = String(barrioDraft[userId] || row?.barrioAsignado || "").trim();
    if (!barrioActual) {
      setError("Debe asignar el barrio antes de guardar la vivienda.");
      return;
    }

    const codigo = String(viviendaDraft[userId] || "").trim();

    const obs = window.prompt(
      codigo
        ? `Observación institucional (obligatoria) para asignar vivienda ${codigo}:`
        : "Observación institucional (obligatoria) para limpiar vivienda:"
    );
    if (obs === null) return;
    if (!String(obs).trim()) {
      setError("La observación institucional es obligatoria.");
      return;
    }

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/vivienda`, {
        viviendaCodigo: codigo,
        observacion: String(obs).trim(),
      });

      setInfo(codigo ? "Vivienda asignada correctamente." : "Vivienda limpiada correctamente.");

      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo guardar la vivienda. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  async function resetAsignacion(userId: string, row?: Usuario) {
    clearMessages();

    const role = up(row?.role);
    if (role !== "PERMISIONARIO") {
      setError("Solo se puede resetear asignación para usuarios PERMISIONARIO.");
      return;
    }

    const ok = window.confirm(
      "Esto reseteará la asignación del usuario:\n\n- Quita barrio asignado\n- Libera ocupación real de vivienda\n- Deja al usuario en estado EN_ESPERA\n\n¿Desea continuar?"
    );
    if (!ok) return;

    const obs = window.prompt("Observación institucional (obligatoria) para reset de asignación:", "");
    if (obs === null) return;
    if (!String(obs).trim()) {
      setError("La observación institucional es obligatoria.");
      return;
    }

    setBusyId(userId);
    try {
      await http.patch(`/users/${userId}/reset-asignacion`, { observacion: String(obs).trim() });

      setBarrioDraft((curr) => ({ ...curr, [userId]: "" }));
      setViviendaDraft((curr) => ({ ...curr, [userId]: "" }));

      setInfo("Asignación reseteada correctamente.");
      await cargar();
      await refreshIfSelf(userId);
    } catch {
      setError("No se pudo resetear la asignación. Si el problema persiste, contacte al administrador.");
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

  async function resetPassword(userId: string) {
    clearMessages();
    const confirm = window.confirm("Va a generar una contraseña temporal para este usuario.\n\n¿Desea continuar?");
    if (!confirm) return;

    setBusyId(userId);
    try {
      const res = await http.post(`/users/${userId}/reset-password`);
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
    } catch {
      setError("No se pudo resetear la contraseña. Si el problema persiste, contacte al administrador.");
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
    if (motivo === null) return;

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

  async function desarchivar(userId: string) {
    clearMessages();
    const ok = window.confirm("Va a desarchivar al usuario seleccionado.\n\n¿Desea continuar?");
    if (!ok) return;

    setBusyId(userId);
    try {
      await http.post(`/users/${userId}/unarchive`, {});
      setInfo("Usuario desarchivado correctamente.");
      await cargar();
    } catch {
      setError("No se pudo desarchivar el usuario. Si el problema persiste, contacte al administrador.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleSort(key: SortKey) {
    setSortBy((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  }

  function activarVistaUsuarios() {
    setViewMode("usuarios");
  }

  function activarVistaRegistros() {
    // preset “seguro” para no mezclar con inactivos generales
    setFiltroQ("");
    setFiltroPermiso("");
    setFiltroBarrio("");
    setFiltroRole("POSTULANTE");
    setFiltroActivo("false");
    setFiltroArchivado("false");
    setSortBy("apellido");
    setSortDir("asc");
    setViewMode("registros");
  }

  useEffect(() => {
    cargarBarrios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, filtroQ, filtroRole, filtroPermiso, filtroBarrio, filtroActivo, filtroArchivado, sortBy, sortDir]);

  const rows = useMemo(() => usuarios || [], [usuarios]);

  if (loading) return <p>Cargando usuarios…</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>Usuarios – ADMIN GENERAL</h1>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={activarVistaUsuarios} disabled={viewMode === "usuarios"}>
            Usuarios
          </button>
          <button onClick={activarVistaRegistros} disabled={viewMode === "registros"}>
            Registros
          </button>
        </div>
      </div>

      {viewMode === "registros" ? (
        <p style={{ marginTop: 0 }}>
          Vista <b>Registros</b>: muestra solicitudes pendientes (fail-closed). Acciones: aprobar / desaprobar.
        </p>
      ) : null}

      {error ? <p style={{ fontWeight: 700, color: "darkred" }}>{error}</p> : null}
      {info ? <p style={{ fontWeight: 700, color: "darkgreen" }}>{info}</p> : null}

      {/* Filtros (solo aplica a vista usuarios; en registros se filtra por params fail-closed) */}
      {viewMode === "usuarios" ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 4,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <label>
              Búsqueda (apellido, nombre, email, DNI, matrícula):{" "}
              <input type="text" value={filtroQ} onChange={(e) => setFiltroQ(e.target.value)} style={{ width: 260 }} />
            </label>
          </div>

          <div>
            <label>
              Rol base:{" "}
              <select value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)}>
                <option value="">Todos</option>
                {ROLES_BASE.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              Permiso:{" "}
              <select value={filtroPermiso} onChange={(e) => setFiltroPermiso(e.target.value)}>
                <option value="">Todos</option>
                {PERMISOS_VALIDOS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              Barrio:{" "}
              <select value={filtroBarrio} onChange={(e) => setFiltroBarrio(e.target.value)} disabled={loadingBarrios}>
                <option value="">Todos</option>
                {barrios.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              Activo:{" "}
              <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value as any)}>
                <option value="todos">Todos</option>
                <option value="true">Solo activos</option>
                <option value="false">Solo inactivos</option>
              </select>
            </label>
          </div>

          <div>
            <label>
              Archivado:{" "}
              <select value={filtroArchivado} onChange={(e) => setFiltroArchivado(e.target.value as any)}>
                <option value="false">No archivados</option>
                <option value="true">Solo archivados</option>
                <option value="todos">Todos</option>
              </select>
            </label>
          </div>

          <div style={{ alignSelf: "flex-end" }}>
            <button onClick={cargar}>Aplicar filtros / Recargar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <button onClick={cargar}>Recargar</button>
        </div>
      )}

      <table border={1} cellPadding={6} cellSpacing={0}>
        <thead>
          <tr>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("apellido")} title="Ordenar por apellido">
              Apellido y Nombre {sortBy === "apellido" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("email")} title="Ordenar por email">
              Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("dni")} title="Ordenar por DNI">
              DNI {sortBy === "dni" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("matricula")} title="Ordenar por matrícula">
              Matrícula {sortBy === "matricula" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>

            {viewMode === "usuarios" ? (
              <>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("role")} title="Ordenar por rol base">
                  Rol base {sortBy === "role" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Permisos</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("barrioAsignado")} title="Ordenar por barrio">
                  Barrio {sortBy === "barrioAsignado" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Vivienda</th>
                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("activo")} title="Ordenar por activo">
                  Activo {sortBy === "activo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Acciones</th>
              </>
            ) : (
              <>
                <th>Estado</th>
                <th>Acciones</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((u) => {
            const busy = busyId === u._id;

            if (viewMode === "registros") {
              return (
                <tr key={u._id}>
                  <td>
                    {safe(u.apellido)} {safe(u.nombre)}
                  </td>
                  <td>{safe(u.email)}</td>
                  <td>{safe(u.dni)}</td>
                  <td>{safe(u.matricula)}</td>
                  <td>
                    {up(u.role) === "POSTULANTE" && u.activo === false ? "PENDIENTE" : safe(u.role)}{" "}
                    {u.archivado ? "(ARCHIVADO)" : ""}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button disabled={busy} onClick={() => aprobarRegistro(u._id)} style={{ marginRight: 8 }}>
                      Aprobar
                    </button>
                    <button disabled={busy} onClick={() => desaprobarRegistro(u._id)}>
                      Desaprobar
                    </button>
                  </td>
                </tr>
              );
            }

            // viewMode === "usuarios" (modo actual)
            const permisos = Array.isArray(u.permisos) ? u.permisos.map(up) : [];
            const draftBarrio = barrioDraft[u._id] ?? String(u.barrioAsignado || "");
            const draftVivienda = viviendaDraft[u._id] ?? String(u.viviendaAsignada || "");

            const role = up(u.role);
            const isPermisionario = role === "PERMISIONARIO";
            const barrioActual = String(draftBarrio || "").trim();

            const viviendasDisponibles = barrioActual ? viviendasPorBarrio[barrioActual] || [] : [];

            return (
              <tr key={u._id}>
                <td>
                  {safe(u.apellido)} {safe(u.nombre)}
                </td>
                <td>{safe(u.email)}</td>
                <td>{safe(u.dni)}</td>
                <td>{safe(u.matricula)}</td>

                <td>
                  <select value={u.role || ""} onChange={(e) => cambiarRol(u._id, e.target.value, u)} disabled={busy}>
                    <option value="">(sin rol)</option>
                    {ROLES_BASE.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={{ whiteSpace: "nowrap" }}>
                  {PERMISOS_VALIDOS.map((p) => {
                    const checked = permisos.includes(p);
                    return (
                      <label key={p} style={{ marginRight: 10 }}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? Array.from(new Set([...permisos, p]))
                              : permisos.filter((x) => x !== p);
                            setPermisos(u._id, next, u);
                          }}
                        />{" "}
                        {p}
                      </label>
                    );
                  })}
                </td>

                {/* ✅ Barrio */}
                <td style={{ whiteSpace: "nowrap" }}>
                  {isPermisionario ? (
                    <>
                      <select
                        value={draftBarrio}
                        disabled={busy || loadingBarrios}
                        onChange={(e) => {
                          const nextBarrio = e.target.value;
                          setBarrioDraft((curr) => ({ ...curr, [u._id]: nextBarrio }));

                          if (nextBarrio) cargarViviendasParaBarrio(nextBarrio);

                          setViviendaDraft((curr) => ({ ...curr, [u._id]: "" }));
                        }}
                        style={{ minWidth: 200 }}
                      >
                        <option value="">Seleccione barrio…</option>
                        {barrios.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>{" "}
                      <button disabled={busy || loadingBarrios} onClick={() => guardarBarrio(u._id)}>
                        Guardar
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </td>

                {/* ✅ Vivienda */}
                <td style={{ whiteSpace: "nowrap" }}>
                  {isPermisionario ? (
                    <>
                      <select
                        value={draftVivienda}
                        disabled={busy || loadingViviendas || !barrioActual}
                        onChange={(e) => setViviendaDraft((curr) => ({ ...curr, [u._id]: e.target.value }))}
                        style={{ minWidth: 140 }}
                        title={!barrioActual ? "Debe asignar barrio antes de vivienda." : ""}
                      >
                        <option value="">{barrioActual ? "(sin vivienda)" : "Primero seleccione barrio"}</option>
                        {barrioActual &&
                          viviendasDisponibles.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                      </select>{" "}
                      <button
                        disabled={busy || loadingViviendas || !barrioActual}
                        onClick={() => guardarVivienda(u._id, u)}
                      >
                        Guardar
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </td>

                <td style={{ textAlign: "center" }}>
                  <button disabled={busy} onClick={() => cambiarActivo(u._id, !(u.activo !== false))}>
                    {u.activo === false ? "Marcar activo" : "Marcar inactivo"}
                  </button>
                </td>

                {/* ✅ ACCIONES */}
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    disabled={busy || up(u.role) !== "PERMISIONARIO"}
                    onClick={() => verDatosDeclarados(u)}
                    style={{ marginRight: 8 }}
                    title={up(u.role) !== "PERMISIONARIO" ? "Solo disponible para PERMISIONARIO" : "Ver Mis Datos Declarados"}
                  >
                    Datos declarados
                  </button>

                  <button disabled={busy} onClick={() => resetPassword(u._id)} style={{ marginRight: 8 }}>
                    Resetear clave
                  </button>

                  <button
                    disabled={busy || !isPermisionario}
                    onClick={() => resetAsignacion(u._id, u)}
                    style={{ marginRight: 8 }}
                    title={!isPermisionario ? "Solo disponible para PERMISIONARIO" : ""}
                  >
                    Reset asignación
                  </button>

                  {u.archivado ? (
                    <button disabled={busy || u._id === myId} onClick={() => desarchivar(u._id)}>
                      Desarchivar
                    </button>
                  ) : (
                    <button disabled={busy || u._id === myId} onClick={() => archivar(u._id)}>
                      Archivar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={viewMode === "usuarios" ? 10 : 6} style={{ textAlign: "center", padding: 12 }}>
                No hay resultados para los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ✅ MODAL Datos Declarados */}
      {openDatosUser ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            zIndex: 9999,
          }}
          onClick={() => cerrarModalDatosDeclarados()}
        >
          <div
            style={{
              background: "white",
              width: "min(980px, 96vw)",
              maxHeight: "90vh",
              overflow: "auto",
              borderRadius: 8,
              padding: 14,
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0 }}>
                Datos declarados — {safe(openDatosUser.apellido)} {safe(openDatosUser.nombre)}
              </h2>
              <button onClick={() => cerrarModalDatosDeclarados()}>Cerrar</button>
            </div>

            <hr />

            <h3 style={{ marginTop: 10 }}>Último registro</h3>
            {loadingUltimo ? (
              <p>Cargando último registro…</p>
            ) : ultimoDeclarado?._id ? (
              <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 6 }}>
                <p style={{ margin: 0 }}>
                  <b>ID:</b> {String(ultimoDeclarado._id)}
                </p>
                <p style={{ margin: 0 }}>
                  <b>Fecha:</b>{" "}
                  {ultimoDeclarado?.createdAt ? new Date(ultimoDeclarado.createdAt).toLocaleString("es-AR") : "—"}
                </p>

                <p style={{ margin: 0 }}>
                  <b>Motivo:</b> {ultimoDeclarado?.motivo ? String(ultimoDeclarado.motivo) : "—"}
                </p>

                <div style={{ marginTop: 8 }}>
                  <button onClick={() => descargarPdfDeclarado(String(ultimoDeclarado._id))} style={{ marginRight: 8 }}>
                    Descargar PDF
                  </button>

                  <button onClick={() => verPdfDeclarado(String(ultimoDeclarado._id))}>Ver</button>
                </div>
              </div>
            ) : (
              <p>Este usuario no tiene registros de “Mis Datos Declarados”.</p>
            )}

            <h3 style={{ marginTop: 16 }}>Historial (últimos 100)</h3>
            {loadingHistorial ? (
              <p>Cargando historial…</p>
            ) : historialDeclarado.length === 0 ? (
              <p>(sin historial)</p>
            ) : (
              <table border={1} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: 220 }}>Fecha</th>
                    <th>ID</th>
                    <th style={{ width: 180 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialDeclarado.map((it) => (
                    <tr key={String(it?._id || Math.random())}>
                      <td>{it?.createdAt ? new Date(it.createdAt).toLocaleString("es-AR") : "—"}</td>
                      <td style={{ fontFamily: "monospace" }}>{String(it?._id || "")}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button onClick={() => descargarPdfDeclarado(String(it._id))} style={{ marginRight: 8 }}>
                          PDF
                        </button>

                        <button onClick={() => verPdfDeclarado(String(it._id))}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
