const elements = {
  authStatus: document.getElementById("auth-status"),
  companyName: document.getElementById("company-name"),
  deviceStatus: document.getElementById("device-status"),
  whatsappStatus: document.getElementById("whatsapp-status"),
  connectedPhone: document.getElementById("connected-phone"),
  localQueueSize: document.getElementById("local-queue-size"),
  lastHeartbeat: document.getElementById("last-heartbeat"),
  lastPolling: document.getElementById("last-polling"),
  lastSend: document.getElementById("last-send"),
  lastErrorPanel: document.getElementById("last-error-panel"),
  lastError: document.getElementById("last-error"),
  primarySender: document.getElementById("primary-sender"),
  openWhatsApp: document.getElementById("open-whatsapp"),
  testConnection: document.getElementById("test-connection"),
  processNext: document.getElementById("process-next"),
  resetState: document.getElementById("reset-state"),
  openOptions: document.getElementById("open-options"),
};

document.addEventListener("DOMContentLoaded", refresh);
elements.openWhatsApp.addEventListener("click", async () => {
  await safeSend("QWEP_OPEN_WHATSAPP");
});
elements.testConnection.addEventListener("click", async () => {
  await safeSend("QWEP_TEST_CONNECTION");
  await refresh();
});
elements.processNext.addEventListener("click", async () => {
  await safeSend("QWEP_PROCESS_NEXT");
  await refresh();
});
elements.resetState.addEventListener("click", async () => {
  await safeSend("QWEP_RESET_STATE");
  await refresh();
});
elements.openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

setInterval(refresh, 5000);

async function refresh() {
  const response = await safeSend("QWEP_GET_STATE");

  if (!response?.ok) {
    return;
  }

  const state = response.state ?? {};
  setText(elements.companyName, formatDisplayValue(state.companyName, "Nao conectada"));
  setText(elements.deviceStatus, labelDeviceStatus(state.deviceStatus));
  setText(elements.whatsappStatus, labelWhatsAppStatus(state.whatsappStatus));
  setText(elements.connectedPhone, formatDisplayValue(state.connectedPhone, "Nao identificado"));
  setText(elements.localQueueSize, String(state.localQueueSize ?? 0));
  setText(elements.lastHeartbeat, formatDate(state.lastHeartbeatAt));
  setText(elements.lastPolling, formatDate(state.lastPollingAt));
  setText(elements.lastSend, formatDate(state.lastSendAt));
  setText(
    elements.primarySender,
    `Emissor principal: ${state.isPrimarySender ? "sim" : "nao"}`,
  );

  const authLabel = labelAuthStatus(state.authStatus);
  setText(elements.authStatus, authLabel);
  elements.authStatus.className = `badge ${badgeClass(state.authStatus)}`;

  if (state.lastError) {
    elements.lastErrorPanel.hidden = false;
    setText(elements.lastError, formatFriendlyError(state.lastError));
  } else {
    elements.lastErrorPanel.hidden = true;
    setText(elements.lastError, "");
  }
}

function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

async function safeSend(type, payload = {}) {
  try {
    return await send(type, payload);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function setText(element, value) {
  element.textContent = value;
}

function formatDate(value) {
  if (!value) {
    return "Aguardando";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function labelAuthStatus(value) {
  const labels = {
    not_configured: "Nao configurado",
    authenticating: "Autenticando",
    authenticated: "Autenticado",
    error: "Erro",
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

function formatFriendlyError(value) {
  return formatDisplayValue(value, "Nao foi possivel concluir a operacao.").replace(
    /\bunknown\b/gi,
    "informacao indisponivel",
  );
}

function badgeClass(value) {
  if (value === "authenticated") {
    return "ok";
  }

  if (value === "error" || value === "revoked") {
    return "error";
  }

  return "neutral";
}
