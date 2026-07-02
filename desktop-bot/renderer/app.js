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
  pendingMessages: document.getElementById("pending-messages"),
  pollingInterval: document.getElementById("polling-interval"),
  primaryDot: document.getElementById("primary-dot"),
  primaryStatus: document.getElementById("primary-status"),
  processedCount: document.getElementById("processed-count"),
  refreshStatus: document.getElementById("refresh-status"),
  failedMessages: document.getElementById("failed-messages"),
  restartBot: document.getElementById("restart-bot"),
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
  whatsappAlertBox: document.getElementById("whatsapp-alert-box"),
  whatsappAlertMessage: document.getElementById("whatsapp-alert-message"),
  whatsappAlertTitle: document.getElementById("whatsapp-alert-title"),
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
elements.restartBot.addEventListener("click", () =>
  runAction(window.queueBot.restartBot),
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
  const config = snapshot?.config ?? null;
  const state = snapshot?.state ?? {};
  const logs = Array.isArray(snapshot?.logs) ? snapshot.logs : [];

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
  elements.companyName.textContent = formatDisplayValue(
    state.companyName,
    "Não conectada",
  );
  elements.primaryStatus.textContent = state.primarySenderKnown
    ? state.isPrimarySender
      ? "Principal"
      : "Não principal"
    : "Aguardando";
  elements.connectedPhone.textContent = maskPhone(state.connectedPhone);
  elements.lastHeartbeat.textContent = formatRelativeDate(
    state.lastHeartbeatAt,
    "Aguardando",
  );
  elements.lastHeartbeat.title = formatDate(
    state.lastHeartbeatAt,
    "Sinal ainda não recebido",
  );
  elements.lastPolling.textContent = formatRelativeDate(
    state.lastPollingAt,
    "Aguardando consulta",
  );
  elements.lastPolling.title = formatDate(
    state.lastPollingAt,
    "Consulta ainda não realizada",
  );
  elements.lastSend.textContent = formatRelativeDate(
    state.lastSendAt,
    "Nenhum envio ainda",
  );
  elements.lastSend.title = formatDate(
    state.lastSendAt,
    "Nenhuma mensagem enviada",
  );
  elements.processedCount.textContent = String(state.processedCount ?? 0);
  elements.localQueue.textContent = String(state.localQueueSize ?? 0);
  elements.pendingMessages.textContent = String(getWaitingMessageCount(state));
  elements.failedMessages.textContent = String(state.failedMessageCount ?? 0);
  elements.botStatus.textContent = getBotStatusLabel(state, config);
  elements.botStatusDot.classList.remove("on", "bad");
  elements.botStatusDot.classList.toggle("on", Boolean(state.botRunning));
  elements.botStatusDot.classList.toggle(
    "bad",
    String(state.authStatus ?? "").toLowerCase() === "error",
  );
  elements.heartbeatHealth.textContent = getHeartbeatHealthLabel(state.lastHeartbeatAt);

  setIndicator(elements.authDot, getAuthLevel(state.authStatus));
  setIndicator(elements.whatsappDot, getWhatsAppLevel(state.whatsappStatus));
  setIndicator(
    elements.primaryDot,
    state.primarySenderKnown ? (state.isPrimarySender ? "good" : "warn") : "neutral",
  );
  setMetricState(elements.lastHeartbeat.closest(".metric"), getHeartbeatLevel(state.lastHeartbeatAt));

  const operationalAlert = getOperationalAlert(state);
  renderOperationalAlert(operationalAlert);

  const hasError = Boolean(state.lastError) && !operationalAlert;
  elements.lastErrorBox.classList.toggle("hidden", !hasError);
  elements.lastError.textContent = formatFriendlyError(state.lastError);

  renderLogs(logs);
}

