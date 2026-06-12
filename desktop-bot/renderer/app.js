const elements = {
  authStatus: document.getElementById("auth-status"),
  autoStart: document.getElementById("auto-start"),
  baseUrl: document.getElementById("base-url"),
  botStatus: document.getElementById("bot-status"),
  botStatusDot: document.getElementById("bot-status-dot"),
  clearConfig: document.getElementById("clear-config"),
  companyName: document.getElementById("company-name"),
  configForm: document.getElementById("config-form"),
  connectedPhone: document.getElementById("connected-phone"),
  credentialHint: document.getElementById("credential-hint"),
  lastError: document.getElementById("last-error"),
  lastErrorBox: document.getElementById("last-error-box"),
  lastHeartbeat: document.getElementById("last-heartbeat"),
  lastPolling: document.getElementById("last-polling"),
  lastSend: document.getElementById("last-send"),
  localQueue: document.getElementById("local-queue"),
  logs: document.getElementById("logs"),
  openWhatsApp: document.getElementById("open-whatsapp"),
  pollingInterval: document.getElementById("polling-interval"),
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
    ? `Credenciais: token ${config.hasToken ? "salvo" : "ausente"}, signing secret ${
        config.hasSigningSecret ? "salvo" : "ausente"
      }. Armazenamento: ${config.credentialStorage ?? "local"}.`
    : "Nenhuma credencial salva.";

  elements.authStatus.textContent = state.authStatus ?? "-";
  elements.whatsappStatus.textContent = state.whatsappStatus ?? "-";
  elements.companyName.textContent = state.companyName || "-";
  elements.primaryStatus.textContent = state.primarySenderKnown
    ? state.isPrimarySender
      ? "Sim"
      : "Nao"
    : "Nao informado";
  elements.connectedPhone.textContent = maskPhone(state.connectedPhone);
  elements.lastHeartbeat.textContent = formatDate(state.lastHeartbeatAt);
  elements.lastPolling.textContent = formatDate(state.lastPollingAt);
  elements.lastSend.textContent = formatDate(state.lastSendAt);
  elements.processedCount.textContent = String(state.processedCount ?? 0);
  elements.localQueue.textContent = String(state.localQueueSize ?? 0);
  elements.botStatus.textContent = state.botRunning ? "Rodando" : "Parado";
  elements.botStatusDot.classList.toggle("on", Boolean(state.botRunning));

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
    item.className = `log ${log.level ?? "info"}`;

    const header = document.createElement("div");
    const eventName = document.createElement("strong");
    const at = document.createElement("span");
    eventName.textContent = log.event ?? "event";
    at.textContent = formatDate(log.at);
    header.append(eventName, at);

    const message = document.createElement("p");
    message.textContent = log.message ?? "";

    item.append(header, message);
    elements.logs.appendChild(item);
  }
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

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "-";
  }

  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
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
