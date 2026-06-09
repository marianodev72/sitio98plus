const crypto = require("crypto");

const { User } = require("../../models/user");
const Vivienda = require("../../models/vivienda");
const AlojamientoNaval = require("../../modules/alojamientos/models/AlojamientoNaval");
const {
  normalizeTipoPersonal,
  normalizeTipoDestinoStrict,
  normalizeGrupoJerarquico,
  normalizePrecedencia,
} = require("../../constants/institucional");
const { parseXlsxBuffer } = require("./xlsxParser");

const PERSONAL_HEADERS_LEGACY = ["PRECEDENCIA", "MATRICULAS", "NOMBRE Y APELLIDO", "DNI", "GRUPO"];
const PERSONAL_HEADERS_COMPLETO = [
  "MATRICULAS",
  "NOMBRE Y APELLIDO",
  "DNI",
  "TIPO_PERSONAL",
  "GRUPO_JERARQUICO",
  "PRECEDENCIA",
];
const VIVIENDAS_HEADERS = ["BARRIOS", "DPTOCASA", "DORM", "GRUPO"];
const GENEROS_ALOJAMIENTO = new Set(["MASCULINO", "FEMENINO", "SIN_RESTRICCION", "NO_ESPECIFICADO"]);
const ALOJAMIENTO_ESTADOS = new Set([
  "DISPONIBLE",
  "PARCIALMENTE_OCUPADO",
  "OCUPADO",
  "RESERVADO",
  "MANTENIMIENTO",
  "FUERA_SERVICIO",
  "INHABILITADO",
  "BAJA",
]);
const ALOJAMIENTO_HEADER_ALIASES = {
  CODIGO: ["CODIGO", "COD", "CODIGO ALOJAMIENTO"],
  DENOMINACION: ["DENOMINACION", "NOMBRE", "DESCRIPCION"],
  DEPENDENCIA: ["DEPENDENCIA", "UNIDAD"],
  LUGAR: ["LUGAR", "UBICACION", "DESTINO"],
  SECTOR: ["SECTOR", "PISO", "AREA"],
  GENERO: ["GENERO", "GENERO PERMITIDO", "GENERO_PERMITIDO"],
  GRUPO_JERARQUICO: ["GRUPO_JERARQUICO", "GRUPO JERARQUICO", "GRUPO", "CATEGORIA"],
  CAPACIDAD: ["CAPACIDAD", "PLAZAS", "CUPO"],
  ESTADO: ["ESTADO", "ESTADO OPERATIVO", "ESTADO_OPERATIVO"],
  ACTIVO: ["ACTIVO", "VIGENTE"],
  OBSERVACIONES: ["OBSERVACIONES", "OBSERVACION", "NOTAS"],
};
const ALOJAMIENTO_REQUIRED_HEADERS = ["CODIGO", "DEPENDENCIA", "LUGAR", "GENERO", "CAPACIDAD"];
const PREFIJOS_VIVIENDA = new Set(["AB", "AS", "PB", "LM", "IN"]);
const PREFIJO_POR_BARRIO = new Map([
  ["ALTE BROWN", "AB"],
  ["ALMIRANTE BROWN", "AB"],
  ["ALTE STORNI", "AS"],
  ["ALMIRANTE STORNI", "AS"],
  ["STORNI", "AS"],
  ["PIEDRABUENA", "PB"],
  ["CTE PIEDRABUENA", "PB"],
  ["COMANDANTE PIEDRABUENA", "PB"],
  ["LA MISION", "LM"],
  ["INDIVIDUALES", "IN"],
]);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function up(value) {
  return String(value || "").toUpperCase().trim();
}

function clean(value) {
  return String(value || "").trim();
}

function normDni(value) {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

function normCodigo(value) {
  return up(value).replace(/\s+/g, "");
}

function normalizeText(value) {
  return up(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "").replace(/\s+/g, " ");
}

function normalizeBarrioVivienda(value) {
  return normalizeText(value).replace(/^BARRIO\s+/, "").trim();
}

function normalizeCodigoToken(value) {
  return normalizeText(value).replace(/\s*-\s*/g, "-").replace(/\s+/g, "");
}

function canonicalCodigoVivienda(value) {
  return normalizeText(value)
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^INRAOIGUAZ/, "INROIGUAZ")
    .replace(/^INRIOIGUAZ/, "INROIGUAZ");
}

function prefijoPorBarrio(barrio) {
  return PREFIJO_POR_BARRIO.get(normalizeBarrioVivienda(barrio)) || null;
}

