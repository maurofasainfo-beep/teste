const elements = {
  authDot: document.getElementById("auth-dot"),
  authStatus: document.getElementById("auth-status"),
  autoStart: document.getElementById("auto-start"),
  baseUrl: document.getElementById("base-url"),
  botStatus: document.getElementById("bot-status"),
  botStatusDot: document.getElementById("bot-status-dot"),
  clearConfig: document.getElementById("clear-config"),
  companyName: document.getElementById("company-name"),
  configForm: document.getElementById("config-form"),
  connectedPhone: document.getElementById("connected-phone"),
  copyBaseUrl: document.getElementById("copy-base-url"),
  copySigningSecret: document.getElementById("copy-signing-secret"),
  copyToken: document.getElementById("copy-token"),
  credentialHint: document.getElementById("credential-hint"),
  heartbeatHealth: document.getElementById("heartbeat-health"),
  lastError: document.getElementById("last-error"),
  lastErrorBox: document.getElementById("last-error-box"),
  lastHeartbeat: document.getElementById("last-heartbeat"),
  lastPolling: document.getElementById("last-polling"),
  lastSend: document.getElementById("last-send"),
  localQueue: document.getElementById("local-queue"),
  logs: document.getElementById("logs"),
  openWhatsApp: document.getElementById("open-whatsapp"),
  pollingInterval: document.getElementById("polling-interval"),
  primaryDot: document.getElementById("primary-dot"),
  primaryStatus: document.getElementById("primary-status"),
  processedCount: document.getElementById("processed-count"),
  refreshStatus: document.getElementById("refresh-status"),
  resetState: document.getElementById("reset-state"),
  sendDelay: document.getElementById("send-delay"),
  signingSecret: document.getElementById("signing-secret"),
  startBot: document.getElementById("start-bot"),
  stopBot: document.getElementById("stop-bot"),
  testConnection: document.getElementById("test-connection"),
  token: document.getElementById("token"),
  toggleSigningSecret: document.getElementById("toggle-signing-secret"),
  toggleToken: document.getElementById("toggle-token"),
  whatsappDot: document.getElementById("whatsapp-dot"),
  whatsappStatus: document.getElementById("whatsapp-status"),
};

let lastSnapshot = null;

elements.configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runAction(() =>
    window.queueBot.saveConfig({
      baseUrl: elements.baseUrl.value,
      token: elements.token.value,
      signingSecret: elements.signingSecret.value,
      pollingIntervalSeconds: Number(elements.pollingInterval.value || 30),
      sendDelayMs: Number(elements.sendDelay.value || 5000),
      autoStart: elements.autoStart.checked,
    }),
  );
  elements.token.value = "";
  elements.signingSecret.value = "";
  await refresh();
});

elements.testConnection.addEventListener("click", () =>
  runAction(window.queueBot.testConnection),
);
elements.clearConfig.addEventListener("click", async () => {
  if (!confirm("Limpar credenciais salvas deste computador?")) {
    return;
  }

  await runAction(window.queueBot.clearConfig);
  elements.token.value = "";
  elements.signingSecret.value = "";
  await refresh();
});
elements.startBot.addEventListener("click", () => runAction(window.queueBot.startBot));
elements.stopBot.addEventListener("click", () => runAction(window.queueBot.stopBot));
elements.openWhatsApp.addEventListener("click", () =>
  runAction(window.queueBot.openWhatsApp),
);
elements.resetState.addEventListener("click", async () => {
  if (!confirm("Resetar locks, filas locais e erros sem apagar credenciais?")) {
    return;
  }

  await runAction(window.queueBot.resetState);
});
elements.refreshStatus.addEventListener("click", () =>
  runAction(window.queueBot.refreshWhatsAppStatus),
);
elements.autoStart.addEventListener("change", () =>
  runAction(() => window.queueBot.setAutoStart(elements.autoStart.checked)),
);
elements.toggleToken.addEventListener("click", () =>
  toggleSecretVisibility(elements.token, elements.toggleToken),
);
elements.toggleSigningSecret.addEventListener("click", () =>
  toggleSecretVisibility(elements.signingSecret, elements.toggleSigningSecret),
);
elements.copyBaseUrl.addEventListener("click", () =>
  copyInputValue(elements.baseUrl, "URL"),
);
elements.copyToken.addEventListener("click", () =>
  copyInputValue(elements.token, "Token"),
);
elements.copySigningSecret.addEventListener("click", () =>
  copyInputValue(elements.signingSecret, "Signing secret"),
);

window.queueBot.onStateUpdated((snapshot) => {
  render(snapshot);
});

refresh();
setInterval(refresh, 10_000);

async function refresh() {
  const snapshot = await window.queueBot.getState();
  render(snapshot);
}

async function runAction(action) {
  setBusy(true);

  try {
    const result = await action();

    if (result?.ok === false) {
      showInlineError(result.error ?? "Operacao falhou.");
    }

    await refresh();
    return result;
  } catch (error) {
    showInlineError(error instanceof Error ? error.message : String(error));
    await refresh();
    return { ok: false };
  } finally {
    setBusy(false);
  }
}

