const {
  fetchMessageStats,
  fetchPendingMessages,
  markMessageProcessing,
  sendAck,
  sendHeartbeat,
} = require("./qwep-client");
const { logError, logInfo, logWarn, toSafeError } = require("./logger");
const {
  getConfig,
  getRuntimeState,
  maskPhone,
  patchRuntimeState,
} = require("./storage");
const { getWhatsAppStatus, sendWhatsAppMessage } = require("./whatsapp-bridge");

const PROCESSING_TIMEOUT_MS = 60_000;
const WHATSAPP_PAUSED_MESSAGE =
  "WhatsApp desconectado. As mensagens ficarao pendentes e serao enviadas quando reconectar.";

let processing = false;
let heartbeatRunning = false;

function resetQueueRuntime() {
  processing = false;
  heartbeatRunning = false;
}

async function getActiveLock() {
  const state = await getRuntimeState();

  if (!state.currentMessageId || !state.processingStartedAt) {
    return null;
  }

  const startedAt = new Date(state.processingStartedAt).getTime();

  if (!Number.isFinite(startedAt)) {
    return null;
  }

  return {
    messageId: state.currentMessageId,
    expired: Date.now() - startedAt > PROCESSING_TIMEOUT_MS,
  };
}

async function acquireMessageLock(messageId) {
  const activeLock = await getActiveLock();

  if (activeLock && !activeLock.expired) {
    return false;
  }

  if (activeLock?.expired) {
    await logWarn("message_lock_expired", "Lock local expirado e liberado.", {
      message_id: activeLock.messageId,
    });
  }

  await patchRuntimeState({
    currentMessageId: messageId,
    processingStartedAt: new Date().toISOString(),
  });

  return true;
}

async function releaseMessageLock(patch = {}) {
  await patchRuntimeState({
    currentMessageId: "",
    processingStartedAt: "",
    ...patch,
  });
}

async function runHeartbeat() {
  if (heartbeatRunning) {
    return { skipped: true, reason: "heartbeat_running" };
  }

  heartbeatRunning = true;

  try {
    const config = await getConfig();

    if (!config?.token || !config?.signingSecret || !config?.baseUrl) {
      await patchRuntimeState({ authStatus: "not_configured" });
      return { skipped: true, reason: "not_configured" };
    }

    const state = await getRuntimeState();
    const whatsappStatus = await getWhatsAppStatus();
    await sendHeartbeat({
      whatsapp_status: whatsappStatus.whatsapp_status,
      connected_phone: whatsappStatus.connected_phone,
      local_queue_size: state.localQueueSize,
      last_error: state.lastError,
    });
    await patchRuntimeState({ heartbeatFailureCount: 0 });
    await refreshMessageStats();

    return { ok: true };
  } catch (error) {
    const safeError = toSafeError(error);
    await incrementFailureCount("heartbeatFailureCount", {
      lastError:
        "Nao foi possivel sincronizar com o FasaWait. Verifique a internet e a URL configurada.",
    });
    await logWarn("heartbeat_failed", safeError);
    return { ok: false, error: toSafeError(error) };
  } finally {
    heartbeatRunning = false;
  }
}

async function runAutomaticPollingCycle() {
  const state = await getRuntimeState();

  if (!state.botRunning) {
    return { skipped: true, reason: "bot_stopped" };
  }

  await patchRuntimeState({ lastPollingAttemptAt: new Date().toISOString() });

  if (Date.now() < Number(state.backoffUntil || 0)) {
    return { skipped: true, reason: "backoff" };
  }

  const result = await runNextMessage("automatic");

  if (result?.ok === false) {
    await incrementFailureCount("pollingFailureCount", {
      lastError:
        "Nao foi possivel consultar mensagens. Verifique a internet ou reinicie a conexao.",
    });
    await patchRuntimeState({ backoffUntil: Date.now() + 60_000 });
  }

  if (result?.ok || result?.reason === "no_messages") {
    await patchRuntimeState({
      lastPollingOkAt: new Date().toISOString(),
      pollingFailureCount: 0,
    });
  }

  if (
    result?.skipped &&
    !String(result.reason ?? "").startsWith("whatsapp_") &&
    ![
      "not_configured",
      "not_authenticated",
      "not_primary_sender",
      "bot_stopped",
      "no_messages",
    ].includes(result.reason)
  ) {
    await incrementFailureCount("pollingFailureCount");
    await patchRuntimeState({ backoffUntil: Date.now() + 30_000 });
  }

  return result;
}

