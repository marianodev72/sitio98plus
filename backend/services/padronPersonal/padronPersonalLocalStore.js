const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_PADRON_PATH = path.join(
  process.cwd(),
  "secure-data",
  "padron-personal",
  "padron-personal-vigente.json"
);

let cache = null;

function normalizeMatricula(value) {
  return String(value || "").trim();
}

function normalizeDni(value) {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

function normalizeEstado(value) {
  const estado = String(value || "").toUpperCase().trim();
  return estado || "VIGENTE";
}

function getPadronPath() {
  return String(process.env.PADRON_PERSONAL_PATH || DEFAULT_PADRON_PATH);
}

function getBackupDir(padronPath = getPadronPath()) {
  return String(process.env.PADRON_PERSONAL_BACKUP_DIR || path.join(path.dirname(padronPath), "backups"));
}

function getStagingDir(padronPath = getPadronPath()) {
  return String(process.env.PADRON_PERSONAL_STAGING_DIR || path.join(path.dirname(padronPath), "staging"));
}

function getHmacSecret() {
  return String(process.env.PADRON_PERSONAL_HMAC_SECRET || "").trim();
}

function requireHmacSecret() {
  const secret = getHmacSecret();
  if (!secret) {
    const err = new Error("PADRON_PERSONAL_HMAC_SECRET no configurado");
    err.code = "PADRON_HMAC_SECRET_MISSING";
    throw err;
  }
  return secret;
}

function hashDni(dni) {
  const normalized = normalizeDni(dni);
  if (!normalized) return "";
  return crypto.createHmac("sha256", requireHmacSecret()).update(normalized).digest("hex");
}

function shortFingerprint(value) {
  const input = String(value || "");
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function validatePadronPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Padron invalido");
  if (Number(payload.version) !== 1) throw new Error("Version de padron no soportada");
  if (!Array.isArray(payload.records)) throw new Error("Padron sin records");

  const seenMatriculas = new Set();
  for (const record of payload.records) {
    const matricula = normalizeMatricula(record?.matricula);
    if (!matricula) throw new Error("Padron con matricula vacia");
    if (!record?.dniHash) throw new Error("Padron con dniHash vacio");
    if (seenMatriculas.has(matricula)) throw new Error("Padron con matricula duplicada");
    seenMatriculas.add(matricula);
  }
  return true;
}

function buildIndex(payload, stat) {
  const byMatricula = new Map();
  for (const record of payload.records || []) {
    byMatricula.set(normalizeMatricula(record.matricula), record);
  }
  return {
    path: getPadronPath(),
    mtimeMs: stat ? stat.mtimeMs : null,
    loadedAt: new Date(),
    payload,
    byMatricula,
  };
}

function loadPadron() {
  const filePath = getPadronPath();
  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    if (cache && cache.path === filePath) cache = null;
    const error = new Error("Padron local no disponible");
    error.code = "PADRON_NOT_FOUND";
    throw error;
  }

  if (cache && cache.path === filePath && cache.mtimeMs === stat.mtimeMs) return cache;

  const payload = readJsonFile(filePath);
  validatePadronPayload(payload);
  cache = buildIndex(payload, stat);
  return cache;
}

function findPadronRecord({ matricula, dni }) {
  const normalizedMatricula = normalizeMatricula(matricula);
  const normalizedDni = normalizeDni(dni);
  if (!normalizedMatricula || !normalizedDni) {
    return { ok: false, reason: "REGISTRO_PADRON_NO_ENCONTRADO" };
  }

  const loaded = loadPadron();
  const record = loaded.byMatricula.get(normalizedMatricula);
  if (!record) return { ok: false, reason: "REGISTRO_PADRON_NO_ENCONTRADO" };
  if (record.dniHash !== hashDni(normalizedDni)) {
    return { ok: false, reason: "REGISTRO_DNI_NO_COINCIDE" };
  }
  if (record.vigente === false || normalizeEstado(record.estado) !== "VIGENTE") {
    return { ok: false, reason: "REGISTRO_PADRON_NO_VIGENTE" };
  }
  return { ok: true, reason: "REGISTRO_OK_PADRON_LOCAL", record };
}

function ensureSafeRecord(row, defaults = {}) {
  const matricula = normalizeMatricula(row?.matricula);
  const dni = normalizeDni(row?.dni);
  const dniHash = String(row?.dniHash || "").trim();
  if (!matricula || (!dni && !dniHash)) {
    const err = new Error("Registro de padron sin matricula o DNI");
    err.code = "PADRON_RECORD_INVALID";
    throw err;
  }
  return {
    matricula,
    dniHash: dniHash || hashDni(dni),
    nombreApellido: String(row?.nombreApellido || "").trim(),
    tipoPersonal: row?.tipoPersonal || null,
    grupoJerarquico: row?.grupoJerarquico || "NO_DEFINIDO",
    precedencia: row?.precedencia ?? null,
    vigente: row?.vigente !== false,
    estado: normalizeEstado(row?.estado || defaults.estado || "VIGENTE"),
  };
}

function validateInputRecords(records) {
  const seenMatriculas = new Set();
  const seenDniHashes = new Map();
  for (const row of records) {
    const record = ensureSafeRecord(row);
    if (seenMatriculas.has(record.matricula)) {
      const err = new Error("Padron con matricula duplicada");
      err.code = "PADRON_DUPLICATE_MATRICULA";
      throw err;
    }
    seenMatriculas.add(record.matricula);
    const existingMatricula = seenDniHashes.get(record.dniHash);
    if (existingMatricula && existingMatricula !== record.matricula) {
      const err = new Error("Padron con conflicto matricula/DNI");
      err.code = "PADRON_DNI_CONFLICT";
      throw err;
    }
    seenDniHashes.set(record.dniHash, record.matricula);
  }
}

