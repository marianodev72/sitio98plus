// frontend/src/pages/admin/UsuariosAdmin.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

type Usuario = {
  _id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  dni?: string;
  matricula?: string;
  tipoPersonal?: string;
  role?: string;
  permisos?: string[];
  barrioAsignado?: string;
  territoriosAlojamiento?: { tipo?: string; valor?: string }[];
  viviendaAsignada?: string;
  viviendaLabel?: string;
  alojamientoLabel?: string;
  activo?: boolean;
  archivado?: boolean;
  viviendaOcupadaLabel?: string;
};

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

function safe(v: unknown) {
  const text = String(v ?? "").trim();
  return text || "Sin asignar";
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function isObjectIdLike(v: unknown) {
  return /^[a-fA-F0-9]{24}$/.test(String(v || "").trim());
}

function fallback(v: unknown) {
  const text = String(v ?? "").trim();
  if (isObjectIdLike(text)) return "Sin asignar";
  return text || "Sin asignar";
}

function tipoPersonalLabel(value: unknown) {
  const tipo = up(value);
  if (tipo === "OF") return "Oficial";
  if (tipo === "SO") return "Suboficial";
  return "Sin definir";
}

function territoriosAlojamientoLabel(u: Usuario) {
  const list = Array.isArray(u.territoriosAlojamiento) ? u.territoriosAlojamiento : [];
  const labels = list
    .map((t) => {
      const tipo = up(t?.tipo);
      const valor = String(t?.valor || "").trim();
      if (!valor || isObjectIdLike(valor)) return "";
      return tipo === "LUGAR" ? `Lugar: ${valor}` : valor;
    })
    .filter(Boolean);
  if (!labels.length) return "Sin asignar";
  return labels.join(", ");
}

function datosVigentesDeclarados(item: any) {
  if (item?.datosEfectivos && typeof item.datosEfectivos === "object" && !Array.isArray(item.datosEfectivos)) {
    return item.datosEfectivos;
  }

  const baseDatos = item?.baseDatos && typeof item.baseDatos === "object" && !Array.isArray(item.baseDatos) ? item.baseDatos : {};
  const datosActualizados =
    item?.datosActualizados && typeof item.datosActualizados === "object" && !Array.isArray(item.datosActualizados)
      ? item.datosActualizados
      : {};

  return { ...baseDatos, ...datosActualizados };
}

function countResumen(value: unknown, singular: string, plural: string) {
  const count = Array.isArray(value) ? value.length : 0;
  if (count === 0) return `Sin ${plural}`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

export default function UsuariosAdmin() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filtroQ, setFiltroQ] = useState("");
  const [filtroRole, setFiltroRole] = useState<string>("");
  const [filtroBarrio, setFiltroBarrio] = useState<string>("");
  const [filtroActivo, setFiltroActivo] = useState<"todos" | "true" | "false">("todos");
  const [filtroArchivado, setFiltroArchivado] = useState<"false" | "true" | "todos">("false");

  const [sortBy, setSortBy] = useState<SortKey>("apellido");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [barrios, setBarrios] = useState<string[]>([]);
  const [loadingBarrios, setLoadingBarrios] = useState(false);

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

    setLoadingHistorial(true);
    try {
      const resHist = await http.get(
        `/formularios/mis-datos-declarados/usuario/${userId}/historial`,
        {
          params: { limit: 100 },
        }
      );
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

  const pageStyle: CSSProperties = {
    padding: 24,
    background: "#0b1220",
    minHeight: "100%",
    color: "#eaf0ff",
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(6px)",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };

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

  const inputStyle: CSSProperties = {
    ...controlStyle,
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

  const tableWrapStyle: CSSProperties = {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
  };

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1440,
  };

  const thStyle: CSSProperties = {
    textAlign: "left",
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    verticalAlign: "middle",
  };

  const modalBackdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    zIndex: 9999,
  };

  const modalStyle: CSSProperties = {
    background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(11,18,32,0.98))",
    width: "min(980px, 96vw)",
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#eaf0ff",
  };

  const ultimoDatosVigentes = datosVigentesDeclarados(ultimoDeclarado);
  const datoVigenteRowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 8,
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };
  const datoVigenteLabelStyle: CSSProperties = {
    color: "rgba(255,255,255,0.65)",
    fontWeight: 700,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={{ margin: 0 }}>Cargando usuarios…</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ marginTop: 0, marginBottom: 16, color: "#ffffff" }}>
        Usuarios — ADMIN (solo lectura)
      </h1>

      {error ? (
        <div
          style={{
            ...cardStyle,
            marginBottom: 12,
            border: "1px solid rgba(239,68,68,0.30)",
            background: "rgba(127,29,29,0.18)",
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          ...cardStyle,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <label style={{ color: "#eaf0ff" }}>
            Búsqueda{" "}
            <input
              type="text"
              value={filtroQ}
              onChange={(e) => setFiltroQ(e.target.value)}
              style={{ ...inputStyle, width: 260, marginLeft: 6 }}
            />
          </label>
        </div>

        <div>
          <label style={{ color: "#eaf0ff" }}>
            Rol base{" "}
            <select
              value={filtroRole}
              onChange={(e) => setFiltroRole(e.target.value)}
              style={{ ...selectStyle, marginLeft: 6 }}
            >
              <option value="" style={optionStyle}>
                Todos
              </option>
              <option value="POSTULANTE" style={optionStyle}>
                POSTULANTE
              </option>
              <option value="PERMISIONARIO" style={optionStyle}>
                PERMISIONARIO
              </option>
              <option value="ALOJADO" style={optionStyle}>
                ALOJADO
              </option>
              <option value="ADMIN" style={optionStyle}>
                ADMIN
              </option>
              <option value="ADMIN_GENERAL" style={optionStyle}>
                ADMIN_GENERAL
              </option>
            </select>
          </label>
        </div>

        <div>
          <label style={{ color: "#eaf0ff" }}>
            Barrio{" "}
            <select
              value={filtroBarrio}
              onChange={(e) => setFiltroBarrio(e.target.value)}
              disabled={loadingBarrios}
              style={{ ...selectStyle, marginLeft: 6 }}
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
          <label style={{ color: "#eaf0ff" }}>
            Activo{" "}
            <select
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value as any)}
              style={{ ...selectStyle, marginLeft: 6 }}
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
          <label style={{ color: "#eaf0ff" }}>
            Archivado{" "}
            <select
              value={filtroArchivado}
              onChange={(e) => setFiltroArchivado(e.target.value as any)}
              style={{ ...selectStyle, marginLeft: 6 }}
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
          <button onClick={cargar} style={buttonStyle}>
            Recargar
          </button>
        </div>
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("apellido")}>
                Apellido y Nombre {sortBy === "apellido" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("email")}>
                Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("dni")}>
                DNI {sortBy === "dni" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("matricula")}>
                Matrícula {sortBy === "matricula" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("tipoPersonal")}>
                Tipo personal {sortBy === "tipoPersonal" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("role")}>
                Rol base {sortBy === "role" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={thStyle}>Permisos</th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("barrioAsignado")}>
                Barrio {sortBy === "barrioAsignado" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={thStyle}>Territorios Alojamientos</th>
              <th style={thStyle}>Vivienda (asignada)</th>
              <th style={thStyle}>Vivienda (ocupada)</th>
              <th style={thStyle}>Alojamiento / Plaza</th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("activo")}>
                Activo {sortBy === "activo" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((u) => {
              const isPermisionario = up(u.role) === "PERMISIONARIO";

              return (
  <tr key={u._id}>
    <td style={tdStyle}>
      <div style={{ fontWeight: 700 }}>{fallback(u.apellido)} {fallback(u.nombre)}</div>
      <button
        type="button"
        disabled={!isPermisionario}
        onClick={() => navigate(`/app/admin/usuarios/${u._id}/datos-declarados`)}
        title={
          !isPermisionario
            ? "Solo disponible para PERMISIONARIO"
            : "Abrir preview institucional de datos declarados"
        }
        style={{ ...buttonStyle, marginTop: 6, padding: "6px 8px", fontSize: 12 }}
      >
        Datos declarados
      </button>
    </td>
    <td style={tdStyle}>{fallback(u.email)}</td>
    <td style={tdStyle}>{fallback(u.dni)}</td>
    <td style={tdStyle}>{fallback(u.matricula)}</td>
    <td style={tdStyle}>{tipoPersonalLabel(u.tipoPersonal)}</td>
    <td style={tdStyle}>{fallback(u.role)}</td>
    <td style={tdStyle}>
      {Array.isArray(u.permisos) && u.permisos.length ? u.permisos.map(up).join(", ") : "Sin asignar"}
    </td>
    <td style={tdStyle}>{fallback(u.barrioAsignado)}</td>
    <td style={tdStyle}>{territoriosAlojamientoLabel(u)}</td>
    <td style={tdStyle}>{fallback(u.viviendaLabel)}</td>
    <td style={tdStyle}>{fallback((u as any).viviendaOcupadaLabel)}</td>
    <td style={tdStyle}>{fallback(u.alojamientoLabel)}</td>
    <td style={tdStyle}>{u.activo === false ? "No" : "Sí"}</td>
    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
      <button
        disabled={!isPermisionario}
        onClick={() => verDatosDeclarados(u)}
        title={
          !isPermisionario
            ? "Solo disponible para PERMISIONARIO"
            : "Ver Mis Datos Declarados"
        }
        style={buttonStyle}
      >
        Datos declarados
      </button>
    </td>
  </tr>
);
})}

