const { app } = require("electron");
const { createQwepHeaders } = require("./crypto");
const { getConfig, normalizeBaseUrl, patchRuntimeState } = require("./storage");

async function validateAuthentication(config) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/api/extension/auth/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: String(config.token ?? "").trim(),
      signing_secret: String(config.signingSecret ?? "").trim(),
      extension_version: app.getVersion(),
      browser_name: "Electron Desktop",
      user_agent: buildUserAgent(),
    }),
  });

  const body = await parseJson(response);

  if (!response.ok) {
    throw new Error(body?.error ?? "Falha ao autenticar dispositivo.");
  }

  const currentState = await getRuntimeStateSafe();
  const primarySenderKnown = typeof body.is_primary_sender === "boolean";

  await patchRuntimeState({
    authStatus: "authenticated",
    deviceStatus: body.status ?? "active",
    companyName:
      body.company_name ?? currentState.companyName ?? "Empresa autenticada",
    deviceId: body.device_id ?? currentState.deviceId ?? "",
    isPrimarySender: primarySenderKnown
      ? Boolean(body.is_primary_sender)
      : Boolean(currentState.isPrimarySender),
    primarySenderKnown,
    pollingIntervalSeconds: clampPollingInterval(
      Number(config.pollingIntervalSeconds) ||
        Number(body.polling_interval_seconds) ||
        30,
    ),
    heartbeatIntervalSeconds: Number(body.heartbeat_interval_seconds) || 30,
    maxBatchSize: Number(body.max_batch_size) || 5,
    lastError: "",
  });

  return body;
}

async function fetchPendingMessages(limit = 1) {
  const response = await qwepRequest(
    `/api/extension/messages/pending?limit=${encodeURIComponent(String(limit))}`,
    {
      method: "GET",
    },
  );

  await patchRuntimeState({
    lastPollingAt: new Date().toISOString(),
    sendDelayMs: Math.max(Number(response.config?.send_delay_ms) || 5000, 5000),
    pollingIntervalSeconds: clampPollingInterval(
      Number(response.config?.polling_interval_seconds) || 30,
    ),
    heartbeatIntervalSeconds:
      Number(response.config?.heartbeat_interval_seconds) || 30,
  });

  return response;
}

async function sendAck(messageId, payload) {
  return qwepRequest(`/api/extension/messages/${messageId}/ack`, {
    method: "POST",
    body: payload,
  });
}

async function markMessageProcessing(messageId, payload) {
  return sendAck(messageId, {
    ...payload,
    status: "processing",
  });
}

async function sendHeartbeat(payload) {
  const response = await qwepRequest("/api/extension/status/heartbeat", {
    method: "POST",
    body: {
      whatsapp_status: normalizeHeartbeatStatus(payload.whatsapp_status),
      connected_phone: payload.connected_phone ?? "",
      extension_version: app.getVersion(),
      browser_name: "Electron Desktop",
      user_agent: buildUserAgent(),
      local_queue_size: payload.local_queue_size ?? 0,
      last_error: payload.last_error ?? "",
    },
  });

  await patchRuntimeState({
    lastHeartbeatAt: new Date().toISOString(),
    deviceStatus: response.device_status ?? "unknown",
    isPrimarySender:
      typeof response.is_primary_sender === "boolean"
        ? Boolean(response.is_primary_sender)
        : (await getRuntimeStateSafe()).isPrimarySender,
    primarySenderKnown: typeof response.is_primary_sender === "boolean",
    pollingIntervalSeconds: clampPollingInterval(
      Number(response.config?.polling_interval_seconds) || 30,
    ),
    heartbeatIntervalSeconds:
      Number(response.config?.heartbeat_interval_seconds) || 30,
    maxBatchSize: Number(response.config?.max_batch_size) || 5,
    sendDelayMs: Math.max(Number(response.config?.send_delay_ms) || 5000, 5000),
  });

  return response;
}

async function getRuntimeStateSafe() {
  const { getRuntimeState } = require("./storage");
  return getRuntimeState();
}

async function qwepRequest(path, options) {
  const config = await getConfig();

  if (!config?.baseUrl || !config?.token || !config?.signingSecret) {
    throw new Error("Bot desktop nao configurado.");
  }

  const url = new URL(path, normalizeBaseUrl(config.baseUrl));
  const method = options.method ?? "GET";
  const bodyText =
    options.body === undefined ? "" : JSON.stringify(options.body ?? {});
  const headers = createQwepHeaders({
    method,
    pathname: url.pathname,
    bodyText,
    token: config.token,
    signingSecret: config.signingSecret,
  });

  const response = await fetch(url.toString(), {
    method,
    headers: {
      ...headers,
      ...(bodyText ? { "Content-Type": "application/json" } : {}),
    },
    body: bodyText || undefined,
  });

  const body = await parseJson(response);

  if (!response.ok) {
    throw new Error(body?.error ?? `Falha HTTP ${response.status}.`);
  }

  return body;
}

function normalizeHeartbeatStatus(status) {
  const allowed = new Set([
    "connected",
    "disconnected",
    "loading",
    "qr_required",
    "error",
    "sending",
    "syncing",
  ]);

  return allowed.has(status) ? status : "disconnected";
}

function clampPollingInterval(value) {
  return Math.min(Math.max(Number(value) || 30, 20), 30);
}

function buildUserAgent() {
  return `Queue SaaS Bot/${app.getVersion()} Electron/${process.versions.electron} Chrome/${process.versions.chrome}`;
}

async function parseJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

module.exports = {
  fetchPendingMessages,
  markMessageProcessing,
  sendAck,
  sendHeartbeat,
  validateAuthentication,
};
