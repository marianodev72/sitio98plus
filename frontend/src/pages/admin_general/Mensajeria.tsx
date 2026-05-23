// frontend/src/pages/admin_general/Mensajeria.tsx
// frontend/src/pages/admin_general/Mensajeria.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  cardStyle,
  heroStyle,
  pageStyle,
  shellStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

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
  territoriosAlojamiento?: { tipo?: string; valor?: string }[];
  activo?: boolean;
  archivado?: boolean;
  viviendaLabel?: string;
};

type MensajeAdjunto = {
  fileId?: string;
  nombre?: string;
  mimetype?: string;
  size?: number;
  path?: string;
};

type Mensaje = {
  _id: string;
  remitente: string | { _id?: string; nombre?: string; apellido?: string; nombreCompleto?: string };
  remitenteDisplay?: string;
  destinatarios: string[];
  asunto?: string;
  cuerpo?: string;
  adjuntos?: MensajeAdjunto[];
  leidoPor?: string[];
  creadoEn?: string;
  replyTo?: string | null;
  threadId?: string | null;
  contextoOperacional?: {
    origen?: string;
    codigo?: string;
    label?: string;
  };
};

type Tab = "entrada" | "enviados" | "nuevo";

type MensajeriaProps = {
  lockedBarrio?: string;
  hideBarrioSelect?: boolean;
  contexto?: "PERMISIONARIO" | "ALOJADO" | "INSPECTOR_ALOJAMIENTOS";
};

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "-" : String(v);
}

function up(v: unknown) {
  return String(v || "").trim().toUpperCase();
}

function contextoOrigen(m?: Mensaje) {
  const origen = String(m?.contextoOperacional?.origen || "").trim();
  return origen || "General";
}

function contextoCodigo(m?: Mensaje) {
  const codigo = String(m?.contextoOperacional?.codigo || "").trim();
  return codigo || "—";
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

function displaySeguro(v: unknown) {
  const s = String(v || "").trim();
  return s || "-";
}

function etiquetaRol(u?: Usuario | null) {
  if (!u) return "-";
  const role = String(u.role || "").trim();
  const perms = Array.isArray(u.permisos) ? u.permisos.map(String) : [];
  if (role === "ADMIN_GENERAL") return "ADMIN_GENERAL";
  if (role === "ADMIN") return "ADMIN";
  if (role === "PERMISIONARIO") {
    if (perms.includes("INSPECTOR_ALOJAMIENTOS")) return "INSPECTOR DE ALOJAMIENTO";
    if (perms.includes("JEFE_DE_BARRIO")) return "JEFE DE BARRIO";
    if (perms.includes("INSPECTOR")) return "INSPECTOR DE BARRIO";
    return "PERMISIONARIO";
  }
  return role || "-";
}

function ambitoUsuario(u?: Usuario | null) {
  const territorios = Array.isArray(u?.territoriosAlojamiento) ? u?.territoriosAlojamiento : [];
  const lugares = territorios
    .filter((t) => String(t?.tipo || "").toUpperCase() === "LUGAR")
    .map((t) => String(t?.valor || "").trim())
    .filter(Boolean);
  if (lugares.length) return lugares.join(", ");
  return u?.barrioAsignado || "-";
}

function claveRolFiltro(u?: Usuario | null) {
  if (!u) return "";
  const role = String(u.role || "").trim();
  const perms = Array.isArray(u.permisos) ? u.permisos.map(String) : [];
  if (role === "ADMIN_GENERAL") return "ADMIN_GENERAL";
  if (role === "ADMIN") return "ADMIN";
  if (role === "PERMISIONARIO") {
    if (perms.includes("INSPECTOR_ALOJAMIENTOS")) return "INSPECTOR_ALOJAMIENTOS";
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
  return base.length > 70 ? `${base.slice(0, 70)}…` : base;
}

const styles = {
  pageTitle: {
    marginTop: 0,
    marginBottom: 14,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.03em",
  } as CSSProperties,

  tabsRow: {
    display: "flex",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap" as const,
  } as CSSProperties,

  tabButton: (active: boolean): CSSProperties => ({
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.05)",
    color: "#ffffff",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
  }),

  box: {
    border: "1px solid rgba(255,255,255,0.14)",
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(6px)",
    color: "#eaf0ff",
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  } as CSSProperties,

  sectionTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  } as CSSProperties,

  error: {
    marginBottom: 12,
    padding: "12px 14px",
    border: "1px solid rgba(244,67,54,0.55)",
    background: "rgba(244,67,54,0.12)",
    color: "#ffe5e5",
    borderRadius: 12,
  } as CSSProperties,

  subtleText: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
  } as CSSProperties,

  input: {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  } as CSSProperties,

  textarea: {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    outline: "none",
    resize: "vertical" as const,
    boxSizing: "border-box",
  } as CSSProperties,

  select: {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
} as CSSProperties,