function renderLogs(logs) {
  elements.logs.replaceChildren();

  if (!logs.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum evento recente ainda.";
    elements.logs.appendChild(empty);
    return;
  }

  for (const log of logs.slice(0, 24)) {
    const item = document.createElement("article");
    const level = normalizeLogLevel(log.level, log.event);
    item.className = `log ${level}`;

    const marker = document.createElement("span");
    marker.className = "log-marker";
    marker.setAttribute("aria-hidden", "true");

    const card = document.createElement("div");
    card.className = "log-card";

    const eventName = document.createElement("strong");
    eventName.className = "log-title";
    const at = document.createElement("span");
    at.className = "log-time";
    eventName.textContent = humanizeEvent(log.event);
    at.textContent = formatTime(log.at, "Agora");
    at.title = formatDate(log.at, "Horário não informado");

    const badge = document.createElement("span");
    badge.className = "log-badge";
    badge.textContent = getLevelLabel(level);

    const message = document.createElement("p");
    message.className = "log-message";
    message.textContent = formatLogMessage(log.message, log.event);

    card.append(badge, eventName, message, at);
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

function getBotStatusLabel(state, config) {
  const authStatus = String(state.authStatus ?? "").toLowerCase();
  const whatsappStatus = String(state.whatsappStatus ?? "").toLowerCase();
  const hasCredentials = Boolean(config?.hasToken && config?.hasSigningSecret);

  if (!config || !hasCredentials || authStatus === "not_configured") {
    return "Aguardando configuração";
  }

  if (authStatus === "authenticating") {
    return "Conectando";
  }

  if (authStatus === "error") {
    return "Erro de conexão";
  }

  if (state.botRunning && ["disconnected", "error"].includes(whatsappStatus)) {
    return "WhatsApp desconectado";
  }

  return state.botRunning ? "Bot rodando" : "Bot pausado";
}

function getWaitingMessageCount(state) {
  return (
    Number(state.pendingMessageCount || 0) +
    Number(state.retryMessageCount || 0) +
    Number(state.reservedMessageCount || 0) +
    Number(state.processingMessageCount || 0)
  );
}

function getOperationalAlert(state) {
  if (!state.botRunning) {
    return null;
  }

  if (state.watchdogStatus) {
    return {
      level: "bad",
      title: "Bot sem sincronizacao",
      message: state.watchdogStatus,
    };
  }

  const whatsappStatus = String(state.whatsappStatus ?? "").toLowerCase();
  const waitingCount = getWaitingMessageCount(state);

  if (whatsappStatus === "qr_required") {
    return {
      level: "warn",
      title: "Aguardando QR Code",
      message:
        "Escaneie o QR Code para continuar os envios. As mensagens ficarao pendentes.",
    };
  }

  if (whatsappStatus === "loading") {
    return {
      level: "warn",
      title: "WhatsApp carregando",
      message: "Envio pausado ate o WhatsApp Web terminar de carregar.",
    };
  }

  if (["disconnected", "error"].includes(whatsappStatus)) {
    return {
      level: "bad",
      title: "WhatsApp desconectado",
      message:
        waitingCount > 0
          ? `${waitingCount} mensagens aguardando envio. Elas serao enviadas quando reconectar.`
          : "As mensagens ficarao pendentes e serao enviadas quando reconectar.",
    };
  }

  if (waitingCount > 0) {
    return {
      level: "warn",
      title: `${waitingCount} mensagens aguardando envio`,
      message: "O bot esta conectado e vai processar automaticamente.",
    };
  }

  if (state.startupNotice && isRecent(state.lastStartupAt, 180_000)) {
    return {
      level: "good",
      title: "Bot reiniciado",
      message: state.startupNotice,
    };
  }

  return null;
}

function renderOperationalAlert(alert) {
  elements.whatsappAlertBox.classList.toggle("hidden", !alert);

  if (!alert) {
    return;
  }

  elements.whatsappAlertBox.classList.remove("good", "warn", "bad");
  elements.whatsappAlertBox.classList.add(alert.level);
  elements.whatsappAlertTitle.textContent = alert.title;
  elements.whatsappAlertMessage.textContent = alert.message;
}

function isRecent(value, maxAgeMs) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() - date.getTime() <= maxAgeMs;
}

function formatFriendlyError(value) {
  const message = formatDisplayValue(
    value,
    "Não foi possível concluir a operação.",
  );
  const normalized = message.toLowerCase();

  if (normalized.includes("erro desconhecido")) {
    return "Não foi possível concluir a operação.";
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound")
  ) {
    return "Não foi possível acessar o FasaWait. Verifique a URL e sua conexão.";
  }

  if (
    normalized.includes("api qwep indisponivel") ||
    normalized.includes("respondeu html")
  ) {
    return "A URL informada não respondeu como esperado. Verifique o endereço do FasaWait.";
  }

  if (
    normalized.includes("unauthorized") ||
    normalized.includes("não autorizado") ||
    normalized.includes("nao autorizado") ||
    normalized.includes("invalid token")
  ) {
    return "As credenciais do dispositivo são inválidas ou expiraram.";
  }

  if (normalized.includes("signing secret")) {
    return "O Signing Secret não foi aceito. Gere novas credenciais do dispositivo.";
  }

  return message.replace(/\bunknown\b/gi, "informação indisponível");
}

function formatLogMessage(value, eventName) {
  const friendlyMessages = {
    auto_start_enabled: "Inicializacao com Windows ativada.",
    auto_start_required:
      "Auto-start mantido ativo enquanto o bot esta rodando.",
    bot_restarted: "Bot reiniciado e pronto para continuar.",
    bot_restart_requested: "Reinicio de conexao solicitado.",
    watchdog_recovered: "Sincronizacao recuperada.",
    whatsapp_disconnected:
      "WhatsApp desconectado. As mensagens ficarao pendentes.",
    auth_ok: "Dispositivo autenticado com sucesso.",
    bot_started: "Processamento automático iniciado.",
    bot_stopped: "Processamento automático pausado.",
    message_sent: "Envio confirmado com sucesso.",
    state_reset: "Estado local limpo com sucesso.",
  };
  const fallback = friendlyMessages[eventName] ?? "Evento registrado.";
  const message = formatDisplayValue(value, fallback);

  if (
    String(eventName ?? "").includes("failed") ||
    String(eventName ?? "").includes("error")
  ) {
    return formatFriendlyError(message);
  }

  if (friendlyMessages[eventName]) {
    return friendlyMessages[eventName];
  }

  return message.replace(/\bunknown\b/gi, "informação indisponível");
}

function formatDisplayValue(value, fallback = "Não informado") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();

  if (!text || ["unknown", "undefined", "null", "-"].includes(text.toLowerCase())) {
    return fallback;
  }

  return text;
}

