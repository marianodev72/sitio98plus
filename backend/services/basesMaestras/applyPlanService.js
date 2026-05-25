const CAMPOS_PERSONAL_PERMITIDOS = new Set(["tipoPersonal", "precedencia"]);
const CAMPOS_PERSONAL_BLOQUEADOS = new Set([
  "role",
  "permisos",
  "password",
  "passwordHash",
  "mfaEnabled",
  "mfaMethod",
  "mfaSecretEnc",
  "mfaPendingSecretEnc",
  "activo",
  "bloqueado",
  "archivado",
  "viviendaAsignada",
  "alojamientoAsignado",
]);

const CAMPOS_VIVIENDA_PERMITIDOS = new Set(["barrio", "dormitorios", "tipoDestino"]);
const CAMPOS_VIVIENDA_BLOQUEADOS = new Set([
  "estado",
  "ocupacionActual",
  "cantidadHabitantes",
  "historialEstados",
]);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function safeKey(item = {}) {
  return item.matricula || item.dni || item.codigo || item.codigoNormalizado || item.codigoOriginal || "";
}

function baseOperation({ action, collection, key, item, allowedFields = [], blockedFields = [], snapshotFields = [] }) {
  return {
    action,
    collection,
    key,
    fields: allowedFields,
    blockedFields,
    snapshot: {
      collection,
      key,
      fields: snapshotFields,
    },
    preview: item,
  };
}

function hasDuplicateWarning(job, field, value) {
  return arr(job.warnings).some((warning) => {
    if (!String(warning?.tipo || "").includes("DUPLICADO")) return false;
    if (field && String(warning?.campo || "").toUpperCase() !== field) return false;
    if (value && String(warning?.valor || "") !== String(value)) return false;
    return true;
  });
}

function pushPersonalRisks(job, item, risks, requiresManualReview) {
  if (hasDuplicateWarning(job, "MATRICULAS", item.matricula)) {
    risks.push({ tipo: "MATRICULA_DUPLICADA", key: safeKey(item), message: "Matricula duplicada detectada en dry-run" });
    requiresManualReview.push({ tipo: "PERSONAL_DUPLICADO", key: safeKey(item), campo: "matricula" });
  }
  if (hasDuplicateWarning(job, "DNI", item.dni)) {
    risks.push({ tipo: "DNI_AMBIGUO", key: safeKey(item), message: "DNI duplicado detectado en dry-run" });
    requiresManualReview.push({ tipo: "PERSONAL_DUPLICADO", key: safeKey(item), campo: "dni" });
  }
  if (arr(item.cambios).some((cambio) => cambio.campo === "tipoPersonal")) {
    risks.push({ tipo: "CAMBIO_TIPO_PERSONAL", key: safeKey(item), message: "Cambio OF/SO requiere revision institucional" });
  }
}

function planPersonal(job) {
  const diff = job.diff || {};
  const creates = [];
  const updates = [];
  const blocked = [];
  const risks = [];
  const warnings = arr(job.warnings);
  const requiresManualReview = [];

  for (const item of arr(diff.nuevos)) {
    pushPersonalRisks(job, item, risks, requiresManualReview);
    creates.push(
      baseOperation({
        action: "CREATE",
        collection: "users",
        key: safeKey(item),
        item,
        allowedFields: ["nombre", "apellido", "dni", "matricula", "tipoPersonal", "precedencia"],
        blockedFields: Array.from(CAMPOS_PERSONAL_BLOQUEADOS),
        snapshotFields: ["_id", "dni", "matricula", "tipoPersonal", "precedencia", "activo", "archivado"],
      })
    );
  }

  for (const item of arr(diff.actualizados)) {
    pushPersonalRisks(job, item, risks, requiresManualReview);
    const cambios = arr(item.cambios);
    const allowed = cambios.filter((cambio) => CAMPOS_PERSONAL_PERMITIDOS.has(cambio.campo));
    const denied = cambios.filter((cambio) => !CAMPOS_PERSONAL_PERMITIDOS.has(cambio.campo));

    if (allowed.length) {
      updates.push(
        baseOperation({
          action: "UPDATE",
          collection: "users",
          key: safeKey(item),
          item: { ...item, cambios: allowed },
          allowedFields: allowed.map((cambio) => cambio.campo),
          blockedFields: [],
          snapshotFields: ["_id", "dni", "matricula", "tipoPersonal", "precedencia"],
        })
      );
    }

    for (const cambio of denied) {
      blocked.push({
        action: "UPDATE",
        collection: "users",
        key: safeKey(item),
        field: cambio.campo,
        reason: CAMPOS_PERSONAL_BLOQUEADOS.has(cambio.campo) ? "CAMPO_BLOQUEADO" : "CAMPO_NO_PERMITIDO",
        cambio,
      });
    }
  }

  return { creates, updates, blocked, risks, warnings, requiresManualReview };
}

