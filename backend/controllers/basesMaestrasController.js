const crypto = require("crypto");
const mongoose = require("mongoose");

const { MasterImportJob, MODOS_CARGA } = require("../models/MasterImportJob");
const { writeStagedPadronAtomic } = require("../services/padronPersonal/padronPersonalLocalStore");
const { executeApply } = require("../services/basesMaestras/applyService");
const {
  buildApplyPlan,
  buildApplyPlanSummary,
  EXCLUDABLE_PERSONAL_BLOCK_CODES,
} = require("../services/basesMaestras/applyPlanService");
const { dryRunPersonal, dryRunViviendas, dryRunAlojamientos } = require("../services/basesMaestras/dryRunService");

const JOB_TTL_HOURS = 24;
const MAX_APPLY_PLAN_PERSIST_BYTES = Number(process.env.BASES_MAESTRAS_MAX_APPLY_PLAN_BYTES || 12 * 1024 * 1024);
const MODOS_CARGA_SET = new Set(MODOS_CARGA);
const MODO_CARGA_LEGACY = "SIN_MODO";

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

function normalizeModoCarga(value) {
  return String(value || "").toUpperCase().trim();
}

function parseModoCarga(req) {
  const modoCarga = normalizeModoCarga(req.body?.modoCarga || req.query?.modoCarga);
  if (!modoCarga || !MODOS_CARGA_SET.has(modoCarga)) {
    const err = new Error(`modoCarga obligatorio. Valores permitidos: ${MODOS_CARGA.join(", ")}`);
    err.status = 400;
    throw err;
  }
  return modoCarga;
}

function modoCargaForDisplay(job) {
  return normalizeModoCarga(job?.modoCarga) || MODO_CARGA_LEGACY;
}

function assertJobModoCargaAplicable(job) {
  if (MODOS_CARGA_SET.has(normalizeModoCarga(job?.modoCarga))) return;
  const err = new Error("Job sin modoCarga valido. Requiere revision y nuevo dry-run con modo de carga explicito.");
  err.status = 409;
  throw err;
}

function jsonSizeBytes(value) {
  return Buffer.byteLength(JSON.stringify(value || {}), "utf8");
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
    alojamientos: result.alojamientos && typeof result.alojamientos === "object" ? result.alojamientos : undefined,
  };
}

function padronPersonalRowsFromDryRunResult(result) {
  return [
    ...(Array.isArray(result.nuevos) ? result.nuevos : []),
    ...(Array.isArray(result.actualizados) ? result.actualizados : []),
    ...(Array.isArray(result.sinCambios) ? result.sinCambios : []),
    ...(Array.isArray(result.omitidosNoRegistrados) ? result.omitidosNoRegistrados : []),
  ];
}

function jobListItem(job) {
  return {
    jobId: String(job._id),
    tipo: job.tipo,
    modoCarga: modoCargaForDisplay(job),
    modoCargaLegacy: !normalizeModoCarga(job.modoCarga),
    estado: job.estado,
    archivoOriginalNombre: job.archivoOriginalNombre || "",
    archivoSha256: job.archivoSha256 || "",
    mime: job.mime || "",
    size: job.size || 0,
    resumen: job.dryRunSummary || {},
    warningsCount: Number(job.warningsCount ?? (Array.isArray(job.warnings) ? job.warnings.length : 0)),
    erroresCount: Number(job.erroresCount ?? job.errorsCount ?? (Array.isArray(job.errors) ? job.errors.length : 0)),
    appliedAt: job.appliedAt || null,
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
    applyPlan: job.applyPlan || null,
    applyPlanSummary: job.applyPlanSummary || null,
    applyPlanGeneratedAt: job.applyPlanGeneratedAt || null,
    applyPlanGeneratedBy: job.applyPlanGeneratedBy || null,
    applyProgress: job.applyProgress || null,
    applyResult: job.applyResult || null,
    appliedAt: job.appliedAt || null,
    appliedBy: job.appliedBy ? String(job.appliedBy) : null,
    manualApprovals: (Array.isArray(job.manualApprovals) ? job.manualApprovals : []).map((approval) => ({
      tipo: approval.tipo,
      key: approval.key,
      approved: Boolean(approval.approved),
      motivo: approval.motivo,
      approvedBy: approval.approvedBy ? String(approval.approvedBy) : null,
      approvedAt: approval.approvedAt,
    })),
    exclusions: (Array.isArray(job.exclusions) ? job.exclusions : []).map((exclusion) => ({
      tipo: exclusion.tipo,
      code: exclusion.code,
      key: exclusion.key,
      rowIndex: exclusion.rowIndex ?? null,
      matricula: exclusion.matricula || "",
      dni: exclusion.dni || "",
      userId: exclusion.userId || "",
      motivo: exclusion.motivo || "",
      createdBy: exclusion.createdBy ? String(exclusion.createdBy) : null,
      createdAt: exclusion.createdAt || null,
      revokedAt: exclusion.revokedAt || null,
    })),
  };
}

