const STORAGE_KEYS = {
  config: "qwep.config",
  state: "qwep.state",
  logs: "qwep.logs",
};

const DEFAULT_STATE = {
  authStatus: "not_configured",
  deviceStatus: "not_configured",
  whatsappStatus: "disconnected",
  companyName: "",
  deviceId: "",
  isPrimarySender: false,
  connectedPhone: "",
  lastHeartbeatAt: "",
  lastPollingAt: "",
  lastSendAt: "",
  lastError: "",
  localQueueSize: 0,
  currentMessageId: "",
  processingStartedAt: "",
  lastProcessedMessageId: "",
  lastNavigationAt: "",
  navigationInProgress: false,
  pollingIntervalSeconds: 30,
  heartbeatIntervalSeconds: 30,
  maxBatchSize: 5,
  sendDelayMs: 3000,
};

export async function getConfig() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.config);
  return data[STORAGE_KEYS.config] ?? null;
}

export async function saveConfig(config) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.config]: {
      baseUrl: normalizeBaseUrl(config.baseUrl),
      token: String(config.token ?? "").trim(),
      signingSecret: String(config.signingSecret ?? "").trim(),
      pollingIntervalSeconds: Number(config.pollingIntervalSeconds || 30),
      sendDelayMs: Number(config.sendDelayMs || 3000),
    },
  });
}

export async function clearConfig() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.config,
    STORAGE_KEYS.state,
    STORAGE_KEYS.logs,
  ]);
}

export async function getRuntimeState() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.state);
  return { ...DEFAULT_STATE, ...(data[STORAGE_KEYS.state] ?? {}) };
}

export async function patchRuntimeState(patch) {
  const current = await getRuntimeState();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEYS.state]: next });
  return next;
}

export async function appendLocalLog(entry) {
  const data = await chrome.storage.local.get(STORAGE_KEYS.logs);
  const logs = Array.isArray(data[STORAGE_KEYS.logs])
    ? data[STORAGE_KEYS.logs]
    : [];
  const nextLogs = [
    {
      at: new Date().toISOString(),
      level: entry.level ?? "info",
      event: entry.event ?? "event",
      message: sanitizeLogMessage(entry.message ?? ""),
      metadata: sanitizeMetadata(entry.metadata ?? {}),
    },
    ...logs,
  ].slice(0, 80);

  await chrome.storage.local.set({ [STORAGE_KEYS.logs]: nextLogs });
}

export async function getLocalLogs() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.logs);
  return Array.isArray(data[STORAGE_KEYS.logs]) ? data[STORAGE_KEYS.logs] : [];
}

export function normalizeBaseUrl(value) {
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

function sanitizeLogMessage(value) {
  return String(value).replace(/qwep_(live|sig)_[A-Za-z0-9_-]+/g, "[secret]");
}

function sanitizeMetadata(metadata) {
  const safe = {};

  for (const [key, value] of Object.entries(metadata)) {
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

export function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}