function normalizeCodigoVivienda({ barrio, codigo }) {
  const codigoOriginal = clean(codigo);
  const codigoNormalizado = normalizeCodigoToken(codigoOriginal);
  const barrioNormalizado = normalizeBarrioVivienda(barrio);
  const prefijo = prefijoPorBarrio(barrio);
  const prefijoExistente = codigoNormalizado.match(/^([A-Z]{2})-/)?.[1] || null;

  if (!codigoNormalizado) {
    return { codigoOriginal, codigo: "", codigoNormalizado: "", barrioNormalizado, normalized: false, resolved: false };
  }

  if (prefijoExistente && PREFIJOS_VIVIENDA.has(prefijoExistente)) {
    return {
      codigoOriginal,
      codigo: codigoNormalizado,
      codigoNormalizado,
      barrioNormalizado,
      normalized: codigoNormalizado !== codigoOriginal,
      resolved: true,
    };
  }

  if (!prefijo) {
    return {
      codigoOriginal,
      codigo: codigoNormalizado,
      codigoNormalizado,
      barrioNormalizado,
      normalized: false,
      resolved: false,
    };
  }

  if (/^\d+$/.test(codigoNormalizado)) {
    const codigoInstitucional = `${prefijo}-${codigoNormalizado}`;
    return {
      codigoOriginal,
      codigo: codigoInstitucional,
      codigoNormalizado: codigoInstitucional,
      barrioNormalizado,
      normalized: codigoInstitucional !== codigoOriginal,
      resolved: true,
    };
  }

  const stornCodigo = codigoNormalizado.match(/^([A-K])(?:-)?(\d{1,2})$/i);
  if (prefijo === "AS" && stornCodigo) {
    const letra = stornCodigo[1].toUpperCase();
    const numero = stornCodigo[2].padStart(2, "0");
    const codigoInstitucional = `AS-${letra}-${numero}`;
    return {
      codigoOriginal,
      codigo: codigoInstitucional,
      codigoNormalizado: codigoInstitucional,
      barrioNormalizado,
      normalized: codigoInstitucional !== codigoOriginal,
      resolved: true,
    };
  }

  if (prefijo === "IN") {
    const codigoInstitucional = `IN-${codigoNormalizado}`;
    return {
      codigoOriginal,
      codigo: codigoInstitucional,
      codigoNormalizado: codigoInstitucional,
      barrioNormalizado,
      normalized: codigoInstitucional !== codigoOriginal,
      resolved: true,
    };
  }

  return {
    codigoOriginal,
    codigo: codigoNormalizado,
    codigoNormalizado,
    barrioNormalizado,
    normalized: false,
    resolved: false,
  };
}

