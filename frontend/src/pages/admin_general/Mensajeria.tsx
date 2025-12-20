// frontend/src/pages/admin_general/Mensajeria.tsx
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
  barrioAsignado?: string;
  activo?: boolean;
  archivado?: boolean;
};

type MensajeAdjunto = {
  fileId?: string;
  nombre?: string;
  mimetype?: string;
  size?: number;
  path?: string; // si backend lo guarda /uploads/mensajes/...
};

type Mensaje = {
  _id: string;
  remitente: string; // ObjectId string
  destinatarios: string[]; // ObjectId[]
  asunto?: string;
  cuerpo?: string;
  adjuntos?: MensajeAdjunto[];
  leidoPor?: string[];
  creadoEn?: string;
};

type Tab = "entrada" | "enviados" | "nuevo";

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function formatFecha(fecha?: string) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function nombreUsuario(u?: Usuario | null) {
  if (!u) return "-";
  const full = `${u.apellido || ""} ${u.nombre || ""}`.trim();
  if (full) return full;
  return u.email || "-";
}

function resumenMensaje(m?: Mensaje) {
  const asunto = (m?.asunto || "").trim();
  const cuerpo = (m?.cuerpo || "").trim();
  const base = asunto || cuerpo || "(sin contenido)";
  return base.length > 70 ? base.slice(0, 70) + "…" : base;
}

