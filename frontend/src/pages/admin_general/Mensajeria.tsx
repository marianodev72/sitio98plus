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
  permisos?: string[];
  barrioAsignado?: string;
  activo?: boolean;
  archivado?: boolean;
  viviendaLabel?: string; // AB-702 (solo si ocupa por ANEXO_03)
};

type MensajeAdjunto = {
  fileId?: string;
  nombre?: string;
  mimetype?: string;
  size?: number;
  path?: string; // legacy path público (no usar)
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
  replyTo?: string | null;
  threadId?: string | null;
};

type Tab = "entrada" | "enviados" | "nuevo";

type MensajeriaProps = {
  lockedBarrio?: string;      // si existe, se fuerza el barrio
  hideBarrioSelect?: boolean; // oculta selector de barrio
};

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

function idUsuario(x: any): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && (x as any)._id) return String((x as any)._id);
  return "";
}

function etiquetaRol(u?: Usuario | null) {
  if (!u) return "-";
  const role = String(u.role || "").trim();
  const perms = Array.isArray(u.permisos) ? u.permisos.map(String) : [];
  if (role === "ADMIN_GENERAL") return "ADMIN_GENERAL";
  if (role === "ADMIN") return "ADMIN";
  if (role === "PERMISIONARIO") {
    if (perms.includes("JEFE_DE_BARRIO")) return "JEFE DE BARRIO";
    if (perms.includes("INSPECTOR")) return "INSPECTOR DE BARRIO";
    return "PERMISIONARIO";
  }
  return role || "-";
}

function claveRolFiltro(u?: Usuario | null) {
  if (!u) return "";
  const role = String(u.role || "").trim();
  const perms = Array.isArray(u.permisos) ? u.permisos.map(String) : [];
  if (role === "ADMIN_GENERAL") return "ADMIN_GENERAL";
  if (role === "ADMIN") return "ADMIN";
  if (role === "PERMISIONARIO") {
    if (perms.includes("JEFE_DE_BARRIO")) return "JEFE_DE_BARRIO";
    if (perms.includes("INSPECTOR")) return "INSPECTOR";
    return "PERMISIONARIO";
  }
  return role || "";
}

function resumenMensaje(m?: Mensaje) {
  const asunto = (m?.asunto || "").trim();
  const cuerpo = (m?.cuerpo || "").trim();
  const base = asunto || cuerpo || "(sin contenido)";
  return base.length > 70 ? base.slice(0, 70) + "…" : base;
}

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

