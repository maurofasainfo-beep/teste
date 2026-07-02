import {
  fetchPendingMessages,
  markMessageProcessing,
  sendAck,
  sendHeartbeat,
} from "./qwep-client.js";
import { logError, logInfo, logWarn, toSafeError } from "./logger.js";
import { getConfig, getRuntimeState, maskPhone, patchRuntimeState } from "./storage.js";
import { getWhatsAppStatus, sendWhatsAppMessage } from "./whatsapp-bridge.js";

let processing = false;
let heartbeatRunning = false;
let backoffUntil = 0;
const PROCESSING_TIMEOUT_MS = 60_000;

export function resetQueueRuntime() {
  processing = false;
  heartbeatRunning = false;
  backoffUntil = 0;
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
    navigationInProgress: false,
    ...patch,
  });
}

export async function runHeartbeat() {
  if (heartbeatRunning) {
    return;
  }

  heartbeatRunning = true;

  try {
    const config = await getConfig();

    if (!config?.token || !config?.signingSecret || !config?.baseUrl) {
      await patchRuntimeState({ authStatus: "not_configured" });
      return;
    }

    const state = await getRuntimeState();
    const whatsappStatus = await getWhatsAppStatus();
    await sendHeartbeat({
      whatsapp_status: whatsappStatus.whatsapp_status,
      connected_phone: whatsappStatus.connected_phone,
      local_queue_size: state.localQueueSize,
      last_error: state.lastError,
    });
  } catch (error) {
    await logWarn("heartbeat_failed", toSafeError(error));
  } finally {
    heartbeatRunning = false;
  }
}

export async function runAutomaticPollingCycle() {
  if (Date.now() < backoffUntil) {
    return { skipped: true, reason: "backoff" };
  }

  const result = await runNextMessage("automatic");

  if (result?.ok === false) {
    backoffUntil = Date.now() + 60_000;
  }

  if (
    result?.skipped &&
    !["not_configured", "not_authenticated", "not_primary_sender"].includes(
      result.reason,
    )
  ) {
    backoffUntil = Date.now() + 30_000;
  }

  return result;
}

export async function runManualNextMessage() {
  return runNextMessage("manual");
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

    if (!state.isPrimarySender) {
      return { skipped: true, reason: "not_primary_sender" };
    }

    const whatsappStatus = await getWhatsAppStatus();

    if (whatsappStatus.whatsapp_status !== "connected") {
      await patchRuntimeState({
        whatsappStatus: whatsappStatus.whatsapp_status,
        lastPollingAt: new Date().toISOString(),
        lastError: getWhatsAppPausedMessage(whatsappStatus.whatsapp_status),
      });
      return {
        skipped: true,
        reason: `whatsapp_${whatsappStatus.whatsapp_status}`,
      };
    }

    const batch = await fetchPendingMessages(1);
    const messages = Array.isArray(batch.messages) ? batch.messages : [];
    await patchRuntimeState({ localQueueSize: messages.length });

    if (messages.length === 0) {
      return { ok: true, count: 0 };
    }

    await logInfo("polling_ok", "Lote de mensagens recebido.", {
      count: messages.length,
      reason,
    });

    await processMessage(messages[0]);

    await patchRuntimeState({ localQueueSize: 0 });
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
          strategy: "whatsapp_web_internal_api",
          status: result.status ?? "clicked_send",
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

    await logInfo("message_sent", "Mensagem confirmada no backend.", {
      message_id: message.id,
      to: maskPhone(message.to),
    });
    await releaseMessageLock({ lastProcessedMessageId: message.id });
  } catch (error) {
    await acknowledgeFailure(message, toSafeError(error), true);
    await releaseMessageLock();
  }
}

function randomSendDelayMs() {
  return 3000 + Math.floor(Math.random() * 4001);
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

  return "WhatsApp desconectado. As mensagens ficarao pendentes e serao enviadas quando reconectar.";
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
        strategy: "whatsapp_web_internal_api",
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
