import { createQwepHeaders } from "./crypto.js";
import { getConfig, normalizeBaseUrl, patchRuntimeState } from "./storage.js";

export async function validateAuthentication(config) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/api/extension/auth/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: String(config.token ?? "").trim(),
      signing_secret: String(config.signingSecret ?? "").trim(),
      extension_version: getExtensionVersion(),
      browser_name: "Chrome",
      user_agent: navigator.userAgent,
    }),
  });

  const body = await parseJson(response);

  if (!response.ok) {
    throw new Error(body?.error ?? "Falha ao autenticar dispositivo.");
  }

  ensureQwepJsonResponse(response, body);

  await patchRuntimeState({
    authStatus: "authenticated",
    deviceStatus: body.status ?? "active",
    companyName: body.company_name ?? "",
    deviceId: body.device_id ?? "",
    isPrimarySender: Boolean(body.is_primary_sender),
    pollingIntervalSeconds:
      Number(config.pollingIntervalSeconds) ||
      Number(body.polling_interval_seconds) ||
      30,
    heartbeatIntervalSeconds: Number(body.heartbeat_interval_seconds) || 30,
    maxBatchSize: Number(body.max_batch_size) || 5,
    lastError: "",
  });

  return body;
}

export async function fetchPendingMessages(limit) {
  const response = await qwepRequest(
    `/api/extension/messages/pending?limit=${encodeURIComponent(String(limit || 5))}`,
    {
      method: "GET",
    },
  );

  await patchRuntimeState({
    lastPollingAt: new Date().toISOString(),
    sendDelayMs: Number(response.config?.send_delay_ms) || 3000,
    pollingIntervalSeconds: Number(response.config?.polling_interval_seconds) || 30,
    heartbeatIntervalSeconds:
      Number(response.config?.heartbeat_interval_seconds) || 30,
  });

  return response;
}

export async function sendAck(messageId, payload) {
  return qwepRequest(`/api/extension/messages/${messageId}/ack`, {
    method: "POST",
    body: payload,
  });
}

export async function markMessageProcessing(messageId, payload) {
  return sendAck(messageId, {
    ...payload,
    status: "processing",
  });
}

export async function sendHeartbeat(payload) {
  const response = await qwepRequest("/api/extension/status/heartbeat", {
    method: "POST",
    body: {
      whatsapp_status: normalizeHeartbeatStatus(payload.whatsapp_status),
      connected_phone: payload.connected_phone ?? "",
      extension_version: getExtensionVersion(),
      browser_name: "Chrome",
      user_agent: navigator.userAgent,
      local_queue_size: payload.local_queue_size ?? 0,
      last_error: payload.last_error ?? "",
    },
  });

  await patchRuntimeState({
    lastHeartbeatAt: new Date().toISOString(),
    deviceStatus: response.device_status ?? "not_configured",
    isPrimarySender: Boolean(response.is_primary_sender),
    pollingIntervalSeconds: Number(response.config?.polling_interval_seconds) || 30,
    heartbeatIntervalSeconds:
      Number(response.config?.heartbeat_interval_seconds) || 30,
    maxBatchSize: Number(response.config?.max_batch_size) || 5,
    sendDelayMs: Number(response.config?.send_delay_ms) || 3000,
  });

  return response;
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

async function qwepRequest(path, options) {
  const config = await getConfig();

  if (!config?.baseUrl || !config?.token || !config?.signingSecret) {
    throw new Error("Extensao nao configurada.");
  }

  const url = new URL(path, normalizeBaseUrl(config.baseUrl));
  const method = options.method ?? "GET";
  const bodyText =
    options.body === undefined ? "" : JSON.stringify(options.body ?? {});
  const headers = await createQwepHeaders({
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
    throw new Error(getResponseErrorMessage(body, response.status));
  }

  ensureQwepJsonResponse(response, body);

  return body;
}

function getResponseErrorMessage(body, status) {
  if (body?.error && body?.detail) {
    return `${body.error}: ${body.detail}`;
  }

  if (body?.error) {
    return body.error;
  }

  return `Falha HTTP ${status}.`;
}

function ensureQwepJsonResponse(response, body) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json") || body?.raw) {
    throw new Error(
      "API QWEP indisponivel nesta URL. O servidor respondeu HTML em vez de JSON. Verifique o deploy do Next.js/Netlify e as rotas /api/extension.",
    );
  }
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

function getExtensionVersion() {
  return chrome.runtime.getManifest().version;
}