{rows.length === 0 && (
  <tr>
    <td colSpan={14} style={{ ...tdStyle, textAlign: "center" }}>
      No hay usuarios para los filtros seleccionados.
    </td>
  </tr>
)}
</tbody>
</table>
</div>

{openDatosUser ? (
  <div style={modalBackdropStyle} onClick={() => cerrarModalDatosDeclarados()}>
    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0, color: "#ffffff" }}>
          Datos declarados — {safe(openDatosUser.apellido)} {safe(openDatosUser.nombre)}
        </h2>
        <button onClick={() => cerrarModalDatosDeclarados()} style={buttonStyle}>
          Cerrar
        </button>
      </div>

      <hr style={{ border: "none", height: 1, background: "rgba(255,255,255,0.12)", margin: "16px 0" }} />

      <h3 style={{ marginTop: 10, color: "#ffffff" }}>Último registro</h3>
      {loadingUltimo ? (
        <p>Cargando último registro…</p>
      ) : ultimoDeclarado?._id ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            padding: 12,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
          }}
        >
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

          <div style={{ marginTop: 14 }}>
            <h4 style={{ margin: "0 0 8px", color: "#ffffff" }}>Dato vigente</h4>
            {[
              ["Grado / Escalafón", ultimoDatosVigentes.gradoEscalafon],
              ["Matrícula", ultimoDatosVigentes.matricula || ultimoDatosVigentes.mr || ultimoDatosVigentes.MR],
              ["Apellido", ultimoDatosVigentes.apellido],
              ["Nombres", ultimoDatosVigentes.nombres || ultimoDatosVigentes.nombre],
              ["Destino actual", ultimoDatosVigentes.destinoActual],
              ["Teléfono actual", ultimoDatosVigentes.telefonoActual || ultimoDatosVigentes.telefono],
              ["Años de servicio", ultimoDatosVigentes.aniosServicioRecibo],
              ["Convivientes", countResumen(ultimoDatosVigentes.convivientes, "conviviente", "convivientes")],
              ["Mascotas", countResumen(ultimoDatosVigentes.mascotas, "mascota", "mascotas")],
            ].map(([label, value]) => (
              <div key={String(label)} style={datoVigenteRowStyle}>
                <div style={datoVigenteLabelStyle}>{label}</div>
                <div>{fallback(value)}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => verPdfDeclarado(String(ultimoDeclarado._id))}
              style={buttonStyle}
            >
              Ver
            </button>
            <button
              onClick={() => descargarPdfDeclarado(String(ultimoDeclarado._id))}
              style={buttonStyle}
            >
              PDF
            </button>
          </div>
        </div>
      ) : (
        <p>Este usuario no tiene registros de “Mis Datos Declarados”.</p>
      )}

      <h3 style={{ marginTop: 16, color: "#ffffff" }}>Historial (últimos 100)</h3>
      {loadingHistorial ? (
        <p>Cargando historial…</p>
      ) : historialDeclarado.length === 0 ? (
        <p>(sin historial)</p>
      ) : (
        <div style={tableWrapStyle}>
          <table style={{ ...tableStyle, minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 220 }}>Fecha</th>
                <th style={thStyle}>ID</th>
                <th style={{ ...thStyle, width: 160 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historialDeclarado.map((it) => (
                <tr key={String(it?._id || Math.random())}>
                  <td style={tdStyle}>
                    {it?.createdAt ? new Date(it.createdAt).toLocaleString("es-AR") : "—"}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "monospace" }}>{String(it?._id || "")}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => verPdfDeclarado(String(it._id))}
                      style={{ ...buttonStyle, marginRight: 8 }}
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => descargarPdfDeclarado(String(it._id))}
                      style={buttonStyle}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
) : null}
</div>
);
}