option: {
  backgroundColor: "#1f2937",
  color: "#ffffff",
} as CSSProperties,

  actionButton: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  } as CSSProperties,

  primaryButton: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(59,130,246,0.9)",
    background: "linear-gradient(180deg, rgba(59,130,246,0.95), rgba(37,99,235,0.95))",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 10px 20px rgba(37,99,235,0.28)",
  } as CSSProperties,

  mutedButton: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  } as CSSProperties,

  dashedBox: {
    padding: 12,
    border: "1px dashed rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 12,
  } as CSSProperties,

  fileInputHidden: {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as CSSProperties,

fileButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  boxSizing: "border-box",
} as CSSProperties,

  tableWrap: {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    overflow: "auto" as const,
    background: "rgba(255,255,255,0.03)",
  } as CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  } as CSSProperties,

  th: {
    textAlign: "left" as const,
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    background: "rgba(255,255,255,0.03)",
  } as CSSProperties,

  td: {
    padding: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    color: "#eaf0ff",
    verticalAlign: "top" as const,
  } as CSSProperties,

  modalBackdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 50,
  } as CSSProperties,

  modal: {
    width: "min(920px, 95vw)",
    maxHeight: "85vh",
    overflow: "auto" as const,
    background: "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(11,18,32,0.98))",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    padding: 16,
    color: "#eaf0ff",
    boxShadow: "0 20px 48px rgba(0,0,0,0.32)",
  } as CSSProperties,

  metaLine: {
    marginBottom: 6,
    color: "rgba(255,255,255,0.82)",
  } as CSSProperties,

  divider: {
    border: "none",
    height: 1,
    background: "rgba(255,255,255,0.1)",
    margin: "14px 0",
  } as CSSProperties,
};

