// backend/controllers/formularioController.js
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const { FormTemplate } = require("../models/FormTemplate");
const { FormSubmission } = require("../models/FormSubmission");

let Vivienda;
try {
  Vivienda = require("../models/Vivienda");
} catch {
  try {
    Vivienda = require("../models/vivienda");
  } catch {
    Vivienda = require("../models/vivienda");
  }
}

let User = null;
try {
  ({ User } = require("../models/User"));
} catch {
  try {
    ({ User } = require("../models/user"));
  } catch {}
}

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));
const up = (v) => String(v || "").toUpperCase().trim();

function genericDenied(res) {
  return res
    .status(403)
    .json({ message: "La página solicitada no está disponible. Por favor, contacte al administrador." });
}

function badRequest(res) {
  return res.status(400).json({ message: "Datos inválidos" });
}

function canSeeSubmission(user, sub) {
  const role = up(user?.role);
  if (role === "ADMIN" || role === "ADMIN_GENERAL") return true;

  if (String(sub.usuario) === String(user?._id)) return true;

  const list = Array.isArray(sub.intervinientes) ? sub.intervinientes : [];
  if (list.some((x) => String(x.userId) === String(user?._id))) return true;

  // retrocompat “postulanteId” para ANEXO_02 (anexos viejos sin intervinientes)
  if (up(sub.codigo) === "ANEXO_02" && String(sub.datos?.postulanteId || "") === String(user?._id)) return true;

  return false;
}

function addIntervinienteUnique(list, userId, rol) {
  if (!isObjectId(userId)) return list;
  const uid = String(userId);
  const exists = list.some((x) => String(x.userId) === uid);
  if (!exists) list.push({ userId, rol: rol ? up(rol) : undefined });
  return list;
}

async function findUserByRolYBarrio(role, barrio) {
  if (!User) return null;
  const r = up(role);
  const b = String(barrio || "").trim();
  if (!b) return null;

  return User.findOne({
    role: r,
    barrioAsignado: b,
    activo: true,
    bloqueado: false,
    archivado: { $ne: true },
  }).select("_id role barrioAsignado nombre apellido");
}

async function autocompleteDatosAnexo02(datos) {
  // Completa SOLO si falta. No rompe contrato.
  if (!User) return datos;

  const postulanteId = datos?.postulanteId;
  if (!isObjectId(postulanteId)) return datos;

  const u = await User.findById(postulanteId).select("nombre apellido meta").lean();
  if (!u) return datos;

  const meta = u.meta || {};
  const apellidoNombresAuto = `${String(u.apellido || "").trim()} ${String(u.nombre || "").trim()}`.trim();

  // Solo completamos si faltan:
  if (!datos.apellidoNombres && apellidoNombresAuto) datos.apellidoNombres = apellidoNombresAuto;

  if (!datos.grado) datos.grado = String(meta.grado || meta.rango || "").trim();
  if (!datos.mrDestino) datos.mrDestino = String(meta.mrDestino || meta.destino || "").trim();

  return datos;
}

