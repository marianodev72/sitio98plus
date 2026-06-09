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
const ESTADOS_ALOJAMIENTO_CRITICOS = new Set(["FUERA_SERVICIO", "INHABILITADO", "BAJA", "MANTENIMIENTO"]);
const ESTADOS_ALOJAMIENTO_BLOQUEO_OCUPADO = new Set(["BAJA", "INHABILITADO"]);
const ROLES_ADMIN_PERSONAL = new Set(["ADMIN", "ADMIN_GENERAL"]);
const PERSONAL_LARGE_PLAN_THRESHOLD = 1000;
const PERSONAL_SAMPLE_CREATES = 25;
const PERSONAL_SAMPLE_UPDATES = 25;
const PERSONAL_SAMPLE_ITEMS = 50;
const EXCLUDABLE_PERSONAL_BLOCK_CODES = new Set(["USUARIO_ARCHIVADO_EN_IMPORTACION_PERSONAL"]);

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

function idString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
}

function compactAssignment(value) {
  if (!value) return null;
  return idString(value);
}

function compactCambio(cambio = {}) {
  return {
    campo: cambio.campo || null,
    actual: cambio.actual ?? null,
    nuevo: cambio.nuevo ?? null,
  };
}

function compactPersonalExistente(value = {}) {
  if (!value || typeof value !== "object") return null;
  return {
    _id: idString(value._id),
    matricula: value.matricula || null,
    dni: value.dni || null,
    tipoPersonal: value.tipoPersonal || null,
    grupoJerarquico: value.grupoJerarquico || "NO_DEFINIDO",
    precedencia: value.precedencia ?? null,
    role: value.role || null,
    bloqueado: Boolean(value.bloqueado),
    archivado: Boolean(value.archivado),
    viviendaAsignada: compactAssignment(value.viviendaAsignada),
    alojamientoAsignado: compactAssignment(value.alojamientoAsignado),
  };
}

function compactPersonalItem(item = {}, options = {}) {
  const compact = {
    fila: item.fila || null,
    matricula: item.matricula || "",
    dni: item.dni || "",
    nombreApellido: item.nombreApellido || "",
    nombre: item.nombre || "",
    apellido: item.apellido || "",
    tipoPersonal: item.tipoPersonal || null,
    grupoJerarquico: item.grupoJerarquico || null,
    precedencia: item.precedencia ?? null,
  };
  const cambios = arr(options.cambios !== undefined ? options.cambios : item.cambios).map(compactCambio);
  if (cambios.length) compact.cambios = cambios;
  const existente = compactPersonalExistente(item.existente);
  if (existente && options.includeExistente) compact.existente = existente;
  return compact;
}

function compactRows(rows, limit = 10) {
  const values = arr(rows);
  return {
    rows: values.slice(0, limit),
    count: values.length,
    truncated: values.length > limit,
  };
}

function compactUsers(users, limit = 5) {
  const values = arr(users);
  return {
    ids: values.slice(0, limit).map((user) => idString(user?._id || user)).filter(Boolean),
    count: values.length,
    truncated: values.length > limit,
  };
}

function compactPersonalWarning(warning = {}) {
  const tipo = warning.tipo || null;
  const compact = {
    tipo,
    campo: warning.campo || null,
    valor: warning.valor ?? null,
    fila: warning.fila || null,
    matricula: warning.matricula || null,
    dni: warning.dni || null,
    actual: warning.actual ?? null,
    nuevo: warning.nuevo ?? null,
    message: warning.message || null,
  };
  if (warning.filas) Object.assign(compact, compactRows(warning.filas));
  if (warning.usuarios) Object.assign(compact, compactUsers(warning.usuarios));
  return Object.fromEntries(Object.entries(compact).filter(([, value]) => value !== null && value !== undefined && value !== ""));
}

function normalizeCode(value) {
  return String(value || "").toUpperCase().trim();
}

function personalBlockCode(item = {}) {
  return normalizeCode(item.code || item.reason || item.tipo);
}

function exclusionToken(code, key) {
  return `${normalizeCode(code)}::${String(key || "").trim()}`;
}

