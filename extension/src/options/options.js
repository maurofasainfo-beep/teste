const STORAGE_CONFIG_KEY = "qwep.config";

const form = document.getElementById("config-form");
const baseUrl = document.getElementById("base-url");
const token = document.getElementById("token");
const signingSecret = document.getElementById("signing-secret");
const pollingInterval = document.getElementById("polling-interval");
const sendDelay = document.getElementById("send-delay");
const statusMessage = document.getElementById("status-message");
const testConnection = document.getElementById("test-connection");
const clearConfig = document.getElementById("clear-config");
const authStatus = document.getElementById("auth-status");
const companyName = document.getElementById("company-name");
const deviceStatus = document.getElementById("device-status");
const whatsappStatus = document.getElementById("whatsapp-status");
const localLogs = document.getElementById("local-logs");

document.addEventListener("DOMContentLoaded", hydrate);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveAndTest();
});
testConnection.addEventListener("click", saveAndTest);
clearConfig.addEventListener("click", async () => {
  const confirmed = confirm("Limpar credenciais salvas nesta extensao?");

  if (!confirmed) {
    return;
  }

  await safeSend("QWEP_CLEAR_CONFIG");
  token.value = "";
  signingSecret.value = "";
  setStatus("Credenciais removidas.", "ok");
  await hydrate();
});

async function hydrate() {
  const rawConfig = await getRawConfig();
  const response = await safeSend("QWEP_GET_STATE");
  const state = response?.state ?? {};
  const logs = response?.logs ?? [];

  if (rawConfig?.baseUrl) {
    baseUrl.value = rawConfig.baseUrl;
  }

  pollingInterval.value = String(rawConfig?.pollingIntervalSeconds ?? 30);
  sendDelay.value = String(rawConfig?.sendDelayMs ?? 3000);
  authStatus.textContent = labelAuthStatus(state.authStatus);
  companyName.textContent = formatDisplayValue(state.companyName, "Nao conectada");
  deviceStatus.textContent = labelDeviceStatus(state.deviceStatus);
  whatsappStatus.textContent = labelWhatsAppStatus(state.whatsappStatus);
  renderLogs(logs);
}

async function saveAndTest() {
  try {
    setStatus("Validando configuracao...", "");
    const currentConfig = await getRawConfig();
    const nextConfig = {
      baseUrl: baseUrl.value.trim(),
      token: token.value.trim() || currentConfig?.token || "",
      signingSecret:
        signingSecret.value.trim() || currentConfig?.signingSecret || "",
      pollingIntervalSeconds: Number(pollingInterval.value || 30),
      sendDelayMs: Number(sendDelay.value || 3000),
    };

    if (!nextConfig.token || !nextConfig.signingSecret) {
      throw new Error("Informe token e signing secret.");
    }

    await ensureHostPermission(nextConfig.baseUrl);
    const response = await safeSend("QWEP_SAVE_CONFIG", {
      config: nextConfig,
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Falha ao testar conexao.");
    }

    token.value = "";
    signingSecret.value = "";
    setStatus("Conexao validada com sucesso.", "ok");
    await hydrate();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
}

async function ensureHostPermission(value) {
  const pattern = toOriginPattern(value);
  const hasPermission = await chrome.permissions.contains({ origins: [pattern] });

  if (hasPermission) {
    return;
  }

  const granted = await chrome.permissions.request({ origins: [pattern] });

  if (!granted) {
    throw new Error("Permissao para acessar o SaaS nao foi concedida.");
  }
}

function toOriginPattern(value) {
  const url = new URL(value);
  return `${url.protocol}//${url.hostname}/*`;
}

async function getRawConfig() {
  const data = await chrome.storage.local.get(STORAGE_CONFIG_KEY);
  return data[STORAGE_CONFIG_KEY] ?? null;
}

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

async function safeSend(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, ...payload });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderLogs(logs) {
  localLogs.textContent = "";

  if (!logs.length) {
    const item = document.createElement("li");
    item.textContent = "Nenhum log local registrado.";
    localLogs.appendChild(item);
    return;
  }

  for (const log of logs.slice(0, 20)) {
    const item = document.createElement("li");
    const date = log.at
      ? new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date(log.at))
      : "Aguardando";
    item.textContent = `${date} - ${log.event}: ${log.message}`;
    localLogs.appendChild(item);
  }
}

function labelAuthStatus(value) {
  const labels = {
    authenticated: "Autenticado",
    authenticating: "Autenticando",
    error: "Erro",
    not_configured: "Nao configurado",
    revoked: "Revogado",
  };

  return labels[value] ?? "Aguardando conexao";
}

function labelDeviceStatus(value) {
  const labels = {
    active: "Ativo",
    created: "Criado",
    disconnected: "Desconectado",
    error: "Erro",
    expired: "Expirado",
    not_configured: "Nao configurado",
    pending_activation: "Aguardando ativacao",
    revoked: "Revogado",
  };

  return labels[value] ?? "Aguardando conexao";
}

function labelWhatsAppStatus(value) {
  const labels = {
    connected: "Conectado",
    disconnected: "Desconectado",
    error: "Erro",
    loading: "Carregando",
    qr_required: "Aguardando QR Code",
    sending: "Enviando",
    syncing: "Sincronizando",
  };

  return labels[value] ?? "Aguardando conexao";
}

function formatDisplayValue(value, fallback) {
  const text = String(value ?? "").trim();

  if (!text || ["unknown", "undefined", "null", "-"].includes(text.toLowerCase())) {
    return fallback;
  }

  return text;
}