export default function Mensajeria(props: MensajeriaProps = {}) {
  const { user } = useAuth();
  const mostrarContextoOperacional = up(user?.role) === "ADMIN_GENERAL";
  const esAlojado = props.contexto === "ALOJADO";
  const esInspectorAlojamientos = props.contexto === "INSPECTOR_ALOJAMIENTOS";
  const usaAgendaAlojamientos = esAlojado || esInspectorAlojamientos;
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

  const [openMsgId, setOpenMsgId] = useState<string | null>(null);
  const [openMsg, setOpenMsg] = useState<Mensaje | null>(null);
  const [openLoading, setOpenLoading] = useState(false);

  const [paraIds, setParaIds] = useState<string[]>([]);
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [filtroRole, setFiltroRole] = useState("");
  const [filtroBarrio, setFiltroBarrio] = useState(
    props.lockedBarrio ? String(props.lockedBarrio) : ""
  );
  const [files, setFiles] = useState<File[]>([]);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const limiteVisible = useMemo(() => {
    const adminLike = !props.lockedBarrio;
    return adminLike ? 1000 : 200;
  }, [props.lockedBarrio]);

  const rolesDisponibles = useMemo(() => {
    if (esAlojado) return ["ADMIN_GENERAL", "ADMIN", "INSPECTOR_ALOJAMIENTOS"];
    if (esInspectorAlojamientos) return ["ADMIN_GENERAL", "ADMIN", "ALOJADO"];
    return ["ADMIN_GENERAL", "ADMIN", "INSPECTOR", "JEFE_DE_BARRIO", "PERMISIONARIO"];
  }, [esAlojado, esInspectorAlojamientos]);

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

        if (locked) {
          const k = claveRolFiltro(u);
          if (
            k !== "ADMIN" &&
            k !== "ADMIN_GENERAL" &&
            String(u.barrioAsignado || "") !== locked
          ) {
            return false;
          }
        }

        if (filtroRole && claveRolFiltro(u) !== filtroRole) return false;

        if (!locked && filtroBarrio && String(u.barrioAsignado || "") !== filtroBarrio) {
          return false;
        }

        if (!q) return true;

        const blob = [
          u.nombre,
          u.apellido,
          usaAgendaAlojamientos ? "" : u.email,
          usaAgendaAlojamientos ? "" : u.dni,
          usaAgendaAlojamientos ? "" : u.matricula,
          u.role,
          u.barrioAsignado,
          u.viviendaLabel,
          ...(Array.isArray(u.territoriosAlojamiento)
            ? u.territoriosAlojamiento.map((t) => t?.valor)
            : []),
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
  }, [usuarios, buscaUsuario, filtroRole, filtroBarrio, props.lockedBarrio, usaAgendaAlojamientos]);

  const usuariosVisibles = useMemo(() => {
    return usuariosFiltrados.slice(0, limiteVisible);
  }, [usuariosFiltrados, limiteVisible]);

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
        ids.forEach((id) => set.delete(id));
      } else {
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

      setEntrada(Array.isArray(inboxRes.data) ? inboxRes.data : inboxRes.data?.mensajes || []);
      setEnviados(Array.isArray(sentRes.data) ? sentRes.data : sentRes.data?.mensajes || []);
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

    const remitenteId =
      typeof (msg as any)?.remitente === "object"
        ? String((msg as any)?.remitente?._id || "")
        : String((msg as any)?.remitente || "");

    if (remitenteId) setParaIds([remitenteId]);
    else setParaIds([]);

    const asuntoBase = String((msg as any)?.asunto || "").trim();
    const nuevoAsunto = asuntoBase.toUpperCase().startsWith("RE:")
      ? asuntoBase
      : `RE: ${asuntoBase}`;
    setAsunto(nuevoAsunto);

    setReplyToId(String((msg as any)?._id));

    const quoted = [
      "",
      "----- Mensaje anterior -----",
      (msg as any)?.creadoEn ? `Fecha: ${formatFecha((msg as any).creadoEn)}` : undefined,
      asuntoBase ? `Asunto: ${asuntoBase}` : undefined,
      remitenteId ? `Remitente: ${nombreRemitente(msg)}` : undefined,
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

  function nombreRemitente(msg?: Mensaje | null) {
    if (!msg) return "-";
    const remitenteId = idUsuario(msg.remitente);
    const desdeAgenda = nombreUsuario(usuariosById.get(remitenteId));
    if (desdeAgenda !== "-") return desdeAgenda;
    if (msg.remitenteDisplay) return displaySeguro(msg.remitenteDisplay);
    if (typeof msg.remitente === "object") {
      const desdeObjeto = nombreUsuario(msg.remitente as Usuario);
      if (desdeObjeto !== "-") return desdeObjeto;
    }
    return "-";
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

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h1 style={titleStyle}>Mensajería</h1>
          <p style={subtitleStyle}>
            Bandeja de entrada, enviados y composición de mensajes institucionales.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={styles.tabsRow}>
            <button
              style={styles.tabButton(tab === "entrada")}
              onClick={() => setTab("entrada")}
              disabled={loading}
            >
              Entrada
            </button>
            <button
              style={styles.tabButton(tab === "enviados")}
              onClick={() => setTab("enviados")}
              disabled={loading}
            >
              Enviados
            </button>
            <button
              style={styles.tabButton(tab === "nuevo")}
              onClick={() => setTab("nuevo")}
              disabled={loading}
            >
              Nuevo
            </button>
            <button
              style={styles.tabButton(false)}
              onClick={cargarBandejas}
              disabled={loading}
            >
              Actualizar
            </button>
          </div>

          {errorMsg ? <div style={styles.error}>{errorMsg}</div> : null}

          {tab === "entrada" ? (
            <section style={styles.box}>
              <h2 style={styles.sectionTitle}>Bandeja de entrada</h2>

              {loading ? <p style={styles.subtleText}>Cargando…</p> : null}
              {!loading && entrada.length === 0 ? <p style={styles.subtleText}>No hay mensajes.</p> : null}

              {!loading && entrada.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Asunto / resumen</th>
                        <th style={styles.th}>Remitente</th>
                        {mostrarContextoOperacional ? <th style={styles.th}>Origen</th> : null}
                        {mostrarContextoOperacional ? <th style={styles.th}>Codigo</th> : null}
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrada.map((m) => (
                        <tr key={m._id}>
                          <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{formatFecha(m.creadoEn)}</td>
                          <td style={styles.td}>{resumenMensaje(m)}</td>
                          <td style={styles.td}>
                            {nombreRemitente(m)}
                          </td>
                          {mostrarContextoOperacional ? <td style={styles.td}>{contextoOrigen(m)}</td> : null}
                          {mostrarContextoOperacional ? <td style={styles.td}>{contextoCodigo(m)}</td> : null}
                          <td style={styles.td}>
                            <button
                              onClick={() => abrirMensaje(m._id, "entrada")}
                              disabled={loading || openLoading}
                              style={styles.actionButton}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === "enviados" ? (
            <section style={styles.box}>
              <h2 style={styles.sectionTitle}>Enviados</h2>

              {loading ? <p style={styles.subtleText}>Cargando…</p> : null}
              {!loading && enviados.length === 0 ? (
                <p style={styles.subtleText}>No hay mensajes enviados.</p>
              ) : null}

              {!loading && enviados.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Fecha</th>
                        <th style={styles.th}>Asunto / resumen</th>
                        <th style={styles.th}>Destinatarios</th>
                        {mostrarContextoOperacional ? <th style={styles.th}>Origen</th> : null}
                        {mostrarContextoOperacional ? <th style={styles.th}>Codigo</th> : null}
                        <th style={styles.th}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enviados.map((m) => (
                        <tr key={m._id}>
                          <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{formatFecha(m.creadoEn)}</td>
                          <td style={styles.td}>{resumenMensaje(m)}</td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            {Array.isArray(m.destinatarios) ? m.destinatarios.length : 0}
                          </td>
                          {mostrarContextoOperacional ? <td style={styles.td}>{contextoOrigen(m)}</td> : null}
                          {mostrarContextoOperacional ? <td style={styles.td}>{contextoCodigo(m)}</td> : null}
                          <td style={styles.td}>
                            <button
                              onClick={() => abrirMensaje(m._id, "enviados")}
                              disabled={loading || openLoading}
                              style={styles.actionButton}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === "nuevo" ? (
            <section style={styles.box}>
              <h2 style={styles.sectionTitle}>Nuevo mensaje</h2>

              <div style={{ display: "grid", gap: 10, maxWidth: 950 }}>
                <input
                  placeholder="Asunto"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />

                <textarea
                  placeholder="Cuerpo del mensaje"
                  value={cuerpo}
                  onChange={(e) => setCuerpo(e.target.value)}
                  rows={6}
                  style={styles.textarea}
                  disabled={loading}
                />

                <div style={styles.dashedBox}>
                  <strong>Adjuntos (PDF / JPG / PNG)</strong>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <>
  <input
    id="mensajeria-adjuntos"
    type="file"
    multiple
    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
    onChange={(e) => setFiles(Array.from(e.target.files || []))}
    disabled={loading}
    style={styles.fileInputHidden}
  />
  <label htmlFor="mensajeria-adjuntos" style={styles.fileButton}>
    Elegir archivos
  </label>
</>
                    <button onClick={() => setFiles([])} disabled={loading} style={styles.actionButton}>
                      Limpiar adjuntos
                    </button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.74)" }}>
                    Adjuntos seleccionados: <strong>{files.length}</strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    placeholder={usaAgendaAlojamientos ? "Buscar destinatario institucional" : "Buscar destinatario (nombre/email/dni/matrícula)"}
                    value={buscaUsuario}
                    onChange={(e) => setBuscaUsuario(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 260 }}
                    disabled={loading}
                  />

                  <select
  value={filtroRole}
  onChange={(e) => setFiltroRole(e.target.value)}
  disabled={loading}
  style={styles.select}
>
  <option value="" style={styles.option}>
    Todos los roles
  </option>
  {rolesDisponibles.map((r) => (
    <option key={r} value={r} style={styles.option}>
      {r === "ADMIN_GENERAL"
        ? "ADMIN_GENERAL"
        : r === "ADMIN"
        ? "ADMIN"
        : r === "INSPECTOR_ALOJAMIENTOS"
        ? "INSPECTOR DE ALOJAMIENTO"
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

                  {!props.hideBarrioSelect ? (
                    <select
  value={props.lockedBarrio ? String(props.lockedBarrio) : filtroBarrio}
  onChange={(e) => {
    if (!props.lockedBarrio) setFiltroBarrio(e.target.value);
  }}
  disabled={loading || !!props.lockedBarrio}
  style={styles.select}
>
  <option value="" style={styles.option}>
    {props.lockedBarrio ? String(props.lockedBarrio) : "Todos los barrios"}
  </option>
  {!props.lockedBarrio &&
    barriosDisponibles.map((b) => (
      <option key={b} value={b} style={styles.option}>
        {b}
      </option>
    ))}
</select>
                  ) : null}

                  <button onClick={seleccionarPorFiltroActual} disabled={loading} style={styles.actionButton}>
                    Agregar filtrados
                  </button>

                  <button onClick={limpiarDestinatarios} disabled={loading} style={styles.actionButton}>
                    Limpiar destinatarios
                  </button>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, textAlign: "center", width: 40 }}>
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
                        <th style={styles.th}>Usuario</th>
                        <th style={styles.th}>Rol</th>
                        <th style={styles.th}>{usaAgendaAlojamientos ? "Ambito" : "Barrio"}</th>
                        <th style={styles.th}>{usaAgendaAlojamientos ? "Referencia" : "Vivienda"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosVisibles.map((u) => {
                        const id = String(u._id);
                        const checked = paraIds.includes(id);
                        return (
                          <tr key={id}>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePara(id)}
                                disabled={loading}
                              />
                            </td>
                            <td style={styles.td}>{nombreUsuario(u)}</td>
                            <td style={styles.td}>{etiquetaRol(u)}</td>
                            <td style={styles.td}>{usaAgendaAlojamientos ? ambitoUsuario(u) : safe(u.barrioAsignado)}</td>
                            <td style={styles.td}>{usaAgendaAlojamientos ? u.viviendaLabel || etiquetaRol(u) : u.viviendaLabel || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                  Destinatarios seleccionados: <strong>{paraIds.length}</strong> (se muestran hasta{" "}
                  <strong>{limiteVisible}</strong> usuarios filtrados)
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={enviarMensaje} disabled={loading} style={styles.primaryButton}>
                    Enviar
                  </button>
                  <button
                    onClick={limpiarFormularioNuevo}
                    disabled={loading}
                    style={styles.mutedButton}
                  >
                    Limpiar formulario
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {openMsgId ? (
            <div style={styles.modalBackdrop} onClick={cerrarMensaje}>
              <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <strong style={{ fontSize: 18, color: "#fff" }}>Mensaje</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {openMsg ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          responderAlMensaje(openMsg);
                        }}
                        disabled={openLoading}
                        style={styles.primaryButton}
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
                      style={styles.mutedButton}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                {openLoading ? <p style={styles.subtleText}>Cargando…</p> : null}

                {!openLoading && openMsg ? (
                  <>
                    <p style={styles.metaLine}>
                      <strong>Fecha:</strong> {formatFecha(openMsg.creadoEn)}
                    </p>
                    <p style={styles.metaLine}>
                      <strong>Asunto:</strong> {safe(openMsg.asunto)}
                    </p>
                    <p style={styles.metaLine}>
                      <strong>Remitente:</strong>{" "}
                      {nombreRemitente(openMsg)}
                    </p>
                    <p style={styles.metaLine}>
                      <strong>Destinatarios:</strong>{" "}
                      {Array.isArray(openMsg.destinatarios)
                        ? openMsg.destinatarios
                            .map((id) => nombreUsuario(usuariosById.get(String(id))))
                            .join(", ")
                        : "-"}
                    </p>

                    <hr style={styles.divider} />

                    <div style={{ whiteSpace: "pre-wrap", color: "#eaf0ff" }}>
                      {safe(openMsg.cuerpo)}
                    </div>

                    <hr style={styles.divider} />

                    <div>
                      <strong>Adjuntos:</strong>{" "}
                      {openMsg.adjuntos && openMsg.adjuntos.length ? (
                        <ul style={{ marginTop: 10 }}>
                          {openMsg.adjuntos.map((a, idx) => (
                            <li key={idx} style={{ marginBottom: 6 }}>
                              {a.fileId ? (
                                <a
                                  href={`/api/mensajes/${openMsg._id}/adjuntos/${a.fileId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#93c5fd" }}
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

                {!openLoading && !openMsg ? (
                  <p style={styles.subtleText}>No se pudo cargar el mensaje.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
