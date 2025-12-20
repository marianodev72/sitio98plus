import { useEffect, useState } from "react";
import { http } from "../../api/http";

type Usuario = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;
  role?: string;
  estadoHabitacional?: string;
  activo?: boolean;
  archivado?: boolean;

  // ✅ NUEVO
  barrioAsignado?: string;
};

type SortBy =
  | "apellido"
  | "nombre"
  | "email"
  | "dni"
  | "matricula"
  | "role"
  | "activo"
  | "estadoHabitacional"
  | "archivadoAt";
type SortDir = "asc" | "desc";

const ROLES = [
  "ADMIN_GENERAL",
  "ADMIN",
  "POSTULANTE",
  "PERMISIONARIO",
  "ALOJADO",
  "INSPECTOR",
  "JEFE_DE_BARRIO",
];

const ROLES_CON_BARRIO = new Set(["INSPECTOR", "JEFE_DE_BARRIO"]);

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function safeFileNameDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}`;
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [activo, setActivo] = useState("");
  const [verArchivados, setVerArchivados] = useState(false);

  // orden
  const [sortBy, setSortBy] = useState<SortBy>("apellido");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ✅ edición local de barrio por usuario
  const [barrioDraft, setBarrioDraft] = useState<Record<string, string>>({});

  function buildParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    if (role) params.role = role;
    if (activo) params.activo = activo;

    // ✅ CRÍTICO: NO mandar archivado si no lo pedís explícitamente
    if (verArchivados) params.archivado = "true";

    params.sortBy = sortBy;
    params.sortDir = sortDir;
    return params;
  }

  async function cargarUsuarios() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await http.get("/users", { params: buildParams() });
      const lista = Array.isArray(res.data) ? res.data : res.data?.usuarios;

      const arr = Array.isArray(lista) ? (lista as Usuario[]) : [];
      setUsuarios(arr);

      // ✅ inicializar drafts de barrio (sin pisar lo que el usuario está editando)
      setBarrioDraft((curr) => {
        const next = { ...curr };
        arr.forEach((u) => {
          if (next[u._id] === undefined) next[u._id] = String(u.barrioAsignado || "");
        });
        return next;
      });
    } catch (err) {
      console.error("Error cargando usuarios", err);
      setUsuarios([]);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  async function cambiarRol(userId: string, nuevoRole: string) {
    setUpdatingId(userId);
    setErrorMsg("");
    const prev = usuarios;

    setUsuarios((curr) => curr.map((u) => (u._id === userId ? { ...u, role: nuevoRole } : u)));

    try {
      await http.patch(`/users/${userId}/role`, { role: nuevoRole });

      // si el nuevo rol NO requiere barrio, limpiamos draft visual
      if (!ROLES_CON_BARRIO.has(up(nuevoRole))) {
        setBarrioDraft((curr) => ({ ...curr, [userId]: "" }));
      }

      await cargarUsuarios();
    } catch (err) {
      console.error("Error cambiando rol", err);
      setUsuarios(prev);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function guardarBarrio(userId: string) {
    const b = String(barrioDraft[userId] || "").trim();

    // regla simple institucional: no guardamos vacío
    if (!b) {
      setErrorMsg("Debe indicar un barrio para asignar.");
      return;
    }

    setUpdatingId(userId);
    setErrorMsg("");

    try {
      await http.patch(`/users/${userId}/barrio`, { barrio: b });
      await cargarUsuarios();
    } catch (err) {
      console.error("Error asignando barrio", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function cambiarActivo(userId: string, nextActivo: boolean) {
    setUpdatingId(userId);
    setErrorMsg("");
    const prev = usuarios;

    setUsuarios((curr) => curr.map((u) => (u._id === userId ? { ...u, activo: nextActivo } : u)));

    try {
      await http.patch(`/users/${userId}/activo`, { activo: nextActivo });
      await cargarUsuarios();
    } catch (err) {
      console.error("Error cambiando activo", err);
      setUsuarios(prev);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setUpdatingId(null);
    }
  }

  function makeTempPasswordAlert(temp?: string) {
    if (temp) alert(`Contraseña temporal generada:\n\n${temp}\n\n(Entregar por canal institucional)`);
    else alert("Operación realizada.");
  }

  async function resetPassword(userId: string) {
    setUpdatingId(userId);
    setErrorMsg("");
    try {
      const res = await http.post(`/users/${userId}/reset-password`);
      makeTempPasswordAlert(res.data?.tempPassword);
    } catch (err) {
      console.error("Error reseteando contraseña", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function archivarUsuario(user: Usuario) {
    const nombre = `${user.apellido || ""} ${user.nombre || ""}`.trim() || user.email || "Usuario";

    const motivo = window.prompt(`ELIMINAR (ARCHIVAR) usuario:\n\n${nombre}\n\nMotivo (opcional):`, "");
    if (motivo === null) return;

    const ok = window.confirm(`Confirmar eliminación institucional (archivado) de:\n\n${nombre}\n\nContinuar?`);
    if (!ok) return;

    setUpdatingId(user._id);
    setErrorMsg("");

    try {
      await http.post(`/users/${user._id}/archive`, { motivo });
      await cargarUsuarios();
    } catch (err) {
      console.error("Error archivando usuario", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function descargarPdf() {
    setErrorMsg("");
    setDownloadingPdf(true);

    try {
      const params = buildParams();
      const res = await http.get("/users/pdf", { params, responseType: "blob" });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Sitio98_Usuarios_${safeFileNameDate()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando PDF de usuarios", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function limpiarFiltros() {
    setQ("");
    setRole("");
    setActivo("");
    setVerArchivados(false);
    setSortBy("apellido");
    setSortDir("asc");
    setTimeout(() => cargarUsuarios(), 0);
  }

  function applySort(next: SortBy) {
    setSortBy((current) => {
      if (current === next) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      return next;
    });
    setTimeout(() => cargarUsuarios(), 0);
  }

  function sortIndicator(col: SortBy) {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  useEffect(() => {
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const thStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

  return (
    <>
      <h1>Usuarios</h1>

      {errorMsg ? (
        <div style={{ marginBottom: "1rem", padding: "0.75rem", border: "1px solid #ccc", background: "#f7f7f7" }}>
          {errorMsg}
        </div>
      ) : null}

      <section style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            placeholder="Buscar (nombre/apellido/email/dni/matrícula)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 320 }}
          />

          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={loading || downloadingPdf}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select value={activo} onChange={(e) => setActivo(e.target.value)} disabled={loading || downloadingPdf}>
            <option value="">Todos (activos/inactivos)</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={verArchivados}
              onChange={(e) => setVerArchivados(e.target.checked)}
              disabled={loading || downloadingPdf}
            />
            Ver archivados
          </label>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} disabled={loading || downloadingPdf}>
            <option value="apellido">Orden: Apellido</option>
            <option value="nombre">Orden: Nombre</option>
            <option value="email">Orden: Email</option>
            <option value="dni">Orden: DNI</option>
            <option value="matricula">Orden: Matrícula</option>
            <option value="role">Orden: Rol</option>
            <option value="activo">Orden: Activo</option>
            <option value="estadoHabitacional">Orden: Estado habitacional</option>
            <option value="archivadoAt">Orden: Archivado (fecha)</option>
          </select>

          <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} disabled={loading || downloadingPdf}>
            {sortDir === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>

          <button onClick={cargarUsuarios} disabled={loading || downloadingPdf}>
            Aplicar
          </button>
          <button onClick={limpiarFiltros} disabled={loading || downloadingPdf}>
            Limpiar filtros
          </button>
          <button onClick={descargarPdf} disabled={loading || downloadingPdf}>
            {downloadingPdf ? "Generando PDF…" : "Descargar PDF"}
          </button>
        </div>

        <p style={{ marginTop: "0.5rem" }}>Resultados: {usuarios.length}</p>
      </section>

      {loading ? (
        <p>Cargando usuarios…</p>
      ) : (
        <table border={1} cellPadding={6} cellSpacing={0}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => applySort("apellido")}>
                Apellido{sortIndicator("apellido")}
              </th>
              <th style={thStyle} onClick={() => applySort("nombre")}>
                Nombre{sortIndicator("nombre")}
              </th>
              <th style={thStyle} onClick={() => applySort("email")}>
                Email{sortIndicator("email")}
              </th>
              <th style={thStyle} onClick={() => applySort("dni")}>
                DNI{sortIndicator("dni")}
              </th>
              <th style={thStyle} onClick={() => applySort("matricula")}>
                Matrícula{sortIndicator("matricula")}
              </th>

              <th style={thStyle} onClick={() => applySort("role")}>
                Rol{sortIndicator("role")}
              </th>

              {/* ✅ NUEVO */}
              <th>Barrio</th>

              <th style={thStyle} onClick={() => applySort("estadoHabitacional")}>
                Estado Hab.{sortIndicator("estadoHabitacional")}
              </th>
              <th style={thStyle} onClick={() => applySort("activo")}>
                Activo{sortIndicator("activo")}
              </th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map((u) => {
              const busy = updatingId === u._id;
              const isActivo = u.activo !== false;

              const rol = up(u.role);
              const requiereBarrio = ROLES_CON_BARRIO.has(rol);

              return (
                <tr key={u._id}>
                  <td>{safe(u.apellido)}</td>
                  <td>{safe(u.nombre)}</td>
                  <td>{safe(u.email)}</td>
                  <td>{safe(u.dni)}</td>
                  <td>{safe(u.matricula)}</td>

                  <td>
                    <select
                      value={u.role || ""}
                      disabled={busy || downloadingPdf || verArchivados}
                      onChange={(e) => cambiarRol(u._id, e.target.value)}
                    >
                      <option value="">(sin rol)</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* ✅ Barrio asignado: solo INSPECTOR / JEFE_DE_BARRIO */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    {requiereBarrio ? (
                      <>
                        <input
                          value={barrioDraft[u._id] ?? String(u.barrioAsignado || "")}
                          onChange={(e) => setBarrioDraft((curr) => ({ ...curr, [u._id]: e.target.value }))}
                          disabled={busy || downloadingPdf || verArchivados}
                          placeholder="Barrio"
                          style={{ width: 160 }}
                        />{" "}
                        <button disabled={busy || downloadingPdf || verArchivados} onClick={() => guardarBarrio(u._id)}>
                          Guardar
                        </button>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td>{safe(u.estadoHabitacional)}</td>
                  <td style={{ textAlign: "center" }}>{isActivo ? "Sí" : "No"}</td>

                  <td>
                    <button disabled={busy || downloadingPdf || verArchivados} onClick={() => cambiarActivo(u._id, !isActivo)}>
                      {isActivo ? "Dar baja" : "Dar alta"}
                    </button>{" "}
                    <button disabled={busy || downloadingPdf || verArchivados} onClick={() => resetPassword(u._id)}>
                      Reset pass
                    </button>{" "}
                    <button disabled={busy || downloadingPdf || verArchivados} onClick={() => archivarUsuario(u)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