function normalizeHeader(value) {
  return up(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function normalizeHeaderKey(value) {
  return normalizeHeader(value).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeGrupoJerarquicoStrict(value) {
  const normalized = normalizeHeaderKey(value);
  return ["OF", "SB_CP", "CB", "TR", "NO_DEFINIDO"].includes(normalized) ? normalized : null;
}

function assertHeaders(actual, expected) {
  const normalized = actual.map(normalizeHeader).filter(Boolean);
  const missing = expected.filter((header) => !normalized.includes(header));
  const unexpected = normalized.filter((header) => !expected.includes(header));

  if (missing.length || unexpected.length) {
    return {
      ok: false,
      error: {
        fila: 1,
        campo: "headers",
        message: `Columnas invalidas. Faltan: ${missing.join(", ") || "-"}; inesperadas: ${unexpected.join(", ") || "-"}`,
      },
    };
  }

  return { ok: true, headers: normalized };
}

function rowObject(cells, headers) {
  const out = {};
  headers.forEach((header, index) => {
    out[header] = clean(cells[index]);
  });
  return out;
}

function assertPersonalHeaders(actual) {
  const completo = assertHeaders(actual, PERSONAL_HEADERS_COMPLETO);
  if (completo.ok) return { ok: true, formato: "COMPLETO", headers: completo.headers };

  const legacy = assertHeaders(actual, PERSONAL_HEADERS_LEGACY);
  if (legacy.ok) return { ok: true, formato: "LEGACY", headers: legacy.headers };

  return {
    ok: false,
    error: {
      fila: 1,
      campo: "headers",
      message: `Columnas invalidas. Formato esperado completo: ${PERSONAL_HEADERS_COMPLETO.join(
        ", "
      )}; formato legacy: ${PERSONAL_HEADERS_LEGACY.join(", ")}`,
    },
  };
}

function hasDangerousFormulaText(raw) {
  return Object.values(raw || {}).some((value) => /^[=+\-@]/.test(String(value || "").trim()));
}

function parseBoolActivo(value) {
  const normalized = up(value);
  if (!normalized) return true;
  if (["SI", "S", "TRUE", "1", "ACTIVO", "VIGENTE"].includes(normalized)) return true;
  if (["NO", "N", "FALSE", "0", "INACTIVO", "BAJA"].includes(normalized)) return false;
  return null;
}

function normalizeGeneroAlojamiento(value) {
  const normalized = normalizeHeaderKey(value);
  if (["M", "MASC", "MASCULINO"].includes(normalized)) return { value: "MASCULINO", valid: true };
  if (["F", "FEM", "FEMENINO"].includes(normalized)) return { value: "FEMENINO", valid: true };
  if (["MIXTO", "SIN_RESTRICCION", "SIN_RESTRICCIONES"].includes(normalized)) {
    return { value: "SIN_RESTRICCION", valid: true };
  }
  if (["NO_DEFINIDO", "NO_ESPECIFICADO", "SIN_DATO"].includes(normalized)) {
    return { value: "NO_ESPECIFICADO", valid: Boolean(clean(value)) };
  }
  return { value: "NO_ESPECIFICADO", valid: false };
}

function normalizeEstadoAlojamiento(value) {
  const normalized = normalizeHeaderKey(value);
  if (!normalized) return "DISPONIBLE";
  return ALOJAMIENTO_ESTADOS.has(normalized) ? normalized : "DISPONIBLE";
}

function publicAlojamiento(alojamiento) {
  if (!alojamiento) return null;
  const ocupacion = alojamiento.ocupacionActual || {};
  const ocupadas = Number(ocupacion.plazasOcupadas || 0);
  const reservadas = Number(ocupacion.plazasReservadas || 0);
  return {
    codigo: alojamiento.codigo || "",
    dependencia: alojamiento.dependencia || "",
    lugar: alojamiento.lugar || "",
    sector: alojamiento.sector || "",
    capacidad: alojamiento.capacidad ?? null,
    generoPermitido: alojamiento.generoPermitido || "NO_ESPECIFICADO",
    aptoParaGrupoJerarquico: alojamiento.aptoParaGrupoJerarquico || "NO_DEFINIDO",
    estado: alojamiento.estado || "",
    activo: alojamiento.activo !== false,
    ocupado: ocupadas > 0 || reservadas > 0 || up(alojamiento.estado) === "OCUPADO",
    plazasOcupadas: ocupadas,
    plazasReservadas: reservadas,
  };
}

function buildFlexibleHeaderMap(actualHeaders, aliases, required) {
  const normalized = actualHeaders.map(normalizeHeaderKey);
  const known = new Map();
  for (const [canonical, names] of Object.entries(aliases)) {
    for (const name of names) known.set(normalizeHeaderKey(name), canonical);
  }

  const map = {};
  const unexpected = [];
  normalized.forEach((header, index) => {
    if (!header) return;
    const canonical = known.get(header);
    if (!canonical) {
      unexpected.push(actualHeaders[index]);
      return;
    }
    if (map[canonical] === undefined) map[canonical] = index;
  });

  const missing = required.filter((header) => map[header] === undefined);
  if (missing.length || unexpected.length) {
    return {
      ok: false,
      error: {
        fila: 1,
        campo: "headers",
        message: `Columnas invalidas. Faltan: ${missing.join(", ") || "-"}; inesperadas: ${
          unexpected.join(", ") || "-"
        }`,
      },
    };
  }

  return { ok: true, map };
}

function flexibleRowObject(cells, headerMap) {
  const out = {};
  for (const [field, index] of Object.entries(headerMap || {})) out[field] = clean(cells[index]);
  return out;
}

function publicUser(user) {
  if (!user) return null;
  return {
    email: user.email || "",
    matricula: user.matricula || "",
    dni: user.dni || "",
    role: user.role || "",
    activo: user.activo !== false,
    archivado: user.archivado === true,
    bloqueado: user.bloqueado === true,
    tipoPersonal: user.tipoPersonal || null,
    grupoJerarquico: user.grupoJerarquico || "NO_DEFINIDO",
    precedencia: user.precedencia ?? null,
    viviendaAsignada: user.viviendaAsignada || null,
    alojamientoAsignado: user.alojamientoAsignado || null,
  };
}

function publicVivienda(vivienda) {
  if (!vivienda) return null;
  return {
    codigo: vivienda.codigo || "",
    barrio: vivienda.barrio || "",
    dormitorios: vivienda.dormitorios ?? null,
    estado: vivienda.estado || "",
    tipoDestino: vivienda.tipoDestino || null,
    ocupada: Boolean(vivienda?.ocupacionActual?.permisionario) || up(vivienda.estado) === "OCUPADA",
  };
}

function pushAlojamientoDuplicateWarnings({ rows, warnings }) {
  pushDuplicateWarnings({ rows, key: "codigo", label: "CODIGO", warnings });
}

function pushDuplicateWarnings({ rows, key, label, warnings }) {
  const map = new Map();
  for (const row of rows) {
    const value = clean(row[key]);
    if (!value) continue;
    const current = map.get(value) || [];
    current.push(row.fila);
    map.set(value, current);
  }
  for (const [value, filas] of map.entries()) {
    if (filas.length > 1) warnings.push({ tipo: "DUPLICADO_ARCHIVO", campo: label, valor: value, filas });
  }
}

function baseSummary({ tipoBase, totalFilas, validas, invalidas, nuevos, actualizados, sinCambios, warnings, errores, hash }) {
  return {
    tipoBase,
    dryRun: true,
    sha256: hash,
    totalFilas,
    validas,
    invalidas,
    nuevos: nuevos.length,
    actualizados: actualizados.length,
    sinCambios: sinCambios.length,
    warnings: warnings.length,
    errores: errores.length,
    conflictos: warnings.filter((warning) => String(warning.tipo || "").includes("INCONSISTENCIA")).length,
    duplicados: warnings.filter((warning) => warning.tipo === "DUPLICADO_ARCHIVO").length,
  };
}

function parsePersonalRows(rows) {
  const headerCheck = assertPersonalHeaders(rows[0]?.cells || []);
  if (!headerCheck.ok) return { parsed: [], errors: [headerCheck.error], warnings: [] };

  const parsed = [];
  const errors = [];
  const warnings = [];
  const isFormatoCompleto = headerCheck.formato === "COMPLETO";

  rows.slice(1).forEach((row, index) => {
    const fila = index + 2;
    if (row.hasFormula) {
      errors.push({ fila, campo: "archivo", message: "No se aceptan formulas en Excel" });
      return;
    }

    const raw = rowObject(row.cells, headerCheck.headers);
    if (hasDangerousFormulaText(raw)) {
      errors.push({ fila, campo: "archivo", message: "No se aceptan valores con prefijo de formula (=, +, -, @)" });
      return;
    }
    const tipoPersonal = normalizeTipoPersonal(isFormatoCompleto ? raw.TIPO_PERSONAL : raw.GRUPO);
    const precedencia = normalizePrecedencia(raw.PRECEDENCIA);
    const matricula = clean(raw.MATRICULAS);
    const dni = normDni(raw.DNI);
    const nombreApellido = clean(raw["NOMBRE Y APELLIDO"]);
    const grupoJerarquicoRaw = isFormatoCompleto ? clean(raw.GRUPO_JERARQUICO) : "";
    let grupoJerarquico = null;
    const rowErrors = [];
    const rowWarnings = [];

    if (!matricula) rowErrors.push({ fila, campo: "MATRICULAS", message: "matricula obligatoria" });
    if (!nombreApellido) rowErrors.push({ fila, campo: "NOMBRE Y APELLIDO", message: "nombre y apellido obligatorio" });
    if (!dni) rowErrors.push({ fila, campo: "DNI", message: "DNI obligatorio" });
    if (precedencia === null) rowErrors.push({ fila, campo: "PRECEDENCIA", message: "precedencia numerica obligatoria" });
    if (!tipoPersonal) {
      rowErrors.push({
        fila,
        campo: isFormatoCompleto ? "TIPO_PERSONAL" : "GRUPO",
        message: `${isFormatoCompleto ? "TIPO_PERSONAL" : "GRUPO"} debe ser OF o SO`,
      });
    }

    if (isFormatoCompleto) {
      const grupoNormalizado = normalizeGrupoJerarquicoStrict(grupoJerarquicoRaw);

      if (!grupoJerarquicoRaw) {
        rowErrors.push({ fila, campo: "GRUPO_JERARQUICO", message: "GRUPO_JERARQUICO obligatorio" });
      } else if (!grupoNormalizado) {
        rowErrors.push({
          fila,
          campo: "GRUPO_JERARQUICO",
          message: "GRUPO_JERARQUICO debe ser OF, SB_CP, CB, TR o NO_DEFINIDO",
        });
      } else {
        grupoJerarquico = grupoNormalizado;
        if (grupoJerarquico === "NO_DEFINIDO") {
          rowWarnings.push({
            tipo: "PERSONAL_GRUPO_JERARQUICO_NO_DEFINIDO",
            fila,
            matricula,
            message: "GRUPO_JERARQUICO NO_DEFINIDO no sera asignable automaticamente en alojamientos",
          });
        }
      }
    } else if (tipoPersonal === "OF") {
      grupoJerarquico = "OF";
    } else if (tipoPersonal === "SO") {
      grupoJerarquico = "NO_DEFINIDO";
      rowWarnings.push({
        tipo: "PERSONAL_LEGACY_SIN_GRUPO_JERARQUICO",
        fila,
        matricula,
        message: "El formato legacy no informa grupo jerarquico granular para personal SO",
      });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    warnings.push(...rowWarnings);
    parsed.push({ fila, matricula, dni, nombreApellido, tipoPersonal, grupoJerarquico, precedencia });
  });

  return { parsed, errors, warnings };
}

async function dryRunPersonal(buffer) {
  const rows = parseXlsxBuffer(buffer);
  const hash = sha256(buffer);
  const { parsed, errors, warnings } = parsePersonalRows(rows);
  const nuevos = [];
  const actualizados = [];
  const sinCambios = [];

  pushDuplicateWarnings({ rows: parsed, key: "dni", label: "DNI", warnings });
  pushDuplicateWarnings({ rows: parsed, key: "matricula", label: "MATRICULAS", warnings });

  const matriculas = parsed.map((row) => row.matricula).filter(Boolean);
  const dnis = parsed.map((row) => row.dni).filter(Boolean);
  const users = await User.find({
    $or: [{ matricula: { $in: matriculas } }, { dni: { $in: dnis } }],
  })
    .select(
      "email matricula dni role activo archivado bloqueado tipoPersonal grupoJerarquico precedencia viviendaAsignada alojamientoAsignado nombre apellido"
    )
    .lean();

  const byMatricula = new Map(users.filter((user) => user.matricula).map((user) => [String(user.matricula), user]));
  const byDni = new Map(users.filter((user) => user.dni).map((user) => [normDni(user.dni), user]));

  for (const matricula of matriculas) {
    const matches = users.filter((user) => String(user.matricula || "") === matricula);
    if (matches.length > 1) warnings.push({ tipo: "DUPLICADO_DB", campo: "MATRICULAS", valor: matricula, usuarios: matches.map(publicUser) });
  }
  for (const dni of dnis) {
    const matches = users.filter((user) => normDni(user.dni) === dni);
    if (matches.length > 1) warnings.push({ tipo: "DUPLICADO_DB", campo: "DNI", valor: dni, usuarios: matches.map(publicUser) });
  }

  for (const row of parsed) {
    const existingByMatricula = byMatricula.get(row.matricula) || null;
    const existingByDni = byDni.get(row.dni) || null;
    if (
      existingByMatricula &&
      existingByDni &&
      String(existingByMatricula._id || "") !== String(existingByDni._id || "")
    ) {
      warnings.push({
        tipo: "CONFLICTO_MATRICULA_DNI_USUARIOS_DISTINTOS",
        fila: row.fila,
        matricula: row.matricula,
        dni: row.dni,
        usuarios: [publicUser(existingByMatricula), publicUser(existingByDni)],
      });
    }

    const existing = existingByMatricula || existingByDni || null;
    if (!existing) {
      nuevos.push(row);
      continue;
    }

    const cambios = [];
    if ((existing.tipoPersonal || null) !== row.tipoPersonal) {
      cambios.push({ campo: "tipoPersonal", actual: existing.tipoPersonal || null, nuevo: row.tipoPersonal });
      warnings.push({ tipo: "CAMBIO_TIPO_PERSONAL", fila: row.fila, matricula: row.matricula, actual: existing.tipoPersonal || null, nuevo: row.tipoPersonal });
    }
    if ((existing.grupoJerarquico || "NO_DEFINIDO") !== row.grupoJerarquico) {
      cambios.push({ campo: "grupoJerarquico", actual: existing.grupoJerarquico || "NO_DEFINIDO", nuevo: row.grupoJerarquico });
      warnings.push({
        tipo: "CAMBIO_GRUPO_JERARQUICO",
        fila: row.fila,
        matricula: row.matricula,
        actual: existing.grupoJerarquico || "NO_DEFINIDO",
        nuevo: row.grupoJerarquico,
      });
    }
    if ((existing.precedencia ?? null) !== row.precedencia) {
      cambios.push({ campo: "precedencia", actual: existing.precedencia ?? null, nuevo: row.precedencia });
      warnings.push({ tipo: "CAMBIO_PRECEDENCIA", fila: row.fila, matricula: row.matricula, actual: existing.precedencia ?? null, nuevo: row.precedencia });
    }
    if (normDni(existing.dni) !== row.dni) {
      cambios.push({ campo: "dni", actual: normDni(existing.dni), nuevo: row.dni });
    }

    if (existing.activo !== false && (existing.archivado || existing.bloqueado)) {
      warnings.push({ tipo: "USUARIO_ACTIVO_INCONSISTENCIA", fila: row.fila, matricula: row.matricula, usuario: publicUser(existing) });
    }

    if (cambios.length) actualizados.push({ ...row, existente: publicUser(existing), cambios });
    else sinCambios.push({ ...row, existente: publicUser(existing) });
  }

  return {
    summary: baseSummary({
      tipoBase: "PERSONAL",
      totalFilas: Math.max(rows.length - 1, 0),
      validas: parsed.length,
      invalidas: errors.length,
      nuevos,
      actualizados,
      sinCambios,
      warnings,
      errores: errors,
      hash,
    }),
    nuevos,
    actualizados,
    sinCambios,
    warnings,
    errores: errors,
  };
}

function parseViviendaRows(rows) {
  const headerCheck = assertHeaders(rows[0]?.cells || [], VIVIENDAS_HEADERS);
  if (!headerCheck.ok) return { parsed: [], errors: [headerCheck.error], warnings: [] };

  const parsed = [];
  const errors = [];
  const warnings = [];

  rows.slice(1).forEach((row, index) => {
    const fila = index + 2;
    if (row.hasFormula) {
      errors.push({ fila, campo: "archivo", message: "No se aceptan formulas en Excel" });
      return;
    }

    const raw = rowObject(row.cells, VIVIENDAS_HEADERS);
    if (hasDangerousFormulaText(raw)) {
      errors.push({ fila, campo: "archivo", message: "No se aceptan valores con prefijo de formula (=, +, -, @)" });
      return;
    }
    const barrio = clean(raw.BARRIOS).replace(/^BARRIO\s*/i, "").trim();
    const codigoInfo = normalizeCodigoVivienda({ barrio, codigo: raw.DPTOCASA });
    const codigo = codigoInfo.codigo;
    const dormitorios = Number(clean(raw.DORM));
    const tipoDestino = normalizeTipoDestinoStrict(raw.GRUPO);
    const rowErrors = [];

    if (!codigo) rowErrors.push({ fila, campo: "DPTOCASA", message: "codigo obligatorio" });
    if (!barrio) rowErrors.push({ fila, campo: "BARRIOS", message: "barrio obligatorio" });
    if (!Number.isInteger(dormitorios) || dormitorios < 0) rowErrors.push({ fila, campo: "DORM", message: "DORM debe ser numerico" });
    if (!tipoDestino) rowErrors.push({ fila, campo: "GRUPO", message: "GRUPO debe ser OF, SO o MIXTO" });

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    if (codigoInfo.resolved && codigoInfo.normalized) {
      warnings.push({
        tipo: "CODIGO_VIVIENDA_NORMALIZADO",
        fila,
        barrio,
        codigoOriginal: codigoInfo.codigoOriginal,
        codigoNormalizado: codigoInfo.codigoNormalizado,
      });
    }
    if (!codigoInfo.resolved) {
      warnings.push({
        tipo: "CODIGO_VIVIENDA_NO_NORMALIZADO",
        fila,
        barrio,
        codigoOriginal: codigoInfo.codigoOriginal,
        codigoNormalizado: codigoInfo.codigoNormalizado,
      });
    }

    parsed.push({
      fila,
      codigoOriginal: codigoInfo.codigoOriginal,
      codigo,
      codigoNormalizado: codigoInfo.codigoNormalizado,
      barrio,
      dormitorios,
      tipoDestino,
    });
  });

  return { parsed, errors, warnings };
}

async function dryRunViviendas(buffer) {
  const rows = parseXlsxBuffer(buffer);
  const hash = sha256(buffer);
  const { parsed, errors, warnings: normalizationWarnings } = parseViviendaRows(rows);
  const warnings = [...normalizationWarnings];
  const nuevos = [];
  const actualizados = [];
  const sinCambios = [];

  pushDuplicateWarnings({ rows: parsed, key: "codigoNormalizado", label: "DPTOCASA", warnings });

  const codigos = parsed.map((row) => row.codigoNormalizado);
  const canonicalCodigos = new Set(parsed.map((row) => canonicalCodigoVivienda(row.codigoNormalizado)).filter(Boolean));
  const viviendas = await Vivienda.find({
    $or: [{ codigo: { $in: codigos } }, { codigo: /^IN-/ }],
  })
    .select("codigo barrio dormitorios estado tipoDestino ocupacionActual")
    .lean();
  const byCodigo = new Map(viviendas.map((vivienda) => [String(vivienda.codigo), vivienda]));
  const byCodigoNormalizado = new Map(viviendas.map((vivienda) => [normalizeCodigoToken(vivienda.codigo), vivienda]));
  const byCodigoCanonical = new Map(viviendas.map((vivienda) => [canonicalCodigoVivienda(vivienda.codigo), vivienda]));

  const archivoCodigos = new Set(codigos);
  const viviendasActivas = await Vivienda.find({ estado: { $ne: "BAJA" } })
    .select("codigo barrio dormitorios estado tipoDestino ocupacionActual")
    .limit(2000)
    .lean();

  for (const vivienda of viviendasActivas) {
    const codigoDb = String(vivienda.codigo || "");
    const codigoDbNormalizado = normalizeCodigoToken(codigoDb);
    const codigoDbCanonical = canonicalCodigoVivienda(codigoDb);
    if (archivoCodigos.has(codigoDb) || archivoCodigos.has(codigoDbNormalizado) || canonicalCodigos.has(codigoDbCanonical)) {
      continue;
    }
    warnings.push({
      tipo: "VIVIENDA_DESAPARECE_DEL_ARCHIVO",
      vivienda: publicVivienda(vivienda),
      message: "La vivienda existe en DB y no aparece en el Excel. No se aplica baja en esta etapa.",
    });
  }

  for (const row of parsed) {
    const existing =
      byCodigo.get(row.codigoNormalizado) ||
      byCodigoNormalizado.get(row.codigoNormalizado) ||
      byCodigoCanonical.get(canonicalCodigoVivienda(row.codigoNormalizado)) ||
      null;
    if (!existing) {
      nuevos.push(row);
      continue;
    }

    const matchedRow =
      existing.codigo && existing.codigo !== row.codigo
        ? { ...row, codigo: existing.codigo, codigoNormalizado: existing.codigo }
        : row;
    const cambios = [];
    const existingTipoDestino = existing.tipoDestino || null;
    if (existingTipoDestino !== matchedRow.tipoDestino) {
      cambios.push({ campo: "tipoDestino", actual: existingTipoDestino, nuevo: matchedRow.tipoDestino });
      warnings.push({ tipo: "CAMBIO_TIPO_DESTINO", fila: matchedRow.fila, codigo: matchedRow.codigo, actual: existingTipoDestino, nuevo: matchedRow.tipoDestino });
      if (publicVivienda(existing).ocupada) {
        warnings.push({ tipo: "VIVIENDA_OCUPADA_CAMBIA_TIPO_DESTINO", fila: matchedRow.fila, codigo: matchedRow.codigo, vivienda: publicVivienda(existing) });
      }
    }
    if (String(existing.barrio || "") !== matchedRow.barrio) {
      cambios.push({ campo: "barrio", actual: existing.barrio || "", nuevo: matchedRow.barrio });
    }
    if (Number(existing.dormitorios || 0) !== matchedRow.dormitorios) {
      cambios.push({ campo: "dormitorios", actual: Number(existing.dormitorios || 0), nuevo: matchedRow.dormitorios });
      warnings.push({ tipo: "CAMBIO_CAPACIDAD", fila: matchedRow.fila, codigo: matchedRow.codigo, actual: Number(existing.dormitorios || 0), nuevo: matchedRow.dormitorios });
    }

    if (cambios.length) actualizados.push({ ...matchedRow, existente: publicVivienda(existing), cambios });
    else sinCambios.push({ ...matchedRow, existente: publicVivienda(existing) });
  }

  return {
    summary: baseSummary({
      tipoBase: "VIVIENDAS",
      totalFilas: Math.max(rows.length - 1, 0),
      validas: parsed.length,
      invalidas: errors.length,
      nuevos,
      actualizados,
      sinCambios,
      warnings,
      errores: errors,
      hash,
    }),
    nuevos,
    actualizados,
    sinCambios,
    warnings,
    errores: errors,
  };
}

function parseAlojamientoRows(rows) {
  const headerCheck = buildFlexibleHeaderMap(
    rows[0]?.cells || [],
    ALOJAMIENTO_HEADER_ALIASES,
    ALOJAMIENTO_REQUIRED_HEADERS
  );
  if (!headerCheck.ok) return { parsed: [], errors: [headerCheck.error], warnings: [] };

  const parsed = [];
  const errors = [];
  const warnings = [];

  rows.slice(1).forEach((row, index) => {
    const fila = index + 2;
    if (row.hasFormula) {
      errors.push({ fila, campo: "archivo", message: "No se aceptan formulas en Excel" });
      return;
    }

    const raw = flexibleRowObject(row.cells, headerCheck.map);
    if (hasDangerousFormulaText(raw)) {
      errors.push({ fila, campo: "archivo", message: "No se aceptan valores con prefijo de formula (=, +, -, @)" });
      return;
    }

    const codigo = normCodigo(raw.CODIGO);
    const denominacion = clean(raw.DENOMINACION);
    const dependencia = clean(raw.DEPENDENCIA);
    const lugar = clean(raw.LUGAR);
    const sector = clean(raw.SECTOR);
    const genero = normalizeGeneroAlojamiento(raw.GENERO);
    const grupoRaw = clean(raw.GRUPO_JERARQUICO);
    const aptoParaGrupoJerarquico = normalizeGrupoJerarquico(grupoRaw);
    const capacidad = Number(clean(raw.CAPACIDAD));
    const estado = normalizeEstadoAlojamiento(raw.ESTADO);
    const activo = parseBoolActivo(raw.ACTIVO);
    const observaciones = clean(raw.OBSERVACIONES);
    const rowErrors = [];

    if (!codigo) rowErrors.push({ fila, campo: "CODIGO", message: "codigo obligatorio" });
    if (!dependencia) rowErrors.push({ fila, campo: "DEPENDENCIA", message: "dependencia obligatoria" });
    if (!lugar) rowErrors.push({ fila, campo: "LUGAR", message: "lugar obligatorio" });
    if (!Number.isInteger(capacidad) || capacidad < 1) {
      rowErrors.push({ fila, campo: "CAPACIDAD", message: "capacidad debe ser un entero mayor a 0" });
      warnings.push({ tipo: "CAPACIDAD_INVALIDA", fila, codigo, valor: raw.CAPACIDAD });
    }
    if (activo === null) rowErrors.push({ fila, campo: "ACTIVO", message: "ACTIVO debe ser SI/NO o vacio" });

    if (!clean(raw.GENERO)) {
      warnings.push({ tipo: "GENERO_AUSENTE", fila, codigo, generoPermitido: genero.value });
    } else if (!genero.valid || !GENEROS_ALOJAMIENTO.has(genero.value)) {
      warnings.push({ tipo: "GENERO_INVALIDO", fila, codigo, valor: raw.GENERO, generoPermitido: genero.value });
    }

    if (!grupoRaw) {
      warnings.push({ tipo: "GRUPO_JERARQUICO_AUSENTE", fila, codigo, aptoParaGrupoJerarquico });
    } else if (aptoParaGrupoJerarquico === "NO_DEFINIDO") {
      warnings.push({ tipo: "GRUPO_JERARQUICO_NO_DEFINIDO", fila, codigo, valor: grupoRaw });
    }

    if (raw.ESTADO && !ALOJAMIENTO_ESTADOS.has(normalizeHeaderKey(raw.ESTADO))) {
      warnings.push({ tipo: "ESTADO_ALOJAMIENTO_INVALIDO", fila, codigo, valor: raw.ESTADO, estado });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    parsed.push({
      fila,
      codigo,
      denominacion,
      dependencia,
      lugar,
      sector,
      generoPermitido: genero.value,
      aptoParaGrupoJerarquico,
      capacidad,
      estado,
      activo: activo !== false,
      observaciones,
    });
  });

  return { parsed, errors, warnings };
}

function alojamientoSensitiveChange(existing, cambios, row, warnings) {
  const publico = publicAlojamiento(existing);
  if (!publico?.ocupado) return;

  if (cambios.some((cambio) => cambio.campo === "generoPermitido")) {
    warnings.push({
      tipo: "ALOJAMIENTO_OCUPADO_CAMBIA_GENERO",
      fila: row.fila,
      codigo: row.codigo,
      alojamiento: publico,
    });
  }
  if (cambios.some((cambio) => cambio.campo === "aptoParaGrupoJerarquico")) {
    warnings.push({
      tipo: "ALOJAMIENTO_OCUPADO_CAMBIA_GRUPO_JERARQUICO",
      fila: row.fila,
      codigo: row.codigo,
      alojamiento: publico,
    });
  }
  if (cambios.some((cambio) => cambio.campo === "capacidad" && Number(cambio.nuevo) < Number(cambio.actual))) {
    warnings.push({
      tipo: "ALOJAMIENTO_OCUPADO_REDUCE_CAPACIDAD",
      fila: row.fila,
      codigo: row.codigo,
      alojamiento: publico,
    });
  }
  if (cambios.some((cambio) => cambio.campo === "activo" && cambio.nuevo === false)) {
    warnings.push({
      tipo: "ALOJAMIENTO_OCUPADO_ACTIVO_FALSE",
      fila: row.fila,
      codigo: row.codigo,
      alojamiento: publico,
    });
  }
}

async function dryRunAlojamientos(buffer) {
  const rows = parseXlsxBuffer(buffer);
  const hash = sha256(buffer);
  const { parsed, errors, warnings: parseWarnings } = parseAlojamientoRows(rows);
  const warnings = [...parseWarnings];
  const nuevos = [];
  const actualizados = [];
  const sinCambios = [];

  pushAlojamientoDuplicateWarnings({ rows: parsed, warnings });

  const codigos = parsed.map((row) => row.codigo).filter(Boolean);
  const alojamientos = await AlojamientoNaval.find({ codigo: { $in: codigos } })
    .select("codigo dependencia lugar sector capacidad generoPermitido aptoParaGrupoJerarquico estado activo observaciones ocupacionActual")
    .lean();
  const byCodigo = new Map(alojamientos.map((alojamiento) => [String(alojamiento.codigo || ""), alojamiento]));

  for (const row of parsed) {
    const existing = byCodigo.get(row.codigo) || null;
    if (!existing) {
      nuevos.push(row);
      continue;
    }

    const cambios = [];
    const comparable = [
      "dependencia",
      "lugar",
      "sector",
      "capacidad",
      "generoPermitido",
      "aptoParaGrupoJerarquico",
      "estado",
      "activo",
      "observaciones",
    ];

    for (const campo of comparable) {
      const actual = campo === "activo" ? existing.activo !== false : existing[campo];
      const nuevo = row[campo];
      if (String(actual ?? "") !== String(nuevo ?? "")) cambios.push({ campo, actual: actual ?? null, nuevo });
    }

    alojamientoSensitiveChange(existing, cambios, row, warnings);

    if (cambios.length) {
      actualizados.push({ ...row, existente: publicAlojamiento(existing), cambios });
    } else {
      sinCambios.push({ ...row, existente: publicAlojamiento(existing) });
    }
  }

  return {
    summary: baseSummary({
      tipoBase: "ALOJAMIENTOS",
      totalFilas: Math.max(rows.length - 1, 0),
      validas: parsed.length,
      invalidas: errors.length,
      nuevos,
      actualizados,
      sinCambios,
      warnings,
      errores: errors,
      hash,
    }),
    nuevos,
    actualizados,
    sinCambios,
    warnings,
    errores: errors,
  };
}

module.exports = {
  dryRunPersonal,
  dryRunViviendas,
  dryRunAlojamientos,
};
