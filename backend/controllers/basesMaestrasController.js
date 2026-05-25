const crypto = require("crypto");
const mongoose = require("mongoose");

const { MasterImportJob } = require("../models/MasterImportJob");
const { buildApplyPlan, buildApplyPlanSummary } = require("../services/basesMaestras/applyPlanService");
const { dryRunPersonal, dryRunViviendas } = require("../services/basesMaestras/dryRunService");

const JOB_TTL_HOURS = 24;

function deny(res) {
  return res.status(404).json({ message: "Recurso no disponible" });
}

function isAdminGeneral(req) {
  return String(req.user?.role || "").toUpperCase().trim() === "ADMIN_GENERAL";
}

function getFileBuffer(req) {
  if (!req.file?.buffer) {
    const err = new Error("Archivo Excel requerido");
    err.status = 400;
    throw err;
  }
  return req.file.buffer;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getExpiresAt() {
  return new Date(Date.now() + JOB_TTL_HOURS * 60 * 60 * 1000);
}

function assertValidObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
    const err = new Error("Identificador invalido");
    err.status = 400;
    throw err;
  }
}

function buildDiff(result) {
  return {
    nuevos: Array.isArray(result.nuevos) ? result.nuevos : [],
    actualizados: Array.isArray(result.actualizados) ? result.actualizados : [],
    sinCambios: Array.isArray(result.sinCambios) ? result.sinCambios : [],
  };
}

function jobListItem(job) {
  return {
    jobId: String(job._id),
    tipo: job.tipo,
    estado: job.estado,
    archivoOriginalNombre: job.archivoOriginalNombre || "",
    archivoSha256: job.archivoSha256 || "",
    mime: job.mime || "",
    size: job.size || 0,
    resumen: job.dryRunSummary || {},
    warningsCount: Array.isArray(job.warnings) ? job.warnings.length : 0,
    erroresCount: Array.isArray(job.errors) ? job.errors.length : 0,
    expiresAt: job.expiresAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function jobDetail(job) {
  return {
    ...jobListItem(job),
    warnings: Array.isArray(job.warnings) ? job.warnings : [],
    errores: Array.isArray(job.errors) ? job.errors : [],
    diff: job.diff || {},
  };
}

async function persistDryRunJob(req, tipo, result) {
  const buffer = getFileBuffer(req);
  const file = req.file || {};
  const archivoSha256 = sha256(buffer);
  const job = await MasterImportJob.create({
    tipo,
    estado: "PENDIENTE_CONFIRMACION",
    archivoOriginalNombre: String(file.originalname || ""),
    archivoSha256,
    mime: String(file.mimetype || ""),
    size: Number(file.size || buffer.length || 0),
    creadoPor: req.user._id,
    dryRunSummary: { ...(result.summary || {}), sha256: archivoSha256 },
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    errors: Array.isArray(result.errores) ? result.errores : [],
    diff: buildDiff(result),
    expiresAt: getExpiresAt(),
  });

  if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
  if (req.audit?.addMeta) {
    req.audit.addMeta({
      tipo,
      estado: job.estado,
      archivoSha256,
      size: job.size,
      summary: job.dryRunSummary,
    });
  }

  return job;
}

async function runPersistedDryRun(req, res, tipo, runner) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const result = await runner(getFileBuffer(req));
    const job = await persistDryRunJob(req, tipo, result);
    return res.json({
      ok: true,
      jobId: String(job._id),
      resumen: job.dryRunSummary,
      summary: job.dryRunSummary,
      nuevos: result.nuevos || [],
      actualizados: result.actualizados || [],
      sinCambios: result.sinCambios || [],
      warnings: job.warnings,
      errores: job.errors,
    });
  } catch (err) {
    const status = err.status || (err.code === "XLSX_INVALIDO" ? 400 : 500);
    if (status >= 500) console.error(`[bases-maestras] ${tipo} dry-run error:`, err);
    return res.status(status).json({
      ok: false,
      summary: {
        tipoBase: tipo,
        dryRun: true,
        totalFilas: 0,
        validas: 0,
        invalidas: 1,
        nuevos: 0,
        actualizados: 0,
        sinCambios: 0,
        warnings: 0,
        errores: 1,
      },
      nuevos: [],
      actualizados: [],
      sinCambios: [],
      warnings: [],
      errores: [{ message: err.message || "Error interno" }],
    });
  }
}

async function personalDryRun(req, res) {
  return runPersistedDryRun(req, res, "PERSONAL", dryRunPersonal);
}

async function viviendasDryRun(req, res) {
  return runPersistedDryRun(req, res, "VIVIENDAS", dryRunViviendas);
}