export default function Mensajeria(props: MensajeriaProps = {}) {
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
  const [filtroBarrio, setFiltroBarrio] = useState(props.lockedBarrio ? String(props.lockedBarrio) : "");
  const [files, setFiles] = useState<File[]>([]);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  // ✅ límite: 200 para todos, excepto ADMIN/ADMIN_GENERAL: 1000
  const limiteVisible = useMemo(() => {
    // Si NO hay lockedBarrio significa que estamos en el panel ADMIN_GENERAL (no subpanel inspector/jefe).
    // En subpaneles se pasa lockedBarrio.
    const adminLike = !props.lockedBarrio;
    return adminLike ? 1000 : 200;
  }, [props.lockedBarrio]);

  const rolesDisponibles = useMemo(() => {
    // ✅ Incluimos PERMISIONARIO (solicitado)
    // Recordatorio: INSPECTOR y JEFE_DE_BARRIO NO son roles base, son permisos dentro de PERMISIONARIO.
    return ["ADMIN_GENERAL", "ADMIN", "INSPECTOR", "JEFE_DE_BARRIO", "PERMISIONARIO"];
  }, []);

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
    const locked = props.lockedBarrio ? String(props.lockedBarrio) : "";

    return usuarios
      .filter((u) => {
        if (u.activo === false) return false;
        if (u.archivado === true) return false;

        // 🔒 Si hay barrio bloqueado, se fuerza en frontend (UX). Seguridad real está en backend.
        if (locked) {
          const k = claveRolFiltro(u);
          // ✅ Admins/globales no se restringen por barrio (requerimiento PERMISIONARIO)
          if (k !== "ADMIN" && k !== "ADMIN_GENERAL" && String(u.barrioAsignado || "") !== locked) return false;
        }

        if (filtroRole && claveRolFiltro(u) !== filtroRole) return false;

        // solo aplica filtroBarrio si NO está locked
        if (!locked && filtroBarrio && String(u.barrioAsignado || "") !== filtroBarrio) return false;

        if (!q) return true;

        const blob = [
          u.nombre,
          u.apellido,
          u.email,
          u.dni,
          u.matricula,
          u.role,
          u.barrioAsignado,
          u.viviendaLabel,
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
  }, [usuarios, buscaUsuario, filtroRole, filtroBarrio, props.lockedBarrio]);

  const usuariosVisibles = useMemo(() => {
    return usuariosFiltrados.slice(0, limiteVisible);
  }, [usuariosFiltrados, limiteVisible]);

  // ✅ estado del checkbox "seleccionar todos"
  const todosVisiblesSeleccionados = useMemo(() => {
    if (!usuariosVisibles.length) return false;
    return usuariosVisibles.every((u) => paraIds.includes(String(u._id)));
  }, [usuariosVisibles, paraIds]);

  const algunosVisiblesSeleccionados = useMemo(() => {
    if (!usuariosVisibles.length) return false;
    return usuariosVisibles.some((u) => paraIds.includes(String(u._id)));
  }, [usuariosVisibles, paraIds]);

  function togglePara(id: string) {
    setParaIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  }

  function limpiarDestinatarios() {
    setParaIds([]);
  }

  function seleccionarPorFiltroActual() {
    const ids = usuariosVisibles.map((u) => String(u._id));
    setParaIds((curr) => {
      const set = new Set(curr);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }

  function toggleSeleccionarTodosVisibles() {
    const ids = usuariosVisibles.map((u) => String(u._id));
    if (!ids.length) return;

    setParaIds((curr) => {
      const set = new Set(curr);
      const allSelected = ids.every((id) => set.has(id));

      if (allSelected) {
        // si ya estaban todos visibles, deseleccionamos solo los visibles
        ids.forEach((id) => set.delete(id));
      } else {
        // si faltaba alguno, seleccionamos todos los visibles
        ids.forEach((id) => set.add(id));
      }
      return Array.from(set);
    });
  }

  function limpiarFormularioNuevo() {
    setParaIds([]);
    setAsunto("");
    setCuerpo("");
    setBuscaUsuario("");
    setFiltroRole("");
    setFiltroBarrio(props.lockedBarrio ? String(props.lockedBarrio) : "");
    setFiles([]);
    setReplyToId(null);
  }

  async function cargarUsuarios() {
  try {
    // ✅ agenda institucional unificada (sirve para admins y permisionarios)
    const res = await http.get("/mensajes/agenda");
    const lista = Array.isArray(res.data) ? res.data : res.data?.usuarios;
    setUsuarios(Array.isArray(lista) ? lista : []);
  } catch (err) {
    console.error("[Mensajeria] Error cargando agenda", err);
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

      setEntrada(Array.isArray(inboxRes.data) ? inboxRes.data : (inboxRes.data?.mensajes || []));
setEnviados(Array.isArray(sentRes.data) ? sentRes.data : (sentRes.data?.mensajes || []));
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

const msg = res.data?.mensaje;
if (!msg || !msg._id) {
  throw new Error("Payload de mensaje inválido");
}

setOpenMsg(msg);


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

  function responderAlMensaje(msg: Mensaje) {
  if (!msg || !msg._id) return;

    // ✅ Respuesta: preselecciona remitente como destinatario y enlaza hilo
    const remitenteId = typeof (msg as any)?.remitente === "object"
      ? String((msg as any)?.remitente?._id || "")
      : String((msg as any)?.remitente || "");

    if (remitenteId) setParaIds([remitenteId]);
    else setParaIds([]);

    const asuntoBase = String((msg as any)?.asunto || "").trim();
    const nuevoAsunto = asuntoBase.toUpperCase().startsWith("RE:") ? asuntoBase : `RE: ${asuntoBase}`;
    setAsunto(nuevoAsunto);

    // Enlace de hilo en backend
    setReplyToId(String((msg as any)?._id));

    const quoted = [
      "",
      "----- Mensaje anterior -----",
      (msg as any)?.creadoEn ? `Fecha: ${formatFecha((msg as any).creadoEn)}` : undefined,
      asuntoBase ? `Asunto: ${asuntoBase}` : undefined,
      remitenteId ? `Remitente: ${nombreUsuario(usuariosById.get(remitenteId))}` : undefined,
      "",
      String((msg as any)?.cuerpo || ""),
    ]
      .filter(Boolean)
      .join("\n");

    setCuerpo((prev) => {
      const p = String(prev || "");
      if (p.trim().length > 0) return p;
      return quoted;
    });

    cerrarMensaje();
    setTab("nuevo");
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
      const adj = archivosPermitidos(files);

      if (adj.length > 0) {
        const fd = new FormData();
        paraIds.forEach((id) => fd.append("para", id));
        fd.append("asunto", asunto || "");
        fd.append("cuerpo", cuerpo || "");
        if (replyToId) fd.append("replyTo", replyToId);
        adj.forEach((f) => fd.append("adjuntos", f));

        await http.post("/mensajes", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await http.post("/mensajes", {
          para: paraIds,
          asunto: asunto || "",
          cuerpo: cuerpo || "",
          replyTo: replyToId,
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
    padding: "10px 14px",
    border: "1px solid #ccc",
    background: active ? "#eee" : "#fff",
    cursor: "pointer",
  });

  const boxStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  padding: 16,
  borderRadius: 12,
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
  color: "#eaf0ff",
};

  return (
    <>
      <h1>Mensajería</h1>

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
            <table style={{ width: "100%", borderCollapse: "collapse" }} cellPadding={6} cellSpacing={0} style={{ width: "100%" }}>
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
                    <td>{nombreUsuario(usuariosById.get(idUsuario(m.remitente)))}</td>
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
            </div>

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
                    {r === "ADMIN_GENERAL"
                      ? "ADMIN_GENERAL"
                      : r === "ADMIN"
                      ? "ADMIN"
                      : r === "INSPECTOR"
                      ? "INSPECTOR DE BARRIO"
                      : r === "JEFE_DE_BARRIO"
                      ? "JEFE DE BARRIO"
                      : r === "PERMISIONARIO"
                      ? "PERMISIONARIO"
                      : r}
                  </option>
                ))}
              </select>

              {/* ✅ barrio: si está locked se oculta o se deshabilita */}
              {!props.hideBarrioSelect ? (
                <select
                  value={props.lockedBarrio ? String(props.lockedBarrio) : filtroBarrio}
                  onChange={(e) => {
                    if (!props.lockedBarrio) setFiltroBarrio(e.target.value);
                  }}
                  disabled={loading || !!props.lockedBarrio}
                >
                  <option value="">
                    {props.lockedBarrio ? String(props.lockedBarrio) : "Todos los barrios"}
                  </option>
                  {!props.lockedBarrio &&
                    barriosDisponibles.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                </select>
              ) : null}

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
                    {/* ✅ checkbox maestro */}
                    <th style={{ textAlign: "center", width: 40 }}>
                      <input
                        type="checkbox"
                        checked={todosVisiblesSeleccionados}
                        ref={(el) => {
                          if (!el) return;
                          el.indeterminate = !todosVisiblesSeleccionados && algunosVisiblesSeleccionados;
                        }}
                        onChange={toggleSeleccionarTodosVisibles}
                        disabled={loading || usuariosVisibles.length === 0}
                        title="Seleccionar todos los visibles"
                      />
                    </th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Barrio</th>
                    <th>Vivienda</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosVisibles.map((u) => {
                    const id = String(u._id);
                    const checked = paraIds.includes(id);
                    return (
                      <tr key={id}>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={checked} onChange={() => togglePara(id)} disabled={loading} />
                        </td>
                        <td>{nombreUsuario(u)}</td>
                        <td>{etiquetaRol(u)}</td>
                        <td>{safe(u.barrioAsignado)}</td>
                        <td>{u.viviendaLabel || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p style={{ margin: 0, fontSize: 12 }}>
              Destinatarios seleccionados: <strong>{paraIds.length}</strong> (se muestran hasta{" "}
              <strong>{limiteVisible}</strong> usuarios filtrados)
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
              {openMsg ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openMsg && responderAlMensaje(openMsg);
                  }}
                  disabled={openLoading}
                >
                  Responder
                </button>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  cerrarMensaje();
                }}
              >
                Cerrar
              </button>
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
                  <strong>Remitente:</strong> {nombreUsuario(usuariosById.get(idUsuario(openMsg.remitente)))}
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
                          {a.fileId ? (
                            <a
                              href={`/api/mensajes/${openMsg._id}/adjuntos/${a.fileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
