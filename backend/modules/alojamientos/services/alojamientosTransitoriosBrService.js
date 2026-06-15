const mongoose = require("mongoose");

const AlojamientoNaval = require("../models/AlojamientoNaval");
const AlojamientoPlaza = require("../models/AlojamientoPlaza");
const AsignacionAlojamiento = require("../models/AsignacionAlojamiento");
const AlojamientoDocumento = require("../models/AlojamientoDocumento");
const {
  CLASES_ALOJAMIENTO,
  GENERO_PERMITIDO,
} = require("../constants/alojamientoConstants");

const BR_CODE_RE = /^BR-[A-Z0-9]+$/;
const ASIGNACIONES_BLOQUEANTES = ["RESERVADA", "ACTIVA"];
const DOCUMENTOS_CERRADOS = ["CERRADO", "ANULADO", "FINALIZADO"];
const GRUPOS_JERARQUICOS_VALIDOS = new Set(["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"]);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function clean(value) {
  return String(value || "").trim();
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function isBrCode(value) {
  return BR_CODE_RE.test(up(value));
}

function plazaCodigo(alojamientoCodigo, numeroPlaza) {
  return `${up(alojamientoCodigo)}-P${numeroPlaza}`;
}

function clasePorCapacidad(capacidad) {
  const value = Number(capacidad || 0);
  if (value === 1) return "C01";
  if (value === 2) return "C02";
  if (value === 3) return "C03";
  if (value === 4) return "C04";
  return "CUSO";
}

function numeroDesdeCodigo(codigo) {
  return up(codigo).replace(/^BR-/, "") || "S/N";
}

function parseCapacidad(value) {
  const capacidad = Number(value);
  if (!Number.isInteger(capacidad) || capacidad < 1) {
    const err = new Error("La capacidad debe ser un entero positivo");
    err.status = 400;
    throw err;
  }
  return capacidad;
}

function validateEnum(value, allowed, field, fallback = "") {
  const normalized = up(value || fallback);
  if (!allowed.includes(normalized)) {
    const err = new Error(`${field} invalido`);
    err.status = 400;
    throw err;
  }
  return normalized;
}

function validateGrupo(value) {
  const normalized = up(value || "NO_DEFINIDO").replace(/[\s/-]+/g, "_");
  if (!GRUPOS_JERARQUICOS_VALIDOS.has(normalized)) {
    const err = new Error("Grupo jerarquico invalido");
    err.status = 400;
    throw err;
  }
  return normalized;
}

function validateCodigoBr(value) {
  const codigo = up(value);
  if (!codigo || !isBrCode(codigo)) {
    const err = new Error("El codigo debe tener formato BR-*");
    err.status = 400;
    throw err;
  }
  return codigo;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function publicAlojamiento(alojamiento) {
  if (!alojamiento) return null;
  return {
    _id: alojamiento._id,
    codigo: alojamiento.codigo,
    dependencia: alojamiento.dependencia,
    lugar: alojamiento.lugar,
    sector: alojamiento.sector,
    tipo: alojamiento.tipo,
    numero: alojamiento.numero,
    clase: alojamiento.clase,
    capacidad: alojamiento.capacidad,
    generoPermitido: alojamiento.generoPermitido,
    aptoParaGrupoJerarquico: alojamiento.aptoParaGrupoJerarquico,
    localidad: alojamiento.localidad,
    provincia: alojamiento.provincia,
    observaciones: alojamiento.observaciones,
    activo: alojamiento.activo,
    estado: alojamiento.estado,
    origenGestion: alojamiento.origenGestion,
    vigenciaTransitoriaDesde: alojamiento.vigenciaTransitoriaDesde,
    vigenciaTransitoriaHasta: alojamiento.vigenciaTransitoriaHasta,
    autorizadoPor: alojamiento.autorizadoPor,
    motivoAltaTransitoria: alojamiento.motivoAltaTransitoria,
    motivoBajaTransitoria: alojamiento.motivoBajaTransitoria,
    ocupacionActual: alojamiento.ocupacionActual || {},
    createdAt: alojamiento.createdAt,
    updatedAt: alojamiento.updatedAt,
  };
}

function publicPlaza(plaza) {
  return {
    _id: plaza._id,
    codigo: plaza.codigo,
    numeroPlaza: plaza.numeroPlaza,
    estado: plaza.estado,
    activo: plaza.activo,
    alojadoActual: plaza.alojadoActual || null,
    reservaActual: plaza.reservaActual || null,
  };
}

function alojamientoTieneOcupacionCache(alojamiento) {
  const ocupacion = alojamiento?.ocupacionActual || {};
  return (
    Number(ocupacion.plazasOcupadas || 0) > 0 ||
    Number(ocupacion.plazasReservadas || 0) > 0 ||
    arr(ocupacion.alojados).length > 0
  );
}

function toError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function loadAlojamientoBr(id, session = null) {
  if (!isObjectId(id)) throw toError(404, "Alojamiento transitorio no disponible");
  const query = AlojamientoNaval.findById(id);
  if (session) query.session(session);
  const alojamiento = await query;
  if (!alojamiento || !isBrCode(alojamiento.codigo)) {
    throw toError(404, "Alojamiento transitorio no disponible");
  }
  return alojamiento;
}

async function resumenVinculos(alojamientoId, session = null) {
  const plazasQuery = AlojamientoPlaza.find({ alojamiento: alojamientoId })
    .select("_id codigo numeroPlaza estado activo alojadoActual reservaActual")
    .sort({ numeroPlaza: 1 })
    .lean();
  if (session) plazasQuery.session(session);
  const plazas = await plazasQuery;
  const plazaIds = plazas.map((plaza) => plaza._id).filter(Boolean);

  const asignacionesQuery = AsignacionAlojamiento.find({
    $or: [{ alojamiento: alojamientoId }, { plaza: { $in: plazaIds } }],
  })
    .select("_id alojamiento plaza estado")
    .lean();
  const documentosQuery = AlojamientoDocumento.find({
    activo: { $ne: false },
    $or: [{ alojamiento: alojamientoId }, { plaza: { $in: plazaIds } }],
  })
    .select("_id alojamiento plaza codigo estado")
    .lean();
  if (session) {
    asignacionesQuery.session(session);
    documentosQuery.session(session);
  }

  const [asignaciones, documentos] = await Promise.all([asignacionesQuery, documentosQuery]);
  const asignacionesBloqueantes = asignaciones.filter((item) => ASIGNACIONES_BLOQUEANTES.includes(up(item.estado)));
  const documentosBloqueantes = documentos;
  const documentosPendientes = documentos.filter((item) => !DOCUMENTOS_CERRADOS.includes(up(item.estado)));
  const plazasValidas = plazas.filter((plaza) => plaza.activo !== false && up(plaza.estado) !== "BAJA");
  const plazasConOcupacion = plazasValidas.filter((plaza) => up(plaza.estado) === "OCUPADA" || plaza.alojadoActual);
  const plazasConReserva = plazasValidas.filter(
    (plaza) => up(plaza.estado) === "RESERVADA" || plaza.reservaActual?.usuario || plaza.reservaActual?.anexoId
  );

  return {
    plazas,
    plazasValidas,
    asignaciones,
    documentos,
    asignacionesBloqueantes,
    documentosPendientes,
    plazasConOcupacion,
    plazasConReserva,
    tieneVinculos: Boolean(
      asignacionesBloqueantes.length ||
        documentosPendientes.length ||
        documentosBloqueantes.length ||
        plazasConOcupacion.length ||
        plazasConReserva.length
    ),
  };
}

function assertSinVinculosPlazas(plazas, vinculos, message) {
  const plazaIds = new Set(plazas.map((plaza) => String(plaza._id)));
  const asignaciones = vinculos.asignaciones.filter(
    (item) => plazaIds.has(String(item.plaza)) && ASIGNACIONES_BLOQUEANTES.includes(up(item.estado))
  );
  const documentos = vinculos.documentos.filter(
    (item) => plazaIds.has(String(item.plaza))
  );
  const ocupadas = plazas.filter((plaza) => up(plaza.estado) === "OCUPADA" || plaza.alojadoActual);
  const reservadas = plazas.filter(
    (plaza) => up(plaza.estado) === "RESERVADA" || plaza.reservaActual?.usuario || plaza.reservaActual?.anexoId
  );

  if (asignaciones.length || documentos.length || ocupadas.length || reservadas.length) {
    throw toError(409, message);
  }
}

async function syncCapacidad({ alojamiento, capacidad, actorId, motivo, session }) {
  if (capacidad < Number(alojamiento.capacidad || 0) && alojamientoTieneOcupacionCache(alojamiento)) {
    throw toError(409, "No se puede reducir capacidad: el alojamiento registra ocupacion actual");
  }
  const vinculos = await resumenVinculos(alojamiento._id, session);
  const validas = [...vinculos.plazasValidas].sort((a, b) => Number(a.numeroPlaza || 0) - Number(b.numeroPlaza || 0));
  const actuales = validas.length;
  const now = new Date();
  const result = {
    plazasAntes: actuales,
    plazasEsperadas: capacidad,
    plazasCreadas: [],
    plazasBajadas: [],
  };

  if (capacidad > actuales) {
    const todas = vinculos.plazas;
    const maxNumero = todas.reduce((max, plaza) => Math.max(max, Number(plaza.numeroPlaza || 0)), 0);
    const docs = [];
    for (let i = 1; i <= capacidad - actuales; i += 1) {
      const numeroPlaza = maxNumero + i;
      docs.push({
        codigo: plazaCodigo(alojamiento.codigo, numeroPlaza),
        alojamiento: alojamiento._id,
        numeroPlaza,
        estado: "LIBRE",
        activo: true,
        historial: [
          {
            accion: "CREACION_TRANSITORIO_BR",
            estadoNuevo: "LIBRE",
            realizadoPor: actorId || null,
            observacion: motivo,
            fecha: now,
          },
        ],
      });
    }
    const created = await AlojamientoPlaza.create(docs, { session });
    result.plazasCreadas = created.map((plaza) => String(plaza._id));
  }

  if (capacidad < actuales) {
    const excedentes = validas.slice(capacidad);
    assertSinVinculosPlazas(excedentes, vinculos, "No se puede reducir capacidad: hay plazas excedentes con vinculos");
    const plazaIds = excedentes.map((plaza) => plaza._id);
    if (plazaIds.length) {
      await AlojamientoPlaza.updateMany(
        { _id: { $in: plazaIds }, alojamiento: alojamiento._id },
        {
          $set: { activo: false, estado: "BAJA" },
          $push: {
            historial: {
              accion: "BAJA_CAPACIDAD_TRANSITORIO_BR",
              estadoAnterior: "LIBRE",
              estadoNuevo: "BAJA",
              realizadoPor: actorId || null,
              observacion: motivo,
              fecha: now,
            },
          },
        },
        { session }
      );
      result.plazasBajadas = plazaIds.map(String);
    }
  }

  return result;
}

function payloadAlojamiento(body = {}, { creating = false } = {}) {
  const capacidad = parseCapacidad(body.capacidad);
  const clase = body.clase ? validateEnum(body.clase, CLASES_ALOJAMIENTO, "Clase") : clasePorCapacidad(capacidad);
  const lugar = clean(body.lugar);
  const tipo = clean(body.tipo);
  const dependencia = clean(body.dependencia || "TRANSITORIO_BR");

  if (!lugar) throw toError(400, "Lugar obligatorio");
  if (!tipo) throw toError(400, "Tipo obligatorio");
  if (creating && !clean(body.motivoAltaTransitoria)) throw toError(400, "Motivo de alta transitoria obligatorio");

  return {
    dependencia,
    lugar,
    sector: clean(body.sector),
    tipo,
    numero: clean(body.numero),
    clase,
    capacidad,
    generoPermitido: validateEnum(body.generoPermitido, GENERO_PERMITIDO, "Genero permitido", "SIN_RESTRICCION"),
    aptoParaGrupoJerarquico: validateGrupo(body.aptoParaGrupoJerarquico),
    localidad: clean(body.localidad),
    provincia: clean(body.provincia),
    observaciones: clean(body.observaciones),
    vigenciaTransitoriaDesde: normalizeDate(body.vigenciaTransitoriaDesde),
    vigenciaTransitoriaHasta: normalizeDate(body.vigenciaTransitoriaHasta),
    autorizadoPor: clean(body.autorizadoPor),
    motivoAltaTransitoria: clean(body.motivoAltaTransitoria),
  };
}

async function listar({ includeBaja = false } = {}) {
  const filter = { codigo: /^BR-/i };
  if (!includeBaja) {
    filter.activo = { $ne: false };
    filter.estado = { $ne: "BAJA" };
  }
  const alojamientos = await AlojamientoNaval.find(filter)
    .sort({ codigo: 1 })
    .lean();
  return alojamientos.map(publicAlojamiento);
}

async function obtenerDetalle(id) {
  const alojamiento = await loadAlojamientoBr(id);
  const vinculos = await resumenVinculos(alojamiento._id);
  const ocupacionCache = alojamiento.ocupacionActual || {};
  return {
    alojamiento: publicAlojamiento(alojamiento),
    plazas: vinculos.plazas.map(publicPlaza),
    vinculos: {
      plazasOcupadas: Math.max(vinculos.plazasConOcupacion.length, Number(ocupacionCache.plazasOcupadas || 0)),
      plazasReservadas: Math.max(vinculos.plazasConReserva.length, Number(ocupacionCache.plazasReservadas || 0)),
      asignacionesBloqueantes: vinculos.asignacionesBloqueantes.length,
      documentosActivos: vinculos.documentos.length,
      documentosPendientes: vinculos.documentosPendientes.length,
      ocupacionCache: alojamientoTieneOcupacionCache(alojamiento),
      tieneVinculos: vinculos.tieneVinculos || alojamientoTieneOcupacionCache(alojamiento),
    },
  };
}

async function crear(body, actorId) {
  const codigo = validateCodigoBr(body.codigo);
  const data = payloadAlojamiento({ ...body, numero: body.numero || numeroDesdeCodigo(codigo) }, { creating: true });
  const existing = await AlojamientoNaval.findOne({ codigo }).select("_id activo estado").lean();
  if (existing) throw toError(409, "Ya existe un alojamiento con ese codigo");

  const session = await mongoose.startSession();
  try {
    let created = null;
    let sync = null;
    await session.withTransaction(async () => {
      created = await AlojamientoNaval.create(
        [
          {
            codigo,
            ...data,
            estado: "DISPONIBLE",
            activo: true,
            origenGestion: "TRANSITORIO_BR",
            ocupacionActual: {
              plazasTotales: data.capacidad,
              plazasOcupadas: 0,
              plazasReservadas: 0,
              alojados: [],
              actualizadoEn: new Date(),
            },
            historialEstados: [
              {
                estadoNuevo: "DISPONIBLE",
                realizadoPor: actorId || null,
                motivo: data.motivoAltaTransitoria,
                origen: "TRANSITORIO_BR",
              },
            ],
          },
        ],
        { session }
      );
      created = created[0];
      sync = await syncCapacidad({
        alojamiento: created,
        capacidad: data.capacidad,
        actorId,
        motivo: data.motivoAltaTransitoria,
        session,
      });
    });
    return { alojamiento: publicAlojamiento(created), sync };
  } finally {
    await session.endSession();
  }
}

async function actualizar(id, body, actorId) {
  const session = await mongoose.startSession();
  try {
    let updated = null;
    let sync = null;
    await session.withTransaction(async () => {
      const alojamiento = await loadAlojamientoBr(id, session);
      if (alojamiento.activo === false || up(alojamiento.estado) === "BAJA") {
        throw toError(409, "No se puede editar un BR finalizado o en BAJA");
      }
      const data = payloadAlojamiento({ ...body, numero: body.numero || alojamiento.numero || numeroDesdeCodigo(alojamiento.codigo) });
      sync = await syncCapacidad({
        alojamiento,
        capacidad: data.capacidad,
        actorId,
        motivo: clean(body.motivo) || "Actualizacion operativa de BR transitorio",
        session,
      });
      Object.assign(alojamiento, data);
      alojamiento.origenGestion = "TRANSITORIO_BR";
      alojamiento.ocupacionActual = alojamiento.ocupacionActual || {};
      alojamiento.ocupacionActual.plazasTotales = data.capacidad;
      alojamiento.ocupacionActual.actualizadoEn = new Date();
      alojamiento.historialEstados.push({
        estadoAnterior: alojamiento.estado,
        estadoNuevo: alojamiento.estado,
        realizadoPor: actorId || null,
        motivo: clean(body.motivo) || "Actualizacion operativa de BR transitorio",
        origen: "TRANSITORIO_BR",
      });
      await alojamiento.save({ session });
      updated = alojamiento;
    });
    return { alojamiento: publicAlojamiento(updated), sync };
  } finally {
    await session.endSession();
  }
}

async function finalizar(id, body, actorId) {
  const motivoUsuario = clean(body?.motivo);
  if (motivoUsuario.length < 5) throw toError(400, "Motivo obligatorio para finalizar BR");
  const motivo = `FIN_USO_TRANSITORIO: ${motivoUsuario}`;
  const session = await mongoose.startSession();
  try {
    let updated = null;
    let plazasBajadas = [];
    await session.withTransaction(async () => {
      const alojamiento = await loadAlojamientoBr(id, session);
      const vinculos = await resumenVinculos(alojamiento._id, session);
      if (alojamiento.activo === false || up(alojamiento.estado) === "BAJA") {
        updated = alojamiento;
        return;
      }
      if (vinculos.tieneVinculos || alojamientoTieneOcupacionCache(alojamiento)) {
        throw toError(409, "No se puede finalizar: el BR tiene ocupacion, reservas, asignaciones o documentos pendientes");
      }
      const plazasValidas = vinculos.plazasValidas;
      assertSinVinculosPlazas(plazasValidas, vinculos, "No se puede finalizar: hay plazas con vinculos");
      const plazaIds = plazasValidas.map((plaza) => plaza._id);
      if (plazaIds.length) {
        await AlojamientoPlaza.updateMany(
          { _id: { $in: plazaIds }, alojamiento: alojamiento._id },
          {
            $set: { activo: false, estado: "BAJA" },
            $push: {
              historial: {
                accion: "FIN_USO_TRANSITORIO",
                estadoAnterior: "LIBRE",
                estadoNuevo: "BAJA",
                realizadoPor: actorId || null,
                observacion: motivo,
                fecha: new Date(),
              },
            },
          },
          { session }
        );
        plazasBajadas = plazaIds.map(String);
      }
      const estadoAnterior = alojamiento.estado;
      alojamiento.activo = false;
      alojamiento.estado = "BAJA";
      alojamiento.motivoBajaTransitoria = motivoUsuario;
      alojamiento.origenGestion = "TRANSITORIO_BR";
      alojamiento.observaciones = [clean(alojamiento.observaciones), motivo].filter(Boolean).join(" | ");
      alojamiento.ocupacionActual = alojamiento.ocupacionActual || {};
      alojamiento.ocupacionActual.plazasTotales = 0;
      alojamiento.ocupacionActual.plazasOcupadas = 0;
      alojamiento.ocupacionActual.plazasReservadas = 0;
      alojamiento.ocupacionActual.alojados = [];
      alojamiento.ocupacionActual.actualizadoEn = new Date();
      alojamiento.historialEstados.push({
        estadoAnterior,
        estadoNuevo: "BAJA",
        realizadoPor: actorId || null,
        motivo,
        origen: "TRANSITORIO_BR",
      });
      await alojamiento.save({ session });
      updated = alojamiento;
    });
    return { alojamiento: publicAlojamiento(updated), plazasBajadas };
  } finally {
    await session.endSession();
  }
}

module.exports = {
  listar,
  obtenerDetalle,
  crear,
  actualizar,
  finalizar,
};