export default function Mensajeria() {
  const [tab, setTab] = useState<Tab>("entrada");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [entrada, setEntrada] = useState<Mensaje[]>([]);
  const [enviados, setEnviados] = useState<Mensaje[]>([]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const usuariosById = useMemo(() => {
    const m = new Map<string, Usuario>();
    usuarios.forEach((u) => m.set(String(u._id), u));
    return m;
  }, [usuarios]);

  // Modal ver mensaje
  const [openMsgId, setOpenMsgId] = useState<string | null>(null);
  const [openMsg, setOpenMsg] = useState<Mensaje | null>(null);
  const [openLoading, setOpenLoading] = useState(false);

  // Nuevo mensaje
  const [paraIds, setParaIds] = useState<string[]>([]);
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [filtroRole, setFiltroRole] = useState("");
  const [filtroBarrio, setFiltroBarrio] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const rolesDisponibles = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach((u) => {
      const r = String(u.role || "").trim();
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [usuarios]);

  const barriosDisponibles = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach((u) => {
      const b = String(u.barrioAsignado || "").trim();
      if (b) set.add(b);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const q = buscaUsuario.trim().toLowerCase();

    return usuarios
      .filter((u) => {
        // por defecto: solo activos y no archivados para enviar
        if (u.activo === false) return false;
        if (u.archivado === true) return false;

        if (filtroRole && String(u.role || "") !== filtroRole) return false;
        if (filtroBarrio && String(u.barrioAsignado || "") !== filtroBarrio) return false;

        if (!q) return true;

        const blob = [
          u.nombre,
          u.apellido,
          u.email,
          u.dni,
          u.matricula,
          u.role,
          u.barrioAsignado,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return blob.includes(q);
      })
      .sort((a, b) =>
        (String(a.apellido || "") + String(a.nombre || "")).localeCompare(
          String(b.apellido || "") + String(b.nombre || "")
        )
      );
  }, [usuarios, buscaUsuario, filtroRole, filtroBarrio]);

  function togglePara(id: string) {
    setParaIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  function limpiarDestinatarios() {
    setParaIds([]);
  }

  function seleccionarPorFiltroActual() {
    const ids = usuariosFiltrados.map((u) => String(u._id));
    setParaIds((curr) => {
      const set = new Set(curr);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }

  function limpiarFormularioNuevo() {
    setParaIds([]);
    setAsunto("");
    setCuerpo("");
    setBuscaUsuario("");
    setFiltroRole("");
    setFiltroBarrio("");
    setFiles([]);
  }

  async function cargarUsuarios() {
    try {
      // tu módulo usuarios ya lo usa -> /api/users
      const res = await http.get("/users", { params: { sortBy: "apellido", sortDir: "asc" } });
      const lista = Array.isArray(res.data) ? res.data : res.data?.usuarios;
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("[Mensajeria] Error cargando usuarios", err);
      setUsuarios([]);
    }
  }

  async function cargarBandejas() {
    setLoading(true);
    setErrorMsg("");
    try {
      const [inboxRes, sentRes] = await Promise.all([
        http.get("/mensajes/entrada"),
        http.get("/mensajes/enviados"),
      ]);

      setEntrada(Array.isArray(inboxRes.data) ? inboxRes.data : []);
      setEnviados(Array.isArray(sentRes.data) ? sentRes.data : []);
    } catch (err) {
      console.error("[Mensajeria] Error cargando bandejas", err);
      setEntrada([]);
      setEnviados([]);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirMensaje(id: string, desde: "entrada" | "enviados") {
    setOpenMsgId(id);
    setOpenMsg(null);
    setOpenLoading(true);
    setErrorMsg("");

    try {
      const res = await http.get(`/mensajes/${id}`);
      setOpenMsg(res.data || null);

      // best-effort: marcar leído si es de entrada
      if (desde === "entrada") {
        try {
          await http.patch(`/mensajes/${id}/leido`);
          await cargarBandejas();
        } catch {
          // silencio institucional
        }
      }
    } catch (err) {
      console.error("[Mensajeria] Error abriendo mensaje", err);
      setErrorMsg("La página solicitada no está disponible. Por favor, contacte al administrador.");
      setOpenMsgId(null);
      setOpenMsg(null);
    } finally {
      setOpenLoading(false);
    }
  }

  function cerrarMensaje() {
    setOpenMsgId(null);
    setOpenMsg(null);
  }

  function archivosPermitidos(files: File[]) {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    return files.filter((f) => allowed.includes(f.type));
  }

  async function enviarMensaje() {
    setErrorMsg("");

    if (!paraIds.length) {
      setErrorMsg("Debe seleccionar al menos un destinatario.");
      return;
    }

    setLoading(true);
    try {
      // Si backend ya soporta multipart + multer, usamos FormData.
      // Si no, enviamos JSON sin adjuntos.
      const adj = archivosPermitidos(files);

      if (adj.length > 0) {
        const fd = new FormData();
        paraIds.forEach((id) => fd.append("para", id)); // backend tolera para o para[]
        fd.append("asunto", asunto || "");
        fd.append("cuerpo", cuerpo || "");
        adj.forEach((f) => fd.append("adjuntos", f));

        await http.post("/mensajes", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await http.post("/mensajes", {
          para: paraIds,
          asunto: asunto || "",
          cuerpo: cuerpo || "",
          adjuntos: [],
        });
      }

      limpiarFormularioNuevo();
      await cargarBandejas();
      setTab("enviados");
    } catch (err) {
      console.error("[Mensajeria] Error enviando", err);
      setErrorMsg("La operación solicitada no está disponible. Por favor, contacte al administrador.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
    cargarBandejas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    border: "1px solid #ccc",
    background: active ? "#eee" : "#fff",
    cursor: "pointer",
  });

  const boxStyle: React.CSSProperties = {
    border: "1px solid #ddd",
    padding: 12,
    borderRadius: 6,
    background: "#fff",
  };

  return (
    <>
      <h1>Mensajería</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button style={btnStyle(tab === "entrada")} onClick={() => setTab("entrada")} disabled={loading}>
          Entrada
        </button>
        <button style={btnStyle(tab === "enviados")} onClick={() => setTab("enviados")} disabled={loading}>
          Enviados
        </button>
        <button style={btnStyle(tab === "nuevo")} onClick={() => setTab("nuevo")} disabled={loading}>
          Nuevo
        </button>
        <button style={btnStyle(false)} onClick={cargarBandejas} disabled={loading}>
          Actualizar
        </button>
      </div>

      {/* Error institucional */}
      {errorMsg ? (
        <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #ccc", background: "#f7f7f7" }}>
          {errorMsg}
        </div>
      ) : null}

      {/* ENTRADA */}
      {tab === "entrada" ? (
        <section style={boxStyle}>
          <h2 style={{ marginTop: 0 }}>Bandeja de entrada</h2>

          {loading ? <p>Cargando…</p> : null}
          {!loading && entrada.length === 0 ? <p>No hay mensajes.</p> : null}

          {!loading && entrada.length > 0 ? (
            <table border={1} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Asunto / resumen</th>
                  <th>Remitente</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {entrada.map((m) => (
                  <tr key={m._id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatFecha(m.creadoEn)}</td>
                    <td>{resumenMensaje(m)}</td>
                    <td>{nombreUsuario(usuariosById.get(String(m.remitente)))}</td>
                    <td>
                      <button onClick={() => abrirMensaje(m._id, "entrada")} disabled={loading || openLoading}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}

      {/* ENVIADOS */}
      {tab === "enviados" ? (
        <section style={boxStyle}>
          <h2 style={{ marginTop: 0 }}>Enviados</h2>

          {loading ? <p>Cargando…</p> : null}
          {!loading && enviados.length === 0 ? <p>No hay mensajes enviados.</p> : null}

          {!loading && enviados.length > 0 ? (
            <table border={1} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Asunto / resumen</th>
                  <th>Destinatarios</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {enviados.map((m) => (
                  <tr key={m._id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatFecha(m.creadoEn)}</td>
                    <td>{resumenMensaje(m)}</td>
                    <td style={{ textAlign: "center" }}>
                      {Array.isArray(m.destinatarios) ? m.destinatarios.length : 0}
                    </td>
                    <td>
                      <button onClick={() => abrirMensaje(m._id, "enviados")} disabled={loading || openLoading}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}

      {/* NUEVO */}
      {tab === "nuevo" ? (
        <section style={boxStyle}>
          <h2 style={{ marginTop: 0 }}>Nuevo mensaje</h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 950 }}>
            <input
              placeholder="Asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              style={{ width: "100%", maxWidth: 800 }}
              disabled={loading}
            />

            <textarea
              placeholder="Cuerpo del mensaje"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={6}
              style={{ width: "100%", maxWidth: 900 }}
              disabled={loading}
            />

            {/* Adjuntos */}
            <div style={{ padding: 10, border: "1px dashed #ccc", background: "#fafafa" }}>
              <strong>Adjuntos (PDF / JPG / PNG)</strong>
              <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  disabled={loading}
                />
                <button onClick={() => setFiles([])} disabled={loading}>
                  Limpiar adjuntos
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                Adjuntos seleccionados: <strong>{files.length}</strong>
              </div>
              {files.length > 0 ? (
                <ul style={{ marginTop: 8 }}>
                  {archivosPermitidos(files).map((f, idx) => (
                    <li key={idx}>
                      {f.name} — {Math.round(f.size / 1024)} KB
                    </li>
                  ))}
                </ul>
              ) : null}
              {files.length > 0 && archivosPermitidos(files).length === 0 ? (
                <p style={{ marginTop: 8 }}>
                  No hay archivos válidos. Solo se permite PDF/JPG/PNG.
                </p>
              ) : null}
            </div>

            {/* Filtros destinatarios */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Buscar destinatario (nombre/email/dni/matrícula)"
                value={buscaUsuario}
                onChange={(e) => setBuscaUsuario(e.target.value)}
                style={{ flex: 1, minWidth: 260 }}
                disabled={loading}
              />

              <select value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)} disabled={loading}>
                <option value="">Todos los roles</option>
                {rolesDisponibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select value={filtroBarrio} onChange={(e) => setFiltroBarrio(e.target.value)} disabled={loading}>
                <option value="">Todos los barrios</option>
                {barriosDisponibles.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <button onClick={seleccionarPorFiltroActual} disabled={loading}>
                Agregar filtrados
              </button>

              <button onClick={limpiarDestinatarios} disabled={loading}>
                Limpiar destinatarios
              </button>
            </div>

            <div style={{ border: "1px solid #ddd", maxHeight: 320, overflow: "auto" }}>
              <table border={0} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Barrio</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.slice(0, 200).map((u) => {
                    const id = String(u._id);
                    const checked = paraIds.includes(id);
                    return (
                      <tr key={id}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePara(id)}
                            disabled={loading}
                          />
                        </td>
                        <td>{nombreUsuario(u)}</td>
                        <td>{safe(u.role)}</td>
                        <td>{safe(u.barrioAsignado)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p style={{ margin: 0, fontSize: 12 }}>
              Destinatarios seleccionados: <strong>{paraIds.length}</strong> (se muestran hasta 200 usuarios filtrados)
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={enviarMensaje} disabled={loading}>
                Enviar
              </button>
              <button onClick={limpiarFormularioNuevo} disabled={loading}>
                Limpiar formulario
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* MODAL VER MENSAJE */}
      {openMsgId ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={cerrarMensaje}
        >
          <div
            style={{
              width: "min(900px, 95vw)",
              maxHeight: "85vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #ddd",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <strong>Mensaje</strong>
              <button onClick={cerrarMensaje}>Cerrar</button>
            </div>

            {openLoading ? <p>Cargando…</p> : null}

            {!openLoading && openMsg ? (
              <>
                <p style={{ marginBottom: 6 }}>
                  <strong>Fecha:</strong> {formatFecha(openMsg.creadoEn)}
                </p>
                <p style={{ marginBottom: 6 }}>
                  <strong>Asunto:</strong> {safe(openMsg.asunto)}
                </p>
                <p style={{ marginBottom: 6 }}>
                  <strong>Remitente:</strong> {nombreUsuario(usuariosById.get(String(openMsg.remitente)))}
                </p>
                <p style={{ marginBottom: 6 }}>
                  <strong>Destinatarios:</strong>{" "}
                  {Array.isArray(openMsg.destinatarios)
                    ? openMsg.destinatarios.map((id) => nombreUsuario(usuariosById.get(String(id)))).join(", ")
                    : "-"}
                </p>

                <hr />

                <div style={{ whiteSpace: "pre-wrap" }}>{safe(openMsg.cuerpo)}</div>

                <hr />

                <div>
                  <strong>Adjuntos:</strong>{" "}
                  {openMsg.adjuntos && openMsg.adjuntos.length ? (
                    <ul>
                      {openMsg.adjuntos.map((a, idx) => (
                        <li key={idx}>
                          {a.path ? (
                            <a href={a.path} target="_blank" rel="noopener noreferrer">
                              {safe(a.nombre)}
                            </a>
                          ) : (
                            <span>{safe(a.nombre)}</span>
                          )}{" "}
                          ({safe(a.mimetype)}) — {safe(a.size)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </>
            ) : null}

            {!openLoading && !openMsg ? <p>No se pudo cargar el mensaje.</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