async function runNextMessage(reason) {
  if (processing) {
    return { skipped: true, reason: "already_processing" };
  }

  const activeLock = await getActiveLock();

  if (activeLock && !activeLock.expired) {
    return { skipped: true, reason: "locked_message_in_progress" };
  }

  if (activeLock?.expired) {
    await logWarn("message_lock_timeout", "Lock local liberado por timeout.", {
      message_id: activeLock.messageId,
    });
    await releaseMessageLock({
      lastError: "Processamento anterior expirou apos 60 segundos.",
    });
  }

  processing = true;
  await patchRuntimeState({ localQueueSize: 0 });

  try {
    const config = await getConfig();

    if (!config?.token || !config?.signingSecret || !config?.baseUrl) {
      await patchRuntimeState({ authStatus: "not_configured" });
      return { skipped: true, reason: "not_configured" };
    }

    const state = await getRuntimeState();

    if (state.authStatus !== "authenticated") {
      return { skipped: true, reason: "not_authenticated" };
    }

    if (state.primarySenderKnown && !state.isPrimarySender) {
      return { skipped: true, reason: "not_primary_sender" };
    }

    const whatsappStatus = await getWhatsAppStatus();

    if (whatsappStatus.whatsapp_status !== "connected") {
      await patchRuntimeState({
        whatsappStatus: whatsappStatus.whatsapp_status,
        lastPollingAt: new Date().toISOString(),
        lastError: getWhatsAppPausedMessage(whatsappStatus.whatsapp_status),
      });
      await refreshMessageStats();
      if (state.whatsappStatus !== whatsappStatus.whatsapp_status) {
        await logWarn(
          "whatsapp_disconnected",
          getWhatsAppPausedMessage(whatsappStatus.whatsapp_status),
          { status: whatsappStatus.whatsapp_status },
        );
      }
      return {
        skipped: true,
        reason: `whatsapp_${whatsappStatus.whatsapp_status}`,
      };
    }

    const batch = await fetchPendingMessages(1);
    const messages = Array.isArray(batch.messages) ? batch.messages : [];
    await patchRuntimeState({
      localQueueSize: messages.length,
      whatsappStatus: "connected",
      lastError: "",
    });
    await refreshMessageStats();

    if (messages.length === 0) {
      return { skipped: true, reason: "no_messages" };
    }

    await logInfo("polling_ok", "Uma mensagem reservada para envio.", {
      count: messages.length,
      reason,
    });

    await processMessage(messages[0]);
    await patchRuntimeState({ localQueueSize: 0, backoffUntil: 0 });
    return { ok: true, count: 1 };
  } catch (error) {
    const safeError = toSafeError(error);
    await logError("polling_failed", safeError);
    return { ok: false, error: safeError };
  } finally {
    processing = false;
  }
}

