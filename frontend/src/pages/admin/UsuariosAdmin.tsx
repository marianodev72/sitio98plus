// frontend/src/pages/admin/UsuariosAdmin.tsx
import { useEffect, useMemo, useState } from "react";
import { http } from "../../api/http";

type Usuario = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;
  role?: string;
  permisos?: string[];
  barrioAsignado?: string;
  viviendaAsignada?: string;
  activo?: boolean;
  archivado?: boolean;

  // opcional si viene en admin-list
  viviendaOcupadaLabel?: string;
};

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

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function UsuariosAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros (solo lectura)
  const [filtroQ, setFiltroQ] = useState("");
  const [filtroRole, setFiltroRole] = useState<string>("");
  const [filtroBarrio, setFiltroBarrio] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "true" | "false">("todos");
  const [filtroArchivado, setFiltroArchivado] = useState<"false" | "true" | "todos">("false");

  const [sortBy, setSortBy] = useState<SortKey>("apellido");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [barrios, setBarrios] = useState<string[]>([]);
  const [loadingBarrios, setLoadingBarrios] = useState(false);

  // ✅ Modal Datos Declarados
  const [openDatosUser, setOpenDatosUser] = useState<Usuario | null>(null);
  const [ultimoDeclarado, setUltimoDeclarado] = useState<any | null>(null);
  const [historialDeclarado, setHistorialDeclarado] = useState<any[]>([]);
  const [loadingUltimo, setLoadingUltimo] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  function clearMessages() {
    setError("");
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
    if (!itemId) return;
    window.open(`/api/formularios/mis-datos-declarados/${itemId}/pdf/preview`, "_blank");
  }

  async function verDatosDeclarados(u: Usuario) {
    clearMessages();

    const userId = String(u?._id || "");
    if (!userId) return;

    setOpenDatosUser(u);
    setUltimoDeclarado(null);
    setHistorialDeclarado([]);

    // 1) último
    setLoadingUltimo(true);
    try {
      const resUlt = await http.get(`/formularios/mis-datos-declarados/usuario/${userId}/ultimo`);
      setUltimoDeclarado(resUlt.data?.item || null);
    } catch {
      setUltimoDeclarado(null);
      setError("No se pudieron cargar los datos declarados del usuario.");
    } finally {
      setLoadingUltimo(false);
    }

    // 2) historial
    setLoadingHistorial(true);
    try {
      const resHist = await http.get(`/formularios/mis-datos-declarados/usuario/${userId}/historial`, {
        params: { limit: 100 },
      });
      setHistorialDeclarado(Array.isArray(resHist.data?.items) ? resHist.data.items : []);
    } catch {
      setHistorialDeclarado([]);
      setError("No se pudo cargar el historial de datos declarados.");
    } finally {
      setLoadingHistorial(false);
    }
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

  async function cargar() {
    setLoading(true);
    setError("");

    try {
      const params: Record<string, string> = {};

      if (filtroQ.trim()) params.q = filtroQ.trim();
      if (filtroRole) params.role = up(filtroRole);
      if (filtroBarrio) params.barrio = filtroBarrio;

      if (filtroActivo !== "todos") params.activo = filtroActivo;
      if (filtroArchivado !== "todos") params.archivado = filtroArchivado;

      params.sortBy = sortBy;
      params.sortDir = sortDir;

      // ✅ usa mismo endpoint admin-list (backend decide acceso real)
      const res = await http.get("/users/admin-list", { params });
      const list = Array.isArray(res.data?.usuarios) ? (res.data.usuarios as Usuario[]) : [];
      setUsuarios(list);
    } catch {
      setUsuarios([]);
      setError("No se pudieron cargar los usuarios. Por favor, intente nuevamente o contacte al administrador.");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    cargarBarrios();
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroQ, filtroRole, filtroBarrio, filtroActivo, filtroArchivado, sortBy, sortDir]);

  const rows = useMemo(() => usuarios || [], [usuarios]);

  if (loading) return <p>Cargando usuarios…</p>;

  return (
    <div>
      <h1>Usuarios — ADMIN (solo lectura)</h1>

      {error ? <p style={{ fontWeight: 700, color: "darkred" }}>{error}</p> : null}

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
            Búsqueda:{" "}
            <input type="text" value={filtroQ} onChange={(e) => setFiltroQ(e.target.value)} style={{ width: 260 }} />
          </label>
        </div>

        <div>
          <label>
            Rol base:{" "}
            <select value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)}>
              <option value="">Todos</option>
              <option value="POSTULANTE">POSTULANTE</option>
              <option value="PERMISIONARIO">PERMISIONARIO</option>
              <option value="ALOJADO">ALOJADO</option>
              <option value="ADMIN">ADMIN</option>
              <option value="ADMIN_GENERAL">ADMIN_GENERAL</option>
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
          <button onClick={cargar}>Recargar</button>
        </div>
      </div>

      <table border={1} cellPadding={6} cellSpacing={0}>
        <thead>
          <tr>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("apellido")}>
              Apellido y Nombre {sortBy === "apellido" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("email")}>
              Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("dni")}>
              DNI {sortBy === "dni" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("matricula")}>
              Matrícula {sortBy === "matricula" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("role")}>
              Rol base {sortBy === "role" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th>Permisos</th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("barrioAsignado")}>
              Barrio {sortBy === "barrioAsignado" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th>Vivienda (asignada)</th>
            <th>Vivienda (ocupada)</th>
            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("activo")}>
              Activo {sortBy === "activo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((u) => {
            const isPermisionario = up(u.role) === "PERMISIONARIO";

            return (
              <tr key={u._id}>
                <td>
                  {safe(u.apellido)} {safe(u.nombre)}
                </td>
                <td>{safe(u.email)}</td>
                <td>{safe(u.dni)}</td>
                <td>{safe(u.matricula)}</td>
                <td>{safe(u.role)}</td>
                <td>{Array.isArray(u.permisos) && u.permisos.length ? u.permisos.map(up).join(", ") : "—"}</td>
                <td>{safe(u.barrioAsignado)}</td>
                <td>{safe(u.viviendaAsignada)}</td>
                <td>{safe((u as any).viviendaOcupadaLabel)}</td>
                <td>{u.activo === false ? "No" : "Sí"}</td>

                {/* ✅ ACCIONES */}
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    disabled={!isPermisionario}
                    onClick={() => verDatosDeclarados(u)}
                    title={!isPermisionario ? "Solo disponible para PERMISIONARIO" : "Ver Mis Datos Declarados"}
                  >
                    Datos declarados
                  </button>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={11} style={{ textAlign: "center", padding: 12 }}>
                No hay usuarios para los filtros seleccionados.
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
  {ultimoDeclarado?.createdAt
    ? new Date(ultimoDeclarado.createdAt).toLocaleString("es-AR")
    : "—"}
</p>

<p style={{ margin: 0 }}>
  <b>Motivo:</b>{" "}
  {ultimoDeclarado?.motivo ? String(ultimoDeclarado.motivo) : "—"}
</p>


                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => verPdfDeclarado(String(ultimoDeclarado._id))}>Ver</button>
                  <button onClick={() => descargarPdfDeclarado(String(ultimoDeclarado._id))}>PDF</button>
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
                    <th style={{ width: 160 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialDeclarado.map((it) => (
                    <tr key={String(it?._id || Math.random())}>
                      <td>{it?.createdAt ? new Date(it.createdAt).toLocaleString("es-AR") : "—"}</td>
                      <td style={{ fontFamily: "monospace" }}>{String(it?._id || "")}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button onClick={() => verPdfDeclarado(String(it._id))} style={{ marginRight: 8 }}>
                          Ver
                        </button>
                        <button onClick={() => descargarPdfDeclarado(String(it._id))}>PDF</button>
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
