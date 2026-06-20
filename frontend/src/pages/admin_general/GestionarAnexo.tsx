// frontend/src/pages/admin_general/GestionarAnexo.tsx
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import AnexoViewer from "../../components/anexos/AnexoViewer";
import Anexo11ResumenRegistro from "../../components/anexos/Anexo11ResumenRegistro";
import Anexo04Vista from "../../components/anexos/Anexo04Vista";
import Anexo01Viewer from "../../components/anexos/Anexo01Viewer";
import AdjuntosList from "../../components/AdjuntosList";
import {
  buttonRowStyle,
  cardStyle,
  heroStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type Conformidad = {
  ok?: boolean;
  fecha?: string;
  usuario?: string;
  observacion?: string;
};

type Adjunto = {
  nombre?: string;
  ruta?: string;
  tipo?: string;
  size?: number;
};

type Anexo = {
  _id: string;
  id?: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  derivadoDe?: string | null;
  datos?: any;
  adjuntos?: Adjunto[];
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function formatTipoDestino(value: unknown): string {
  const normalized = up(value);
  if (normalized === "OF") return "OFICIALES";
  if (normalized === "SO") return "SUBOFICIALES";
  if (normalized === "MIXTO") return "MIXTO";
  return "SIN DEFINIR";
}

function viviendaElegibleLabel(v: any): string {
  const base = safe(v?.codigo || v?.nombre || v?.direccion || prettyId(v?._id));
  const barrio = safe(v?.barrio);
  const dormitorios = v?.dormitorios === null || v?.dormitorios === undefined ? "—" : String(v.dormitorios);
  return `${base} - ${barrio} - ${dormitorios} dorm. - ${formatTipoDestino(v?.tipoDestino)}`;
}

function prettyId(v: unknown) {
  const s = String(v || "").trim();
  if (!s) return "—";
  if (/^[0-9a-fA-F]{24}$/.test(s)) return `…${s.slice(-6)}`;
  return s;
}

export default function GestionarAnexo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const isAdmin = role === "ADMIN_GENERAL" || role === "ADMIN";

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [textoAdmin, setTextoAdmin] = useState("");

  const [viviendaId, setViviendaId] = useState("");
  const [viviendasElegibles, setViviendasElegibles] = useState<any[]>([]);
  const [loadingViviendas, setLoadingViviendas] = useState(false);

  const [anexo01Datos, setAnexo01Datos] = useState<any>(null);
  const [origen, setOrigen] = useState<Anexo | null>(null);

  async function cargarViviendasElegiblesAsignacion() {
    const anexo01Id = String(anexo?._id || anexo?.id || id || "").trim();
    setViviendasElegibles([]);
    setViviendaId("");

    if (!anexo01Id) {
      setError("No se pudo determinar el ANEXO_01 para listar viviendas elegibles.");
      return;
    }

    setLoadingViviendas(true);
    try {
      const res = await http.get(`/viviendas/elegibles-asignacion`, {
        params: { anexo01Id },
        withCredentials: true,
      });

      const data = res?.data;
      const lista =
        (Array.isArray(data) && data) ||
        (Array.isArray(data?.viviendas) && data.viviendas) ||
        (Array.isArray(data?.items) && data.items) ||
        [];

      setViviendasElegibles(lista);
    } catch (e: any) {
      console.error("[ADMIN] Error cargando viviendas elegibles", e);
      setViviendasElegibles([]);
      setViviendaId("");
      setError(
        e?.response?.data?.code === "ANEXO_01_REQUERIDO" || [400, 409].includes(Number(e?.response?.status))
          ? "No se pudieron cargar viviendas elegibles: falta contexto del ANEXO_01."
          : e?.response?.data?.message ||
              "No se pudieron cargar viviendas compatibles para la postulacion."
      );
    } finally {
      setLoadingViviendas(false);
    }
  }

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.get(`/formularios/${id}`);
      const a = (res.data?.anexo || res.data?.formulario || null) as Anexo | null;
      setAnexo(a);
      setOrigen((res.data?.origen || null) as Anexo | null);
      if (res.data?.origen?.datos) setAnexo01Datos(res.data.origen.datos);

      const datosLocal = a?.datos || {};
      if (datosLocal?.observacionesAdminGeneral) {
        setTextoAdmin(datosLocal.observacionesAdminGeneral);
      } else {
        setTextoAdmin("");
      }
    } catch (e) {
      console.error("[ADMIN] Error cargando anexo", e);
      setError("No se pudo cargar el anexo. Contacte al administrador.");
      setAnexo(null);
      setOrigen(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const codigo = useMemo(() => up(anexo?.codigo), [anexo?.codigo]);
  const estado = useMemo(() => up(anexo?.estado), [anexo?.estado]);
  const datos = anexo?.datos || {};
  const viviendasDisponibles = useMemo(
    () => viviendasElegibles.filter((v: any) => up(v?.estado) === "DISPONIBLE"),
    [viviendasElegibles]
  );
  const viviendasADesocuparse = useMemo(
    () => viviendasElegibles.filter((v: any) => up(v?.estado) === "A_DESOCUPARSE"),
    [viviendasElegibles]
  );
  const totalViviendasElegibles = viviendasDisponibles.length + viviendasADesocuparse.length;
  const adjuntosParaMostrar: Adjunto[] =
    codigo === "ANEXO_02" ? origen?.adjuntos || [] : anexo?.adjuntos || [];

  useEffect(() => {
    if (!anexo?._id) return;

    if (codigo === "ANEXO_01") {
      cargarViviendasElegiblesAsignacion();
    } else {
      setViviendasElegibles([]);
      setViviendaId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anexo?._id, codigo]);

  useEffect(() => {
    async function cargarAnexo01Derivado() {
      try {
        setAnexo01Datos(null);

        if (codigo !== "ANEXO_02") return;
        const derivadoDe = String(anexo?.derivadoDe || "").trim();
        if (!/^[0-9a-fA-F]{24}$/.test(derivadoDe)) return;

        const res = await http.get(`/formularios/${derivadoDe}`);
        const a01 = res.data?.anexo || res.data?.formulario || null;
        const d01 = a01?.datos || null;

        setAnexo01Datos(d01);
      } catch (e) {
        console.error("[ADMIN] Error cargando ANEXO_01 derivado para preview", e);
        setAnexo01Datos(null);
      }
    }

    if (anexo?._id) cargarAnexo01Derivado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anexo?._id, codigo]);

  if (!isAdmin) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Acceso no autorizado</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)" }}>
              Esta página es solo para ADMIN_GENERAL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={softCardStyle}>Cargando…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div
            style={{
              ...softCardStyle,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(127,29,29,0.18)",
              color: "#fecaca",
            }}
          >
            {error}
            <div style={{ marginTop: 12 }}>
              <button onClick={() => navigate(-1)} style={secondaryButtonStyle}>
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anexo) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <div style={softCardStyle}>
            <p style={{ marginTop: 0 }}>No se encontraron datos del anexo.</p>
            <button onClick={() => navigate(-1)} style={secondaryButtonStyle}>
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const confPerm: Conformidad | null = (datos && datos.conformidadPermisionario) || null;
  const confPermOk = !!confPerm?.ok;

  const confInspector: Conformidad | null = (datos && datos.conformidadInspector) || null;
  const confInspectorOk = !!confInspector?.ok;

  const esAnexo11 = codigo === "ANEXO_11";

  const obsHistInspector: any[] = Array.isArray(datos.observacionesInspectorHistorial)
    ? datos.observacionesInspectorHistorial
    : [];

  const visitasProgramadas: any[] = Array.isArray(datos.visitasProgramadas)
    ? datos.visitasProgramadas
    : [];

  const decisionInspector: string = datos.decisionInspector || "";
  const responsableTrabajo: string = datos.responsableTrabajo || "";
  const prioridadInspector: string = datos.prioridadInspector || datos.prioridad || "";
  const trabajoFinalizadoInspector: boolean = !!datos.trabajoFinalizadoInspector;

  const esAnexoCerrableClasico = [
    "ANEXO_02",
    "ANEXO_03",
    "ANEXO_07",
    "ANEXO_08",
    "ANEXO_09",
  ].includes(codigo);

  const esEstadoCerrable =
    (codigo === "ANEXO_02" && estado === "EN_REVISION") ||
    (codigo !== "ANEXO_02" && ["EN_REVISION", "ENVIADO"].includes(estado));

  const puedeCerrarAdminClasico =
    esAnexoCerrableClasico &&
    esEstadoCerrable &&
    (codigo === "ANEXO_02" ? role === "ADMIN_GENERAL" : isAdmin);

  const puedeGestionarAdmin11 = isAdmin && esAnexo11 && esEstadoCerrable;
  const resultadoPostulacion = up(datos?.resultadoPostulacion);
  const esPostulacionAprobada =
    codigo === "ANEXO_01" &&
    (estado === "APROBADO" ||
      up(anexo?.estadoInstitucional) === "APROBADO_ADMIN_GENERAL" ||
      resultadoPostulacion === "APROBADO");
  const esPostulacionRechazada =
    codigo === "ANEXO_01" &&
    (estado === "RECHAZADO" ||
      up(anexo?.estadoInstitucional) === "RECHAZADO_ADMIN_GENERAL" ||
      resultadoPostulacion === "RECHAZADO");
  const esPostulacionTerminal = ["CERRADO", "ASIGNADO"].includes(estado);
  const puedeDecidirPostulacion01 =
    isAdmin && codigo === "ANEXO_01" && !esPostulacionAprobada && !esPostulacionRechazada && !esPostulacionTerminal;
  const puedeGenerarAnexo02 = isAdmin && codigo === "ANEXO_01";

  async function cerrarTramiteAdminClasico() {
    if (!anexo?._id) return;

    const rutas: Record<string, string> = {
      ANEXO_02: "conformidad-admin",
      ANEXO_03: "cerrar-admin-03",
      ANEXO_07: "cerrar-admin-07",
      ANEXO_08: "cerrar-admin-08",
      ANEXO_09: "cerrar-admin-09",
    };

    const endpoint = rutas[codigo];
    if (!endpoint) {
      setError(`No existe ruta de cierre para ${codigo}`);
      return;
    }

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const payload =
        codigo === "ANEXO_02"
          ? { datos: {} }
          : {
              datos: {
                observacionesAdminGeneral: textoAdmin || "",
              },
            };

      const res = await http.post(`/formularios/${anexo._id}/${endpoint}`, payload);

      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) {
        setAnexo(upd);
      }

      setInfoMsg("Trámite cerrado correctamente por ADMIN GENERAL.");
    } catch (e: any) {
      console.error("[ADMIN] Error cerrando trámite", e);
      setError(
        e?.response?.data?.message ||
          "No se pudo cerrar el trámite. Contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  async function aprobarPostulacionAnexo01() {
    if (!anexo?._id || codigo !== "ANEXO_01" || busy) return;
    const ok = window.confirm("Confirma la aprobacion formal de la postulacion ANEXO_01?");
    if (!ok) return;

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/aprobar-postulacion`, {});
      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) setAnexo(upd);
      setInfoMsg("Postulacion ANEXO_01 aprobada. Ya puede generar ANEXO_02.");
    } catch (e: any) {
      console.error("[ADMIN] Error aprobando postulacion ANEXO_01", e);
      setError(e?.response?.data?.message || "No se pudo aprobar la postulacion.");
    } finally {
      setBusy(false);
    }
  }

  async function rechazarPostulacionAnexo01() {
    if (!anexo?._id || codigo !== "ANEXO_01" || busy) return;
    const motivo = window.prompt("Ingrese el motivo obligatorio del rechazo de la postulacion:", "");
    if (motivo === null) return;
    const motivoTrim = motivo.trim();
    if (motivoTrim.length < 5) {
      setError("Debe indicar un motivo de rechazo de al menos 5 caracteres.");
      return;
    }

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/rechazar-postulacion`, {
        motivo: motivoTrim,
      });
      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) setAnexo(upd);
      setInfoMsg("Postulacion ANEXO_01 rechazada.");
    } catch (e: any) {
      console.error("[ADMIN] Error rechazando postulacion ANEXO_01", e);
      setError(e?.response?.data?.message || "No se pudo rechazar la postulacion.");
    } finally {
      setBusy(false);
    }
  }

  async function generarAnexo02Desde01() {
    if (!anexo?._id) return;

    if (codigo !== "ANEXO_01") {
      setError("Acción no disponible para este tipo de anexo.");
      return;
    }

    if (!esPostulacionAprobada) {
      setError("Debe aprobar la postulacion antes de generar ANEXO_02.");
      return;
    }

    const idTrim = viviendaId.trim();

    if (!idTrim) {
      setError("Debe seleccionar una vivienda.");
      return;
    }

    if (!/^[a-f\d]{24}$/i.test(idTrim)) {
      setError("Debe ingresar un ObjectId válido de vivienda.");
      return;
    }

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/generar-anexo-02`, {
        viviendaId: idTrim,
      });

      const nuevo = res.data?.anexo || null;
      if (nuevo?._id) {
        setInfoMsg("ANEXO_02 generado correctamente.");
        navigate(`/app/admin-general/gestiones/${nuevo._id}`);
        return;
      }

      setError("No se ha podido procesar su solicitud.");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const existingId = e?.response?.data?.existingId;
        if (existingId) {
          navigate(`/app/admin-general/gestiones/${existingId}`);
          return;
        }
      }

      console.error("[ADMIN] Error generando ANEXO_02", e);
      setError(
        e?.response?.data?.message || "No se ha podido procesar su solicitud."
      );
    } finally {
      setBusy(false);
    }
  }

  async function devolverAnexo11AlInspector() {
    if (!anexo?._id) return;

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/gestion-admin-11`, {
        accion: "DEVOLVER_A_INSPECTOR",
        observacionesAdminGeneral: textoAdmin || "",
      });

      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) setAnexo(upd);

      setInfoMsg(
        "Trámite devuelto al inspector para revisión, con observaciones de ADMIN GENERAL."
      );
    } catch (e: any) {
      console.error("[ADMIN] Error devolviendo ANEXO_11 al inspector", e);
      setError(
        e?.response?.data?.message ||
          "No se pudo devolver el trámite al inspector. Contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  async function cerrarAnexo11Admin() {
    if (!anexo?._id) return;

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/gestion-admin-11`, {
        accion: "CERRAR",
        observacionesAdminGeneral: textoAdmin || "",
      });

      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) setAnexo(upd);

      setInfoMsg("Trámite ANEXO_11 cerrado por ADMIN GENERAL.");
    } catch (e: any) {
      console.error("[ADMIN] Error cerrando ANEXO_11", e);
      setError(
        e?.response?.data?.message ||
          "No se pudo cerrar el trámite ANEXO_11. Contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

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

  const housingActionRowStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" };
  const housingFieldStyle: CSSProperties = { display: "grid", gap: 6, flex: "1 1 360px", minWidth: 0 };
  const housingLabelStyle: CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.62)" };
  const housingSelectStyle: CSSProperties = { ...controlStyle, width: "100%", minWidth: 0, minHeight: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", backgroundColor: "rgba(255,255,255,0.04)", outline: "none", colorScheme: "dark", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" };
  const housingOptionStyle: CSSProperties = { backgroundColor: "#1f2937", color: "#ffffff" };
  const housingOptgroupStyle: CSSProperties = { backgroundColor: "#111827", color: "#eaf0ff" };

  const miniTableWrap: CSSProperties = {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
  };

  const miniTh: CSSProperties = {
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    textAlign: "left",
    padding: 8,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    background: "rgba(255,255,255,0.04)",
  };

  const miniTd: CSSProperties = {
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    padding: 8,
    color: "#ffffff",
    fontSize: 13,
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <h2 style={titleStyle}>Gestión de Anexo (ADMIN GENERAL)</h2>
          <p style={subtitleStyle}>
            Consulta, visualización y gestión institucional del trámite seleccionado.
          </p>
        </div>

        {infoMsg ? (
          <div
            style={{
              ...softCardStyle,
              marginBottom: 12,
              border: "1px solid rgba(34,197,94,0.28)",
              background: "rgba(22,101,52,0.18)",
              color: "#bbf7d0",
            }}
          >
            {infoMsg}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              ...softCardStyle,
              marginBottom: 12,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(127,29,29,0.18)",
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={cardStyle}>
          <div style={{ ...softCardStyle, marginBottom: 16 }}>
            <div><b>ID:</b> {prettyId(anexo._id)}</div>
            <div><b>Código:</b> {anexo.codigo}</div>
            <div>
              <b>Estado:</b> {safe(anexo.estado)}
              {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
            </div>
            {codigo === "ANEXO_01" && (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <b>Resultado postulacion:</b>{" "}
                {esPostulacionAprobada
                  ? "APROBADA"
                  : esPostulacionRechazada
                  ? "RECHAZADA"
                  : "PENDIENTE"}
                {esPostulacionRechazada && datos?.motivoRechazo ? (
                  <div style={{ marginTop: 4 }}>
                    <b>Motivo rechazo:</b> {safe(datos.motivoRechazo)}
                  </div>
                ) : null}
              </div>
            )}
            <div><b>Creado:</b> {fmtDate(anexo.createdAt)}</div>
            <div><b>Actualizado:</b> {fmtDate(anexo.updatedAt)}</div>

            {codigo === "ANEXO_03" && (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <b>Conformidad Permisionario (03):</b>{" "}
                {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
              </div>
            )}

            {codigo === "ANEXO_07" && (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <b>Revisión Inspector (07):</b>{" "}
                {confInspectorOk ? `SI — ${fmtDate(confInspector?.fecha as string)}` : "NO"}
              </div>
            )}

            {codigo === "ANEXO_08" && (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <b>Conformidad Permisionario (08):</b>{" "}
                {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
              </div>
            )}

            {codigo === "ANEXO_09" && (
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <b>Conformidad Permisionario (09):</b>{" "}
                {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
              </div>
            )}
          </div>

          {codigo === "ANEXO_11" && (
            <Anexo11ResumenRegistro anexo={anexo as any} mostrarAdmin={true} />
          )}

          <div style={{ marginTop: 16 }}>
  {codigo === "ANEXO_01" ? (
    <Anexo01Viewer datos={datos} />
  ) : codigo === "ANEXO_04" ? (
    <Anexo04Vista datos={datos} />
  ) : (
    <AnexoViewer
      codigo={anexo.codigo}
      datos={datos}
      anexo01Datos={anexo01Datos || origen?.datos}
      vivienda={undefined}
    />
  )}
</div>

          {esAnexo11 && (
            <div style={{ ...softCardStyle, marginTop: 16, marginBottom: 16 }}>
              <h3 style={sectionTitleStyle}>Resumen técnico — ANEXO 11 (Pedido de Trabajo)</h3>

              <p style={{ fontSize: 13 }}>
                <b>Prioridad fijada por inspector:</b> {safe(prioridadInspector || "—")}
              </p>
              <p style={{ fontSize: 13 }}>
                <b>Responsable del trabajo:</b> {safe(responsableTrabajo || "—")}
              </p>
              <p style={{ fontSize: 13 }}>
                <b>Decisión del inspector:</b> {safe(decisionInspector || "—")}
              </p>
              <p style={{ fontSize: 13 }}>
                <b>Trabajo marcado como finalizado por inspector:</b>{" "}
                {trabajoFinalizadoInspector ? "SI" : "NO"}
              </p>

              <p style={{ fontSize: 13, marginTop: 8 }}>
                <b>Conformidad del Permisionario:</b>{" "}
                {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
              </p>

              <p style={{ fontSize: 13 }}>
                <b>Conformidad de Inspector (sello):</b>{" "}
                {confInspectorOk ? `SI — ${fmtDate(confInspector?.fecha as string)}` : "NO"}
              </p>

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px dashed rgba(255,255,255,0.20)",
                  fontSize: 13,
                }}
              >
                <b>Historial de observaciones del inspector:</b>
                {obsHistInspector.length > 0 ? (
                  <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                    {obsHistInspector.map((o, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        <b>{fmtDate(o.fecha)}</b>: {typeof o.texto === "string" ? o.texto : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ marginTop: 4 }}>No hay observaciones registradas por el inspector.</p>
                )}
              </div>

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px dashed rgba(255,255,255,0.20)",
                  fontSize: 13,
                }}
              >
                <b>Visitas programadas:</b>
                {visitasProgramadas.length > 0 ? (
                  <div style={{ ...miniTableWrap, marginTop: 6 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={miniTh}>Fecha programada</th>
                          <th style={miniTh}>Observación</th>
                          <th style={miniTh}>Registrada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitasProgramadas.map((v, idx) => (
                          <tr key={idx}>
                            <td style={miniTd}>{fmtDate(v.fechaProgramada)}</td>
                            <td style={miniTd}>{safe(v.observacion)}</td>
                            <td style={miniTd}>{fmtDate(v.creadoAt || v.fechaRegistro)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ marginTop: 4 }}>No hay visitas registradas.</p>
                )}
              </div>
            </div>
          )}

          <div style={{ ...buttonRowStyle, marginBottom: 16 }}>
            <button onClick={() => navigate(-1)} disabled={busy} style={secondaryButtonStyle}>
              Volver
            </button>

            <a
              href={`/api/formularios/${anexo._id}/pdf`}
              target="_blank"
              rel="noreferrer"
              style={{
                ...secondaryButtonStyle,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              PDF
            </a>

            <button onClick={cargar} disabled={busy} style={primaryButtonStyle}>
              Recargar
            </button>
          </div>

          <div style={{ ...softCardStyle, marginBottom: 18 }}>
            <h3 style={sectionTitleStyle}>Adjuntos</h3>
            <AdjuntosList formularioId={anexo._id} adjuntos={adjuntosParaMostrar} />
          </div>

          {(puedeCerrarAdminClasico || puedeGestionarAdmin11 || puedeGenerarAnexo02) && (
            <div style={{ ...softCardStyle, marginBottom: 18 }}>
              <h3 style={sectionTitleStyle}>Intervención ADMIN GENERAL</h3>

              <p style={{ fontSize: 13, marginBottom: 6, color: "rgba(255,255,255,0.82)" }}>
                Puede registrar observaciones institucionales y gestionar el cierre o devolución del trámite.
              </p>

              <textarea
                rows={4}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#ffffff",
                  marginBottom: 8,
                  boxSizing: "border-box",
                }}
                value={textoAdmin}
                onChange={(e) => setTextoAdmin(e.target.value)}
                placeholder="Observaciones institucionales (opcional)…"
                disabled={busy}
              />

              {codigo === "ANEXO_01" && (
                <div style={{ ...softCardStyle, marginBottom: 16 }}>
                  <h4 style={{ marginTop: 0, color: "#ffffff" }}>Generación institucional</h4>

                  <div style={{ ...buttonRowStyle, marginBottom: 12 }}>
                    {puedeDecidirPostulacion01 && (
                      <>
                        <button
                          type="button"
                          onClick={aprobarPostulacionAnexo01}
                          disabled={busy}
                          style={successButtonStyle}
                        >
                          Aprobar postulacion
                        </button>
                        <button
                          type="button"
                          onClick={rechazarPostulacionAnexo01}
                          disabled={busy}
                          style={secondaryButtonStyle}
                        >
                          Rechazar postulacion
                        </button>
                      </>
                    )}
                    {esPostulacionAprobada && (
                      <span style={{ color: "#bbf7d0", fontWeight: 800 }}>Postulacion aprobada</span>
                    )}
                    {esPostulacionRechazada && (
                      <span style={{ color: "#fecaca", fontWeight: 800 }}>Postulacion rechazada</span>
                    )}
                  </div>

                  <div style={housingActionRowStyle}>
                    <div style={housingFieldStyle}>
                      <label style={housingLabelStyle}>Vivienda elegible</label>
                    <select
                      value={viviendaId}
                      onChange={(e) => setViviendaId(e.target.value)}
                      disabled={busy || loadingViviendas}
                      style={housingSelectStyle}
                    >
                      <option value="" style={housingOptionStyle}>
                        {loadingViviendas ? "Cargando viviendas…" : "Seleccionar vivienda…"}
                      </option>

                      {!loadingViviendas && totalViviendasElegibles === 0 && (
                        <option value="" disabled style={housingOptionStyle}>
                          No hay viviendas elegibles para este ANEXO_01
                        </option>
                      )}

                      {viviendasDisponibles.length > 0 && (
                        <optgroup label="DISPONIBLE" style={housingOptgroupStyle}>
                          {viviendasDisponibles.map((v: any) => (
                              <option key={String(v?._id)} value={String(v?._id)} style={housingOptionStyle}>
                                {viviendaElegibleLabel(v)}
                              </option>
                            ))}
                        </optgroup>
                      )}

                      {viviendasADesocuparse.length > 0 && (
                        <optgroup label="A_DESOCUPARSE" style={housingOptgroupStyle}>
                          {viviendasADesocuparse.map((v: any) => (
                              <option key={String(v?._id)} value={String(v?._id)} style={housingOptionStyle}>
                                {viviendaElegibleLabel(v)}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    </div>

                    <button
                      type="button"
                      onClick={generarAnexo02Desde01}
                      disabled={busy || !esPostulacionAprobada}
                      style={{
                        ...successButtonStyle,
                        opacity: busy || !esPostulacionAprobada ? 0.6 : 1,
                        cursor: busy || !esPostulacionAprobada ? "not-allowed" : "pointer",
                      }}
                    >
                      Generar ANEXO_02
                    </button>
                  </div>

                  {!esPostulacionAprobada && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#fecaca" }}>
                      Debe aprobar la postulacion antes de generar ANEXO_02.
                    </div>
                  )}

                  <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                    Se asigna la vivienda en este paso. Si ya existe un ANEXO_02 derivado, se abrirá automáticamente.
                  </div>
                </div>
              )}

              {esAnexo11 ? (
                <div style={{ ...buttonRowStyle, marginTop: 0 }}>
                  <button onClick={devolverAnexo11AlInspector} disabled={busy} style={secondaryButtonStyle}>
                    Devolver al inspector (ANEXO 11)
                  </button>
                  <button onClick={cerrarAnexo11Admin} disabled={busy} style={successButtonStyle}>
                    Cerrar trámite ANEXO 11 (ADMIN GENERAL)
                  </button>
                </div>
              ) : (
                <button
                  onClick={cerrarTramiteAdminClasico}
                  disabled={busy}
                  style={successButtonStyle}
                >
                  Cerrar trámite (ADMIN GENERAL)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