async function processMessage(message) {
  const startedAt = new Date().toISOString();

  if (!message?.id || !message?.reservation_id || !message?.reservation_token) {
    await logWarn("message_invalid", "Mensagem reservada sem campos obrigatorios.");
    return;
  }

  if (!message.to || !message.text) {
    await acknowledgeFailure(message, "Payload da mensagem esta incompleto.", false);
    return;
  }

  const state = await getRuntimeState();

  if (state.lastProcessedMessageId === message.id) {
    await acknowledgeFailure(
      message,
      "Mensagem ja processada localmente. Reenvio bloqueado.",
      false,
    );
    return;
  }

  const locked = await acquireMessageLock(message.id);

  if (!locked) {
    await logWarn("message_lock_busy", "Mensagem ignorada por lock local ativo.", {
      message_id: message.id,
    });
    return;
  }

  try {
    const processingAck = await markMessageProcessing(message.id, {
      reservation_id: message.reservation_id,
      reservation_token: message.reservation_token,
      provider_response: {
        status: "processing_confirmed",
        idempotency_key: message.idempotency_key ?? null,
        started_at: startedAt,
        client: "electron_desktop",
      },
    });

    if (processingAck?.idempotent || processingAck?.status === "sent") {
      await logInfo("message_already_sent", "Backend informou ACK sent existente.", {
        message_id: message.id,
      });
      await releaseMessageLock({ lastProcessedMessageId: message.id });
      return;
    }

    await delay(randomSendDelayMs());
    const result = await sendWhatsAppMessage({
      messageId: message.id,
      to: message.to,
      text: message.text,
    });

    try {
      await sendAck(message.id, {
        status: "sent",
        reservation_id: message.reservation_id,
        reservation_token: message.reservation_token,
        provider_response: {
          strategy: "electron_whatsapp_web_internal_api",
          status: result.status ?? "sent_without_navigation",
          provider_message_id: result.provider_message_id ?? null,
          idempotency_key: message.idempotency_key ?? null,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        },
      });
    } catch (ackError) {
      await logError("sent_ack_failed", toSafeError(ackError), {
        message_id: message.id,
      });
      await releaseMessageLock({ lastProcessedMessageId: message.id });
      return;
    }

    const nextState = await getRuntimeState();
    await patchRuntimeState({
      processedCount: Number(nextState.processedCount || 0) + 1,
    });
    await refreshMessageStats();
    await logInfo("message_sent", "Mensagem confirmada no backend.", {
      message_id: message.id,
      to: maskPhone(message.to),
    });
    await releaseMessageLock({ lastProcessedMessageId: message.id });
  } catch (error) {
    await acknowledgeFailure(message, toSafeError(error), true);
    await refreshMessageStats();
    await releaseMessageLock();
  }
}

async function refreshMessageStats() {
  try {
    return await fetchMessageStats();
  } catch (error) {
    await logWarn("message_stats_failed", toSafeError(error));
    return null;
  }
}

async function incrementFailureCount(field, patch = {}) {
  const state = await getRuntimeState();
  const current = Number(state[field] || 0);

  await patchRuntimeState({
    [field]: current + 1,
    ...patch,
  });
}

function getWhatsAppPausedMessage(status) {
  if (status === "qr_required") {
    return "Escaneie o QR Code para continuar os envios. As mensagens ficarao pendentes.";
  }

  if (status === "loading") {
    return "WhatsApp carregando. O envio esta pausado ate a conexao ficar pronta.";
  }

  if (status === "error") {
    return "Erro no WhatsApp Web. As mensagens ficarao pendentes e serao reenviadas depois.";
  }

  return WHATSAPP_PAUSED_MESSAGE;
}

function randomSendDelayMs() {
  return 5000 + Math.floor(Math.random() * 5001);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acknowledgeFailure(message, errorMessage, retryable) {
  try {
    await sendAck(message.id, {
      status: "failed",
      reservation_id: message.reservation_id,
      reservation_token: message.reservation_token,
      error_message: errorMessage,
      retryable,
      provider_response: {
        strategy: "electron_whatsapp_web_internal_api",
        status: "failed",
        idempotency_key: message.idempotency_key ?? null,
        failed_at: new Date().toISOString(),
      },
    });

    await logWarn("message_failed_ack", "Falha confirmada no backend.", {
      message_id: message.id,
      retryable,
    });
  } catch (ackError) {
    await logError("ack_failed", toSafeError(ackError), {
      message_id: message.id,
    });
  }
}

module.exports = {
  resetQueueRuntime,
  runAutomaticPollingCycle,
  runHeartbeat,
};