// ─────────────────────────────
// GET detalle por ID (intervinientes + admin)
async function getById(req, res) {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id).populate("usuario", "nombre apellido email role").lean();
    if (!anexo) return genericDenied(res);
    if (!canSeeSubmission(req.user, anexo)) return genericDenied(res);

    return res.json({ anexo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

// ─────────────────────────────
// ✅ NUEVO: Estado institucional (gestión ADMIN_GENERAL)
// Guarda:
// - anexo.estadoInstitucional
// - anexo.datos._historialInstitucional[] (para que el front lo muestre)
async function setEstadoInstitucional(req, res) {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return genericDenied(res);

    const user = req.user;
    const role = up(user?.role);
    if (role !== "ADMIN_GENERAL") return genericDenied(res);

    const estadoInstitucional = up(req.body?.estadoInstitucional || "");
    const motivo = String(req.body?.motivo || "").trim();

    // lista permitida (ajustable)
    const allowed = new Set(["EN_REVISION", "APROBADA", "NO_APROBADA"]);
    if (!allowed.has(estadoInstitucional)) return badRequest(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (!canSeeSubmission(user, anexo)) return genericDenied(res);

    // Sólo por ahora: habilitamos gestión institucional base para ANEXO_01
    if (up(anexo.codigo) !== "ANEXO_01") return genericDenied(res);

    anexo.estadoInstitucional = estadoInstitucional;

    anexo.datos = anexo.datos && typeof anexo.datos === "object" ? anexo.datos : {};
    const hist = Array.isArray(anexo.datos._historialInstitucional) ? anexo.datos._historialInstitucional : [];

    hist.push({
      fecha: new Date().toISOString(),
      estadoInstitucional,
      motivo: motivo || undefined,
      realizadoPor: String(user?._id || ""),
    });

    anexo.datos._historialInstitucional = hist;
    await anexo.save();

    return res.json({ anexo: anexo.toObject() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

// ─────────────────────────────
// PDF helpers
function t(v) {
  return v === null || v === undefined ? "" : String(v);
}
function safeDate(v) {
  const s = String(v || "").trim();
  return s ? s : ".";
}
function yn(v) {
  const s = up(v);
  if (s === "SI" || s === "SÍ" || s === "YES" || s === "TRUE") return "SI";
  if (s === "NO" || s === "FALSE") return "NO";
  return t(v);
}
function mbbrm(v) {
  const s = up(v);
  if (["MB", "B", "R", "M"].includes(s)) return s;
  return "";
}

function writeHeaderAnexo03(doc) {
  doc.font("Helvetica-Bold").fontSize(14).text("ACTA DE RECEPCIÓN DE VIVIENDA FISCAL", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(10).text("SITIO 98", { align: "center" });
  doc.moveDown(0.8);
}

function writeKeyValue(doc, label, value) {
  doc.font("Helvetica-Bold").text(label, { continued: true });
  doc.font("Helvetica").text(` ${value || "—"}`);
}

function writeBoxRow(doc, label, value, xLabel, xValue, y) {
  doc.fontSize(9).text(label, xLabel, y);
  doc.fontSize(9).text(value, xValue, y, { width: 60, align: "center" });
  doc.rect(xValue - 2, y - 2, 64, 14).stroke();
}

// ─────────────────────────────
// PDF ANEXO_03
function renderAnexo03Pdf(doc, anexo, vivienda) {
  const d = anexo.datos || {};

  writeHeaderAnexo03(doc);

  writeKeyValue(doc, "Permisionario:", t(d.permisionarioNombre || d.permisionario || d.postulanteNombre));
  writeKeyValue(doc, "Unidad Habitacional:", t(d.unidadHabitacional || vivienda?.codigo));
  writeKeyValue(doc, "Dirección:", t(d.direccion));
  writeKeyValue(doc, "Localidad:", t(d.localidad));
  writeKeyValue(doc, "Provincia:", t(d.provincia));
  writeKeyValue(doc, "Inspector:", t(d.inspectorNombre));
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").fontSize(11).text("Material");
  doc.moveDown(0.3);

  const material = d.material || {};
  const xLabel = 50;
  const xValue = 430;
  let y = doc.y;

  const matRows = [
    ["Llaves del edificio", yn(material.llavesEdificio)],
    ["Llaves de la vivienda", yn(material.llavesVivienda)],
    ["Llaves de la baulera", yn(material.llavesBaulera)],
    ["Llave de terraza", yn(material.llaveTerraza)],
    ["Llave de cochera", yn(material.llaveCochera)],
    ["Inventario de muebles", yn(material.inventarioMuebles)],
    ["Línea telefónica", yn(material.lineaTelefonica)],
  ];

  matRows.forEach(([lab, val]) => {
    writeBoxRow(doc, lab, val, xLabel, xValue, y);
    y += 16;
  });

  doc.y = y + 10;

  doc.font("Helvetica-Bold").fontSize(11).text("Documentación");
  doc.moveDown(0.3);

  const docu = d.documentacion || {};
  y = doc.y;

  const docRows = [
    ["Reglamento de viviendas fiscales", yn(docu.reglamentoViviendas)],
    ["Guía telefónica", yn(docu.guiaTelefonica)],
    ["Reglamento de copropiedad", yn(docu.reglamentoCopropiedad)],
  ];

  docRows.forEach(([lab, val]) => {
    writeBoxRow(doc, lab, val, xLabel, xValue, y);
    y += 16;
  });

  doc.y = y + 12;

  doc.font("Helvetica-Bold").fontSize(11).text("Lectura de medidores");
  doc.moveDown(0.3);

  const med = d.medidores || {};
  const mx = 50;
  const my = doc.y;

  doc.font("Helvetica").fontSize(9);
  doc.text(`Gas (m³): ${t(med.gas_m3) || "—"}`, mx, my);
  doc.text(`Agua (m³): ${t(med.agua_m3) || "—"}`, mx + 160, my);
  doc.text(`Luz (KWS): ${t(med.luz_kws) || "—"}`, mx + 320, my);
  doc.text(`Teléfono (pulsos): ${t(med.telefono_pulsos) || "—"}`, mx, my + 14);

  doc.moveDown(1.2);

  doc.font("Helvetica-Bold").fontSize(11).text("Estado de sistemas y elementos (MB / B / R / M)");
  doc.moveDown(0.3);

  const est = d.estadoSistemas || {};
  const items = [
    ["Agua", mbbrm(est.agua)],
    ["Cloacas", mbbrm(est.cloacas)],
    ["Electricidad", mbbrm(est.electricidad)],
    ["Gas", mbbrm(est.gas)],
    ["Pluviales", mbbrm(est.pluviales)],
    ["Teléfono", mbbrm(est.telefono)],
    ["Aberturas", mbbrm(est.aberturas)],
    ["Albañilería", mbbrm(est.albanileria)],
    ["Alfombras", mbbrm(est.alfombras)],
    ["Antena TV", mbbrm(est.antenaTv)],
    ["Calefactor/Estufa", mbbrm(est.calefactorEstufa)],
    ["Calefón/Termotanque", mbbrm(est.calefonTermotanque)],
    ["Carpintería", mbbrm(est.carpinteria)],
    ["Cerrajería", mbbrm(est.cerrajeria)],
    ["Cocina", mbbrm(est.cocina)],
    ["Desinfección", mbbrm(est.desinfeccion)],
    ["Herrajes", mbbrm(est.herrajes)],
    ["Limpieza", mbbrm(est.limpieza)],
    ["Lustrado", mbbrm(est.lustrado)],
    ["Parques/Jardines", mbbrm(est.parquesJardines)],
    ["Pintura", mbbrm(est.pintura)],
    ["Pisos", mbbrm(est.pisos)],
    ["Portero Eléctrico", mbbrm(est.porteroElectrico)],
    ["Sanitarios", mbbrm(est.sanitarios)],
    ["Vidrios", mbbrm(est.vidrios)],
    ["Estado General", mbbrm(est.estadoGeneral)],
  ];

  const startY = doc.y;
  const col1X = 50;
  const col2X = 320;
  const rowH = 14;

  items.forEach((it, idx) => {
    const [lab, val] = it;
    const isLeft = idx % 2 === 0;
    const x = isLeft ? col1X : col2X;
    const yrow = startY + Math.floor(idx / 2) * rowH;

    doc.font("Helvetica").fontSize(9).text(lab, x, yrow);
    doc.font("Helvetica").fontSize(9).text(val, x + 200, yrow, { width: 40, align: "center" });
    doc.rect(x + 196, yrow - 2, 48, 12).stroke();
  });

  doc.y = startY + Math.ceil(items.length / 2) * rowH + 10;

  doc.font("Helvetica-Bold").fontSize(11).text("Novedades");
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(9).text(t(d.novedadesTexto || ""), { width: 520, align: "left" });
  doc.moveDown(1);

  doc.font("Helvetica").fontSize(9).text(
    "El Permisionario recibe la vivienda en las condiciones indicadas precedentemente, comprometiéndose al cuidado y conservación de la misma.",
    { width: 520, align: "justify" }
  );
  doc.moveDown(0.8);

  const fecha = d.fechaFirma || new Date().toLocaleDateString();
  doc.text(`Lugar y fecha: ${t(d.lugarFirma) || "—"} - ${fecha}`);
  doc.moveDown(1);

  doc.text("Firma Inspector: ____________________________", 50);
  doc.text("Firma Permisionario: ________________________", 50, doc.y + 10);
}

// ─────────────────────────────
// PDF ANEXO_02
function renderAnexo02Pdf(doc, anexo, vivienda) {
  const d = anexo.datos || {};

  doc.font("Helvetica").fontSize(10).text("R.G-6-002 PÚBLICO");
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(12).text("ANEXO 02");
  doc.font("Helvetica-Bold").fontSize(12).text("ACTA DE ASIGNACIÓN DE VIVIENDA FISCAL DE LA ARMADA");
  doc.font("Helvetica").fontSize(10).text("(2.06., inc. 7.; 2.10., inc. 1. y 2.15., subinc. 2.1.)");
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(12).text("ARMADA ARGENTINA");
  doc.font("Helvetica-Bold").fontSize(12).text("ACTA DE ASIGNACIÓN DE VIVIENDA FISCAL DE LA ARMADA");
  doc.moveDown(0.8);

  doc.font("Helvetica").fontSize(10).text(
    "El ESTADO MAYOR GENERAL DE LA ARMADA, representado por la Dirección General del"
  );
  doc.font("Helvetica").fontSize(10).text(
    "Personal Naval, entrega, en carácter de permisionario, al:--------------------------------------------------------------"
  );

  const grado = t(d.grado);
  const apeNom = t(d.apellidoNombres);
  const destino = t(d.mrDestino);

  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").text("GRADO", 55, doc.y, { continued: true });
  doc.text("   ", { continued: true });
  doc.text("APELLIDO Y NOMBRES", { continued: true });
  doc.text("   ", { continued: true });
  doc.text("M.R. DESTINO");
  doc.font("Helvetica").text(`${grado}    ${apeNom}    ${destino}`);

  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(10).text(
    "la unidad habitacional propiedad de la ARMADA ARGENTINA, ubicada en:--------------------------------------"
  );

  const direccion = t(d.direccion);
  const tipoUnidad = t(d.tipoUnidad || "");
  const localidad = t(d.localidad || vivienda?.barrio || "");

  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").text("DIRECCIÓN", 55, doc.y, { continued: true });
  doc.text("   ", { continued: true });
  doc.text("CASA", { continued: true });
  doc.text("   ", { continued: true });
  doc.text("DEPARTAMENTO", { continued: true });
  doc.text("   ", { continued: true });
  doc.text("LOCALIDAD");
  doc.font("Helvetica").text(`${direccion}    ${tipoUnidad}    ${localidad}`);

  doc.moveDown(0.8);

  doc.font("Helvetica").fontSize(10).text(
    "Esta asignación se acuerda conforme a las normas, requisitos y condiciones que fija el “Reglamento"
  );
  doc.text(
    "de Viviendas Fiscales de la Armada”, que el permisionario declara conocer en todas sus partes, obligándose a"
  );
  doc.text(
    "cumplir con los requisitos y aceptando todas las condiciones allí establecidas. -------------------------------------"
  );

  doc.moveDown(0.4);
  doc.text(
    "El personal militar que se le asigne Vivienda Fiscal de uso particular, no percibirá la Compensación"
  );
  doc.text(
    "por Vivienda (Código 247).-------------------------------------------------------------------------------------------------"
  );

  doc.moveDown(0.4);
  doc.text(
    "Asimismo, queda aclarado que, de conformidad con las disposiciones orgánicas vigentes en la"
  );
  doc.text(
    "ARMADA ARGENTINA, que determinan el traslado periódico de su lugar de prestación de servicios, se lo"
  );
  doc.text(
    "considera personal con inestabilidad de residencia. Por consiguiente, la presente no constituye un Contrato"
  );
  doc.text(
    "de Locación regido por el Código Civil y leyes complementarias.----------------------------------------------------"
  );

  doc.moveDown(0.4);
  doc.text("Queda asimismo acordado que el derecho al uso de la vivienda es conferido con carácter precario y");
  doc.text("por sola circunstancia de prestar servicios en el destino arriba expresado, fijándose:");

  const fechaAsignacion = safeDate(d.fechaAsignacion);
  const fechaEntrega = safeDate(d.fechaEntrega);

  doc.moveDown(0.2);
  doc.text(`Fecha de Asignación: ${fechaAsignacion}`);
  doc.text(`Fecha de Entrega: ${fechaEntrega}`);
  doc.text("de no mediar circunstancias especiales que obliguen a su anticipación.----------------------------------------------");

  doc.moveDown(0.6);
  doc.text(
    "El permisionario recibe la vivienda en correcto estado de uso y conservación, constituyendo responsabilidad suya contribuir con material y mano de obra, como también controlar la ejecución de todos los"
  );
  doc.text(
    "trabajos que sean necesarios en ella, de modo tal que a la finalización de la autorización precaria para el uso"
  );
  doc.text(
    "la misma sea reintegrada en perfecto estado de funcionamiento y presentación. -----------------------------------"
  );

  doc.moveDown(0.8);

  doc.text("Lugar y fecha: ...................................................................................");
  doc.moveDown(1.2);

  doc.text("Permisionario o Representante", 55);
  doc.text("............................................................", 55);
  doc.text("Grado, Apellido y Nombres", 55);

  doc.moveDown(1.0);

  doc.text("Jefe Organismo Administrador", 330);
  doc.text("............................................................", 330);

  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(9).text("A-5", { align: "right" });
}

// ─────────────────────────────
// GET PDF
async function descargarPdf(req, res) {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return genericDenied(res);

    const anexo = await FormSubmission.findById(id).lean();
    if (!anexo) return genericDenied(res);
    if (!canSeeSubmission(req.user, anexo)) return genericDenied(res);

    const codigo = up(anexo.codigo);
    const vivienda = anexo.vivienda ? await Vivienda.findById(anexo.vivienda).lean() : null;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${codigo}_${id}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    if (codigo === "ANEXO_03") renderAnexo03Pdf(doc, anexo, vivienda);
    else if (codigo === "ANEXO_02") renderAnexo02Pdf(doc, anexo, vivienda);
    else doc.font("Helvetica").fontSize(12).text("Documento no disponible.");

    doc.end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── CREAR ANEXO ───────────── */
async function crearAnexo(req, res) {
  try {
    const codigo = up(req.params.codigo);
    const user = req.user;
    const userRole = up(user?.role);

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!datos || typeof datos !== "object") return badRequest(res);

    const template = await FormTemplate.findOne({ code: codigo, activo: true });
    if (!template) return genericDenied(res);

    // Reglas mínimas ANEXO_02
    if (codigo === "ANEXO_02") {
      if (!isObjectId(datos.anexo01Id)) return badRequest(res);
      if (!isObjectId(datos.postulanteId)) return badRequest(res);
      if (!isObjectId(datos.viviendaId)) return badRequest(res);

      datos = await autocompleteDatosAnexo02(datos);
    }

    // ANEXO_03
    if (codigo === "ANEXO_03") {
      if (userRole !== "INSPECTOR") return genericDenied(res);
      if (!isObjectId(datos.viviendaId)) return badRequest(res);

      const anexo02 = await FormSubmission.findOne({
        codigo: "ANEXO_02",
        estado: "CERRADO",
        "datos.viviendaId": datos.viviendaId,
      })
        .sort({ createdAt: -1 })
        .lean();

      if (!anexo02) return genericDenied(res);

      const v = await Vivienda.findById(datos.viviendaId).lean();
      if (!v?.barrio) return genericDenied(res);

      const barrioInspector = String(user.barrioAsignado || "").trim();
      if (!barrioInspector || barrioInspector !== String(v.barrio).trim()) return genericDenied(res);

      datos.derivadoDe = anexo02._id;
      if (anexo02?.datos?.postulanteId) datos.postulanteId = anexo02.datos.postulanteId;

      if (!datos.inspectorNombre) datos.inspectorNombre = `${user.apellido || ""} ${user.nombre || ""}`.trim();
    }

    // Adjuntos
    const adjuntos = [];
    (req.files || []).forEach((f) =>
      adjuntos.push({
        nombre: f.originalname,
        ruta: String(f.path || "").replace(/\\/g, "/"),
        tipo: f.mimetype,
        size: f.size,
      })
    );

    // Intervinientes mínimos
    const intervinientes = [];

    if (codigo === "ANEXO_02" && isObjectId(datos.postulanteId)) {
      addIntervinienteUnique(intervinientes, datos.postulanteId, "POSTULANTE");
    }

    if (codigo === "ANEXO_03") {
      addIntervinienteUnique(intervinientes, user._id, "INSPECTOR");
      if (isObjectId(datos.postulanteId)) addIntervinienteUnique(intervinientes, datos.postulanteId, "PERMISIONARIO");

      const v = await Vivienda.findById(datos.viviendaId).lean();
      const barrio = v?.barrio || null;
      if (barrio) {
        const jefe = await findUserByRolYBarrio("JEFE_DE_BARRIO", barrio);
        if (jefe?._id) addIntervinienteUnique(intervinientes, jefe._id, "JEFE_DE_BARRIO");
      }
    }

    const sub = await FormSubmission.create({
      template: template._id,
      codigo,
      usuario: user._id,
      datos,
      estado: "ENVIADO",
      adjuntos,
      vivienda: datos.viviendaId || undefined,
      alojamiento: datos.alojamientoId || undefined,
      intervinientes,
      derivadoDe: isObjectId(datos.derivadoDe) ? datos.derivadoDe : undefined,
    });

    return res.status(201).json({ anexo: sub });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── LISTAR POR CÓDIGO (ADMIN) ───────────── */
async function listarPorCodigo(req, res) {
  try {
    const codigo = up(req.params.codigo);
    const anexos = await FormSubmission.find({ codigo })
      .populate("usuario", "nombre apellido email role")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ anexos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── MIS ANEXOS ───────────── */
async function getMisAnexos(req, res) {
  try {
    const user = req.user;
    const codigo = req.query.codigo ? up(req.query.codigo) : null;

    const or = [{ usuario: user._id }, { "intervinientes.userId": user._id }];
    or.push({ codigo: "ANEXO_02", "datos.postulanteId": user._id }); // retrocompat

    const filtro = codigo ? { codigo, $or: or } : { $or: or };
    const anexos = await FormSubmission.find(filtro).sort({ createdAt: -1 }).lean();
    return res.json({ anexos });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── CONFORMIDAD POSTULANTE (ANEXO_02) ───────────── */
async function darConformidad(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_02") return genericDenied(res);
    if (String(anexo.datos?.postulanteId || "") !== String(user._id)) return genericDenied(res);

    if (["EN_REVISION", "CERRADO"].includes(anexo.estado)) return res.json({ anexo });

    anexo.conformidadPostulante = { ok: true, fecha: new Date(), usuario: user._id };
    anexo.cambiarEstado("EN_REVISION", user._id, "Conformidad postulante");
    await anexo.save();

    return res.json({ anexo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── CIERRE ADMIN GENERAL (ANEXO_02) ───────────── */
async function darConformidadAdmin(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_02") return genericDenied(res);

    if (!anexo.conformidadPostulante?.ok) return badRequest(res);
    if (anexo.estado !== "EN_REVISION") return badRequest(res);

    let datosIn = req.body?.datos ?? {};
    if (typeof datosIn === "string") {
      try {
        datosIn = JSON.parse(datosIn || "{}");
      } catch {
        return badRequest(res);
      }
    }
    anexo.datos = anexo.datos || {};
    if (typeof datosIn.fechaAsignacion === "string") anexo.datos.fechaAsignacion = datosIn.fechaAsignacion.trim();
    if (typeof datosIn.fechaEntrega === "string") anexo.datos.fechaEntrega = datosIn.fechaEntrega.trim();

    anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL");
    anexo.datos.conformidadAdminGeneral = { ok: true, fecha: new Date(), usuario: user._id };

    let barrioVivienda = null;
    if (Vivienda && isObjectId(anexo.datos.viviendaId)) {
      const v = await Vivienda.findById(anexo.datos.viviendaId);
      if (v) {
        barrioVivienda = v.barrio || null;
        if (v.estado === "DISPONIBLE") {
          v.estado = "RESERVADA";
          await v.save();
        }
      }
    }

    if (User && isObjectId(anexo.datos.postulanteId)) {
      await User.updateOne(
        { _id: anexo.datos.postulanteId },
        { $set: { role: "PERMISIONARIO", estadoHabitacional: "PERMISIONARIO_EN_ESPERA" } }
      );
    }

    const iv = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];
    addIntervinienteUnique(iv, anexo.datos.postulanteId, "POSTULANTE");

    if (barrioVivienda) {
      const inspector = await findUserByRolYBarrio("INSPECTOR", barrioVivienda);
      if (inspector?._id) addIntervinienteUnique(iv, inspector._id, "INSPECTOR");

      const jefe = await findUserByRolYBarrio("JEFE_DE_BARRIO", barrioVivienda);
      if (jefe?._id) addIntervinienteUnique(iv, jefe._id, "JEFE_DE_BARRIO");
    }

    anexo.intervinientes = iv;
    await anexo.save();

    return res.json({ anexo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── ANEXO_03: ACTUALIZAR DATOS (SOLO INSPECTOR, ENVIADO) ───────────── */
function isInspectorInterviniente(anexo, userId) {
  const list = Array.isArray(anexo.intervinientes) ? anexo.intervinientes : [];
  return list.some((x) => String(x.userId) === String(userId) && up(x.rol) === "INSPECTOR");
}

function sanitizeDatosAnexo03(prevDatos, nextDatos) {
  const prev = prevDatos && typeof prevDatos === "object" ? prevDatos : {};
  const next = nextDatos && typeof nextDatos === "object" ? nextDatos : {};

  const locked = {
    viviendaId: prev.viviendaId,
    alojamientoId: prev.alojamientoId,
    postulanteId: prev.postulanteId,
    derivadoDe: prev.derivadoDe,
    inspectorNombre: prev.inspectorNombre,
  };

  const cleaned = { ...next };
  Object.keys(cleaned).forEach((k) => {
    const kk = up(k);
    if (kk.startsWith("CONFORMIDAD")) delete cleaned[k];
  });

  return { ...prev, ...cleaned, ...locked };
}

async function updateDatosAnexo03(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const role = up(user?.role);

    if (!isObjectId(id)) return genericDenied(res);
    if (role !== "INSPECTOR") return genericDenied(res);

    let datos = req.body?.datos ?? req.body;
    if (typeof datos === "string") {
      try {
        datos = JSON.parse(datos || "{}");
      } catch {
        return badRequest(res);
      }
    }
    if (!datos || typeof datos !== "object") return badRequest(res);

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_03") return genericDenied(res);
    if (up(anexo.estado) !== "ENVIADO") return genericDenied(res);
    if (!isInspectorInterviniente(anexo, user._id)) return genericDenied(res);

    anexo.datos = sanitizeDatosAnexo03(anexo.datos || {}, datos);
    await anexo.save();

    return res.json({ anexo: anexo.toObject() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── ANEXO_03: CONFORMIDAD PERMISIONARIO ───────────── */
async function darConformidadPermisionario03(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_03") return genericDenied(res);

    if (String(anexo.datos?.postulanteId || "") !== String(user._id)) return genericDenied(res);
    if (["EN_REVISION", "CERRADO"].includes(anexo.estado)) return res.json({ anexo });

    anexo.datos = anexo.datos || {};
    anexo.datos.conformidadPermisionario = { ok: true, fecha: new Date(), usuario: user._id };
    anexo.cambiarEstado("EN_REVISION", user._id, "Conformidad permisionario");
    await anexo.save();

    return res.json({ anexo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

/* ───────────── ANEXO_03: CIERRE ADMIN_GENERAL ───────────── */
async function cerrarAnexo03AdminGeneral(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const anexo = await FormSubmission.findById(id);
    if (!anexo) return genericDenied(res);
    if (up(anexo.codigo) !== "ANEXO_03") return genericDenied(res);

    if (!anexo.datos?.conformidadPermisionario?.ok) return badRequest(res);
    if (anexo.estado !== "EN_REVISION") return badRequest(res);

    anexo.cambiarEstado("CERRADO", user._id, "Cierre ADMIN_GENERAL (ANEXO_03)");
    anexo.datos = anexo.datos || {};
    anexo.datos.conformidadAdminGeneral = { ok: true, fecha: new Date(), usuario: user._id };

    if (Vivienda && isObjectId(anexo.datos.viviendaId)) {
      const v = await Vivienda.findById(anexo.datos.viviendaId);
      if (v) {
        if (v.estado === "RESERVADA") v.estado = "OCUPADA";

        const permisionarioId = anexo.datos.postulanteId;
        if (isObjectId(permisionarioId)) {
          v.ocupacionActual = {
            permisionario: permisionarioId,
            fechaAsignacion: new Date(),
            observacion: "Ocupación materializada por ANEXO_03",
          };
        }

        await v.save();
      }
    }

    await anexo.save();
    return res.json({ anexo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
}

module.exports = {
  // base
  crearAnexo,
  listarPorCodigo,
  getMisAnexos,
  getById,
  descargarPdf,

  // ✅ gestión institucional
  setEstadoInstitucional,

  // ANEXO_02
  darConformidad,
  darConformidadAdmin,

  // ANEXO_03
  updateDatosAnexo03,
  darConformidadPermisionario03,
  cerrarAnexo03AdminGeneral,
};
