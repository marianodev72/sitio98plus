// frontend/src/pages/permisionario/inspector/GestionarAnexo11Inspector.tsx

import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../../api/http";
import Anexo11ResumenRegistro from "../../../components/anexos/Anexo11ResumenRegistro";

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  usuario?: any;
  datos?: any;
  historialEstados?: any[];
};

type Props = {
  anexo: Anexo;
  user?: any;
  onReload?: () => Promise<void> | void;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

function clean(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function getDatos(anexo: Anexo) {
  return anexo?.datos && typeof anexo.datos === "object" ? anexo.datos : {};
}

function getPermisionarioNombre(anexo: Anexo) {
  const d = getDatos(anexo);
  return (
    d?.permisionarioNombre ||
    d?.postulanteLabel ||
    d?.postulanteNombre ||
    anexo?.usuario?.nombre ||
    "—"
  );
}

function getViviendaLabel(anexo: Anexo) {
  const d = getDatos(anexo);
  return (
    d?.viviendaLabel ||
    d?.unidadHabitacional ||
    d?.viviendaCodigo ||
    d?.casa ||
    d?.espacio ||
    "—"
  );
}

function getBarrio(anexo: Anexo) {
  const d = getDatos(anexo);
  return d?.viviendaBarrio || d?.inspectorBarrio || d?.barrio || "—";
}

function getSolicitud(anexo: Anexo) {
  const d = getDatos(anexo);
  return d?.solicitudDetalle || d?.detallePedido || d?.tipoSolicitud || "—";
}

function getDetalle(anexo: Anexo) {
  const d = getDatos(anexo);
  return d?.detallePedido || d?.solicitudDetalle || d?.descripcion || "—";
}

function getVisitas(anexo: Anexo) {
  const d = getDatos(anexo);
  return Array.isArray(d?.visitasProgramadas) ? d.visitasProgramadas : [];
}

function getDecisionInspector(anexo: Anexo) {
  const d = getDatos(anexo);
  return d?.decisionInspector || "";
}

function isAnexo11CerradoPorAdmin(anexo: Anexo) {
  const d = getDatos(anexo);
  const estado = up(anexo?.estado);
  const estadoInstitucional = up(anexo?.estadoInstitucional);

  return (
    estado === "CERRADO" ||
    estado === "FINALIZADO" ||
    estadoInstitucional === "CERRADO" ||
    estadoInstitucional === "CERRADO_ADMIN_GENERAL" ||
    estadoInstitucional === "FINALIZADO" ||
    up(d?.resolucionAdminGeneral) === "CERRADO" ||
    !!d?.fechaCierreAdminGeneral ||
    !!d?.cerradoPorAdminGeneralNombre
  );
}

export default function GestionarAnexo11Inspector({
  anexo,
  user,
  onReload,
}: Props) {
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const datos = useMemo(() => getDatos(anexo), [anexo]);
  const estadoInstitucional = up(anexo?.estadoInstitucional);

  const [fechaProgramada, setFechaProgramada] = useState("");
  const [observacionVisita, setObservacionVisita] = useState("");

  const [decisionInspector, setDecisionInspector] = useState(
    getDecisionInspector(anexo) || ""
  );
  const [motivoRechazo, setMotivoRechazo] = useState(datos?.motivoRechazo || "");
  const [prioridadInspector, setPrioridadInspector] = useState(
    datos?.prioridadInspector || datos?.prioridad || ""
  );
  const [observacionesInspector, setObservacionesInspector] = useState(
    datos?.observacionesInspector || ""
  );

  const [fechaProgramadaObra, setFechaProgramadaObra] = useState(
    datos?.fechaProgramadaObra || ""
  );
  const [responsableTrabajo, setResponsableTrabajo] = useState(
    datos?.responsableTrabajo || ""
  );
  const [descripcionTecnicaObra, setDescripcionTecnicaObra] = useState(
    datos?.descripcionTecnicaObra || ""
  );

  const [fechaFinalizacionInspector, setFechaFinalizacionInspector] = useState(
    datos?.fechaFinalizacionInspector || ""
  );
  const [observacionFinalInspector, setObservacionFinalInspector] = useState(
    datos?.observacionFinalInspector || ""
  );

  const acciones = useMemo(() => {
    const visitas = getVisitas(anexo);
    const yaAprobado = up(datos?.decisionInspector) === "APROBADO";
    const obraProgramada =
      !!datos?.fechaProgramadaObra ||
      !!datos?.responsableTrabajo ||
      !!datos?.descripcionTecnicaObra;

    const cerradoPorAdmin = isAnexo11CerradoPorAdmin(anexo);

    return {
      cerradoPorAdmin,
      canProgramarVisita: !cerradoPorAdmin,
      canResolver: !cerradoPorAdmin,
      canProgramarObra:
        !cerradoPorAdmin && (yaAprobado || up(decisionInspector) === "APROBADO"),
      canFinalizarObra:
        !cerradoPorAdmin && (obraProgramada || !!fechaProgramadaObra),
      visitasCount: visitas.length,
    };
  }, [anexo, datos, decisionInspector, fechaProgramadaObra]);

  const pageStyle: CSSProperties = {
    padding: "clamp(14px, 2.5vw, 24px)",
    color: "#E5E7EB",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowX: "hidden",
  };

  const titleStyle: CSSProperties = {
    marginTop: 0,
    marginBottom: 14,
    color: "#F8FAFC",
  };

  const buttonStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: busy ? "wait" : "pointer",
  };

  const primaryButtonStyle: CSSProperties = {
    ...buttonStyle,
    border: "1px solid rgba(34,197,94,0.32)",
    background: "rgba(22,163,74,0.22)",
    fontWeight: 800,
  };

  const pdfLinkStyle: CSSProperties = {
    ...buttonStyle,
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
  };

  const alertErrorStyle: CSSProperties = {
    marginTop: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(127,29,29,0.24)",
    color: "#fecaca",
    fontSize: 13,
    lineHeight: 1.45,
  };

  const alertSuccessStyle: CSSProperties = {
    marginTop: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(34,197,94,0.34)",
    background: "rgba(20,83,45,0.22)",
    color: "#bbf7d0",
    fontSize: 13,
    lineHeight: 1.45,
  };

  const noticeStyle: CSSProperties = {
    marginBottom: 16,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    lineHeight: 1.45,
  };

  const summaryStyle: CSSProperties = {
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 1.6,
    minWidth: 0,
  };

  const actionRowStyle: CSSProperties = {
    marginTop: 12,
    marginBottom: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  };

  const actionGridStyle: CSSProperties = {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    minWidth: 0,
  };

  const actionCardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    minWidth: 0,
    boxSizing: "border-box",
  };

  const sectionTitleStyle: CSSProperties = {
    marginTop: 0,
    marginBottom: 12,
    color: "#F8FAFC",
    fontSize: 16,
  };

  const fieldWrapStyle: CSSProperties = {
    marginBottom: 10,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    marginBottom: 6,
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  const controlStyle: CSSProperties = {
    width: "100%",
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#ffffff",
    boxSizing: "border-box",
    outline: "none",
  };

  const selectStyle: CSSProperties = {
    ...controlStyle,
    colorScheme: "dark",
  };

  const optionStyle: CSSProperties = {
    backgroundColor: "#111827",
    color: "#ffffff",
  };

  const textareaStyle: CSSProperties = {
    ...controlStyle,
    resize: "vertical",
    lineHeight: 1.5,
  };

  const unavailableTextStyle: CSSProperties = {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.45,
  };

  function buildHistorialEntry(texto: string) {
    return {
      fecha: new Date().toISOString(),
      texto,
      usuario: user?._id || user?.id || null,
    };
  }

  function getHistorialInspectorActual() {
    return Array.isArray(datos?.observacionesInspectorHistorial)
      ? datos.observacionesInspectorHistorial
      : [];
  }

  async function recargar() {
    try {
      setBusy(true);
      setErr("");
      setInfoMsg("");
      await onReload?.();
    } catch (e) {
      console.error("[ANEXO_11] Error recargando", e);
      setErr("No se pudo recargar la información del anexo.");
    } finally {
      setBusy(false);
    }
  }

  async function patchDatos(nextDatos: any, successMessage: string) {
    try {
      setBusy(true);
      setErr("");
      setInfoMsg("");

      await http.patch(`/formularios/${anexo._id}/datos`, {
        datos: nextDatos,
      });

      setInfoMsg(successMessage);
      await onReload?.();
    } catch (e: any) {
      console.error("[ANEXO_11] Error guardando datos", e);
      setErr(
        e?.response?.data?.message ||
          "No se pudieron guardar los cambios para este anexo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function programarVisita() {
    if (acciones.cerradoPorAdmin) {
      setErr("Este anexo fue cerrado por ADMIN GENERAL y no admite nuevas acciones.");
      return;
    }

    if (!fechaProgramada) {
      setErr("Debe indicar una fecha para programar la visita.");
      return;
    }

    const visitasActuales = Array.isArray(datos?.visitasProgramadas)
      ? datos.visitasProgramadas
      : [];

    const historialActual = getHistorialInspectorActual();

    const textoHistorial = [
      "Visita programada",
      `Fecha: ${fechaProgramada}`,
      clean(observacionVisita) ? `Observación: ${clean(observacionVisita)}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const nextDatos = {
      ...datos,
      visitasProgramadas: [
        ...visitasActuales,
        {
          fechaProgramada,
          observacion: observacionVisita || "",
          creadoPor: user?._id || user?.id || null,
          fechaRegistro: new Date().toISOString(),
        },
      ],
      observacionesInspector: clean(observacionVisita) || datos?.observacionesInspector || "",
      observacionesInspectorHistorial: [
        ...historialActual,
        buildHistorialEntry(textoHistorial),
      ],
    };

    await patchDatos(nextDatos, "Visita programada correctamente.");
    setFechaProgramada("");
    setObservacionVisita("");
  }

  async function registrarResolucion() {
    if (acciones.cerradoPorAdmin) {
      setErr("Este anexo fue cerrado por ADMIN GENERAL y no admite nuevas acciones.");
      return;
    }

    if (!decisionInspector) {
      setErr("Debe seleccionar una decisión del inspector.");
      return;
    }

    if (up(decisionInspector) === "RECHAZADO" && !motivoRechazo.trim()) {
      setErr("Debe indicar el motivo de rechazo.");
      return;
    }

    const historialActual = getHistorialInspectorActual();

    const textoResumen = [
      `Decisión: ${decisionInspector || "—"}`,
      prioridadInspector ? `Prioridad: ${prioridadInspector}` : "",
      clean(observacionesInspector) ? `Observación: ${clean(observacionesInspector)}` : "",
      up(decisionInspector) === "RECHAZADO" && motivoRechazo
        ? `Motivo rechazo: ${motivoRechazo}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const nextDatos = {
      ...datos,
      decisionInspector,
      motivoRechazo: motivoRechazo || "",
      prioridadInspector: prioridadInspector || "",
      observacionesInspector: clean(observacionesInspector) || "",
      observacionesInspectorHistorial: [
        ...historialActual,
        buildHistorialEntry(textoResumen),
      ],
    };

    await patchDatos(nextDatos, "Resolución inspectiva registrada correctamente.");
  }

  async function programarObra() {
    if (acciones.cerradoPorAdmin) {
      setErr("Este anexo fue cerrado por ADMIN GENERAL y no admite nuevas acciones.");
      return;
    }

    if (!fechaProgramadaObra && !responsableTrabajo && !descripcionTecnicaObra) {
      setErr("Debe completar al menos un dato de programación de obra.");
      return;
    }

    const historialActual = getHistorialInspectorActual();

    const textoResumen = [
      "Programación de obra",
      fechaProgramadaObra ? `Fecha: ${fechaProgramadaObra}` : "",
      clean(responsableTrabajo) ? `Responsable: ${clean(responsableTrabajo)}` : "",
      clean(descripcionTecnicaObra)
        ? `Descripción técnica: ${clean(descripcionTecnicaObra)}`
        : "",
      clean(observacionesInspector) ? `Observación inspector: ${clean(observacionesInspector)}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const nextDatos = {
      ...datos,
      fechaProgramadaObra: fechaProgramadaObra || "",
      responsableTrabajo: responsableTrabajo || "",
      descripcionTecnicaObra: descripcionTecnicaObra || "",
      observacionesInspector:
        clean(observacionesInspector) ||
        clean(descripcionTecnicaObra) ||
        datos?.observacionesInspector ||
        "",
      observacionesInspectorHistorial: [
        ...historialActual,
        buildHistorialEntry(textoResumen),
      ],
    };

    await patchDatos(nextDatos, "Programación de obra guardada correctamente.");
  }

  async function finalizarObra() {
    if (acciones.cerradoPorAdmin) {
      setErr("Este anexo fue cerrado por ADMIN GENERAL y no admite nuevas acciones.");
      return;
    }

    if (!fechaFinalizacionInspector) {
      setErr("Debe indicar la fecha de finalización.");
      return;
    }

    const historialActual = getHistorialInspectorActual();

    const textoFinal = [
      "Final de obra inspector",
      `Fecha finalización: ${fechaFinalizacionInspector}`,
      clean(observacionFinalInspector)
        ? `Observación: ${clean(observacionFinalInspector)}`
        : "",
      clean(observacionesInspector)
        ? `Observación inspector: ${clean(observacionesInspector)}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const nextDatos = {
      ...datos,
      trabajoFinalizadoInspector: true,
      fechaFinalizacionInspector,
      observacionFinalInspector: observacionFinalInspector || "",
      observacionesInspector:
        clean(observacionFinalInspector) ||
        clean(observacionesInspector) ||
        datos?.observacionesInspector ||
        "",
      observacionesInspectorHistorial: [
        ...historialActual,
        buildHistorialEntry(textoFinal),
      ],
    };

    try {
      setBusy(true);
      setErr("");
      setInfoMsg("");

      await http.patch(`/formularios/${anexo._id}/datos`, {
        datos: nextDatos,
      });

      setInfoMsg("Final de obra registrada correctamente.");
      await onReload?.();
    } catch (e: any) {
      console.error("[ANEXO_11] Error registrando final de obra", e);
      setErr(
        e?.response?.data?.message ||
          "No se pudo registrar el final de obra."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={pageStyle}>
      <button
        onClick={() => navigate("/app/permisionario/mi-barrio-inspector/gestiones")}
        style={{ ...buttonStyle, marginBottom: 12 }}
        disabled={busy}
      >
        Volver
      </button>

      <h2 style={titleStyle}>Gestión — ANEXO_11</h2>

      {err && (
        <div
          style={alertErrorStyle}
        >
          {err}
        </div>
      )}

      {infoMsg && !err && (
        <div
          style={alertSuccessStyle}
        >
          {infoMsg}
        </div>
      )}

      <div style={summaryStyle}>
        <div>
          <b>Estado:</b> {safe(anexo.estado)}
          {estadoInstitucional ? ` / ${estadoInstitucional}` : ""}
        </div>
        <div>
          <b>Vivienda / Espacio:</b> {safe(getViviendaLabel(anexo))}
        </div>
        <div>
          <b>Barrio:</b> {safe(getBarrio(anexo))}
        </div>
        <div>
          <b>Permisionario:</b> {safe(getPermisionarioNombre(anexo))}
        </div>
        <div>
          <b>Tipo de solicitud:</b> {safe(getSolicitud(anexo))}
        </div>
        <div>
          <b>Detalle:</b> {safe(getDetalle(anexo))}
        </div>
      </div>

      <Anexo11ResumenRegistro anexo={anexo} mostrarAdmin />

      <div
        style={actionRowStyle}
      >
        <button onClick={recargar} disabled={busy} style={buttonStyle}>
          {busy ? "Procesando…" : "Recargar"}
        </button>

        <a
          href={`/api/formularios/${anexo._id}/pdf`}
          target="_blank"
          rel="noreferrer"
          style={pdfLinkStyle}
        >
          PDF
        </a>
      </div>

      {acciones.cerradoPorAdmin && (
        <div
          style={noticeStyle}
        >
          Este anexo fue cerrado por ADMIN GENERAL y ya no admite nuevas acciones del inspector.
        </div>
      )}

      <div
        style={actionGridStyle}
      >
        <div style={actionCardStyle}>
          <h3 style={sectionTitleStyle}>Programar visita</h3>

          {acciones.canProgramarVisita ? (
            <>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Fecha programada
                </label>
                <input
                  type="datetime-local"
                  value={fechaProgramada}
                  onChange={(e) => setFechaProgramada(e.target.value)}
                  style={controlStyle}
                  disabled={busy}
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Observación
                </label>
                <textarea
                  value={observacionVisita}
                  onChange={(e) => setObservacionVisita(e.target.value)}
                  rows={4}
                  style={textareaStyle}
                  disabled={busy}
                />
              </div>

              <button onClick={programarVisita} disabled={busy} style={primaryButtonStyle}>
                Guardar visita
              </button>
            </>
          ) : (
            <div style={unavailableTextStyle}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>

        <div style={actionCardStyle}>
          <h3 style={sectionTitleStyle}>Resolución inspectiva</h3>

          {acciones.canResolver ? (
            <>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Decisión
                </label>
                <select
                  value={decisionInspector}
                  onChange={(e) => setDecisionInspector(e.target.value)}
                  style={selectStyle}
                  disabled={busy}
                >
                  <option value="" style={optionStyle}>Seleccionar</option>
                  <option value="APROBADO" style={optionStyle}>APROBADO</option>
                  <option value="RECHAZADO" style={optionStyle}>RECHAZADO</option>
                  <option value="OBSERVADO" style={optionStyle}>OBSERVADO</option>
                </select>
              </div>

              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Prioridad
                </label>
                <input
                  type="text"
                  value={prioridadInspector}
                  onChange={(e) => setPrioridadInspector(e.target.value)}
                  style={controlStyle}
                  disabled={busy}
                />
              </div>

              {up(decisionInspector) === "RECHAZADO" && (
                <div style={fieldWrapStyle}>
                  <label style={labelStyle}>
                    Motivo de rechazo
                  </label>
                  <textarea
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    rows={3}
                    style={textareaStyle}
                    disabled={busy}
                  />
                </div>
              )}

              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Observaciones inspector
                </label>
                <textarea
                  value={observacionesInspector}
                  onChange={(e) => setObservacionesInspector(e.target.value)}
                  rows={4}
                  style={textareaStyle}
                  disabled={busy}
                />
              </div>

              <button onClick={registrarResolucion} disabled={busy} style={primaryButtonStyle}>
                Guardar resolución
              </button>
            </>
          ) : (
            <div style={unavailableTextStyle}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>

        <div style={actionCardStyle}>
          <h3 style={sectionTitleStyle}>Programar obra</h3>

          {acciones.canProgramarObra ? (
            <>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Fecha visita / obra
                </label>
                <input
                  type="datetime-local"
                  value={fechaProgramadaObra}
                  onChange={(e) => setFechaProgramadaObra(e.target.value)}
                  style={controlStyle}
                  disabled={busy}
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Responsable
                </label>
                <input
                  type="text"
                  value={responsableTrabajo}
                  onChange={(e) => setResponsableTrabajo(e.target.value)}
                  style={controlStyle}
                  disabled={busy}
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Descripción técnica
                </label>
                <textarea
                  value={descripcionTecnicaObra}
                  onChange={(e) => setDescripcionTecnicaObra(e.target.value)}
                  rows={4}
                  style={textareaStyle}
                  disabled={busy}
                />
              </div>

              <button onClick={programarObra} disabled={busy} style={primaryButtonStyle}>
                Guardar programación de obra
              </button>
            </>
          ) : (
            <div style={unavailableTextStyle}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>

        <div style={actionCardStyle}>
          <h3 style={sectionTitleStyle}>Final de obra</h3>

          {acciones.canFinalizarObra ? (
            <>
              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Fecha finalización
                </label>
                <input
                  type="datetime-local"
                  value={fechaFinalizacionInspector}
                  onChange={(e) => setFechaFinalizacionInspector(e.target.value)}
                  style={controlStyle}
                  disabled={busy}
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={labelStyle}>
                  Observación final inspector
                </label>
                <textarea
                  value={observacionFinalInspector}
                  onChange={(e) => setObservacionFinalInspector(e.target.value)}
                  rows={4}
                  style={textareaStyle}
                  disabled={busy}
                />
              </div>

              <button onClick={finalizarObra} disabled={busy} style={primaryButtonStyle}>
                Registrar final de obra
              </button>
            </>
          ) : (
            <div style={unavailableTextStyle}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
