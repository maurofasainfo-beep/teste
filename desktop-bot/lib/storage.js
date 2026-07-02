const fs = require("node:fs");
const path = require("node:path");

const STORE_FILE = "fasawait-bot-state.json";
const STORE_BACKUP_FILE = "fasawait-bot-state.backup.json";
const STORE_TEMP_FILE = "fasawait-bot-state.tmp.json";
const LEGACY_STORE_FILES = ["queue-saas-bot-state.json"];

const DEFAULT_STATE = {
  authStatus: "not_configured",
  deviceStatus: "not_configured",
  whatsappStatus: "disconnected",
  botRunning: false,
  companyName: "",
  deviceId: "",
  isPrimarySender: false,
  primarySenderKnown: false,
  connectedPhone: "",
  lastHeartbeatAt: "",
  lastPollingAt: "",
  lastPollingAttemptAt: "",
  lastPollingOkAt: "",
  lastSendAt: "",
  lastError: "",
  processedCount: 0,
  localQueueSize: 0,
  pendingMessageCount: 0,
  retryMessageCount: 0,
  reservedMessageCount: 0,
  processingMessageCount: 0,
  failedMessageCount: 0,
  currentMessageId: "",
  processingStartedAt: "",
  lastProcessedMessageId: "",
  pollingFailureCount: 0,
  heartbeatFailureCount: 0,
  watchdogStatus: "",
  startupNotice: "",
  lastStartupAt: "",
  pollingIntervalSeconds: 30,
  heartbeatIntervalSeconds: 30,
  maxBatchSize: 5,
  sendDelayMs: 5000,
  backoffUntil: 0,
};

let storageFilePath = "";
let electronSafeStorage = null;

function configureStorage({ dataDir, legacyDataDirs = [], safeStorage }) {
  storageFilePath = path.join(dataDir, STORE_FILE);
  electronSafeStorage = safeStorage;
  fs.mkdirSync(path.dirname(storageFilePath), { recursive: true });
  migrateLegacyStore([dataDir, ...legacyDataDirs]);
  ensureStore();
}

function ensureConfigured() {
  if (!storageFilePath) {
    throw new Error("Storage nao configurado.");
  }
}

function ensureStore() {
  ensureConfigured();

  if (!fs.existsSync(storageFilePath)) {
    writeStore({ config: null, state: DEFAULT_STATE, logs: [] });
  }
}

function migrateLegacyStore(legacyDataDirs) {
  ensureConfigured();

  if (fs.existsSync(storageFilePath)) {
    return;
  }

  for (const legacyDataDir of legacyDataDirs) {
    for (const legacyFile of LEGACY_STORE_FILES) {
      const legacyPath = path.join(legacyDataDir, legacyFile);

      if (!fs.existsSync(legacyPath)) {
        continue;
      }

      try {
        fs.copyFileSync(legacyPath, storageFilePath);
        return;
      } catch {
        return;
      }
    }
  }
}

function readStore() {
  ensureStore();

  try {
    return normalizeStore(JSON.parse(fs.readFileSync(storageFilePath, "utf8")));
  } catch {
    return readBackupStore();
  }
}

function writeStore(store) {
  ensureConfigured();
  const directory = path.dirname(storageFilePath);
  const backupPath = path.join(directory, STORE_BACKUP_FILE);
  const tempPath = path.join(directory, STORE_TEMP_FILE);
  const normalized = normalizeStore(store);
  const payload = JSON.stringify(normalized, null, 2);

  if (fs.existsSync(storageFilePath)) {
    try {
      fs.copyFileSync(storageFilePath, backupPath);
    } catch {
      // A falha de backup nao deve impedir a gravacao atomica do estado atual.
    }
  }

  fs.writeFileSync(tempPath, payload, "utf8");
  fs.renameSync(tempPath, storageFilePath);
}

function readBackupStore() {
  const backupPath = path.join(path.dirname(storageFilePath), STORE_BACKUP_FILE);

  try {
    return normalizeStore(JSON.parse(fs.readFileSync(backupPath, "utf8")));
  } catch {
    return { config: null, state: { ...DEFAULT_STATE }, logs: [] };
  }
}

function normalizeStore(store) {
  return {
    config: store?.config ?? null,
    state: { ...DEFAULT_STATE, ...(store?.state ?? {}) },
    logs: Array.isArray(store?.logs) ? store.logs.slice(0, 120) : [],
  };
}

function canEncrypt() {
  return Boolean(electronSafeStorage?.isEncryptionAvailable?.());
}

function encryptSecret(value) {
  const secret = String(value ?? "").trim();

  if (!secret) {
    return null;
  }

  if (canEncrypt()) {
    return {
      mode: "safeStorage",
      value: electronSafeStorage.encryptString(secret).toString("base64"),
    };
  }

  return {
    mode: "plain_fallback",
    value: secret,
  };
}