function isPersonalLargeApplyJob(job) {
  return job?.tipo === "PERSONAL" && Boolean(job?.applyPlan?.isLargePlan);
}

function applyProgressFromResult(result = {}, status = "RUNNING") {
  return {
    status,
    startedAt: result.startedAt || new Date(),
    finishedAt: result.finishedAt || null,
    totalCreates: Number(result.totalCreates || 0),
    totalUpdates: Number(result.totalUpdates || 0),
    processedCreates: Number(result.processedCreates || 0),
    processedUpdates: Number(result.processedUpdates || 0),
    created: Number(result.createsApplied || 0),
    updated: Number(result.updatesApplied || 0),
    skipped: Number(result.skipped || 0),
    excluded: Number(result.excluded || 0),
    errors: Array.isArray(result.errors) ? result.errors.slice(0, 20) : [],
    batchSize: Number(result.batchSize || 0),
    batchCount: Number(result.batchCount || 0),
    lastBatchAt: new Date(),
  };
}

function normalizeApprovalTipo(value) {
  return String(value || "").toUpperCase().trim();
}

function normalizeApprovalKey(value) {
  return String(value || "").trim();
}

function normalizeExclusionCode(value) {
  return String(value || "").toUpperCase().trim();
}

function approvalMatches(item, tipo, key) {
  return normalizeApprovalTipo(item?.tipo) === tipo && normalizeApprovalKey(item?.key) === key;
}

function findApprovalTarget(job, tipo, key) {
  const plan = job.applyPlan || {};
  const risk = (Array.isArray(plan.risks) ? plan.risks : []).find((item) => approvalMatches(item, tipo, key));
  if (risk) return { source: "risks", item: risk };
  const manualReview = (Array.isArray(plan.requiresManualReview) ? plan.requiresManualReview : []).find((item) =>
    approvalMatches(item, tipo, key)
  );
  if (manualReview) return { source: "requiresManualReview", item: manualReview };
  return null;
}

function activeExclusionExists(job, code, key) {
  return (Array.isArray(job.exclusions) ? job.exclusions : []).some(
    (exclusion) =>
      !exclusion.revokedAt &&
      normalizeExclusionCode(exclusion.code || exclusion.tipo) === code &&
      normalizeApprovalKey(exclusion.key) === key
  );
}

function findBlockedTarget(job, code, key) {
  const plan = buildApplyPlan({ ...job, exclusions: [] }, { full: true });
  return (Array.isArray(plan.blocked) ? plan.blocked : []).find(
    (item) => normalizeExclusionCode(item.code || item.reason || item.tipo) === code && normalizeApprovalKey(item.key) === key
  );
}