function activePersonalExclusions(job = {}) {
  const map = new Map();
  for (const exclusion of arr(job.exclusions)) {
    const code = normalizeCode(exclusion.code || exclusion.tipo);
    const key = String(exclusion.key || "").trim();
    if (!code || !key || exclusion.revokedAt || !EXCLUDABLE_PERSONAL_BLOCK_CODES.has(code)) continue;
    map.set(exclusionToken(code, key), exclusion);
  }
  return map;
}

function compactPersonalFlags(existente = {}) {
  return {
    archivado: Boolean(existente.archivado),
    bloqueado: Boolean(existente.bloqueado),
    hasViviendaAsignada: Boolean(existente.viviendaAsignada),
    hasAlojamientoAsignado: Boolean(existente.alojamientoAsignado),
  };
}

function compactPersonalChanges(item = {}, fallbackCambio = null) {
  const cambios = arr(item.cambios).length ? arr(item.cambios) : arr(fallbackCambio ? [fallbackCambio] : []);
  return cambios
    .filter((cambio) => ["tipoPersonal", "grupoJerarquico", "precedencia", "dni"].includes(cambio?.campo))
    .map(compactCambio);
}

function countByCode(items, codeField = "tipo") {
  const counts = {};
  for (const item of arr(items)) {
    const code = String(item?.[codeField] || item?.reason || item?.tipo || "SIN_CODIGO");
    counts[code] = (counts[code] || 0) + 1;
  }
  return counts;
}

function groupedApprovalItems(items, messagePrefix) {
  return Object.entries(countByCode(items)).map(([tipo, count]) => ({
    tipo,
    key: "*",
    grouped: true,
    count,
    message: `${messagePrefix}: ${tipo} (${count})`,
  }));
}

function applyPersonalExclusions(job, plan) {
  const active = activePersonalExclusions(job);
  if (!active.size) return { ...plan, excluded: [], totalExcluded: 0, excludedCounts: {} };

  const excluded = [];
  const blocked = [];
  const excludedKeys = new Set();

  for (const item of arr(plan.blocked)) {
    const code = personalBlockCode(item);
    const key = String(item.key || "").trim();
    const exclusion = active.get(exclusionToken(code, key));
    if (exclusion && EXCLUDABLE_PERSONAL_BLOCK_CODES.has(code)) {
      excludedKeys.add(key);
      excluded.push({
        ...item,
        excluded: true,
        exclusion: {
          tipo: exclusion.tipo || code,
          code,
          key,
          motivo: exclusion.motivo || "",
          createdBy: idString(exclusion.createdBy) || "",
          createdAt: exclusion.createdAt || null,
        },
      });
      continue;
    }
    blocked.push(item);
  }

  const keepOperation = (operation) => !excludedKeys.has(String(operation?.key || "").trim());

  return {
    ...plan,
    creates: arr(plan.creates).filter(keepOperation),
    updates: arr(plan.updates).filter(keepOperation),
    blocked,
    excluded,
    totalExcluded: excluded.length,
    excludedCounts: countByCode(excluded, "reason"),
  };
}

