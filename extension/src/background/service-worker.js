import { validateAuthentication } from "../lib/qwep-client.js";
import { logError, logInfo, toSafeError } from "../lib/logger.js";
import {
  clearConfig,
  getConfig,
  getLocalLogs,
  getRuntimeState,
  patchRuntimeState,
  saveConfig,
} from "../lib/storage.js";
import {
  resetQueueRuntime,
  runAutomaticPollingCycle,
  runHeartbeat,
  runManualNextMessage,
} from "../lib/message-queue.js";
import { getWhatsAppStatus, openWhatsAppWeb } from "../lib/whatsapp-bridge.js";

const HEARTBEAT_ALARM = "qwep-heartbeat";
const POLLING_ALARM = "qwep-polling";

chrome.runtime.onInstalled.addListener(() => {
  scheduleOperationalAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleOperationalAlarms();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    runHeartbeat();
  }

  if (alarm.name === POLLING_ALARM) {
    runAutomaticPollingCycle();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ ok: false, error: toSafeError(error) }));

  return true;
});

async function handleRuntimeMessage(message) {
  switch (message?.type) {
    case "QWEP_SAVE_CONFIG":
      await saveConfig(message.config);
      await patchRuntimeState({ authStatus: "authenticating", lastError: "" });
      return testConnection();

    case "QWEP_TEST_CONNECTION":
      return testConnection();

    case "QWEP_CLEAR_CONFIG":
      await clearConfig();
      await chrome.alarms.clearAll();
      return { ok: true };

    case "QWEP_RESET_STATE":
      await resetExtensionState();
      return { ok: true };

    case "QWEP_GET_STATE":
      return {
        ok: true,
        config: sanitizeConfig(await getConfig()),
        state: await getRuntimeState(),
        logs: await getLocalLogs(),
      };

    case "QWEP_OPEN_WHATSAPP":
      await openWhatsAppWeb();
      return { ok: true };

    case "QWEP_REFRESH_WHATSAPP_STATUS":
      return { ok: true, status: await getWhatsAppStatus() };

    case "QWEP_PROCESS_NEXT":
      return processNextMessageManually();

    default:
      return { ok: false, error: "Mensagem desconhecida." };
  }
}

async function testConnection() {
  try {
    const config = await getConfig();

    if (!config?.baseUrl || !config?.token || !config?.signingSecret) {
      await patchRuntimeState({
        authStatus: "not_configured",
        lastError: "Informe URL, token e signing secret.",
      });
      return { ok: false, error: "Informe URL, token e signing secret." };
    }

    await patchRuntimeState({ authStatus: "authenticating", lastError: "" });
    const response = await validateAuthentication(config);
    await scheduleOperationalAlarms();
    await logInfo("auth_ok", "Dispositivo autenticado.", {
      company: response.company_name,
      primary: response.is_primary_sender,
    });
    return { ok: true, response };
  } catch (error) {
    const safeError = toSafeError(error);
    await patchRuntimeState({ authStatus: "error", lastError: safeError });
    await logError("auth_failed", safeError);
    return { ok: false, error: safeError };
  }
}

async function processNextMessageManually() {
  const auth = await testConnection();

  if (!auth.ok) {
    return auth;
  }

  return {
    ok: true,
    result: await runManualNextMessage(),
  };
}

async function resetExtensionState() {
  await chrome.alarms.clearAll();
  resetQueueRuntime();
  await patchRuntimeState({
    lastError: "",
    localQueueSize: 0,
    currentMessageId: "",
    processingStartedAt: "",
    navigationInProgress: false,
    lastPollingAt: "",
    whatsappStatus: "disconnected",
  });
  await scheduleOperationalAlarms();
}

async function scheduleOperationalAlarms() {
  const state = await getRuntimeState();
  const heartbeatPeriod = Math.max(
    Number(state.heartbeatIntervalSeconds || 30) / 60,
    0.5,
  );
  const pollingSeconds = Math.min(
    Math.max(Number(state.pollingIntervalSeconds || 30), 20),
    30,
  );
  const pollingPeriod = Math.max(pollingSeconds / 60, 0.5);

  await chrome.alarms.create(HEARTBEAT_ALARM, {
    periodInMinutes: heartbeatPeriod,
  });
  await chrome.alarms.create(POLLING_ALARM, {
    periodInMinutes: pollingPeriod,
  });
}

function sanitizeConfig(config) {
  if (!config) {
    return null;
  }

  return {
    baseUrl: config.baseUrl,
    hasToken: Boolean(config.token),
    hasSigningSecret: Boolean(config.signingSecret),
    pollingIntervalSeconds: config.pollingIntervalSeconds,
    sendDelayMs: config.sendDelayMs,
  };
}