function render(snapshot) {
  lastSnapshot = snapshot;
  const { config, state, logs } = snapshot;

  if (document.activeElement !== elements.baseUrl) {
    elements.baseUrl.value = config?.baseUrl ?? elements.baseUrl.value ?? "";
  }

  elements.pollingInterval.value = String(config?.pollingIntervalSeconds ?? 30);
  elements.sendDelay.value = String(config?.sendDelayMs ?? 5000);
  elements.autoStart.checked = Boolean(config?.autoStart);
  elements.credentialHint.textContent = config
    ? getCredentialHint(config)
    : "Informe URL, token e signing secret para iniciar.";

  elements.authStatus.textContent = formatAuthStatus(state.authStatus);
  elements.whatsappStatus.textContent = formatWhatsAppStatus(state.whatsappStatus);
  elements.companyName.textContent = state.companyName || "-";
  elements.primaryStatus.textContent = state.primarySenderKnown
    ? state.isPrimarySender
      ? "Principal"
      : "Nao principal"
    : "Aguardando";
  elements.connectedPhone.textContent = maskPhone(state.connectedPhone);
  elements.lastHeartbeat.textContent = formatRelativeDate(state.lastHeartbeatAt);
  elements.lastHeartbeat.title = formatDate(state.lastHeartbeatAt);
  elements.lastPolling.textContent = formatRelativeDate(state.lastPollingAt);
  elements.lastPolling.title = formatDate(state.lastPollingAt);
  elements.lastSend.textContent = formatRelativeDate(state.lastSendAt);
  elements.lastSend.title = formatDate(state.lastSendAt);
  elements.processedCount.textContent = String(state.processedCount ?? 0);
  elements.localQueue.textContent = String(state.localQueueSize ?? 0);
  elements.botStatus.textContent = state.botRunning ? "Rodando" : "Pausado";
  elements.botStatusDot.classList.toggle("on", Boolean(state.botRunning));
  elements.heartbeatHealth.textContent = getHeartbeatHealthLabel(state.lastHeartbeatAt);

  setIndicator(elements.authDot, getAuthLevel(state.authStatus));
  setIndicator(elements.whatsappDot, getWhatsAppLevel(state.whatsappStatus));
  setIndicator(
    elements.primaryDot,
    state.primarySenderKnown ? (state.isPrimarySender ? "good" : "warn") : "neutral",
  );
  setMetricState(elements.lastHeartbeat.closest(".metric"), getHeartbeatLevel(state.lastHeartbeatAt));

  const hasError = Boolean(state.lastError);
  elements.lastErrorBox.classList.toggle("hidden", !hasError);
  elements.lastError.textContent = state.lastError || "-";

  renderLogs(logs ?? []);
}

function renderLogs(logs) {
  elements.logs.replaceChildren();

  if (!logs.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum evento local registrado.";
    elements.logs.appendChild(empty);
    return;
  }

  for (const log of logs.slice(0, 30)) {
    const item = document.createElement("article");
    const level = normalizeLogLevel(log.level, log.event);
    item.className = `log ${level}`;

    const marker = document.createElement("span");
    marker.className = "log-marker";
    marker.setAttribute("aria-hidden", "true");

    const card = document.createElement("div");
    card.className = "log-card";

    const header = document.createElement("div");
    header.className = "log-header";
    const eventName = document.createElement("strong");
    eventName.className = "log-title";
    const at = document.createElement("span");
    at.className = "log-time";
    eventName.textContent = humanizeEvent(log.event);
    at.textContent = formatTime(log.at);
    at.title = formatDate(log.at);
    header.append(eventName, at);

    const badge = document.createElement("span");
    badge.className = "log-badge";
    badge.textContent = getLevelLabel(level);

    const message = document.createElement("p");
    message.className = "log-message";
    message.textContent = log.message ?? "";

    card.append(header, badge, message);
    item.append(marker, card);
    elements.logs.appendChild(item);
  }
}

function getCredentialHint(config) {
  const hasCredentials = Boolean(config.hasToken && config.hasSigningSecret);

  if (!hasCredentials) {
    return "Credenciais incompletas. Cole o token e o signing secret do dispositivo.";
  }

  if (config.credentialStorage === "safeStorage") {
    return "Credenciais salvas e protegidas neste computador.";
  }

  return "Credenciais salvas neste computador.";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR");
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 10) {
    return "agora";
  }

  if (seconds < 60) {
    return `ha ${seconds}s`;
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `ha ${minutes}min`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `ha ${hours}h`;
  }

  return date.toLocaleDateString("pt-BR");
}

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "-";
  }

  const tail = digits.slice(-4);

  if (digits.startsWith("55")) {
    return `+55 ****-${tail}`;
  }

  return `****-${tail}`;
}

