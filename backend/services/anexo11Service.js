//backend/services/anexo11Service.js
function up(v) {
  return String(v || "").toUpperCase().trim();
}

function isObj(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function cleanText(v) {
  return typeof v === "string" ? v.trim() : "";
}

function toBool(v) {
  return v === true;
}

function pushHistorialEstado(anexo, item) {
  if (!Array.isArray(anexo.historialEstados)) {
    anexo.historialEstados = [];
  }
  anexo.historialEstados.push(item);
}

function aplicarCambiosAnexo11({ anexo, datos = {}, actor = {}, flags = {} }) {
  if (!anexo) return anexo;

  if (!isObj(anexo.datos)) {
    anexo.datos = {};
  }

  const d = anexo.datos;
  const role = up(actor.role);
  const userId = actor._id ? String(actor._id) : null;
  const ahora = new Date();

  const inspectorOpera = !!flags.inspectorOpera;
  const adminOpera = !!flags.adminOpera;
  const permisionarioOpera = !!flags.permisionarioOpera;

  if (permisionarioOpera || inspectorOpera || adminOpera) {
    if ("unidad" in datos) d.unidad = datos.unidad || null;
    if ("dpto" in datos) d.dpto = datos.dpto || null;
    if ("mb" in datos) d.mb = datos.mb || null;
    if ("mz" in datos) d.mz = datos.mz || null;
    if ("casa" in datos) d.casa = datos.casa || null;

    if ("permisionarioGrado" in datos) d.permisionarioGrado = datos.permisionarioGrado || null;
    if ("permisionarioNombre" in datos) d.permisionarioNombre = datos.permisionarioNombre || null;

    if ("promotorTipo" in datos) d.promotorTipo = datos.promotorTipo || null;
    if ("promotorGrado" in datos) d.promotorGrado = datos.promotorGrado || null;
    if ("promotorNombre" in datos) d.promotorNombre = datos.promotorNombre || null;
    if ("promotorRol" in datos) d.promotorRol = datos.promotorRol || null;

    if (isObj(datos.solicitudTipos)) {
      d.solicitudTipos = {
        cambio: !!datos.solicitudTipos.cambio,
        reparacion: !!datos.solicitudTipos.reparacion,
        verificacion: !!datos.solicitudTipos.verificacion,
        provision: !!datos.solicitudTipos.provision,
      };
    }

    if (typeof datos.solicitudDetalle === "string") {
      d.solicitudDetalle = datos.solicitudDetalle.trim();
      d.detallePedido = datos.solicitudDetalle.trim();
    }

    if (typeof datos.detallePedido === "string" && !cleanText(d.solicitudDetalle)) {
      d.detallePedido = datos.detallePedido.trim();
      d.solicitudDetalle = datos.detallePedido.trim();
    }

    if (typeof datos.fechaSolicitud === "string") {
      d.fechaSolicitud = datos.fechaSolicitud;
    }

    if (typeof datos.ambito === "string") {
      d.ambito = datos.ambito.trim() || "VIVIENDA";
    }
  }

  if (inspectorOpera) {
    let prioridadRaw = "";
    if (typeof datos.prioridadInspector === "string") {
      prioridadRaw = datos.prioridadInspector || "";
    } else if (typeof datos.prioridad === "string") {
      prioridadRaw = datos.prioridad || "";
    }

    if (prioridadRaw) {
      const p = up(prioridadRaw);
      const allowed = ["URGENTE", "ALTA", "MEDIA", "BAJA"];
      if (allowed.includes(p)) {
        d.prioridadInspector = p;
        d.prioridad = p;
      }
    }

    if (typeof datos.inspectorNombre === "string") {
      d.inspectorNombre = datos.inspectorNombre.trim();
    }

    if (typeof datos.inspectorBarrio === "string") {
      d.inspectorBarrio = datos.inspectorBarrio.trim();
    }

    if (typeof datos.responsableTrabajo === "string") {
      const rt = up(datos.responsableTrabajo || "");
      if (rt === "INSTITUCION" || rt === "PERMISIONARIO") {
        d.responsableTrabajo = rt;
      } else if (datos.responsableTrabajo.trim()) {
        d.responsableTrabajo = datos.responsableTrabajo.trim();
      }
    }

    if (typeof datos.fechaProgramadaObra === "string") {
      d.fechaProgramadaObra = datos.fechaProgramadaObra;
    }

    if (typeof datos.descripcionTecnicaObra === "string") {
      d.descripcionTecnicaObra = datos.descripcionTecnicaObra.trim();
    }

    if (typeof datos.decisionInspector === "string") {
      const dec = up(datos.decisionInspector || "");
      if (
        dec === "APROBADO" ||
        dec === "NO_APROBADO" ||
        dec === "RECHAZADO" ||
        dec === "OBSERVADO"
      ) {
        d.decisionInspector = dec;
      }
    }

    if (typeof datos.motivoRechazo === "string") {
      d.motivoRechazo = datos.motivoRechazo.trim();
    }

    if (typeof datos.trabajoFinalizadoInspector === "boolean") {
      d.trabajoFinalizadoInspector = datos.trabajoFinalizadoInspector;
    }

    if (typeof datos.fechaFinalizacionInspector === "string") {
      d.fechaFinalizacionInspector = datos.fechaFinalizacionInspector;
    }

    if (typeof datos.observacionFinalInspector === "string") {
      d.observacionFinalInspector = datos.observacionFinalInspector.trim();
    }

       if (Array.isArray(datos.observacionesInspectorHistorial)) {
      d.observacionesInspectorHistorial = datos.observacionesInspectorHistorial.map((o) => ({
        texto: cleanText(o?.texto),
        fecha: o?.fecha || ahora.toISOString(),
        usuario: o?.usuario || userId,
      }));
    } else if (typeof datos.nuevaObservacionInspector === "string") {
      const texto = cleanText(datos.nuevaObservacionInspector);
      if (texto) {
        const historial = Array.isArray(d.observacionesInspectorHistorial)
          ? d.observacionesInspectorHistorial
          : [];
        historial.push({
          texto,
          fecha: ahora.toISOString(),
          usuario: userId,
        });
        d.observacionesInspectorHistorial = historial;
      }
    }

    // La última observación visible del inspector se actualiza SIEMPRE
    // aunque también venga historial completo
    if (typeof datos.observacionesInspector === "string") {
      d.observacionesInspector = datos.observacionesInspector.trim();
    }

    // Fallback útil: si no vino campo plano pero sí hay historial, usar la última entrada
    if (
      (!d.observacionesInspector || !String(d.observacionesInspector).trim()) &&
      Array.isArray(d.observacionesInspectorHistorial) &&
      d.observacionesInspectorHistorial.length > 0
    ) {
      const ultimaObs =
        d.observacionesInspectorHistorial[d.observacionesInspectorHistorial.length - 1];

      d.observacionesInspector = cleanText(ultimaObs?.texto);
    }


    if (Array.isArray(datos.visitasProgramadas)) {
      d.visitasProgramadas = datos.visitasProgramadas.map((v) => ({
        fechaProgramada: v?.fechaProgramada || null,
        observacion: cleanText(v?.observacion),
        creadoPor: v?.creadoPor || userId,
        creadoAt: v?.creadoAt || v?.fechaRegistro || ahora.toISOString(),
        fechaRegistro: v?.fechaRegistro || v?.creadoAt || ahora.toISOString(),
      }));
    }

    if (isObj(datos.nuevaVisita)) {
      if (!Array.isArray(d.visitasProgramadas)) {
        d.visitasProgramadas = [];
      }

      d.visitasProgramadas.push({
        fechaProgramada: datos.nuevaVisita.fechaProgramada || null,
        observacion: cleanText(datos.nuevaVisita.observacion),
        creadoPor: datos.nuevaVisita.creadoPor || userId,
        creadoAt: datos.nuevaVisita.creadoAt || ahora.toISOString(),
        fechaRegistro: datos.nuevaVisita.fechaRegistro || ahora.toISOString(),
      });
    }

    d.conformidadInspector = {
      ok: true,
      fecha: ahora,
      usuario: userId,
      observacion:
        d.observacionesInspector ||
        "Actuación del inspector sobre ANEXO_11.",
    };
  }

  if (adminOpera) {
    if (typeof datos.observacionesAdminGeneral === "string") {
      d.observacionesAdminGeneral = datos.observacionesAdminGeneral.trim();
    }

    if (Array.isArray(datos.observacionesAdminGeneralHistorial)) {
      d.observacionesAdminGeneralHistorial = datos.observacionesAdminGeneralHistorial.map((o) => ({
        texto: cleanText(o?.texto),
        fecha: o?.fecha || ahora.toISOString(),
        usuario: o?.usuario || userId,
      }));
    }

    if (typeof datos.nuevaObservacionAdmin === "string" && cleanText(datos.nuevaObservacionAdmin)) {
      if (!Array.isArray(d.observacionesAdminGeneralHistorial)) {
        d.observacionesAdminGeneralHistorial = [];
      }

      d.observacionesAdminGeneralHistorial.push({
        texto: cleanText(datos.nuevaObservacionAdmin),
        fecha: ahora.toISOString(),
        usuario: userId,
      });

      d.observacionesAdminGeneral = cleanText(datos.nuevaObservacionAdmin);
    }
  }

  if (permisionarioOpera && "conformidadPermisionario" in datos) {
    if (toBool(datos.conformidadPermisionario?.ok)) {
      d.conformidadPermisionario = {
        ok: true,
        fecha: ahora.toISOString(),
        usuario: userId,
      };
    }
  }

  if (typeof datos.estado === "string" && datos.estado.trim() && datos.estado !== anexo.estado) {
    pushHistorialEstado(anexo, {
      fecha: ahora.toISOString(),
      estadoAnterior: anexo.estado || null,
      estadoNuevo: datos.estado.trim(),
      observacion: cleanText(datos.observacionEstado) || `Cambio de estado a ${datos.estado.trim()}`,
      realizadoPor: userId || "Sistema",
    });

    anexo.estado = datos.estado.trim();
  }

  if (
    typeof datos.estadoInstitucional === "string" &&
    datos.estadoInstitucional.trim() !== String(anexo.estadoInstitucional || "").trim()
  ) {
    anexo.estadoInstitucional = datos.estadoInstitucional.trim() || null;
  }

    anexo.datos = d;
  if (typeof anexo.markModified === "function") {
    anexo.markModified("datos");
  }
  return anexo;
}

module.exports = {
  aplicarCambiosAnexo11,
};