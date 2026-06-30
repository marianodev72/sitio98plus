// backend/controllers/viviendaController.js
// Controller PURO (sin Express Router)

const Vivienda = require("../models/vivienda");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const {
  deriveGrupoViviendaFromGradoEscalafon,
  deriveGrupoViviendaFromGrupoJerarquico,
  isTipoDestinoCompatibleConGrupoVivienda,
  normalizeTipoPersonal,
} = require("../constants/institucional");
const {
  SEMAFORO,
  calcularHacinamientoAnexo17,
} = require("../services/hacinamientoService");

// User model (para vincular ocupación con permisionario; fail-closed)
let User = null;
try {
  ({ User } = require("../models/user"));
} catch {
  try {
    User = require("../models/user");
  } catch {
    User = null;
  }
}

// MisDatosDeclaradosUpdate model (para override de habitantes; fail-closed)
let MisDatosDeclaradosUpdate = null;
try {
  MisDatosDeclaradosUpdate = require("../models/MisDatosDeclaradosUpdate");
} catch {
  MisDatosDeclaradosUpdate = null;
}

let FormSubmission = null;
try {
  ({ FormSubmission } = require("../models/FormSubmission"));
} catch {
  FormSubmission = null;
}

// Nombre de colección para $lookup (fallback seguro)
const MIS_DATOS_COLL = "misdatosdeclaradosupdates";
const FORM_SUBMISSIONS_COLL = "formsubmissions";

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function safeStr(v) {
  return String(v || "").trim();
}

function isObjectIdLike(v) {
  return /^[a-f\d]{24}$/i.test(String(v || ""));
}

function hasPerm(user, perm) {
  const list = Array.isArray(user && user.permisos) ? user.permisos : [];
  const p = up(perm);
  return list.map((x) => up(x)).includes(p);
}

// ─────────────────────────────
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex tolerante a tildes (áàäâ etc).
 * Ej: "MISION" matchea "MISIÓN"
 */
function accentInsensitivePattern(input) {
  const map = {
    A: "AÁÀÂÄ",
    E: "EÉÈÊË",
    I: "IÍÌÎÏ",
    O: "OÓÒÔÖ",
    U: "UÚÙÛÜ",
    N: "NÑ",
    C: "CÇ",
  };

  const s = up(input);
  let out = "";

  for (const ch of s) {
    if (map[ch]) out += `[${map[ch]}]`;
    else out += escapeRegex(ch);
  }

  return out;
}