function compactPersonalApplyPlanForPersistence(plan) {
  const creates = arr(plan.creates);
  const updates = arr(plan.updates);
  const blocked = arr(plan.blocked);
  const risks = arr(plan.risks);
  const warnings = arr(plan.warnings);
  const requiresManualReview = arr(plan.requiresManualReview);
  const excluded = arr(plan.excluded);
  const totalItems = creates.length + updates.length + blocked.length + risks.length + warnings.length + requiresManualReview.length + excluded.length;

  if (totalItems <= PERSONAL_LARGE_PLAN_THRESHOLD) return plan;

  const groupedRisks = groupedApprovalItems(risks, "Riesgo agrupado de plan masivo PERSONAL");
  const groupedManualReview = groupedApprovalItems(requiresManualReview, "Revision manual agrupada de plan masivo PERSONAL");

  return {
    isLargePlan: true,
    detailsTruncated: true,
    totalItems,
    maxPersistedSamples: PERSONAL_SAMPLE_ITEMS,
    totalCreates: creates.length,
    totalUpdates: updates.length,
    totalBlocked: blocked.length,
    totalRisks: risks.length,
    totalWarnings: warnings.length,
    totalRequiresManualReview: requiresManualReview.length,
    totalExcluded: excluded.length,
    canApply: blocked.length === 0,
    blocked: blocked.slice(0, PERSONAL_SAMPLE_ITEMS),
    excluded: excluded.slice(0, PERSONAL_SAMPLE_ITEMS),
    risks: groupedRisks,
    requiresManualReview: groupedManualReview,
    warnings: warnings.slice(0, PERSONAL_SAMPLE_ITEMS),
    creates: creates.slice(0, PERSONAL_SAMPLE_CREATES),
    updates: updates.slice(0, PERSONAL_SAMPLE_UPDATES),
    sampleCreates: creates.slice(0, PERSONAL_SAMPLE_CREATES),
    sampleUpdates: updates.slice(0, PERSONAL_SAMPLE_UPDATES),
    sampleBlocked: blocked.slice(0, PERSONAL_SAMPLE_ITEMS),
    sampleExcluded: excluded.slice(0, PERSONAL_SAMPLE_ITEMS),
    sampleWarnings: warnings.slice(0, PERSONAL_SAMPLE_ITEMS),
    sampleRisks: risks.slice(0, PERSONAL_SAMPLE_ITEMS),
    riskCounts: countByCode(risks),
    blockedCounts: countByCode(blocked, "reason"),
    warningCounts: countByCode(warnings),
    manualReviewCounts: countByCode(requiresManualReview),
    excludedCounts: plan.excludedCounts || countByCode(excluded, "reason"),
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

function pushPersonalBlocked(blocked, item, reason, field = null, cambio = null) {
  const existente = item?.existente || {};
  const code = normalizeCode(reason);
  blocked.push({
    tipo: code,
    code,
    action: "UPDATE",
    collection: "users",
    key: safeKey(item),
    rowIndex: item.fila || null,
    matricula: item.matricula || existente.matricula || "",
    dni: item.dni || existente.dni || "",
    nombre: item.nombre || "",
    nombreApellido: item.nombreApellido || "",
    userId: idString(existente._id) || "",
    flags: compactPersonalFlags(existente),
    changes: compactPersonalChanges(item, cambio),
    field,
    reason,
    cambio,
    message:
      code === "USUARIO_ARCHIVADO_EN_IMPORTACION_PERSONAL"
        ? "Usuario archivado detectado en importacion de personal. Puede excluirse del apply masivo para revision individual."
        : "Bloqueo no aprobable en importacion de personal.",
  });
}

function personalTieneAsignacion(value) {
  return Boolean(value);
}

function pushPersonalPrecedenciaDuplicada(diff, risks, requiresManualReview) {
  const byPrecedencia = new Map();
  for (const item of [...arr(diff.nuevos), ...arr(diff.actualizados), ...arr(diff.sinCambios)]) {
    if (item?.precedencia === null || item?.precedencia === undefined) continue;
    const key = String(item.precedencia);
    const current = byPrecedencia.get(key) || [];
    current.push(item);
    byPrecedencia.set(key, current);
  }

  for (const [precedencia, items] of byPrecedencia.entries()) {
    if (items.length <= 1) continue;
    for (const item of items) {
      risks.push({
        tipo: "PRECEDENCIA_DUPLICADA_ARCHIVO",
        key: safeKey(item),
        precedencia,
        message: "Precedencia duplicada en archivo requiere revision institucional",
      });
      requiresManualReview.push({ tipo: "PRECEDENCIA_DUPLICADA_ARCHIVO", key: safeKey(item) });
    }
  }
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

function pushPersonalHardening(item, risks, requiresManualReview, blocked) {
  const existente = item?.existente || {};
  const cambios = arr(item.cambios);
  const key = safeKey(item);
  const cambiaTipoPersonal = cambios.some((cambio) => cambio.campo === "tipoPersonal");
  const cambiaGrupoJerarquico = cambios.some((cambio) => cambio.campo === "grupoJerarquico");
  const cambiaPrecedencia = cambios.some((cambio) => cambio.campo === "precedencia");
  const cambiaDni = cambios.find((cambio) => cambio.campo === "dni") || null;
  const role = String(existente.role || "").toUpperCase();
  const usuarioAdmin = ROLES_ADMIN_PERSONAL.has(role);

  if (cambiaTipoPersonal && personalTieneAsignacion(existente.viviendaAsignada)) {
    risks.push({
      tipo: "CAMBIO_TIPO_PERSONAL_CON_VIVIENDA_ASIGNADA",
      key,
      message: "Cambio OF/SO con vivienda asignada requiere revision institucional",
    });
    requiresManualReview.push({ tipo: "CAMBIO_TIPO_PERSONAL_CON_VIVIENDA_ASIGNADA", key });
  }

  if (cambiaGrupoJerarquico && personalTieneAsignacion(existente.alojamientoAsignado)) {
    risks.push({
      tipo: "CAMBIO_GRUPO_JERARQUICO_CON_ALOJAMIENTO_ASIGNADO",
      key,
      message: "Cambio de grupo jerarquico con alojamiento asignado requiere revision institucional",
    });
    requiresManualReview.push({ tipo: "CAMBIO_GRUPO_JERARQUICO_CON_ALOJAMIENTO_ASIGNADO", key });
  }

  if (existente.archivado) {
    pushPersonalBlocked(blocked, item, "USUARIO_ARCHIVADO_EN_IMPORTACION_PERSONAL");
  }

  if (existente.bloqueado) {
    risks.push({
      tipo: "USUARIO_BLOQUEADO_EN_IMPORTACION_PERSONAL",
      key,
      message: "Usuario bloqueado requiere revision institucional antes de actualizar datos de personal",
    });
    requiresManualReview.push({ tipo: "USUARIO_BLOQUEADO_EN_IMPORTACION_PERSONAL", key });
  }

  if (usuarioAdmin && cambios.length) {
    risks.push({
      tipo: "USUARIO_ADMIN_EN_IMPORTACION_PERSONAL",
      key,
      role,
      message: "Usuario con rol administrativo detectado en importacion de personal",
    });
  }
  if (usuarioAdmin && cambiaTipoPersonal) {
    pushPersonalBlocked(blocked, item, "CAMBIO_TIPO_PERSONAL_USUARIO_ADMIN", "tipoPersonal", cambios.find((cambio) => cambio.campo === "tipoPersonal") || null);
  }
  if (usuarioAdmin && cambiaDni) {
    pushPersonalBlocked(blocked, item, "CAMBIO_DNI_USUARIO_ADMIN", "dni", cambiaDni);
  }
  if (usuarioAdmin && cambiaGrupoJerarquico) {
    requiresManualReview.push({ tipo: "USUARIO_ADMIN_EN_IMPORTACION_PERSONAL", key, campo: "grupoJerarquico" });
  }
  if (usuarioAdmin && cambiaPrecedencia) {
    requiresManualReview.push({ tipo: "USUARIO_ADMIN_EN_IMPORTACION_PERSONAL", key, campo: "precedencia" });
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
        item: compactPersonalItem(item),
        allowedFields: ["nombre", "apellido", "dni", "matricula", "tipoPersonal", "grupoJerarquico", "precedencia"],
        blockedFields: Array.from(CAMPOS_PERSONAL_BLOQUEADOS),
        snapshotFields: [
          "_id",
          "dni",
          "matricula",
          "tipoPersonal",
          "grupoJerarquico",
          "precedencia",
          "role",
          "activo",
          "archivado",
          "bloqueado",
          "viviendaAsignada",
          "alojamientoAsignado",
        ],
      })
    );
  }

  for (const item of arr(diff.actualizados)) {
    pushPersonalRisks(job, item, risks, requiresManualReview);
    pushPersonalHardening(item, risks, requiresManualReview, blocked);
    const cambios = arr(item.cambios);
    const allowed = cambios.filter((cambio) => CAMPOS_PERSONAL_PERMITIDOS.has(cambio.campo));
    const denied = cambios.filter((cambio) => !CAMPOS_PERSONAL_PERMITIDOS.has(cambio.campo));

    if (allowed.length) {
      updates.push(
        baseOperation({
          action: "UPDATE",
          collection: "users",
          key: safeKey(item),
          item: compactPersonalItem(item, { cambios: allowed }),
          allowedFields: allowed.map((cambio) => cambio.campo),
          blockedFields: [],
          snapshotFields: [
            "_id",
            "dni",
            "matricula",
            "tipoPersonal",
            "grupoJerarquico",
            "precedencia",
            "role",
            "activo",
            "archivado",
            "bloqueado",
            "viviendaAsignada",
            "alojamientoAsignado",
          ],
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

  pushPersonalPrecedenciaDuplicada(diff, risks, requiresManualReview);

  for (const warning of warnings) {
    if (warning?.tipo === "DUPLICADO_ARCHIVO" && String(warning?.campo || "").toUpperCase() === "MATRICULAS") {
      blocked.push({
        action: "IDENTIDAD_BLOQUEADA",
        collection: "users",
        key: warning.valor || "",
        reason: "DUPLICADO_MATRICULA_ARCHIVO",
        warning: compactPersonalWarning(warning),
      });
    }
    if (warning?.tipo === "DUPLICADO_ARCHIVO" && String(warning?.campo || "").toUpperCase() === "DNI") {
      blocked.push({
        action: "IDENTIDAD_BLOQUEADA",
        collection: "users",
        key: warning.valor || "",
        reason: "DUPLICADO_DNI_ARCHIVO",
        warning: compactPersonalWarning(warning),
      });
    }
    if (warning?.tipo === "DUPLICADO_DB" && String(warning?.campo || "").toUpperCase() === "MATRICULAS") {
      blocked.push({
        action: "IDENTIDAD_BLOQUEADA",
        collection: "users",
        key: warning.valor || "",
        reason: "DUPLICADO_MATRICULA_DB",
        warning: compactPersonalWarning(warning),
      });
    }
    if (warning?.tipo === "DUPLICADO_DB" && String(warning?.campo || "").toUpperCase() === "DNI") {
      blocked.push({
        action: "IDENTIDAD_BLOQUEADA",
        collection: "users",
        key: warning.valor || "",
        reason: "DUPLICADO_DNI_DB",
        warning: compactPersonalWarning(warning),
      });
    }
    if (warning?.tipo === "CONFLICTO_MATRICULA_DNI_USUARIOS_DISTINTOS") {
      blocked.push({
        action: "IDENTIDAD_BLOQUEADA",
        collection: "users",
        key: warning.matricula || warning.dni || "",
        reason: "CONFLICTO_MATRICULA_DNI_USUARIOS_DISTINTOS",
        warning: compactPersonalWarning(warning),
      });
    }
  }

  return applyPersonalExclusions(job, {
    creates,
    updates,
    blocked,
    risks,
    warnings: warnings.map(compactPersonalWarning),
    requiresManualReview,
    totalSinCambios: arr(diff.sinCambios).length,
  });
}

function viviendaOcupada(item) {
  return Boolean(item?.existente?.ocupada) || String(item?.existente?.estado || "").toUpperCase() === "OCUPADA";
}

function bajaViviendaAusenteReason(estado) {
  const normalized = String(estado || "").toUpperCase().trim();
  if (["DISPONIBLE", "REPARACION", "BAJA"].includes(normalized)) return null;
  if (normalized === "OCUPADA") return "BAJA_VIVIENDA_OCUPADA_BLOQUEADA";
  if (normalized === "RESERVADA") return "BAJA_VIVIENDA_RESERVADA_BLOQUEADA";
  if (normalized === "A_DESOCUPARSE") return "BAJA_VIVIENDA_A_DESOCUPARSE_BLOQUEADA";
  return "BAJA_AUTOMATICA_BLOQUEADA";
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
      const vivienda = warning?.vivienda || {};
      const key = vivienda.codigo || "";
      const reason = bajaViviendaAusenteReason(vivienda.estado);
      if (reason) {
        blocked.push({
          action: "BAJA_SUGERIDA",
          collection: "viviendas",
          key,
          reason,
          warning,
        });
      } else {
        risks.push({
          tipo: "BAJA_LOGICA_VIVIENDA",
          key,
          message: "Vivienda no incluida en el Excel; baja logica requiere revision institucional.",
        });
        requiresManualReview.push({
          tipo: "BAJA_LOGICA_VIVIENDA",
          key,
          vivienda,
          message: "La vivienda no aparece en el Excel. Requiere aprobacion ADMIN_GENERAL para baja logica.",
        });
      }
    }
    if (warning?.tipo === "DUPLICADO_ARCHIVO") {
      risks.push({ tipo: "CODIGO_AMBIGUO", key: warning.valor || "", message: "Codigo duplicado detectado en dry-run" });
      requiresManualReview.push({ tipo: "CODIGO_DUPLICADO", key: warning.valor || "" });
    }
  }

  return { creates, updates, blocked, risks, warnings, requiresManualReview };
}

function alojamientoOcupado(item) {
  const alojados = arr(item?.existente?.alojados);
  const alojadosOcupacionActual = arr(item?.existente?.ocupacionActual?.alojados);
  return (
    Boolean(item?.existente?.ocupado) ||
    Number(item?.existente?.plazasOcupadas || 0) > 0 ||
    Number(item?.existente?.plazasReservadas || 0) > 0 ||
    alojados.length > 0 ||
    alojadosOcupacionActual.length > 0 ||
    String(item?.existente?.estado || "").toUpperCase() === "OCUPADO"
  );
}

function alojamientoOcupacionComprometida(item) {
  return Number(item?.existente?.plazasOcupadas || 0) + Number(item?.existente?.plazasReservadas || 0);
}

function pushAlojamientoRisk(risks, requiresManualReview, tipo, key, message) {
  risks.push({ tipo, key, message });
  requiresManualReview.push({ tipo, key });
}

function pushAlojamientoBlocked(blocked, item, field, reason, cambio) {
  blocked.push({
    action: "UPDATE",
    collection: "alojamientos",
    key: safeKey(item),
    field,
    reason,
    cambio,
  });
}

function pushAlojamientoRisks(item, risks, requiresManualReview, blocked) {
  const key = safeKey(item);
  const cambios = arr(item.cambios);
  const ocupado = alojamientoOcupado(item);
  const ocupacionComprometida = alojamientoOcupacionComprometida(item);

  if (!ocupado) return;

  if (cambios.some((cambio) => cambio.campo === "generoPermitido")) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "CAMBIO_GENERO_ALOJAMIENTO_OCUPADO",
      key,
      "Cambio de genero en alojamiento ocupado requiere revision institucional"
    );
  }
  if (cambios.some((cambio) => cambio.campo === "aptoParaGrupoJerarquico")) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "CAMBIO_GRUPO_ALOJAMIENTO_OCUPADO",
      key,
      "Cambio de grupo jerarquico en alojamiento ocupado requiere revision institucional"
    );
  }
  for (const cambio of cambios.filter((cambio) => cambio.campo === "capacidad")) {
    const capacidadNueva = Number(cambio.nuevo);
    const capacidadActual = Number(cambio.actual);
    const reduceCapacidad = capacidadNueva < capacidadActual;

    if (reduceCapacidad && capacidadNueva < ocupacionComprometida) {
      pushAlojamientoBlocked(blocked, item, "capacidad", "REDUCCION_CAPACIDAD_INCOMPATIBLE_BLOQUEADA", cambio);
    } else if (reduceCapacidad) {
      pushAlojamientoRisk(
        risks,
        requiresManualReview,
        "REDUCCION_CAPACIDAD_ALOJAMIENTO",
        key,
        "Reduccion de capacidad en alojamiento ocupado requiere revision institucional"
      );
    } else {
      pushAlojamientoRisk(
        risks,
        requiresManualReview,
        "CAMBIO_CAPACIDAD_ALOJAMIENTO_OCUPADO",
        key,
        "Cambio de capacidad en alojamiento ocupado requiere revision institucional"
      );
    }
  }
  if (cambios.some((cambio) => cambio.campo === "activo" && cambio.nuevo === false)) {
    pushAlojamientoRisk(
      risks,
      requiresManualReview,
      "CAMBIO_ACTIVO_ALOJAMIENTO_OCUPADO",
      key,
      "Desactivacion de alojamiento ocupado requiere revision institucional"
    );
  }
  for (const cambio of cambios.filter((cambio) => cambio.campo === "estado")) {
    const estadoNuevo = String(cambio.nuevo || "").toUpperCase();
    if (ESTADOS_ALOJAMIENTO_BLOQUEO_OCUPADO.has(estadoNuevo)) {
      pushAlojamientoBlocked(
        blocked,
        item,
        "estado",
        estadoNuevo === "BAJA" ? "BAJA_ALOJAMIENTO_OCUPADO_BLOQUEADA" : "INHABILITADO_ALOJAMIENTO_OCUPADO_BLOQUEADO",
        cambio
      );
    } else if (ESTADOS_ALOJAMIENTO_CRITICOS.has(estadoNuevo)) {
      pushAlojamientoRisk(
        risks,
        requiresManualReview,
        "ESTADO_CRITICO_ALOJAMIENTO_OCUPADO",
        key,
        "Cambio a estado critico en alojamiento ocupado requiere revision institucional"
      );
    } else {
      pushAlojamientoRisk(
        risks,
        requiresManualReview,
        "CAMBIO_ESTADO_ALOJAMIENTO_OCUPADO",
        key,
        "Cambio de estado en alojamiento ocupado requiere revision institucional"
      );
    }
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
    pushAlojamientoRisks(item, risks, requiresManualReview, blocked);
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

function buildApplyPlan(job, options = {}) {
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

  if (job.tipo === "PERSONAL") {
    const plan = planPersonal(job);
    return options.full ? plan : compactPersonalApplyPlanForPersistence(plan);
  }
  if (job.tipo === "VIVIENDAS") return planViviendas(job);
  if (job.tipo === "ALOJAMIENTOS") return planAlojamientos(job);

  const err = new Error("Tipo de job no soportado");
  err.status = 400;
  throw err;
}

function buildApplyPlanSummary(applyPlan) {
  const plan = applyPlan || {};
  const creates = Number(plan.totalCreates ?? arr(plan.creates).length);
  const updates = Number(plan.totalUpdates ?? arr(plan.updates).length);
  const blocked = Number(plan.totalBlocked ?? arr(plan.blocked).length);
  const risks = Number(plan.totalRisks ?? arr(plan.risks).length);
  const warnings = Number(plan.totalWarnings ?? arr(plan.warnings).length);
  const requiresManualReview = Number(plan.totalRequiresManualReview ?? arr(plan.requiresManualReview).length);
  const excluded = Number(plan.totalExcluded ?? arr(plan.excluded).length);

  return {
    creates,
    updates,
    blocked,
    risks,
    warnings,
    requiresManualReview,
    excluded,
    totalCreates: creates,
    totalUpdates: updates,
    totalBlocked: blocked,
    totalRisks: risks,
    totalWarnings: warnings,
    totalRequiresManualReview: requiresManualReview,
    totalExcluded: excluded,
    totalSinCambios: Number(plan.totalSinCambios || 0),
    totalItems: Number(plan.totalItems || creates + updates + blocked + risks + warnings + requiresManualReview + excluded),
    isLargePlan: Boolean(plan.isLargePlan),
    detailsTruncated: Boolean(plan.detailsTruncated),
    riskCounts: plan.riskCounts || countByCode(plan.risks),
    blockedCounts: plan.blockedCounts || countByCode(plan.blocked, "reason"),
    warningCounts: plan.warningCounts || countByCode(plan.warnings),
    manualReviewCounts: plan.manualReviewCounts || countByCode(plan.requiresManualReview),
    excludedCounts: plan.excludedCounts || countByCode(plan.excluded, "reason"),
    createsCount: creates,
    updatesCount: updates,
    blockedCount: blocked,
    risksCount: risks,
    warningsCount: warnings,
    requiresManualReviewCount: requiresManualReview,
    excludedCount: excluded,
  };
}

module.exports = {
  buildApplyPlan,
  buildApplyPlanSummary,
  EXCLUDABLE_PERSONAL_BLOCK_CODES,
};