function setBusy(busy) {
  for (const button of document.querySelectorAll("button")) {
    button.disabled = busy;
  }
}

function showInlineError(message) {
  const snapshot = lastSnapshot ?? { state: {} };
  render({
    ...snapshot,
    state: {
      ...(snapshot.state ?? {}),
      lastError: String(message ?? "Erro desconhecido."),
    },
  });
}

function toggleSecretVisibility(input, button) {
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  button.textContent = isHidden ? "Ocultar" : "Mostrar";
}

async function copyInputValue(input, label) {
  const value = input.value.trim();

  if (!value) {
    showHint(`${label} vazio. Digite um valor para copiar.`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showHint(`${label} copiado.`);
  } catch {
    input.select();
    document.execCommand("copy");
    showHint(`${label} copiado.`);
  }
}

function showHint(message) {
  elements.credentialHint.textContent = message;
  window.setTimeout(() => {
    if (elements.credentialHint.textContent === message) {
      refresh();
    }
  }, 2200);
}

function setIndicator(element, level) {
  element.classList.remove("good", "warn", "bad", "neutral");
  element.classList.add(level);
}

function setMetricState(element, level) {
  element.classList.remove("online", "warn");

  if (level === "good") {
    element.classList.add("online");
  }

  if (level === "warn") {
    element.classList.add("warn");
  }
}

function getAuthLevel(status) {
  const value = String(status ?? "").toLowerCase();

  if (["authenticated", "online", "ok", "connected"].includes(value)) {
    return "good";
  }

  if (["authenticating", "pending", "unknown"].includes(value)) {
    return "warn";
  }

  if (value === "-" || !value) {
    return "neutral";
  }

  return "bad";
}

function getWhatsAppLevel(status) {
  const value = String(status ?? "").toLowerCase();

  if (value === "connected") {
    return "good";
  }

  if (["loading", "syncing", "qr_required", "sending"].includes(value)) {
    return "warn";
  }

  if (value === "-" || value === "unknown" || !value) {
    return "neutral";
  }

  return "bad";
}

function getHeartbeatLevel(value) {
  if (!value) {
    return "warn";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "warn";
  }

  const seconds = (Date.now() - date.getTime()) / 1000;
  return seconds <= 75 ? "good" : "warn";
}

function getHeartbeatHealthLabel(value) {
  return getHeartbeatLevel(value) === "good" ? "Online" : "Aguardando sinal";
}

function formatAuthStatus(status) {
  const value = String(status ?? "").toLowerCase();

  if (value === "authenticated") {
    return "Online";
  }

  if (value === "error") {
    return "Erro";
  }

  if (value === "authenticating") {
    return "Validando";
  }

  if (value === "not_configured") {
    return "Nao configurado";
  }

  if (!value || value === "undefined") {
    return "-";
  }

  return status;
}

function formatWhatsAppStatus(status) {
  const value = String(status ?? "").toLowerCase();

  if (value === "connected") {
    return "Conectado";
  }

  if (value === "disconnected") {
    return "Desconectado";
  }

  if (value === "qr_required") {
    return "QR pendente";
  }

  if (value === "loading") {
    return "Carregando";
  }

  if (!value || value === "undefined") {
    return "-";
  }

  return status;
}

function normalizeLogLevel(level, eventName) {
  const value = String(level ?? "").toLowerCase();
  const event = String(eventName ?? "").toLowerCase();

  if (["success", "sent", "ok"].includes(value) || event.includes("sent")) {
    return "success";
  }

  if (["warn", "warning"].includes(value) || event.includes("retry")) {
    return "warn";
  }

  if (["error", "failed"].includes(value) || event.includes("failed")) {
    return "error";
  }

  return "info";
}

function getLevelLabel(level) {
  if (level === "success") {
    return "ok";
  }

  if (level === "error") {
    return "erro";
  }

  if (level === "warn") {
    return "aviso";
  }

  return "info";
}

function humanizeEvent(eventName) {
  const value = String(eventName ?? "event");
  const labels = {
    ack_failed: "ACK nao confirmado",
    auth_failed: "Conexao recusada",
    auth_ok: "Conexao validada",
    background_error: "Erro em segundo plano",
    bot_started: "Bot iniciado",
    bot_stopped: "Bot pausado",
    heartbeat_failed: "Heartbeat falhou",
    message_already_sent: "Mensagem ja confirmada",
    message_failed_ack: "Falha registrada",
    message_invalid: "Mensagem invalida",
    message_lock_busy: "Mensagem em processamento",
    message_lock_expired: "Bloqueio local liberado",
    message_lock_timeout: "Tempo de processamento excedido",
    message_sent: "Mensagem enviada",
    polling_failed: "Polling falhou",
    polling_ok: "Mensagem reservada",
    primary_sender_required: "Dispositivo nao principal",
    sent_ack_failed: "Confirmacao falhou",
    startup_failed: "Inicializacao falhou",
    state_reset: "Estado resetado",
  };

  if (labels[value]) {
    return labels[value];
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