function formatDate(value, fallback = "Não informado") {
  const safeValue = formatDisplayValue(value, "");

  if (!safeValue) {
    return fallback;
  }

  const date = new Date(safeValue);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString("pt-BR");
}

function formatTime(value, fallback = "Aguardando") {
  const safeValue = formatDisplayValue(value, "");

  if (!safeValue) {
    return fallback;
  }

  const date = new Date(safeValue);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDate(value, fallback = "Aguardando") {
  const safeValue = formatDisplayValue(value, "");

  if (!safeValue) {
    return fallback;
  }

  const date = new Date(safeValue);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 10) {
    return "agora";
  }

  if (seconds < 60) {
    return `há ${seconds}s`;
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `há ${minutes}min`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `há ${hours}h`;
  }

  return date.toLocaleDateString("pt-BR");
}

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "Não identificado";
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
      lastError: formatFriendlyError(message),
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

  if (["-", "not_configured", "undefined", "null", ""].includes(value)) {
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

  if (["-", "unknown", "undefined", "null", ""].includes(value)) {
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
  return getHeartbeatLevel(value) === "good" ? "Online" : "Sem sinal";
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
    return "Não configurado";
  }

  if (["", "unknown", "undefined", "null", "-"].includes(value)) {
    return "Aguardando configuração";
  }

  return "Aguardando conexão";
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
    return "Conectando";
  }

  if (value === "syncing") {
    return "Sincronizando";
  }

  if (value === "sending") {
    return "Enviando";
  }

  if (value === "error") {
    return "Erro de conexão";
  }

  return "Aguardando conexão";
}

function normalizeLogLevel(level, eventName) {
  const value = String(level ?? "").toLowerCase();
  const event = String(eventName ?? "").toLowerCase();

  if (
    ["error", "failed"].includes(value) ||
    event.includes("failed") ||
    event.includes("error")
  ) {
    return "error";
  }

  if (["warn", "warning"].includes(value) || event.includes("retry")) {
    return "warn";
  }

  if (
    ["success", "sent", "ok"].includes(value) ||
    event === "auth_ok" ||
    event === "message_sent"
  ) {
    return "success";
  }

  return "info";
}

function getLevelLabel(level) {
  if (level === "success") {
    return "sucesso";
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
  const value = formatDisplayValue(eventName, "");

  if (!value) {
    return "Evento registrado";
  }

  const labels = {
    auto_start_enabled: "Auto-start ativado",
    auto_start_required: "Auto-start mantido",
    bot_restarted: "Bot reiniciado",
    bot_restart_requested: "Reinicio solicitado",
    watchdog_alert: "Alerta de sincronizacao",
    watchdog_recovered: "Sincronizacao recuperada",
    whatsapp_disconnected: "WhatsApp desconectado",
    ack_failed: "Confirmação não enviada",
    auth_failed: "Conexão recusada",
    auth_ok: "Conexão validada",
    background_error: "Falha na operação",
    bot_started: "Bot iniciado",
    bot_stopped: "Bot pausado",
    heartbeat_failed: "Sincronização falhou",
    message_already_sent: "Mensagem já confirmada",
    message_failed_ack: "Falha registrada",
    message_invalid: "Mensagem inválida",
    message_lock_busy: "Mensagem em processamento",
    message_lock_expired: "Bloqueio local liberado",
    message_lock_timeout: "Tempo de processamento excedido",
    message_sent: "Mensagem enviada",
    polling_failed: "Consulta falhou",
    polling_ok: "Nova mensagem recebida",
    primary_sender_required: "Dispositivo não principal",
    sent_ack_failed: "Confirmação falhou",
    startup_failed: "Inicialização falhou",
    state_reset: "Estado resetado",
  };

  if (labels[value]) {
    return labels[value];
  }

  const label = value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return formatDisplayValue(label, "Evento registrado");
}