function viviendaOcupada(item) {
  return Boolean(item?.existente?.ocupada) || String(item?.existente?.estado || "").toUpperCase() === "OCUPADA";
}

function pushViviendaRisks(item, risks, requiresManualReview) {
  if (viviendaOcupada(item)) {
    risks.push({ tipo: "VIVIENDA_OCUPADA", key: safeKey(item), message: "Vivienda ocupada detectada en dry-run" });
  }
  if (arr(item.cambios).some((cambio) => cambio.campo === "tipoDestino") && viviendaOcupada(item)) {
    requiresManualReview.push({ tipo: "CAMBIO_TIPO_DESTINO_OCUPADA", key: safeKey(item) });
  }
}

function planViviendas(job) {
  const diff = job.diff || {};
  const creates = [];
  const updates = [];
  const blocked = [];
  const risks = [];
  const warnings = arr(job.warnings);
  const requiresManualReview = [];

  for (const item of arr(diff.nuevos)) {
    creates.push(
      baseOperation({
        action: "CREATE",
        collection: "viviendas",
        key: safeKey(item),
        item,
        allowedFields: ["codigo", "barrio", "dormitorios", "tipoDestino"],
        blockedFields: Array.from(CAMPOS_VIVIENDA_BLOQUEADOS),
        snapshotFields: ["_id", "codigo", "barrio", "dormitorios", "tipoDestino", "estado", "ocupacionActual"],
      })
    );
  }

  for (const item of arr(diff.actualizados)) {
    pushViviendaRisks(item, risks, requiresManualReview);
    const cambios = arr(item.cambios);
    const allowed = cambios.filter((cambio) => CAMPOS_VIVIENDA_PERMITIDOS.has(cambio.campo));
    const denied = cambios.filter((cambio) => !CAMPOS_VIVIENDA_PERMITIDOS.has(cambio.campo));

    if (viviendaOcupada(item) && allowed.some((cambio) => cambio.campo === "dormitorios" && Number(cambio.nuevo) < Number(cambio.actual))) {
      blocked.push({
        action: "UPDATE",
        collection: "viviendas",
        key: safeKey(item),
        field: "dormitorios",
        reason: "REDUCCION_CAPACIDAD_OCUPADA",
      });
    } else if (allowed.length) {
      updates.push(
        baseOperation({
          action: "UPDATE",
          collection: "viviendas",
          key: safeKey(item),
          item: { ...item, cambios: allowed },
          allowedFields: allowed.map((cambio) => cambio.campo),
          blockedFields: [],
          snapshotFields: ["_id", "codigo", "barrio", "dormitorios", "tipoDestino", "estado", "ocupacionActual"],
        })
      );
    }

    for (const cambio of denied) {
      blocked.push({
        action: "UPDATE",
        collection: "viviendas",
        key: safeKey(item),
        field: cambio.campo,
        reason: CAMPOS_VIVIENDA_BLOQUEADOS.has(cambio.campo) ? "CAMPO_BLOQUEADO" : "CAMPO_NO_PERMITIDO",
        cambio,
      });
    }
  }

  for (const warning of warnings) {
    if (warning?.tipo === "VIVIENDA_DESAPARECE_DEL_ARCHIVO") {
      blocked.push({
        action: "BAJA_SUGERIDA",
        collection: "viviendas",
        key: warning?.vivienda?.codigo || "",
        reason: "BAJA_AUTOMATICA_BLOQUEADA",
        warning,
      });
    }
    if (warning?.tipo === "DUPLICADO_ARCHIVO") {
      risks.push({ tipo: "CODIGO_AMBIGUO", key: warning.valor || "", message: "Codigo duplicado detectado en dry-run" });
      requiresManualReview.push({ tipo: "CODIGO_DUPLICADO", key: warning.valor || "" });
    }
  }

  return { creates, updates, blocked, risks, warnings, requiresManualReview };
}

function buildApplyPlan(job) {
  if (!job) {
    const err = new Error("Job inexistente");
    err.status = 404;
    throw err;
  }
  if (job.estado !== "PENDIENTE_CONFIRMACION") {
    const err = new Error("Job no esta pendiente de confirmacion");
    err.status = 409;
    throw err;
  }
  if (arr(job.errors).length > 0) {
    const err = new Error("Job contiene errores de dry-run");
    err.status = 409;
    throw err;
  }

  if (job.tipo === "PERSONAL") return planPersonal(job);
  if (job.tipo === "VIVIENDAS") return planViviendas(job);

  const err = new Error("Tipo de job no soportado");
  err.status = 400;
  throw err;
}

module.exports = {
  buildApplyPlan,
};