function mergePadronRecords(existingRecords, incomingRecords) {
  const merged = new Map();
  for (const record of existingRecords || []) {
    merged.set(normalizeMatricula(record.matricula), { ...record });
  }
  for (const row of incomingRecords || []) {
    const safe = ensureSafeRecord(row);
    merged.set(safe.matricula, safe);
  }
  return [...merged.values()].sort((a, b) => String(a.matricula).localeCompare(String(b.matricula)));
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function stagedPadronPath(sourceJobId) {
  const safeJobId = String(sourceJobId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeJobId) {
    const err = new Error("sourceJobId requerido para staging de padron");
    err.code = "PADRON_STAGE_JOB_ID_REQUIRED";
    throw err;
  }
  return path.join(getStagingDir(), `padron-personal-stage-${safeJobId}.json`);
}

function writeStagedPadronAtomic({ sourceJobId, records, metadata = {} }) {
  if (!Array.isArray(records)) throw new Error("records debe ser array");
  validateInputRecords(records);

  const filePath = stagedPadronPath(sourceJobId);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const payload = {
    version: 1,
    generatedAt: now.toISOString(),
    source: metadata.source || {},
    hash: { alg: "HMAC-SHA256", field: "dni" },
    records: records.map((row) => ensureSafeRecord(row)),
  };
  validatePadronPayload(payload);

  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
  const check = readJsonFile(tmpPath);
  validatePadronPayload(check);
  fs.renameSync(tmpPath, filePath);

  return {
    path: filePath,
    count: payload.records.length,
    generatedAt: payload.generatedAt,
    fingerprint: shortFingerprint(`${sourceJobId}:${payload.generatedAt}:${payload.records.length}`),
  };
}

function loadStagedPadron(sourceJobId) {
  const filePath = stagedPadronPath(sourceJobId);
  const payload = readJsonFile(filePath);
  validatePadronPayload(payload);
  return payload;
}

function removeStagedPadron(sourceJobId) {
  const filePath = stagedPadronPath(sourceJobId);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return { path: filePath, removed: true };
}

function padronAlreadyApplied({ sourceJobId, sourceSha256, modoCarga }) {
  let loaded = null;
  try {
    loaded = loadPadron();
  } catch (err) {
    if (err.code === "PADRON_NOT_FOUND") return { applied: false };
    throw err;
  }

  const source = loaded.payload?.source || {};
  if (String(source.sourceJobId || "") !== String(sourceJobId || "")) return { applied: false };

  const expectedSha = String(sourceSha256 || "");
  const currentSha = String(source.sourceSha256 || "");
  const expectedModo = String(modoCarga || "").toUpperCase().trim();
  const currentModo = String(source.modoCarga || "").toUpperCase().trim();
  if (expectedSha !== currentSha || expectedModo !== currentModo) {
    const err = new Error("Padron vigente coincide con sourceJobId pero no con metadata critica");
    err.code = "PADRON_SOURCE_METADATA_CONFLICT";
    throw err;
  }

  return {
    applied: true,
    records: Array.isArray(loaded.payload.records) ? loaded.payload.records.length : 0,
    generatedAt: loaded.payload.generatedAt || null,
    fingerprint: shortFingerprint(`${currentSha}:${currentModo}:${source.sourceJobId || ""}`),
  };
}

function writePadronAtomic({ records, metadata = {} }) {
  if (!Array.isArray(records)) throw new Error("records debe ser array");
  validateInputRecords(records);

  const filePath = getPadronPath();
  const dir = path.dirname(filePath);
  const backupDir = getBackupDir(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const payload = {
    version: 1,
    generatedAt: now.toISOString(),
    source: metadata.source || {},
    hash: { alg: "HMAC-SHA256", field: "dni" },
    records: records.map((row) => ensureSafeRecord(row)),
  };
  validatePadronPayload(payload);

  if (fs.existsSync(filePath)) {
    const backupPath = path.join(backupDir, `padron-personal-vigente.json.bak.${timestampForFile(now)}`);
    fs.copyFileSync(filePath, backupPath);
  }

  const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
  const check = readJsonFile(tmpPath);
  validatePadronPayload(check);
  fs.renameSync(tmpPath, filePath);
  cache = null;

  return {
    path: filePath,
    count: payload.records.length,
    generatedAt: payload.generatedAt,
    fingerprint: shortFingerprint(`${payload.generatedAt}:${payload.records.length}:${metadata?.source?.sourceSha256 || ""}`),
  };
}

function getPadronStatus() {
  const filePath = getPadronPath();
  const status = {
    source: String(process.env.REGISTRO_PADRON_SOURCE || "csv"),
    path: filePath,
    exists: false,
    records: 0,
    generatedAt: null,
    loadedAt: cache?.loadedAt || null,
  };
  try {
    const loaded = loadPadron();
    status.exists = true;
    status.records = loaded.payload.records.length;
    status.generatedAt = loaded.payload.generatedAt || null;
  } catch (err) {
    status.error = err.code || "PADRON_STATUS_ERROR";
  }
  return status;
}

module.exports = {
  normalizeMatricula,
  normalizeDni,
  hashDni,
  loadPadron,
  findPadronRecord,
  writePadronAtomic,
  writeStagedPadronAtomic,
  loadStagedPadron,
  removeStagedPadron,
  padronAlreadyApplied,
  mergePadronRecords,
  getPadronStatus,
};
