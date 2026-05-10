// frontend/src/pages/permisionario/inspector/GestionarAnexo11Inspector.tsx

import { useMemo, useState } from "react";
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
    <div style={{ padding: 24 }}>
      <button
        onClick={() => navigate("/app/permisionario/mi-barrio-inspector/gestiones")}
        style={{ marginBottom: 12 }}
        disabled={busy}
      >
        Volver
      </button>

      <h2>Gestión — ANEXO_11</h2>

      {err && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 12,
            padding: 10,
            border: "1px solid #f44336",
            background: "#ffebee",
          }}
        >
          {err}
        </div>
      )}

      {infoMsg && !err && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 12,
            padding: 10,
            border: "1px solid #4caf50",
            background: "#e8f5e9",
          }}
        >
          {infoMsg}
        </div>
      )}

      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
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
        style={{
          marginTop: 12,
          marginBottom: 16,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={recargar} disabled={busy}>
          {busy ? "Procesando…" : "Recargar"}
        </button>

        <a
          href={`/api/formularios/${anexo._id}/pdf`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            padding: "6px 10px",
            border: "1px solid #999",
            borderRadius: 4,
            background: "#fff",
            color: "#000",
            textDecoration: "none",
          }}
        >
          PDF
        </a>
      </div>

      {acciones.cerradoPorAdmin && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            border: "1px solid #999",
            background: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          Este anexo fue cerrado por ADMIN GENERAL y ya no admite nuevas acciones del inspector.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Programar visita</h3>

          {acciones.canProgramarVisita ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Fecha programada
                </label>
                <input
                  type="datetime-local"
                  value={fechaProgramada}
                  onChange={(e) => setFechaProgramada(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Observación
                </label>
                <textarea
                  value={observacionVisita}
                  onChange={(e) => setObservacionVisita(e.target.value)}
                  rows={4}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <button onClick={programarVisita} disabled={busy}>
                Guardar visita
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13 }}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Resolución inspectiva</h3>

          {acciones.canResolver ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Decisión
                </label>
                <select
                  value={decisionInspector}
                  onChange={(e) => setDecisionInspector(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={busy}
                >
                  <option value="">Seleccionar</option>
                  <option value="APROBADO">APROBADO</option>
                  <option value="RECHAZADO">RECHAZADO</option>
                  <option value="OBSERVADO">OBSERVADO</option>
                </select>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Prioridad
                </label>
                <input
                  type="text"
                  value={prioridadInspector}
                  onChange={(e) => setPrioridadInspector(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              {up(decisionInspector) === "RECHAZADO" && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    Motivo de rechazo
                  </label>
                  <textarea
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    rows={3}
                    style={{ width: "100%" }}
                    disabled={busy}
                  />
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Observaciones inspector
                </label>
                <textarea
                  value={observacionesInspector}
                  onChange={(e) => setObservacionesInspector(e.target.value)}
                  rows={4}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <button onClick={registrarResolucion} disabled={busy}>
                Guardar resolución
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13 }}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Programar obra</h3>

          {acciones.canProgramarObra ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Fecha visita / obra
                </label>
                <input
                  type="datetime-local"
                  value={fechaProgramadaObra}
                  onChange={(e) => setFechaProgramadaObra(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Responsable
                </label>
                <input
                  type="text"
                  value={responsableTrabajo}
                  onChange={(e) => setResponsableTrabajo(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Descripción técnica
                </label>
                <textarea
                  value={descripcionTecnicaObra}
                  onChange={(e) => setDescripcionTecnicaObra(e.target.value)}
                  rows={4}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <button onClick={programarObra} disabled={busy}>
                Guardar programación de obra
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13 }}>
              {acciones.cerradoPorAdmin
                ? "Este anexo fue cerrado por ADMIN GENERAL."
                : "Este anexo aún no admite acciones para su estado actual."}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Final de obra</h3>

          {acciones.canFinalizarObra ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Fecha finalización
                </label>
                <input
                  type="datetime-local"
                  value={fechaFinalizacionInspector}
                  onChange={(e) => setFechaFinalizacionInspector(e.target.value)}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Observación final inspector
                </label>
                <textarea
                  value={observacionFinalInspector}
                  onChange={(e) => setObservacionFinalInspector(e.target.value)}
                  rows={4}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </div>

              <button onClick={finalizarObra} disabled={busy}>
                Registrar final de obra
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13 }}>
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
