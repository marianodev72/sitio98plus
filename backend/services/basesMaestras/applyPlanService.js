const CAMPOS_PERSONAL_PERMITIDOS = new Set(["tipoPersonal", "grupoJerarquico", "precedencia"]);
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

const CAMPOS_ALOJAMIENTO_PERMITIDOS = new Set([
  "denominacion",
  "dependencia",
  "lugar",
  "sector",
  "generoPermitido",
  "aptoParaGrupoJerarquico",
  "capacidad",
  "estado",
  "activo",
  "observaciones",
]);
const CAMPOS_ALOJAMIENTO_BLOQUEADOS = new Set([
  "_id",
  "codigo",
  "ocupacionActual",
  "historialOcupacion",
  "historialEstados",
  "origenImportacion",
  "plazas",
  "asignaciones",
]);
const ESTADOS_ALOJAMIENTO_RIESGO_OCUPADO = new Set(["BAJA", "FUERA_SERVICIO", "INHABILITADO"]);

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
  if (arr(item.cambios).some((cambio) => cambio.campo === "grupoJerarquico")) {
    risks.push({ tipo: "CAMBIO_GRUPO_JERARQUICO", key: safeKey(item), message: "Cambio de grupo jerarquico requiere revision institucional" });
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
        allowedFields: ["nombre", "apellido", "dni", "matricula", "tipoPersonal", "grupoJerarquico", "precedencia"],
        blockedFields: Array.from(CAMPOS_PERSONAL_BLOQUEADOS),
        snapshotFields: ["_id", "dni", "matricula", "tipoPersonal", "grupoJerarquico", "precedencia", "activo", "archivado"],
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
          snapshotFields: ["_id", "dni", "matricula", "tipoPersonal", "grupoJerarquico", "precedencia"],
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

function alojamientoOcupado(item) {
  return (
    Boolean(item?.existente?.ocupado) ||
    Number(item?.existente?.plazasOcupadas || 0) > 0 ||
    Number(item?.existente?.plazasReservadas || 0) > 0 ||
    String(item?.existente?.estado || "").toUpperCase() === "OCUPADO"
  );
}

function pushAlojamientoRisk(risks, requiresManualReview, tipo, key, message) {
  risks.push({ tipo, key, message });
  requiresManualReview.push({ tipo, key });
}

function pushAlojamientoRisks(item, risks, requiresManualReview) {
  const key = safeKey(item);
  const cambios = arr(item.cambios);
  const ocupado = alojamientoOcupado(item);

  if (!ocupado) return;

  if (cambios.some((cambio) => cambio.campo === "generoPermitido")) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "ALOJAMIENTO_OCUPADO_CAMBIA_GENERO",
      key,
      "Cambio de genero en alojamiento ocupado requiere revision institucional"
    );
  }
  if (cambios.some((cambio) => cambio.campo === "aptoParaGrupoJerarquico")) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "ALOJAMIENTO_OCUPADO_CAMBIA_GRUPO_JERARQUICO",
      key,
      "Cambio de grupo jerarquico en alojamiento ocupado requiere revision institucional"
    );
  }
  if (cambios.some((cambio) => cambio.campo === "capacidad" && Number(cambio.nuevo) < Number(cambio.actual))) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "ALOJAMIENTO_OCUPADO_REDUCE_CAPACIDAD",
      key,
      "Reduccion de capacidad en alojamiento ocupado requiere revision institucional"
    );
  }
  if (cambios.some((cambio) => cambio.campo === "activo" && cambio.nuevo === false)) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "ALOJAMIENTO_OCUPADO_ACTIVO_FALSE",
      key,
      "Desactivacion de alojamiento ocupado requiere revision institucional"
    );
  }
  if (
    cambios.some(
      (cambio) => cambio.campo === "estado" && ESTADOS_ALOJAMIENTO_RIESGO_OCUPADO.has(String(cambio.nuevo || "").toUpperCase())
    )
  ) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "ALOJAMIENTO_OCUPADO_CAMBIA_ESTADO_CRITICO",
      key,
      "Cambio a estado critico en alojamiento ocupado requiere revision institucional"
    );
  }
}

function planAlojamientos(job) {
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
        collection: "alojamientos",
        key: safeKey(item),
        item,
        allowedFields: [
          "codigo",
          "denominacion",
          "dependencia",
          "lugar",
          "sector",
          "generoPermitido",
          "aptoParaGrupoJerarquico",
          "capacidad",
          "estado",
          "activo",
          "observaciones",
        ],
        blockedFields: Array.from(CAMPOS_ALOJAMIENTO_BLOQUEADOS),
        snapshotFields: [
          "_id",
          "codigo",
          "dependencia",
          "lugar",
          "sector",
          "generoPermitido",
          "aptoParaGrupoJerarquico",
          "capacidad",
          "estado",
          "activo",
          "ocupacionActual",
        ],
      })
    );
  }

  for (const item of arr(diff.actualizados)) {
    pushAlojamientoRisks(item, risks, requiresManualReview);
    const cambios = arr(item.cambios);
    const allowed = cambios.filter((cambio) => CAMPOS_ALOJAMIENTO_PERMITIDOS.has(cambio.campo));
    const denied = cambios.filter((cambio) => !CAMPOS_ALOJAMIENTO_PERMITIDOS.has(cambio.campo));

    if (allowed.length) {
      updates.push(
        baseOperation({
          action: "UPDATE",
          collection: "alojamientos",
          key: safeKey(item),
          item: { ...item, cambios: allowed },
          allowedFields: allowed.map((cambio) => cambio.campo),
          blockedFields: [],
          snapshotFields: [
            "_id",
            "codigo",
            "dependencia",
            "lugar",
            "sector",
            "generoPermitido",
            "aptoParaGrupoJerarquico",
            "capacidad",
            "estado",
            "activo",
            "ocupacionActual",
          ],
        })
      );
    }

    for (const cambio of denied) {
      blocked.push({
        action: "UPDATE",
        collection: "alojamientos",
        key: safeKey(item),
        field: cambio.campo,
        reason: CAMPOS_ALOJAMIENTO_BLOQUEADOS.has(cambio.campo) ? "CAMPO_BLOQUEADO" : "CAMPO_NO_PERMITIDO",
        cambio,
      });
    }
  }

  for (const warning of warnings) {
    if (warning?.tipo === "DUPLICADO_ARCHIVO") {
      risks.push({ tipo: "CODIGO_ALOJAMIENTO_DUPLICADO", key: warning.valor || "", message: "Codigo duplicado detectado en dry-run" });
      requiresManualReview.push({ tipo: "CODIGO_ALOJAMIENTO_DUPLICADO", key: warning.valor || "" });
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
  if (job.tipo === "ALOJAMIENTOS") return planAlojamientos(job);

  const err = new Error("Tipo de job no soportado");
  err.status = 400;
  throw err;
}

function buildApplyPlanSummary(applyPlan) {
  const plan = applyPlan || {};
  const creates = arr(plan.creates).length;
  const updates = arr(plan.updates).length;
  const blocked = arr(plan.blocked).length;
  const risks = arr(plan.risks).length;
  const warnings = arr(plan.warnings).length;
  const requiresManualReview = arr(plan.requiresManualReview).length;

  return {
    creates,
    updates,
    blocked,
    risks,
    warnings,
    requiresManualReview,
    createsCount: creates,
    updatesCount: updates,
    blockedCount: blocked,
    risksCount: risks,
    warningsCount: warnings,
    requiresManualReviewCount: requiresManualReview,
  };
}

module.exports = {
  buildApplyPlan,
  buildApplyPlanSummary,
};