function decryptSecret(record) {
  if (!record) {
    return "";
  }

  if (typeof record === "string") {
    return record;
  }

  if (record.mode === "safeStorage" && record.value && canEncrypt()) {
    try {
      return electronSafeStorage.decryptString(Buffer.from(record.value, "base64"));
    } catch {
      return "";
    }
  }

  if (record.mode === "plain_fallback") {
    return String(record.value ?? "");
  }

  return "";
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value ?? "").trim());
  const host = url.hostname.toLowerCase();
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (url.protocol === "http:" && !isLocalHost) {
    url.protocol = "https:";
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function getConfig() {
  const store = readStore();

  if (!store.config) {
    return null;
  }

  return {
    baseUrl: store.config.baseUrl,
    token: decryptSecret(store.config.token),
    signingSecret: decryptSecret(store.config.signingSecret),
    pollingIntervalSeconds: Number(store.config.pollingIntervalSeconds || 30),
    sendDelayMs: Number(store.config.sendDelayMs || 5000),
    autoStart: Boolean(store.config.autoStart),
  };
}

async function getPublicConfig() {
  const store = readStore();

  if (!store.config) {
    return null;
  }

  return {
    baseUrl: store.config.baseUrl,
    hasToken: Boolean(store.config.token),
    hasSigningSecret: Boolean(store.config.signingSecret),
    pollingIntervalSeconds: Number(store.config.pollingIntervalSeconds || 30),
    sendDelayMs: Number(store.config.sendDelayMs || 5000),
    autoStart: Boolean(store.config.autoStart),
    credentialStorage: canEncrypt() ? "safeStorage" : "plain_fallback",
  };
}

async function saveConfig(config) {
  const store = readStore();
  const current = store.config ?? {};
  const token = String(config.token ?? "").trim();
  const signingSecret = String(config.signingSecret ?? "").trim();

  const nextConfig = {
    baseUrl: normalizeBaseUrl(config.baseUrl ?? current.baseUrl ?? ""),
    token: token ? encryptSecret(token) : current.token ?? null,
    signingSecret: signingSecret
      ? encryptSecret(signingSecret)
      : current.signingSecret ?? null,
    pollingIntervalSeconds: Math.min(
      Math.max(Number(config.pollingIntervalSeconds || current.pollingIntervalSeconds || 30), 20),
      30,
    ),
    sendDelayMs: Math.min(
      Math.max(Number(config.sendDelayMs || current.sendDelayMs || 5000), 5000),
      10000,
    ),
    autoStart:
      typeof config.autoStart === "boolean"
        ? config.autoStart
        : Boolean(current.autoStart),
  };

  writeStore({ ...store, config: nextConfig });
  return getPublicConfig();
}

async function setAutoStart(autoStart) {
  const store = readStore();
  const current = store.config ?? {};
  writeStore({
    ...store,
    config: {
      ...current,
      autoStart: Boolean(autoStart),
    },
  });
  return getPublicConfig();
}

async function clearConfig() {
  const store = readStore();
  writeStore({
    config: null,
    state: { ...DEFAULT_STATE },
    logs: store.logs,
  });
}

async function getRuntimeState() {
  return { ...DEFAULT_STATE, ...(readStore().state ?? {}) };
}

async function patchRuntimeState(patch) {
  const store = readStore();
  const next = { ...DEFAULT_STATE, ...(store.state ?? {}), ...patch };
  writeStore({ ...store, state: next });
  return next;
}

async function resetRuntimeState() {
  const store = readStore();
  writeStore({
    ...store,
    state: {
      ...DEFAULT_STATE,
      authStatus: store.state?.authStatus ?? "not_configured",
      companyName: store.state?.companyName ?? "",
      deviceId: store.state?.deviceId ?? "",
      isPrimarySender: Boolean(store.state?.isPrimarySender),
      primarySenderKnown: Boolean(store.state?.primarySenderKnown),
      botRunning: Boolean(store.state?.botRunning),
    },
  });
}

async function appendLocalLog(entry) {
  const store = readStore();
  const nextLogs = [
    {
      at: new Date().toISOString(),
      level: entry.level ?? "info",
      event: entry.event ?? "event",
      message: sanitizeLogMessage(entry.message ?? ""),
      metadata: sanitizeMetadata(entry.metadata ?? {}),
    },
    ...store.logs,
  ].slice(0, 120);

  writeStore({ ...store, logs: nextLogs });
}

async function getLocalLogs() {
  return readStore().logs;
}

function sanitizeLogMessage(value) {
  return String(value)
    .replace(/qwep_(live|sig)_[A-Za-z0-9_-]+/g, "[secret]")
    .slice(0, 500);
}

function sanitizeMetadata(metadata) {
  const safe = {};

  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (/token|secret|authorization/i.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }

    if (/phone|telefone|to/i.test(key) && typeof value === "string") {
      safe[key] = maskPhone(value);
      continue;
    }

    safe[key] = value;
  }

  return safe;
}

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

module.exports = {
  DEFAULT_STATE,
  appendLocalLog,
  clearConfig,
  configureStorage,
  getConfig,
  getLocalLogs,
  getPublicConfig,
  getRuntimeState,
  maskPhone,
  normalizeBaseUrl,
  patchRuntimeState,
  resetRuntimeState,
  saveConfig,
  setAutoStart,
};