async function listJobs(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const filter = {};

    const tipo = String(req.query.tipo || "").toUpperCase().trim();
    const estado = String(req.query.estado || "").toUpperCase().trim();
    if (tipo) filter.tipo = tipo;
    if (estado) filter.estado = estado;

    const [total, jobs] = await Promise.all([
      MasterImportJob.countDocuments(filter),
      MasterImportJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    if (req.audit?.addMeta) req.audit.addMeta({ page, limit, total, tipo, estado });
    return res.json({ ok: true, page, limit, total, items: jobs.map(jobListItem) });
  } catch (err) {
    console.error("[bases-maestras] list jobs error:", err);
    return res.status(err.status || 500).json({ ok: false, errores: [{ message: err.message || "Error interno" }] });
  }
}

async function getJob(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    assertValidObjectId(req.params.id);
    const job = await MasterImportJob.findById(req.params.id).lean();
    if (!job) return deny(res);
    if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
    if (req.audit?.addMeta) req.audit.addMeta({ tipo: job.tipo, estado: job.estado });
    return res.json({ ok: true, job: jobDetail(job) });
  } catch (err) {
    console.error("[bases-maestras] get job error:", err);
    return res.status(err.status || 500).json({ ok: false, errores: [{ message: err.message || "Error interno" }] });
  }
}

async function cancelJob(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    assertValidObjectId(req.params.id);
    const job = await MasterImportJob.findOneAndUpdate(
      { _id: req.params.id, estado: "PENDIENTE_CONFIRMACION" },
      { $set: { estado: "CANCELADO" } },
      { new: true }
    ).lean();

    if (!job) {
      return res.status(409).json({
        ok: false,
        errores: [{ message: "Job inexistente o no cancelable" }],
      });
    }

    if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
    if (req.audit?.addMeta) req.audit.addMeta({ tipo: job.tipo, estado: job.estado });
    return res.json({ ok: true, job: jobListItem(job) });
  } catch (err) {
    console.error("[bases-maestras] cancel job error:", err);
    return res.status(err.status || 500).json({ ok: false, errores: [{ message: err.message || "Error interno" }] });
  }
}

async function getApplyPlan(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    assertValidObjectId(req.params.id);
    const job = await MasterImportJob.findById(req.params.id).lean();
    if (!job) return deny(res);
    if (job.estado !== "PENDIENTE_CONFIRMACION") {
      return res.status(409).json({ ok: false, errores: [{ message: "Job no esta pendiente de confirmacion" }] });
    }
    if (Array.isArray(job.errors) && job.errors.length > 0) {
      return res.status(409).json({ ok: false, errores: [{ message: "Job contiene errores de dry-run" }] });
    }

    let generated = false;
    let sourceJob = job;
    let applyPlan = job.applyPlan || null;
    let applyPlanSummary = job.applyPlanSummary || null;

    if (!applyPlan) {
      applyPlan = buildApplyPlan(job);
      applyPlanSummary = buildApplyPlanSummary(applyPlan);
      const updated = await MasterImportJob.findOneAndUpdate(
        {
          _id: job._id,
          estado: "PENDIENTE_CONFIRMACION",
          $or: [{ applyPlan: { $exists: false } }, { applyPlan: null }],
        },
        {
          $set: {
            applyPlan,
            applyPlanSummary,
            applyPlanGeneratedAt: new Date(),
            applyPlanGeneratedBy: req.user._id,
          },
        },
        { new: true }
      ).lean();

      if (updated) {
        generated = true;
        sourceJob = updated;
      } else {
        sourceJob = await MasterImportJob.findById(req.params.id).lean();
        if (!sourceJob?.applyPlan) {
          return res.status(409).json({ ok: false, errores: [{ message: "No se pudo congelar apply-plan" }] });
        }
        applyPlan = sourceJob.applyPlan;
        applyPlanSummary = sourceJob.applyPlanSummary || buildApplyPlanSummary(applyPlan);
      }
    }

    if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(sourceJob._id));
    if (req.audit?.addMeta) {
      req.audit.addMeta({
        tipo: sourceJob.tipo,
        estado: sourceJob.estado,
        generated,
        summary: applyPlanSummary,
      });
    }

    return res.json({
      ok: true,
      jobId: String(sourceJob._id),
      tipo: sourceJob.tipo,
      estado: sourceJob.estado,
      generated,
      applyPlanSummary,
      applyPlanGeneratedAt: sourceJob.applyPlanGeneratedAt || null,
      applyPlan,
    });
  } catch (err) {
    console.error("[bases-maestras] apply plan error:", err);
    return res.status(err.status || 500).json({ ok: false, errores: [{ message: err.message || "Error interno" }] });
  }
}

module.exports = {
  personalDryRun,
  viviendasDryRun,
  listJobs,
  getJob,
  cancelJob,
  getApplyPlan,
};
