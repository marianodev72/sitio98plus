// backend/controllers/viviendaController.js
// Controller PURO (sin Express Router)

const Vivienda = require("../models/vivienda");
const PDFDocument = require("pdfkit");

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

// Nombre de colección para $lookup (fallback seguro)
const MIS_DATOS_COLL = "misdatosdeclaradosupdates";
const FORM_SUBMISSIONS_COLL = "formsubmissions";

function up(v) {
  return String(v || "").toUpperCase().trim();
}

function safeStr(v) {
  return String(v || "").trim();
}

function hasPerm(user, perm) {
  const list = Array.isArray(user && user.permisos) ? user.permisos : [];
  const p = up(perm);
  return list.map((x) => up(x)).includes(p);
}

// ─────────────────────────────
// ✅ ANEXO 17 — dormitorios mínimos (aproximación institucional)
// Regla: 1 adulto + hijos se trata como pareja (adulto no comparte con menores)
// Nota: hijosUnknown se trata conservador (si no lo pasás, queda 0)
function dormitoriosMinimosANEXO17({ adultos = 0, hijosM = 0, hijosF = 0, hijosUnknown = 0 }) {
  const a0 = Number(adultos) || 0;
  const hm0 = Number(hijosM) || 0;
  const hf0 = Number(hijosF) || 0;
  const hu0 = Number(hijosUnknown) || 0;

  const hijos = hm0 + hf0 + hu0;

  // fail-closed
  if (a0 <= 0 && hijos <= 0) return 0;

  // normalización institucional:
  // 1 adulto + hijos => se trata como pareja
  const adultosNorm = a0 === 1 && hijos > 0 ? 2 : a0;

  // dormitorios para adultos:
  // - 1–2 adultos => 1 dormitorio
  // - 3–4 adultos => 2 dormitorios, etc.
  const aSafe = Math.max(1, Number(adultosNorm || 1));
  const dormAdultos = aSafe <= 2 ? 1 : Math.ceil(aSafe / 2);

  // sin hijos
  if (hijos === 0) return dormAdultos;

  // 1 hijo => +1
  if (hijos === 1) return dormAdultos + 1;

  // 2 hijos => unknown conservador: +2, distinto sexo: +2, mismo sexo: +1
  if (hijos === 2) {
    if (hu0 > 0) return dormAdultos + 2;
    const distintoSexo = hm0 > 0 && hf0 > 0;
    return dormAdultos + (distintoSexo ? 2 : 1);
  }

  // 3 hijos => +2
  if (hijos === 3) return dormAdultos + 2;

  // 4 hijos => unknown conservador: +3, 3 de un sexo: +3, 2 y 2: +2
  if (hijos === 4) {
    if (hu0 > 0) return dormAdultos + 3;
    const tresDeUnSexo = hm0 >= 3 || hf0 >= 3;
    return dormAdultos + (tresDeUnSexo ? 3 : 2);
  }

  // 5+ => base (adultos + 4 hijos) = dormAdultos + 2; cada 2 hijos extra suma 1 dormitorio
  const extra = Math.max(0, hijos - 4);
  const dormExtra = Math.ceil(extra / 2);
  return dormAdultos + 2 + dormExtra;
}

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
  const { codigo, barrio, estado, dormitorios, permisionario, personasMin, personasMax, sortBy, sortDir } = query;

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
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        { $project: { _id: 1, createdAt: 1, datosActualizados: 1, datos: 1, grupoFamiliar: 1 } },
      ],
      as: "misDatosUltimos",
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
      misDatosUltimo: { $arrayElemAt: ["$misDatosUltimos", 0] }, // objeto (o null)
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
    },
  });

  pipeline.push({
    $addFields: {
      _mdConvivientes: {
        $cond: ["$_mdTieneConvivientes", "$_mdConvivientesCandidatos", "$_a01Convivientes"],
      },
      _datosHabitantes: {
        $cond: ["$_mdTieneConvivientes", "$_mdDatos", "$_a01Datos"],
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

  // Dormitorios mínimos ANEXO 17 (en pipeline)
  pipeline.push({
    $addFields: {
      dormitoriosMinimos: {
        $let: {
          vars: {
            hijos: "$_mdHijosTotal",
            hm: "$_mdHijosM",
            hf: "$_mdHijosF",
            hu: "$_mdHijosUnknown",
            adultosRaw: "$_mdAdultosTotal",
          },
          in: {
            $let: {
              vars: {
                adultosNorm: {
                  $cond: [
                    { $and: [{ $eq: ["$$adultosRaw", 1] }, { $gt: ["$$hijos", 0] }] },
                    2,
                    "$$adultosRaw",
                  ],
                },
              },
              in: {
                $switch: {
                  branches: [
                    { case: { $and: [{ $eq: ["$$adultosNorm", 2] }, { $eq: ["$$hijos", 0] }] }, then: 1 },
                    {
                      case: {
                        $and: [{ $eq: ["$$adultosNorm", 2] }, { $lte: ["$$hijos", 2] }, { $gt: ["$$hijos", 0] }],
                      },
                      then: 2,
                    },
                    {
                      case: {
                        $and: [{ $eq: ["$$adultosNorm", 2] }, { $lte: ["$$hijos", 4] }, { $gt: ["$$hijos", 2] }],
                      },
                      then: 3,
                    },
                    {
                      case: {
                        $and: [{ $eq: ["$$adultosNorm", 2] }, { $lte: ["$$hijos", 6] }, { $gt: ["$$hijos", 4] }],
                      },
                      then: 4,
                    },

                    // Detalle por sexo de 2 y 4 hijos (conservador)
                    {
                      case: { $and: [{ $eq: ["$$adultosNorm", 2] }, { $eq: ["$$hijos", 2] }] },
                      then: {
                        $cond: [
                          { $gt: ["$$hu", 0] },
                          3,
                          { $cond: [{ $and: [{ $gt: ["$$hm", 0] }, { $gt: ["$$hf", 0] }] }, 3, 2] },
                        ],
                      },
                    },
                    {
                      case: { $and: [{ $eq: ["$$adultosNorm", 2] }, { $eq: ["$$hijos", 4] }] },
                      then: {
                        $cond: [
                          { $gt: ["$$hu", 0] },
                          4,
                          { $cond: [{ $or: [{ $gte: ["$$hm", 3] }, { $gte: ["$$hf", 3] }] }, 4, 3] },
                        ],
                      },
                    },
                  ],
                  default: {
                    // fallback razonable
                    $ceil: { $divide: [{ $add: ["$$adultosNorm", "$$hijos"] }, 2] },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Semáforo ANEXO 17 + porcentaje
  pipeline.push({
    $addFields: {
      hacinamientoColor: {
        $cond: [
          { $lt: ["$_dormitoriosNum", "$dormitoriosMinimos"] },
          "ROJO",
          { $cond: [{ $eq: ["$_dormitoriosNum", "$dormitoriosMinimos"] }, "AMARILLO", "VERDE"] },
        ],
      },
      hacinamientoPct: {
        $cond: [
          { $gt: ["$dormitoriosMinimos", 0] },
          { $round: [{ $multiply: [{ $divide: ["$_dormitoriosNum", "$dormitoriosMinimos"] }, 100] }, 0] },
          0,
        ],
      },
      // compatibilidad histórica
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

  // 8) Project final
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

      permisionario: {
        nombre: "$permisionarioDoc.nombre",
        apellido: "$permisionarioDoc.apellido",
        matricula: "$permisionarioDoc.matricula",
      },
    },
  });

  // 9) Sorting
  const sort = {};
  if (sortKey === "hacinamiento") sort.hacinamientoRatio = dir;
  else if (sortKey === "personas") sort.cantidadHabitantes = dir;
  else sort[sortKey] = dir;

  pipeline.push({ $sort: sort });

  return {
    pipeline,
    meta: { sortBy: sortKey, sortDir: dir === -1 ? "desc" : "asc" },
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
  const personasMin = clean(query.personasMin);
  const personasMax = clean(query.personasMax);

  if (codigo) out["Código"] = codigo;
  if (barrio) out["Barrio"] = barrio;
  if (estado) out["Estado"] = estado;
  if (dormitorios) out["Dormitorios"] = dormitorios;
  if (permisionario) out["Permisionario"] = permisionario;
  if (personasMin) out["Personas mín."] = personasMin;
  if (personasMax) out["Personas máx."] = personasMax;

  return out;
}

function isInspectorLike(user) {
  const role = up(user && user.role);
  return role === "INSPECTOR" || hasPerm(user, "INSPECTOR");
}

// ✅ PDF local (sin utils/pdf)
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
    const color = v && v.hacinamientoColor ? v.hacinamientoColor : "-";

    const p = (v && v.permisionario) || {};
    const permStr =
      p.apellido || p.nombre || p.matricula
        ? `${p.apellido || ""} ${p.nombre || ""}`.trim() + (p.matricula ? ` (Matr: ${p.matricula})` : "")
        : "—";

    doc.text(
      `${idx + 1}. ${codigo} | Barrio: ${barrio} | Estado: ${estado} | Dorm: ${dormitorios} | Personas: ${personas} | Hacin.: ${pctText} (${color}) | Ocupa: ${permStr}`
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

    const { pipeline } = buildViviendasPipeline(q);
    const viviendas = await Vivienda.aggregate(pipeline);

    return res.json({ viviendas });
  } catch (err) {
    console.error("[VIVIENDAS] Error listando:", err);
    return res.status(500).json({ message: "Error interno" });
  }
}

// ─────────────────────────────
// LISTAR ELEGIBLES PARA ASIGNACIÓN (ANEXO_02) — ADMIN_GENERAL
async function listarElegiblesAsignacion(req, res) {
  try {
    const user = req.user;
    const role = up(user && user.role);

    if (!user || role !== "ADMIN_GENERAL") return res.status(404).json({ message: "Recurso no disponible" });

    const viviendas = await Vivienda.find({
      estado: { $in: ["DISPONIBLE", "A_DESOCUPARSE"] },
    })
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
async function generarPdf(req, res) {
  try {
    const user = req.user;
    const role = up(user && user.role);
    const inspectorLike = isInspectorLike(user);

    if (!user || !(role === "ADMIN" || role === "ADMIN_GENERAL" || inspectorLike)) {
      return res.status(404).json({ message: "Recurso no disponible" });
    }

    const q = Object.assign({}, req.query || {});

    if (inspectorLike && !(role === "ADMIN" || role === "ADMIN_GENERAL")) {
      const barrioAsignado = safeStr(user && user.barrioAsignado);
      if (!barrioAsignado) return res.status(404).json({ message: "Recurso no disponible" });
      q.barrio = barrioAsignado;
    }

    const { pipeline, meta } = buildViviendasPipeline(q);
    const viviendas = await Vivienda.aggregate(pipeline);

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

module.exports = {
  listar,
  listarBarrios,
  listarCodigos,
  listarElegiblesAsignacion,
  generarPdf,
  cambiarEstado,
};