async function persistDryRunJob(req, tipo, result) {
  const buffer = getFileBuffer(req);
  const file = req.file || {};
  const archivoSha256 = sha256(buffer);
  const modoCarga = parseModoCarga(req);
  const job = await MasterImportJob.create({
    tipo,
    modoCarga,
    estado: "PENDIENTE_CONFIRMACION",
    archivoOriginalNombre: String(file.originalname || ""),
    archivoSha256,
    mime: String(file.mimetype || ""),
    size: Number(file.size || buffer.length || 0),
    creadoPor: req.user._id,
    dryRunSummary: { ...(result.summary || {}), modoCarga, sha256: archivoSha256 },
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    errors: Array.isArray(result.errores) ? result.errores : [],
    diff: buildDiff(result),
    expiresAt: getExpiresAt(),
  });

  if (tipo === "PERSONAL" && process.env.PADRON_PERSONAL_HMAC_SECRET) {
    const staged = writeStagedPadronAtomic({
      sourceJobId: String(job._id),
      records: padronPersonalRowsFromDryRunResult(result),
      metadata: {
        source: {
          tipo: "BASE_MAESTRA_PERSONAL",
          modoCarga,
          sourceJobId: String(job._id),
          sourceSha256: archivoSha256,
          archivo: String(file.originalname || ""),
        },
      },
    });
    job.dryRunSummary = {
      ...(job.dryRunSummary || {}),
      padronPersonalLocal: {
        staged: true,
        records: staged.count,
        generatedAt: staged.generatedAt,
        fingerprint: staged.fingerprint,
      },
    };
    await job.save();
  }

  if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
  if (req.audit?.addMeta) {
    req.audit.addMeta({
      tipo,
      modoCarga,
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
    const modoCarga = parseModoCarga(req);
    const result = await runner(getFileBuffer(req), { modoCarga });
    const job = await persistDryRunJob(req, tipo, result);
    return res.json({
      ok: true,
      jobId: String(job._id),
      modoCarga: job.modoCarga,
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

async function alojamientosDryRun(req, res) {
  return runPersistedDryRun(req, res, "ALOJAMIENTOS", dryRunAlojamientos);
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

    const jobsPipeline = [
      { $match: filter },
      {
        $project: {
          tipo: 1,
          modoCarga: 1,
          estado: 1,
          archivoOriginalNombre: 1,
          archivoSha256: 1,
          mime: 1,
          size: 1,
          dryRunSummary: 1,
          warningsCount: { $size: { $ifNull: ["$warnings", []] } },
          erroresCount: { $size: { $ifNull: ["$errors", []] } },
          appliedAt: 1,
          expiresAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const [total, jobs] = await Promise.all([
      MasterImportJob.countDocuments(filter),
      MasterImportJob.aggregate(jobsPipeline).allowDiskUse(true),
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
      const persistPayload = { applyPlan, applyPlanSummary };
      const persistBytes = jsonSizeBytes(persistPayload);
      if (persistBytes > MAX_APPLY_PLAN_PERSIST_BYTES) {
        return res.status(413).json({
          ok: false,
          errores: [
            {
              message: "El plan de aplicacion excede el tamano maximo persistible. Divida el archivo o reduzca el volumen del plan.",
              bytes: persistBytes,
              maxBytes: MAX_APPLY_PLAN_PERSIST_BYTES,
            },
          ],
        });
      }
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
        modoCarga: modoCargaForDisplay(sourceJob),
        estado: sourceJob.estado,
        generated,
        summary: applyPlanSummary,
      });
    }

    return res.json({
      ok: true,
      jobId: String(sourceJob._id),
      tipo: sourceJob.tipo,
      modoCarga: modoCargaForDisplay(sourceJob),
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

async function applyJob(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    assertValidObjectId(req.params.id);
    const job = await MasterImportJob.findById(req.params.id).lean();
    if (!job) return deny(res);
    assertJobModoCargaAplicable(job);
    const actorId = req.user._id;

    if (isPersonalLargeApplyJob(job)) {
      if (!["PENDIENTE_CONFIRMACION", "FALLIDO"].includes(job.estado)) {
        return res.status(409).json({ ok: false, errores: [{ message: "Job no esta disponible para apply masivo" }] });
      }

      const startedAt = new Date();
      const initialProgress = applyProgressFromResult(
        {
          startedAt,
          totalCreates: Number(job.applyPlan?.totalCreates || 0),
          totalUpdates: Number(job.applyPlan?.totalUpdates || 0),
          excluded: Number(job.applyPlan?.totalExcluded || 0),
          batchSize: Number(process.env.BASES_MAESTRAS_PERSONAL_BATCH_SIZE || 250),
        },
        "RUNNING"
      );

      const running = await MasterImportJob.findOneAndUpdate(
        { _id: job._id, estado: { $in: ["PENDIENTE_CONFIRMACION", "FALLIDO"] } },
        {
          $set: {
            estado: "APLICANDO",
            appliedBy: actorId,
            applyResult: null,
            applyProgress: initialProgress,
          },
        },
        { new: true }
      ).lean();

      if (!running) {
        return res.status(409).json({ ok: false, errores: [{ message: "No se pudo iniciar apply masivo" }] });
      }

      const jobForApply = { ...job, estado: "PENDIENTE_CONFIRMACION" };
      setImmediate(() => {
        executeApply({
          job: jobForApply,
          actorId,
          updateProgress: async (progress) => {
            await MasterImportJob.updateOne(
              { _id: job._id, estado: "APLICANDO" },
              { $set: { applyProgress: applyProgressFromResult(progress, "RUNNING") } }
            );
          },
          markApplied: async (applyResult) => {
            await MasterImportJob.findOneAndUpdate(
              { _id: job._id, estado: "APLICANDO" },
              {
                $set: {
                  estado: "APLICADO",
                  appliedAt: new Date(),
                  appliedBy: actorId,
                  applyResult,
                  applyProgress: applyProgressFromResult(applyResult, "COMPLETED"),
                },
              }
            );
          },
          markFailed: async (applyResult) => {
            await MasterImportJob.findOneAndUpdate(
              { _id: job._id, estado: "APLICANDO" },
              {
                $set: {
                  estado: "FALLIDO",
                  appliedBy: actorId,
                  applyResult,
                  applyProgress: applyProgressFromResult(applyResult, "FAILED"),
                },
              }
            );
          },
        }).catch((err) => {
          console.error("[bases-maestras] async personal apply error:", err);
        });
      });

      if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
      if (req.audit?.addMeta) {
        req.audit.addMeta({
          async: true,
          totalCreates: initialProgress.totalCreates,
          totalUpdates: initialProgress.totalUpdates,
          excluded: initialProgress.excluded,
        });
      }

      return res.status(202).json({
        ok: true,
        jobId: String(job._id),
        estado: "APLICANDO",
        applyProgress: initialProgress,
      });
    }

    const result = await executeApply({
      job,
      actorId,
      markApplied: async (applyResult, session) => {
        const applied = await MasterImportJob.findOneAndUpdate(
          { _id: job._id, estado: "PENDIENTE_CONFIRMACION" },
          {
            $set: {
              estado: "APLICADO",
              appliedAt: new Date(),
              appliedBy: actorId,
              applyResult,
            },
          },
          { new: true, session }
        );
        if (!applied) {
          const err = new Error("Job ya no esta pendiente de confirmacion");
          err.status = 409;
          throw err;
        }
      },
      markFailed: async (applyResult, session = null) => {
        await MasterImportJob.findOneAndUpdate(
          { _id: job._id, estado: "PENDIENTE_CONFIRMACION" },
          {
            $set: {
              estado: "FALLIDO",
              appliedBy: actorId,
              applyResult,
            },
          },
          session ? { session } : {}
        );
      },
    });

    if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
    if (req.audit?.addMeta) {
      req.audit.addMeta({
        createsApplied: result.createsApplied,
        updatesApplied: result.updatesApplied,
        blocked: result.blocked,
        skipped: result.skipped,
        errors: result.errors.length,
      });
    }

    return res.json({ ok: true, jobId: String(job._id), estado: "APLICADO", applyResult: result });
  } catch (err) {
    console.error("[bases-maestras] apply job error:", err);
    return res.status(err.status || 500).json({
      ok: false,
      applyResult: err.applyResult || null,
      errores: [{ message: err.message || "Error interno" }],
    });
  }
}

async function manualApproval(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    assertValidObjectId(req.params.id);

    const tipo = normalizeApprovalTipo(req.body?.tipo);
    const key = normalizeApprovalKey(req.body?.key);
    const motivo = String(req.body?.motivo || "").trim();

    if (!tipo || !key || !motivo) {
      return res.status(400).json({ ok: false, errores: [{ message: "tipo, key y motivo son obligatorios" }] });
    }

    const job = await MasterImportJob.findById(req.params.id).lean();
    if (!job) return deny(res);
    if (job.estado !== "PENDIENTE_CONFIRMACION") {
      return res.status(409).json({ ok: false, errores: [{ message: "Job no esta pendiente de confirmacion" }] });
    }
    if (Array.isArray(job.errors) && job.errors.length > 0) {
      return res.status(409).json({ ok: false, errores: [{ message: "Job contiene errores de dry-run" }] });
    }
    if (!job.applyPlan || typeof job.applyPlan !== "object") {
      return res.status(409).json({ ok: false, errores: [{ message: "Job no tiene applyPlan persistido" }] });
    }

    const target = findApprovalTarget(job, tipo, key);
    if (!target) {
      return res.status(400).json({ ok: false, errores: [{ message: "Riesgo o revision manual inexistente" }] });
    }

    if ((Array.isArray(job.manualApprovals) ? job.manualApprovals : []).some((approval) => approvalMatches(approval, tipo, key) && approval.approved)) {
      return res.status(409).json({ ok: false, errores: [{ message: "Aprobacion manual ya registrada" }] });
    }

    const approval = {
      tipo,
      key,
      approved: true,
      motivo,
      approvedBy: req.user._id,
      approvedAt: new Date(),
    };

    const updated = await MasterImportJob.findOneAndUpdate(
      {
        _id: job._id,
        estado: "PENDIENTE_CONFIRMACION",
        manualApprovals: {
          $not: {
            $elemMatch: {
              tipo,
              key,
              approved: true,
            },
          },
        },
      },
      { $push: { manualApprovals: approval } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(409).json({ ok: false, errores: [{ message: "No se pudo registrar la aprobacion manual" }] });
    }

    if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
    if (req.audit?.addMeta) {
      req.audit.addMeta({
        tipo,
        key,
        motivo,
        approvedBy: String(req.user._id),
        source: target.source,
      });
    }

    return res.json({
      ok: true,
      jobId: String(job._id),
      approval: {
        tipo,
        key,
        approved: true,
        motivo,
        approvedBy: String(req.user._id),
        approvedAt: approval.approvedAt,
        source: target.source,
      },
    });
  } catch (err) {
    console.error("[bases-maestras] manual approval error:", err);
    return res.status(err.status || 500).json({ ok: false, errores: [{ message: err.message || "Error interno" }] });
  }
}

async function excludeBlockedItem(req, res) {
  try {
    if (!isAdminGeneral(req)) return deny(res);
    assertValidObjectId(req.params.id);

    const code = normalizeExclusionCode(req.body?.code || req.body?.tipo);
    const tipo = normalizeExclusionCode(req.body?.tipo || code);
    const key = normalizeApprovalKey(req.body?.key);
    const motivo = String(req.body?.motivo || "").trim();

    if (!code || !tipo || !key || motivo.length < 10) {
      return res.status(400).json({ ok: false, errores: [{ message: "tipo/code, key y motivo de al menos 10 caracteres son obligatorios" }] });
    }
    if (!EXCLUDABLE_PERSONAL_BLOCK_CODES.has(code)) {
      return res.status(400).json({ ok: false, errores: [{ message: "El bloqueo seleccionado no es excluible del apply" }] });
    }

    const job = await MasterImportJob.findById(req.params.id).lean();
    if (!job) return deny(res);
    if (job.tipo !== "PERSONAL") {
      return res.status(400).json({ ok: false, errores: [{ message: "Las exclusiones solo estan habilitadas para PERSONAL" }] });
    }
    if (job.estado !== "PENDIENTE_CONFIRMACION") {
      return res.status(409).json({ ok: false, errores: [{ message: "Job no esta pendiente de confirmacion" }] });
    }
    if (Array.isArray(job.errors) && job.errors.length > 0) {
      return res.status(409).json({ ok: false, errores: [{ message: "Job contiene errores de dry-run" }] });
    }
    if (activeExclusionExists(job, code, key)) {
      return res.status(409).json({ ok: false, errores: [{ message: "La exclusion ya esta registrada para este bloqueo" }] });
    }

    const target = findBlockedTarget(job, code, key);
    if (!target) {
      return res.status(400).json({ ok: false, errores: [{ message: "Bloqueo excluible inexistente en el plan actual" }] });
    }

    const exclusion = {
      tipo,
      code,
      key,
      rowIndex: target.rowIndex ?? null,
      matricula: target.matricula || "",
      dni: target.dni || "",
      userId: target.userId || "",
      motivo,
      createdBy: req.user._id,
      createdAt: new Date(),
    };

    const nextJob = {
      ...job,
      exclusions: [...(Array.isArray(job.exclusions) ? job.exclusions : []), exclusion],
    };
    const applyPlan = buildApplyPlan(nextJob);
    const applyPlanSummary = buildApplyPlanSummary(applyPlan);
    const persistBytes = jsonSizeBytes({ applyPlan, applyPlanSummary });
    if (persistBytes > MAX_APPLY_PLAN_PERSIST_BYTES) {
      return res.status(413).json({
        ok: false,
        errores: [{ message: "El plan de aplicacion excede el tamano maximo persistible luego de registrar la exclusion" }],
      });
    }

    const updated = await MasterImportJob.findOneAndUpdate(
      {
        _id: job._id,
        estado: "PENDIENTE_CONFIRMACION",
        exclusions: {
          $not: {
            $elemMatch: {
              code,
              key,
              revokedAt: null,
            },
          },
        },
      },
      {
        $push: { exclusions: exclusion },
        $set: {
          applyPlan,
          applyPlanSummary,
          applyPlanGeneratedAt: new Date(),
          applyPlanGeneratedBy: req.user._id,
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(409).json({ ok: false, errores: [{ message: "No se pudo registrar la exclusion" }] });
    }

    if (req.audit?.setTarget) req.audit.setTarget("MasterImportJob", String(job._id));
    if (req.audit?.addMeta) {
      req.audit.addMeta({
        tipo,
        code,
        key,
        motivo,
        createdBy: String(req.user._id),
      });
    }

    return res.json({
      ok: true,
      jobId: String(job._id),
      exclusion: {
        ...exclusion,
        createdBy: String(req.user._id),
      },
      job: jobDetail(updated),
    });
  } catch (err) {
    console.error("[bases-maestras] exclusion error:", err);
    return res.status(err.status || 500).json({ ok: false, errores: [{ message: err.message || "Error interno" }] });
  }
}

module.exports = {
  personalDryRun,
  viviendasDryRun,
  alojamientosDryRun,
  listJobs,
  getJob,
  cancelJob,
  getApplyPlan,
  applyJob,
  manualApproval,
  excludeBlockedItem,
};