function buildViviendasPipeline(query = {}) {
  const { codigo, barrio, estado, dormitorios, permisionario, grado, personasMin, personasMax, sortBy, sortDir } = query;

  const dir = String(sortDir || "asc").toLowerCase() === "desc" ? -1 : 1;
  const sortKey = String(sortBy || "barrio").toLowerCase();
  const toIntOrZero = (input) => ({
    $convert: {
      input: { $ifNull: [input, 0] },
      to: "int",
      onError: 0,
      onNull: 0,
    },
  });

  const pipeline = [];
  const match = { estado: { $ne: "BAJA" } };

  // Parse numéricos de personas para aplicar DESPUÉS (cuando ya tenemos override)
  const personasMinNum =
    personasMin !== undefined && personasMin !== "" && !Number.isNaN(Number(personasMin)) ? Number(personasMin) : null;
  const personasMaxNum =
    personasMax !== undefined && personasMax !== "" && !Number.isNaN(Number(personasMax)) ? Number(personasMax) : null;

  if (estado) match.estado = String(estado);

  if (codigo) {
    match.codigo = { $regex: escapeRegex(codigo), $options: "i" };
  }

  // ✅ BARRIO tolerante a tildes
  if (barrio) {
    const patt = accentInsensitivePattern(barrio);
    match.barrio = { $regex: patt, $options: "i" };
  }

  if (dormitorios !== undefined && dormitorios !== "") {
    const d = Number(dormitorios);
    if (!Number.isNaN(d)) match.dormitorios = d;
  }

  pipeline.push({ $match: match });

  // 1) Lookup del permisionario
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "ocupacionActual.permisionario",
      foreignField: "_id",
      as: "permisionarioDoc",
    },
  });

  // 2) Lookup del ÚLTIMO MisDatosDeclaradosUpdate del permisionario
  pipeline.push({
    $lookup: {
      from: MIS_DATOS_COLL,
      let: { uid: "$ocupacionActual.permisionario" },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                // match directo (ObjectId == ObjectId)
                { $eq: ["$usuario", "$$uid"] },

                // match por string (String(ObjectId) == String(ObjectId/string))
                { $eq: [{ $toString: "$usuario" }, { $toString: "$$uid" }] },
              ],
            },
          },
        },
        { $sort: { updatedAt: -1, createdAt: -1, _id: -1 } },
        { $limit: 10 },
        { $project: { _id: 1, createdAt: 1, updatedAt: 1, datosActualizados: 1, datos: 1, grupoFamiliar: 1 } },
      ],
      as: "misDatosCandidatos",
    },
  });

  pipeline.push({
    $lookup: {
      from: FORM_SUBMISSIONS_COLL,
      let: { uid: "$ocupacionActual.permisionario" },
      pipeline: [
        {
          $match: {
            codigo: "ANEXO_01",
            $expr: {
              $or: [
                { $eq: ["$usuario", "$$uid"] },
                { $eq: [{ $toString: "$usuario" }, { $toString: "$$uid" }] },
              ],
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        { $project: { _id: 1, createdAt: 1, datos: 1 } },
      ],
      as: "anexo01Ultimos",
    },
  });

  // Normalizamos docs
  pipeline.push({
    $addFields: {
      permisionarioDoc: { $arrayElemAt: ["$permisionarioDoc", 0] },
      misDatosUltimo: { $arrayElemAt: ["$misDatosCandidatos", 0] }, // compatibilidad interna del pipeline
      anexo01Ultimo: { $arrayElemAt: ["$anexo01Ultimos", 0] },
    },
  });

  // 3) Derivaciones adicionales para ANEXO 17 (si no hay cantidades, caemos a convivientes por edad)
  pipeline.push({
    $addFields: {
      _mdDatos: {
        $ifNull: ["$misDatosUltimo.datosActualizados", { $ifNull: ["$misDatosUltimo.datos", {}] }],
      },
      _mdGrupoLegacy: { $ifNull: ["$misDatosUltimo.grupoFamiliar", {}] },
      _a01Datos: { $ifNull: ["$anexo01Ultimo.datos", {}] },
    },
  });

  pipeline.push({
    $addFields: {
      _mdConvivientesCandidatos: {
        $let: {
          vars: {
            datosConvivientes: "$_mdDatos.convivientes",
            datosIntegrantes: "$_mdDatos.integrantes",
            grupoConvivientes: "$_mdGrupoLegacy.convivientes",
            grupoIntegrantes: "$_mdGrupoLegacy.integrantes",
            grupoRaw: "$_mdGrupoLegacy",
          },
          in: {
            $switch: {
              branches: [
                { case: { $eq: [{ $type: "$$datosConvivientes" }, "array"] }, then: "$$datosConvivientes" },
                { case: { $eq: [{ $type: "$$datosIntegrantes" }, "array"] }, then: "$$datosIntegrantes" },
                { case: { $eq: [{ $type: "$$grupoConvivientes" }, "array"] }, then: "$$grupoConvivientes" },
                { case: { $eq: [{ $type: "$$grupoIntegrantes" }, "array"] }, then: "$$grupoIntegrantes" },
                { case: { $eq: [{ $type: "$$grupoRaw" }, "array"] }, then: "$$grupoRaw" },
              ],
              default: [],
            },
          },
        },
      },
      _a01Convivientes: {
        $cond: [
          { $eq: [{ $type: "$_a01Datos.convivientes" }, "array"] },
          "$_a01Datos.convivientes",
          [],
        ],
      },
    },
  });

  pipeline.push({
    $addFields: {
      _mdTieneConvivientes: {
        $and: [
          { $isArray: "$_mdConvivientesCandidatos" },
          { $gt: [{ $size: "$_mdConvivientesCandidatos" }, 0] },
        ],
      },
      _a01TieneConvivientes: {
        $and: [
          { $isArray: "$_a01Convivientes" },
          { $gt: [{ $size: "$_a01Convivientes" }, 0] },
        ],
      },
      _mdTieneCantidades: {
        $or: [
          { $ne: ["$_mdDatos.cantidadAdultos", null] },
          { $ne: ["$_mdDatos.cantidadHijos", null] },
        ],
      },
      _a01TieneCantidades: {
        $or: [
          { $ne: ["$_a01Datos.cantidadAdultos", null] },
          { $ne: ["$_a01Datos.cantidadHijos", null] },
        ],
      },
    },
  });

  pipeline.push({
    $addFields: {
      _mdConvivientes: {
        $switch: {
          branches: [
            { case: "$_mdTieneConvivientes", then: "$_mdConvivientesCandidatos" },
            {
              case: {
                $and: [
                  { $not: ["$_mdTieneCantidades"] },
                  "$_a01TieneConvivientes",
                ],
              },
              then: "$_a01Convivientes",
            },
          ],
          default: [],
        },
      },
      _datosHabitantes: {
        $switch: {
          branches: [
            {
              case: { $or: ["$_mdTieneConvivientes", "$_mdTieneCantidades"] },
              then: "$_mdDatos",
            },
            {
              case: { $or: ["$_a01TieneConvivientes", "$_a01TieneCantidades"] },
              then: "$_a01Datos",
            },
          ],
          default: {},
        },
      },
      _cantidadHabitantesBase: toIntOrZero("$cantidadHabitantes"),
      fuenteHacinamiento: {
        $switch: {
          branches: [
            {
              case: { $or: ["$_mdTieneConvivientes", "$_mdTieneCantidades"] },
              then: "MIS_DATOS_DECLARADOS",
            },
            {
              case: { $or: ["$_a01TieneConvivientes", "$_a01TieneCantidades"] },
              then: "ANEXO_01",
            },
            {
              case: { $gt: [toIntOrZero("$cantidadHabitantes"), 0] },
              then: "VIVIENDA",
            },
          ],
          default: "SIN_DATOS",
        },
      },
    },
  });

  pipeline.push({
    $addFields: {
      _mdAdultosExtraByEdad: {
        $size: {
          $filter: {
            input: "$_mdConvivientes",
            as: "c",
            cond: { $gte: [toIntOrZero("$$c.edad"), 18] },
          },
        },
      },
      _mdNiniosByEdad: {
        $filter: {
          input: "$_mdConvivientes",
          as: "c",
          cond: { $lt: [toIntOrZero("$$c.edad"), 18] },
        },
      },
    },
  });

  pipeline.push({
    $addFields: {
      _adultosPreferidos: { $ifNull: ["$_datosHabitantes.cantidadAdultos", null] },
      _hijosPreferidos: { $ifNull: ["$_datosHabitantes.cantidadHijos", null] },
      _cantidadHabitantesBase: toIntOrZero("$cantidadHabitantes"),
      _dormitoriosNum: toIntOrZero("$dormitorios"),

      // fallback institucional: titular = 1
      _adultosFallback: { $add: [1, "$_mdAdultosExtraByEdad"] },
      _hijosFallback: { $size: "$_mdNiniosByEdad" },
    },
  });

  pipeline.push({
    $addFields: {
      _mdAdultosTotal: {
        $cond: [{ $ne: ["$_adultosPreferidos", null] }, toIntOrZero("$_adultosPreferidos"), "$_adultosFallback"],
      },
      _mdHijosTotal: {
        $cond: [{ $ne: ["$_hijosPreferidos", null] }, toIntOrZero("$_hijosPreferidos"), "$_hijosFallback"],
      },
    },
  });

  // Conteo por “sexo” si viene (solo aplica al fallback por convivientes)
  pipeline.push({
    $addFields: {
      _mdHijosM: {
        $size: {
          $filter: {
            input: "$_mdNiniosByEdad",
            as: "h",
            cond: {
              $in: [
                { $toUpper: { $toString: { $ifNull: ["$$h.sexo", { $ifNull: ["$$h.genero", ""] }] } } },
                ["M", "MASCULINO", "VARON", "VARÓN"],
              ],
            },
          },
        },
      },
      _mdHijosF: {
        $size: {
          $filter: {
            input: "$_mdNiniosByEdad",
            as: "h",
            cond: {
              $in: [
                { $toUpper: { $toString: { $ifNull: ["$$h.sexo", { $ifNull: ["$$h.genero", ""] }] } } },
                ["F", "FEMENINO", "MUJER"],
              ],
            },
          },
        },
      },
    },
  });

  pipeline.push({
    $addFields: {
      _mdHijosUnknown: {
        $max: [0, { $subtract: ["$_mdHijosTotal", { $add: ["$_mdHijosM", "$_mdHijosF"] }] }],
      },
    },
  });

  // 4) Habitantes efectivos (con mínimo institucional = 1 cuando no hay datos)
  pipeline.push({
    $addFields: {
      cantidadHabitantesEfectiva: {
        $cond: [
          // Si hay MisDatosDeclarados
          {
            $or: ["$_mdTieneConvivientes", "$_a01TieneConvivientes"],
          },
          { $add: ["$_mdAdultosTotal", "$_mdHijosTotal"] },

          // Si NO hay MisDatosDeclarados
          {
            $cond: [
              { $gt: ["$_cantidadHabitantesBase", 0] },
              "$_cantidadHabitantesBase",
              1, // mínimo institucional: titular
            ],
          },
        ],
      },
    },
  });

  // 5) Ratio (habitantes/dormitorios)
  pipeline.push({
    $addFields: {
      hacinamientoRatio: {
        $cond: [{ $gt: ["$_dormitoriosNum", 0] }, { $divide: ["$cantidadHabitantesEfectiva", "$_dormitoriosNum"] }, 0],
      },
    },
  });

  // 6) Aplicar filtros por personas usando EFECTIVA
  if (personasMinNum !== null || personasMaxNum !== null) {
    const mm = {};
    if (personasMinNum !== null) mm.$gte = personasMinNum;
    if (personasMaxNum !== null) mm.$lte = personasMaxNum;
    pipeline.push({ $match: { cantidadHabitantesEfectiva: mm } });
  }

  // 7) Filtro por permisionario
  if (permisionario) {
    const rx = new RegExp(escapeRegex(permisionario), "i");
    pipeline.push({
      $match: {
        $or: [{ "permisionarioDoc.nombre": rx }, { "permisionarioDoc.apellido": rx }, { "permisionarioDoc.matricula": rx }],
      },
    });
  }

  // 8) Filtro por grado del permisionario
  if (grado && up(grado) !== "TODOS") {
    const rxGrado = new RegExp(`^${escapeRegex(grado)}$`, "i");
    pipeline.push({
      $match: {
        $or: [{ "permisionarioDoc.grado": rxGrado }, { "permisionarioDoc.meta.grado": rxGrado }],
      },
    });
  }

  // 9) Project final
  pipeline.push({
    $project: {
      codigo: 1,
      barrio: 1,
      dormitorios: 1,
      estado: 1,
      tipoDestino: 1,

      // UI usa la efectiva
      cantidadHabitantes: "$cantidadHabitantesEfectiva",

      // viejo
      hacinamientoRatio: 1,

      // nuevo
      dormitoriosMinimos: 1,
      hacinamientoColor: 1,
      hacinamientoPct: 1,
      hacinamientoBase: {
        fuente: "$fuenteHacinamiento",
        adultos: "$_mdAdultosTotal",
        hijos: "$_mdHijosTotal",
        hijosM: "$_mdHijosM",
        hijosF: "$_mdHijosF",
        hijosUnknown: "$_mdHijosUnknown",
        misDatosCandidatos: "$misDatosCandidatos",
        anexo01Ultimo: "$anexo01Ultimo",
      },

      permisionario: {
        nombre: "$permisionarioDoc.nombre",
        apellido: "$permisionarioDoc.apellido",
        matricula: "$permisionarioDoc.matricula",
        grado: { $ifNull: ["$permisionarioDoc.grado", "$permisionarioDoc.meta.grado"] },
      },
    },
  });

  // 10) Sorting
  const sort = {};
  if (sortKey === "hacinamiento") sort.hacinamientoRatio = dir;
  else if (sortKey === "personas") sort.cantidadHabitantes = dir;
  else if (sortKey === "grado") sort["permisionario.grado"] = dir;
  else sort[sortKey] = dir;

  pipeline.push({ $sort: sort });

  return {
    pipeline,
    meta: { sortBy: sortKey, sortDir: dir === -1 ? "desc" : "asc" },
  };
}

const SEMAFOROS_COLOR = new Set([SEMAFORO.VERDE, SEMAFORO.AMARILLO, SEMAFORO.ROJO]);
const HACINAMIENTO_FILTROS = new Set([
  SEMAFORO.VERDE,
  SEMAFORO.AMARILLO,
  SEMAFORO.ROJO,
  SEMAFORO.REQUIERE_EVALUACION,
]);

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function toIntOrNullValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  return int >= 0 ? int : null;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function objectWithContent(value) {
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function pickArray(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

function pickSexoGenero(value = {}) {
  return up(value.sexo || value.genero || value["género"] || value.gender);
}

function isSexoMasculino(value) {
  return ["M", "MASCULINO", "VARON", "VARÓN", "HOMBRE"].includes(up(value));
}

function isSexoFemenino(value) {
  return ["F", "FEMENINO", "MUJER"].includes(up(value));
}

function normalizarTextoInstitucional(value) {
  return up(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function vinculoIntegrante(integrante = {}) {
  return normalizarTextoInstitucional(
    integrante.parentesco ||
      integrante.relacion ||
      integrante["relación"] ||
      integrante.vinculo ||
      integrante["vínculo"] ||
      integrante.tipoVinculo
  );
}

function esVinculoPareja(vinculo) {
  const v = normalizarTextoInstitucional(vinculo);
  return (
    v.includes("CONYUGE") ||
    v.includes("ESPOS") ||
    v.includes("CONVIVIENT") ||
    v.includes("CONCUBIN") ||
    v.includes("PAREJA")
  );
}

function esVinculoDescendiente(vinculo) {
  const v = normalizarTextoInstitucional(vinculo);
  return (
    v.includes("HIJO") ||
    v.includes("HIJA") ||
    v.includes("HIJASTR") ||
    v.includes("NIETO") ||
    v.includes("NIETA")
  );
}

function esVinculoAdultoNoDescendiente(vinculo) {
  const v = normalizarTextoInstitucional(vinculo);
  return (
    v.includes("PADRE") ||
    v.includes("MADRE") ||
    v.includes("HERMAN") ||
    v.includes("SUEGR") ||
    v.includes("TIO") ||
    v.includes("TIA") ||
    v.includes("PRIM") ||
    v.includes("ABUEL")
  );
}

function composicionDesdeDatos(datos = {}, grupoLegacy = {}) {
  const fuenteDatos = isPlainObject(datos) ? datos : {};
  const fuenteGrupo = isPlainObject(grupoLegacy) || Array.isArray(grupoLegacy) ? grupoLegacy : {};
  const grupoEnDatos = fuenteDatos.grupoFamiliar;
  const convivientes = pickArray(
    fuenteDatos.convivientes,
    fuenteDatos.integrantes,
    isPlainObject(grupoEnDatos) ? grupoEnDatos.convivientes : null,
    isPlainObject(grupoEnDatos) ? grupoEnDatos.integrantes : null,
    Array.isArray(grupoEnDatos) ? grupoEnDatos : null,
    isPlainObject(fuenteGrupo) ? fuenteGrupo.convivientes : null,
    isPlainObject(fuenteGrupo) ? fuenteGrupo.integrantes : null,
    Array.isArray(fuenteGrupo) ? fuenteGrupo : null
  );

  const adultosPreferidos = toIntOrNullValue(fuenteDatos.cantidadAdultos);
  const hijosPreferidos = toIntOrNullValue(fuenteDatos.cantidadHijos);
  const tieneCantidades = adultosPreferidos !== null || hijosPreferidos !== null;
  const tieneConvivientes = convivientes.length > 0;

  if (!tieneCantidades && !tieneConvivientes) return null;

  let adultosPorEdad = 0;
  let hijosPorEdad = 0;
  let hijosM = 0;
  let hijosF = 0;
  let hijosSinSexo = 0;
  let integrantesSinEdad = 0;
  let pareja = 0;
  let descendientes = 0;
  let descendientesM = 0;
  let descendientesF = 0;
  let descendientesUnknown = 0;
  let otrosNoClasificables = 0;

  for (const integrante of convivientes) {
    const vinculo = vinculoIntegrante(integrante || {});
    if (esVinculoPareja(vinculo)) {
      pareja += 1;
      continue;
    }

    if (esVinculoDescendiente(vinculo)) {
      descendientes += 1;
      const sexoDesc = pickSexoGenero(integrante || {});
      if (isSexoMasculino(sexoDesc)) descendientesM += 1;
      else if (isSexoFemenino(sexoDesc)) descendientesF += 1;
      else descendientesUnknown += 1;
      continue;
    }

    const edad = toIntOrNullValue(integrante && integrante.edad);

    if (vinculo) {
      if (esVinculoAdultoNoDescendiente(vinculo)) {
        otrosNoClasificables += 1;
        continue;
      }

      if (edad !== null && edad < 18) {
        descendientes += 1;
        const sexoProbable = pickSexoGenero(integrante || {});
        if (isSexoMasculino(sexoProbable)) descendientesM += 1;
        else if (isSexoFemenino(sexoProbable)) descendientesF += 1;
        else descendientesUnknown += 1;
        continue;
      }

      otrosNoClasificables += 1;
      continue;
    }

    if (edad === null) {
      integrantesSinEdad += 1;
      continue;
    }

    if (edad >= 18) {
      adultosPorEdad += 1;
      continue;
    }

    hijosPorEdad += 1;
    const sexo = pickSexoGenero(integrante || {});
    if (isSexoMasculino(sexo)) hijosM += 1;
    else if (isSexoFemenino(sexo)) hijosF += 1;
    else hijosSinSexo += 1;
  }

  const hayDescendientesPorVinculo = descendientes > 0;
  const adultosBase = adultosPreferidos !== null ? adultosPreferidos : 1 + pareja + adultosPorEdad;
  const adultos = adultosBase + otrosNoClasificables + Math.max(0, pareja - 1);
  const hijos = hijosPreferidos !== null ? hijosPreferidos : (hayDescendientesPorVinculo ? descendientes : hijosPorEdad);
  const hijosMFinal = hayDescendientesPorVinculo ? descendientesM : hijosM;
  const hijosFFinal = hayDescendientesPorVinculo ? descendientesF : hijosF;
  const hijosSinSexoFinal = hayDescendientesPorVinculo ? descendientesUnknown : hijosSinSexo;
  const sexoInformado = hijosMFinal + hijosFFinal + hijosSinSexoFinal;
  const hijosUnknown = Math.max(0, hijos - hijosMFinal - hijosFFinal);
  const edadesInsuficientes = !tieneCantidades && integrantesSinEdad > 0;

  return {
    adultos,
    hijos,
    hijosM: hijosMFinal,
    hijosF: hijosFFinal,
    hijosUnknown: sexoInformado > 0 || hijos === 2 || hijos === 4 ? hijosUnknown : 0,
    distribucionRazonable: {
      descendientes: hayDescendientesPorVinculo ? descendientes : hijos,
      descendientesM: hayDescendientesPorVinculo ? descendientesM : hijosM,
      descendientesF: hayDescendientesPorVinculo ? descendientesF : hijosF,
      descendientesUnknown: hayDescendientesPorVinculo ? descendientesUnknown : hijosSinSexo,
      otrosNoClasificables: otrosNoClasificables + Math.max(0, pareja - 1),
    },
    tieneCantidades,
    tieneConvivientes,
    usableComoFuenteVigente: !edadesInsuficientes,
  };
}

function datosMisDatosDeclarados(update = {}) {
  if (!isPlainObject(update)) return {};
  if (objectWithContent(update.datosActualizados)) return update.datosActualizados;
  if (objectWithContent(update.datos)) return update.datos;
  return {};
}

function resolverFuenteFamiliarHacinamiento(hacinamientoBase = {}) {
  const candidatos = Array.isArray(hacinamientoBase.misDatosCandidatos)
    ? hacinamientoBase.misDatosCandidatos
    : [];

  for (const candidato of candidatos) {
    const composicion = composicionDesdeDatos(datosMisDatosDeclarados(candidato), candidato && candidato.grupoFamiliar);
    if (composicion && composicion.usableComoFuenteVigente) {
      return { fuente: "MIS_DATOS_DECLARADOS", composicion };
    }
  }

  const anexo01Datos = isPlainObject(hacinamientoBase.anexo01Ultimo && hacinamientoBase.anexo01Ultimo.datos)
    ? hacinamientoBase.anexo01Ultimo.datos
    : {};
  const composicionAnexo01 = composicionDesdeDatos(anexo01Datos);
  if (composicionAnexo01) {
    return { fuente: "ANEXO_01", composicion: composicionAnexo01 };
  }

  return {
    fuente: safeStr(hacinamientoBase.fuente) || "SIN_DATOS",
    composicion: null,
  };
}

function enriquecerHacinamientoAnexo17(vivienda = {}) {
  const { hacinamientoBase = {}, ...out } = vivienda || {};
  const fuenteResuelta = resolverFuenteFamiliarHacinamiento(hacinamientoBase);
  const fuenteHacinamiento = fuenteResuelta.fuente;
  const composicion = fuenteResuelta.composicion;
  const tieneComposicion = Boolean(composicion);

  const hacinamiento = calcularHacinamientoAnexo17({
    estadoVivienda: out.estado,
    dormitoriosReales: out.dormitorios,
    adultos: tieneComposicion ? composicion.adultos : null,
    hijos: tieneComposicion ? composicion.hijos : null,
    hijosM: tieneComposicion ? composicion.hijosM : null,
    hijosF: tieneComposicion ? composicion.hijosF : null,
    hijosUnknown: tieneComposicion ? composicion.hijosUnknown : null,
    distribucionRazonable: tieneComposicion ? composicion.distribucionRazonable : null,
  });

  const dormitoriosReales = isNumber(hacinamiento.dormitoriosReales)
    ? hacinamiento.dormitoriosReales
    : Number(out.dormitorios || 0);
  const dormitoriosMinimos = hacinamiento.dormitoriosMinimosAnexo17;
  const hacinamientoPct =
    isNumber(dormitoriosReales) && dormitoriosReales > 0 && isNumber(dormitoriosMinimos) && dormitoriosMinimos > 0
      ? Math.round((dormitoriosReales / dormitoriosMinimos) * 100)
      : null;

  return {
    ...out,
    cantidadHabitantes: isNumber(hacinamiento.habitantes) ? hacinamiento.habitantes : out.cantidadHabitantes,
    hacinamientoRatio: isNumber(hacinamiento.ratioPersonasPorDormitorio)
      ? hacinamiento.ratioPersonasPorDormitorio
      : (isNumber(out.hacinamientoRatio) ? out.hacinamientoRatio : null),
    dormitoriosMinimos,
    hacinamientoColor: SEMAFOROS_COLOR.has(hacinamiento.semaforo) ? hacinamiento.semaforo : null,
    hacinamientoPct,
    dormitoriosMinimosAnexo17: dormitoriosMinimos,
    semaforo: hacinamiento.semaforo,
    requiereEvaluacion: Boolean(hacinamiento.requiereEvaluacion),
    motivo: hacinamiento.motivo || "",
    criterio: hacinamiento.criterio,
    fuenteHacinamiento,
  };
}

function enriquecerViviendasHacinamiento(viviendas = []) {
  return (Array.isArray(viviendas) ? viviendas : []).map(enriquecerHacinamientoAnexo17);
}

function normalizeHacinamientoFiltro(value) {
  const filtro = up(value);
  return HACINAMIENTO_FILTROS.has(filtro) ? filtro : "";
}

function getPagination(query = {}, options = {}) {
  const pageRaw = Number.parseInt(String(query.page || "1"), 10);
  const limitRaw = Number.parseInt(String(query.limit || ""), 10);
  const allowedLimits = new Set([50, 100]);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const defaultLimit = options.defaultLimit === 50 || options.defaultLimit === 100 ? options.defaultLimit : null;
  const limit = allowedLimits.has(limitRaw) ? limitRaw : defaultLimit;

  return { page, limit };
}

function filtrarPorHacinamiento(viviendas = [], hacinamiento) {
  const filtro = normalizeHacinamientoFiltro(hacinamiento);
  if (!filtro) return viviendas;

  return (Array.isArray(viviendas) ? viviendas : []).filter((v) => up(v && (v.semaforo || v.hacinamientoColor)) === filtro);
}

async function listarViviendasFiltradas(query = {}, _user = null, options = {}) {
  const { pipeline, meta } = buildViviendasPipeline(query);
  const viviendasBase = await Vivienda.aggregate(pipeline);
  const enriquecidas = enriquecerViviendasHacinamiento(viviendasBase);
  const filtradas = filtrarPorHacinamiento(enriquecidas, query.hacinamiento);

  const total = filtradas.length;
  const paginate = options.paginate === true;
  const { page, limit } = getPagination(query, { defaultLimit: options.defaultLimit });

  if (!paginate || !limit) {
    return {
      viviendas: filtradas,
      total,
      page: 1,
      limit: total,
      totalPages: 1,
      meta,
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    viviendas: filtradas.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
    meta,
  };
}

function buildFiltrosResumen(query = {}) {
  const clean = (v) => (v === undefined || v === null ? "" : String(v).trim());
  const out = {};

  const codigo = clean(query.codigo);
  const barrio = clean(query.barrio);
  const estado = clean(query.estado);
  const dormitorios = clean(query.dormitorios);
  const permisionario = clean(query.permisionario);
  const grado = clean(query.grado);
  const personasMin = clean(query.personasMin);
  const personasMax = clean(query.personasMax);
  const hacinamiento = normalizeHacinamientoFiltro(query.hacinamiento);

  if (codigo) out["Código"] = codigo;
  if (barrio) out["Barrio"] = barrio;
  if (estado) out["Estado"] = estado;
  if (dormitorios) out["Dormitorios"] = dormitorios;
  if (permisionario) out["Permisionario"] = permisionario;
  if (grado) out["Grado"] = grado;
  if (personasMin) out["Personas mín."] = personasMin;
  if (personasMax) out["Personas máx."] = personasMax;
  if (hacinamiento) out["Hacinamiento"] = hacinamiento;

  return out;
}

function isInspectorLike(user) {
  const role = up(user && user.role);
  return role === "INSPECTOR" || hasPerm(user, "INSPECTOR");
}

function asExcelValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function getHacinamientoEstado(vivienda = {}) {
  return safeStr(vivienda.semaforo || vivienda.hacinamientoColor) || "SIN_DATOS";
}

function getPermisionarioLabel(vivienda = {}) {
  const p = vivienda.permisionario || {};
  return safeStr((p.apellido || "") + " " + (p.nombre || "")) || safeStr(p.matricula) || "-";
}

function getPermisionarioMatricula(vivienda = {}) {
  return safeStr(vivienda && vivienda.permisionario && vivienda.permisionario.matricula) || "-";
}

function getPermisionarioGrado(vivienda = {}) {
  return safeStr(vivienda && vivienda.permisionario && vivienda.permisionario.grado) || "-";
}

function formatTipoDestinoExcel(value) {
  const normalized = up(value);
  if (normalized === "OF") return "OFICIALES";
  if (normalized === "SO") return "SUBOFICIALES";
  if (normalized === "MIXTO") return "MIXTO";
  return "SIN DEFINIR";
}

function resumenHacinamiento(viviendas = []) {
  const resumen = { VERDE: 0, AMARILLO: 0, ROJO: 0, REQUIERE_EVALUACION: 0, SIN_DATOS: 0, NO_APLICA: 0 };
  for (const vivienda of Array.isArray(viviendas) ? viviendas : []) {
    const key = getHacinamientoEstado(vivienda);
    if (Object.prototype.hasOwnProperty.call(resumen, key)) resumen[key] += 1;
    else resumen.SIN_DATOS += 1;
  }
  return resumen;
}

function applyHeaderStyle(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function aplicarFormatoTabla(sheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "O1" };
  applyHeaderStyle(sheet.getRow(1));
  sheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 24 : 20;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });
}

function buildViviendasWorkbook({ viviendas = [], filtros = {}, user = null, fecha = new Date() } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sitio98Plus";
  workbook.created = fecha;
  workbook.modified = fecha;

  const resumenSheet = workbook.addWorksheet("Resumen");
  resumenSheet.columns = [
    { header: "Concepto", key: "concepto", width: 34 },
    { header: "Valor", key: "valor", width: 48 },
  ];
  applyHeaderStyle(resumenSheet.getRow(1));

  const filtrosKeys = filtros && typeof filtros === "object" ? Object.keys(filtros) : [];
  resumenSheet.addRow({ concepto: "Titulo", valor: "Listado de Viviendas Fiscales" });
  resumenSheet.addRow({ concepto: "Fecha/hora de emision", valor: fecha.toLocaleString("es-AR") });
  resumenSheet.addRow({ concepto: "Usuario", valor: safeStr((user && (user.email || user.username || user.nombre)) || "") || "-" });
  resumenSheet.addRow({ concepto: "Rol", valor: safeStr(user && user.role) || "-" });
  resumenSheet.addRow({ concepto: "Total de viviendas", valor: Array.isArray(viviendas) ? viviendas.length : 0 });
  resumenSheet.addRow({ concepto: "Filtros aplicados", valor: filtrosKeys.length ? "Ver detalle debajo" : "Sin filtros" });

  if (filtrosKeys.length) {
    resumenSheet.addRow({ concepto: "", valor: "" });
    resumenSheet.addRow({ concepto: "Filtro", valor: "Valor" });
    applyHeaderStyle(resumenSheet.getRow(resumenSheet.rowCount));
    for (const key of filtrosKeys) resumenSheet.addRow({ concepto: key, valor: String(filtros[key]) });
  }

  const resumen = resumenHacinamiento(viviendas);
  resumenSheet.addRow({ concepto: "", valor: "" });
  resumenSheet.addRow({ concepto: "Resumen por hacinamiento", valor: "Cantidad" });
  applyHeaderStyle(resumenSheet.getRow(resumenSheet.rowCount));
  for (const key of ["VERDE", "AMARILLO", "ROJO", "REQUIERE_EVALUACION", "SIN_DATOS", "NO_APLICA"]) {
    resumenSheet.addRow({ concepto: key, valor: resumen[key] || 0 });
  }

  resumenSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  const viviendasSheet = workbook.addWorksheet("Viviendas");
  viviendasSheet.columns = [
    { header: "Barrio", key: "barrio", width: 24 },
    { header: "Vivienda / Codigo", key: "codigo", width: 20 },
    { header: "Dormitorios", key: "dormitorios", width: 14 },
    { header: "Estado vivienda", key: "estado", width: 18 },
    { header: "Destino", key: "destino", width: 18 },
    { header: "Grado", key: "grado", width: 12 },
    { header: "Permisionario", key: "permisionario", width: 30 },
    { header: "Matricula", key: "matricula", width: 16 },
    { header: "Grupo familiar / personas", key: "personas", width: 24 },
    { header: "Adultos", key: "adultos", width: 12 },
    { header: "Menores", key: "menores", width: 12 },
    { header: "Hacinamiento", key: "hacinamiento", width: 22 },
    { header: "Motivo / criterio", key: "criterio", width: 42 },
    { header: "Fuente", key: "fuente", width: 24 },
    { header: "Observaciones", key: "observaciones", width: 42 },
  ];

  for (const vivienda of Array.isArray(viviendas) ? viviendas : []) {
    viviendasSheet.addRow({
      barrio: asExcelValue(vivienda.barrio),
      codigo: asExcelValue(vivienda.codigo),
      dormitorios: asExcelValue(vivienda.dormitorios),
      estado: asExcelValue(vivienda.estado),
      destino: formatTipoDestinoExcel(vivienda.tipoDestino),
      grado: getPermisionarioGrado(vivienda),
      permisionario: getPermisionarioLabel(vivienda),
      matricula: getPermisionarioMatricula(vivienda),
      personas: asExcelValue(vivienda.cantidadHabitantes),
      adultos: asExcelValue(vivienda.cantidadAdultos),
      menores: asExcelValue(vivienda.cantidadMenores),
      hacinamiento: getHacinamientoEstado(vivienda),
      criterio: asExcelValue(vivienda.criterio || vivienda.motivo),
      fuente: asExcelValue(vivienda.fuenteHacinamiento),
      observaciones: asExcelValue(vivienda.motivo),
    });
  }

  aplicarFormatoTabla(viviendasSheet);
  return workbook;
}

// PDF local (sin utils/pdf)
function generateViviendasListadoPDF(res, payload) {
  const { titulo, fecha, filtros, orden, viviendas } = payload || {};

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(16).text("Sitio 98", { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(12).text(String(titulo || "Listado de Viviendas"), { align: "center" });
  doc.moveDown(0.6);

  doc.fontSize(10).text(`Fecha/hora: ${fecha ? new Date(fecha).toLocaleString() : new Date().toLocaleString()}`);
  doc.moveDown(0.4);

  if (orden && orden.sortBy) {
    doc.fontSize(9).text(`Orden: ${String(orden.sortBy)} (${String(orden.sortDir || "asc")})`);
    doc.moveDown(0.3);
  }

  const filtrosKeys = filtros && typeof filtros === "object" ? Object.keys(filtros) : [];
  if (filtrosKeys.length) {
    doc.fontSize(10).text("Filtros:", { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(9);
    for (const k of filtrosKeys) {
      doc.text(`- ${k}: ${String(filtros[k])}`);
    }
    doc.moveDown(0.6);
  }

  doc.fontSize(10).text("Viviendas:", { underline: true });
  doc.moveDown(0.2);

  const list = Array.isArray(viviendas) ? viviendas : [];
  doc.fontSize(9);

  list.forEach((v, idx) => {
    const codigo = v && v.codigo ? v.codigo : "-";
    const barrio = v && v.barrio ? v.barrio : "-";
    const estado = v && v.estado ? v.estado : "-";
    const dormitorios = v && v.dormitorios !== undefined ? v.dormitorios : "-";
    const personas = v && v.cantidadHabitantes !== undefined ? v.cantidadHabitantes : "-";

    const pctText = typeof v.hacinamientoPct === "number" ? `${v.hacinamientoPct.toFixed(0)}%` : "-";
    const color = v && (v.semaforo || v.hacinamientoColor) ? (v.semaforo || v.hacinamientoColor) : "-";

    const p = (v && v.permisionario) || {};
    const grado = safeStr(p.grado) || "-";
    const permStr =
      p.apellido || p.nombre || p.matricula
        ? `${p.apellido || ""} ${p.nombre || ""}`.trim() + (p.matricula ? ` (Matr: ${p.matricula})` : "")
        : "—";

    doc.text(
      `${idx + 1}. ${codigo} | Barrio: ${barrio} | Estado: ${estado} | Dorm: ${dormitorios} | Personas: ${personas} | Hacin.: ${pctText} (${color}) | Grado: ${grado} | Ocupa: ${permStr}`
    );
  });

  doc.end();
}

// ─────────────────────────────
// LISTAR (ADMIN/ADMIN_GENERAL + TERRITORIAL SOLO SU BARRIO)
async function listar(req, res) {
  try {
    const user = req.user;
    const role = up(user && user.role);

    if (!user || !role) return res.status(404).json({ message: "Recurso no disponible" });

    const esAdminGeneral = role === "ADMIN_GENERAL";
    const esAdmin = role === "ADMIN";
    const esTerritorial = hasPerm(user, "INSPECTOR") || hasPerm(user, "JEFE_DE_BARRIO");

    if (!esAdminGeneral && !esAdmin && !esTerritorial) return res.status(404).json({ message: "Recurso no disponible" });

    const q = Object.assign({}, req.query || {});

    // Territorial (y no admin/admin_general) => barrioAsignado obligatorio (fail-closed)
    if (esTerritorial && !esAdminGeneral && !esAdmin) {
      const barrioAsignado = safeStr(user && user.barrioAsignado);
      if (!barrioAsignado) return res.status(404).json({ message: "Recurso no disponible" });
      q.barrio = barrioAsignado;
    }

    const result = await listarViviendasFiltradas(q, user, { paginate: true });

    return res.json(result);
  } catch (err) {
    console.error("[VIVIENDAS] Error listando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// LISTAR ELEGIBLES PARA ASIGNACIÓN (ANEXO_02) — ADMIN_GENERAL
async function resolverGrupoViviendaPostulanteDesdeAnexo01(anexo01Id) {
  if (!FormSubmission || !User || !isObjectIdLike(anexo01Id)) {
    return { ok: false, status: 400, message: "No se pudo determinar el grupo institucional del postulante." };
  }

  const anexo01 = await FormSubmission.findById(anexo01Id)
    .select("codigo datos usuario")
    .lean();

  if (!anexo01 || up(anexo01.codigo) !== "ANEXO_01") {
    return { ok: false, status: 404, message: "Recurso no disponible" };
  }

  const postulante = await User.findById(anexo01.usuario)
    .select("_id tipoPersonal grupoJerarquico")
    .lean();

  const gradoEscalafon = safeStr(anexo01?.datos?.gradoEscalafon);
  const grupo =
    deriveGrupoViviendaFromGradoEscalafon(gradoEscalafon) ||
    deriveGrupoViviendaFromGrupoJerarquico(postulante?.grupoJerarquico) ||
    normalizeTipoPersonal(postulante?.tipoPersonal);

  if (!grupo) {
    return { ok: false, status: 409, message: "No se pudo determinar el grupo institucional del postulante." };
  }

  return { ok: true, grupo };
}

async function listarElegiblesAsignacion(req, res) {
  try {
    const user = req.user;
    const role = up(user && user.role);

    if (!user || role !== "ADMIN_GENERAL") return res.status(404).json({ message: "Recurso no disponible" });

    const filtro = {
      estado: { $in: ["DISPONIBLE", "A_DESOCUPARSE"] },
    };

    const anexo01Id = safeStr(req.query?.anexo01Id);
    if (!anexo01Id) {
      return res.status(400).json({
        code: "ANEXO_01_REQUERIDO",
        message: "Debe indicarse ANEXO_01 para listar viviendas compatibles.",
      });
    }

    const resGrupo = await resolverGrupoViviendaPostulanteDesdeAnexo01(anexo01Id);
    if (!resGrupo.ok) {
      return res.status(resGrupo.status || 409).json({ message: resGrupo.message || "Recurso no disponible" });
    }

    const tiposDestinoCompatibles = ["OF", "SO", "MIXTO"].filter((tipo) =>
      isTipoDestinoCompatibleConGrupoVivienda(resGrupo.grupo, tipo)
    );
    filtro.tipoDestino = { $in: tiposDestinoCompatibles };

    const viviendas = await Vivienda.find(filtro)
      .select("_id codigo barrio dormitorios estado tipoDestino")
      .sort({ barrio: 1, codigo: 1 })
      .lean();

    return res.json({ viviendas });
  } catch (err) {
    console.error("[VIVIENDAS] Error listando elegibles:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// CAMBIAR ESTADO (SOLO ADMIN_GENERAL)
async function cambiarEstado(req, res) {
  try {
    if (!req.user || up(req.user.role) !== "ADMIN_GENERAL") {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const { id } = req.params;
    const { estado } = req.body;

    if (!/^[a-f\d]{24}$/i.test(String(id || ""))) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    if (typeof estado !== "string" || !estado.trim()) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const vivienda = await Vivienda.findById(id);
    if (!vivienda) return res.status(404).json({ message: "Recurso no disponible" });

    const estadoNorm = up(estado);
    vivienda.estado = estadoNorm;

    // Si pasa a OCUPADA intentamos vincular ocupación (fail-closed)
    if (estadoNorm === "OCUPADA") {
      vivienda.ocupacionActual =
        vivienda.ocupacionActual && typeof vivienda.ocupacionActual === "object" ? vivienda.ocupacionActual : {};

      vivienda.ocupacionActual.updatedAt = new Date();

      const bodyPerm =
        (req.body && (req.body.permisionarioId || req.body.permisionario || req.body.usuarioId || req.body.userId)) ||
        null;

      const isOid = (x) => /^[a-f\d]{24}$/i.test(String(x || ""));
      let permisionarioId = isOid(bodyPerm) ? String(bodyPerm) : null;

      if (!permisionarioId && vivienda.ocupacionActual && isOid(vivienda.ocupacionActual.permisionario)) {
        permisionarioId = String(vivienda.ocupacionActual.permisionario);
      }

      if (!permisionarioId && User) {
        const candidates = await User.find({
          role: "PERMISIONARIO",
          activo: true,
          viviendaAsignada: vivienda._id,
        })
          .select("_id")
          .limit(2);

        if (Array.isArray(candidates) && candidates.length === 1) {
          permisionarioId = String(candidates[0]._id);
        }
      }

      if (permisionarioId) vivienda.ocupacionActual.permisionario = permisionarioId;
    } else {
      if (vivienda.ocupacionActual && typeof vivienda.ocupacionActual === "object") {
        vivienda.ocupacionActual.permisionario = null;
      }
    }

    await vivienda.save();
    return res.json({ message: "Estado actualizado" });
  } catch (err) {
    console.error("[VIVIENDAS] Error cambiando estado:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// LISTAR BARRIOS (ADMIN_GENERAL y ADMIN)
async function listarBarrios(req, res) {
  try {
    const user = req.user;
    const role = up(user && user.role);

    if (!user || (role !== "ADMIN_GENERAL" && role !== "ADMIN")) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const barrios = await Vivienda.distinct("barrio", {
      estado: { $ne: "BAJA" },
      barrio: { $nin: [null, ""] },
    });

    const out = (Array.isArray(barrios) ? barrios : [])
      .map((b) => String(b || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es"));

    return res.json({ barrios: out });
  } catch (err) {
    console.error("[VIVIENDAS] Error listando barrios:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// LISTAR CODIGOS POR BARRIO (ADMIN_GENERAL) — GET /api/viviendas/codigos?barrio=...
async function listarCodigos(req, res) {
  try {
    const user = req.user;
    if (!user || up(user.role) !== "ADMIN_GENERAL") {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const barrioRaw = String((req.query && req.query.barrio) || "").trim();
    if (!barrioRaw) return res.status(404).json({ message: "Recurso no disponible" });

    const docs = await Vivienda.find({
      barrio: barrioRaw,
      estado: { $ne: "BAJA" },
      codigo: { $nin: [null, ""] },
    })
      .select("codigo")
      .sort({ codigo: 1 })
      .lean();

    const codigos = (Array.isArray(docs) ? docs : [])
      .map((d) => String((d && d.codigo) || "").trim())
      .filter(Boolean);

    return res.json({ codigos });
  } catch (err) {
    console.error("[VIVIENDAS] Error listando codigos:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// PDF (ADMIN/ADMIN_GENERAL + INSPECTOR-LIKE SOLO SU BARRIO)
async function prepararExportViviendas(req, res) {
  const user = req.user;
  const role = up(user && user.role);
  const inspectorLike = isInspectorLike(user);

  if (!user || !(role === "ADMIN" || role === "ADMIN_GENERAL" || inspectorLike)) {
    res.status(404).json({ message: "Recurso no disponible" });
    return null;
  }

  const q = Object.assign({}, req.query || {});

  if (inspectorLike && !(role === "ADMIN" || role === "ADMIN_GENERAL")) {
    const barrioAsignado = safeStr(user && user.barrioAsignado);
    if (!barrioAsignado) {
      res.status(404).json({ message: "Recurso no disponible" });
      return null;
    }
    q.barrio = barrioAsignado;
  }

  const result = await listarViviendasFiltradas(q, user, { paginate: false });
  return { ...result, q, user };
}

async function generarPdf(req, res) {
  try {
    const exportData = await prepararExportViviendas(req, res);
    if (!exportData) return null;

    const { viviendas, meta, q } = exportData;

    const filtros = buildFiltrosResumen(q);

    const now = new Date();
    const safe = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const filename = `Sitio98_Viviendas_${safe}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // 🛡️ Hardening descargas
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");

    generateViviendasListadoPDF(res, {
      titulo: "Listado de Viviendas",
      fecha: now,
      filtros,
      orden: { sortBy: meta.sortBy, sortDir: meta.sortDir },
      viviendas,
    });
  } catch (err) {
    console.error("[VIVIENDAS] Error generando PDF:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

async function generarExcel(req, res) {
  try {
    const exportData = await prepararExportViviendas(req, res);
    if (!exportData) return null;

    const { viviendas, q, user } = exportData;
    const filtros = buildFiltrosResumen(q);
    const now = new Date();
    const safe = now.toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const filename = "viviendas_fiscales_" + safe + ".xlsx";
    const workbook = buildViviendasWorkbook({ viviendas, filtros, user, fecha: now });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error("[VIVIENDAS] Error generando Excel:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

module.exports = {
  listar,
  listarBarrios,
  listarCodigos,
  listarElegiblesAsignacion,
  generarPdf,
  generarExcel,
  cambiarEstado,
};
