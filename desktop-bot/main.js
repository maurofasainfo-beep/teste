const path = require("node:path");
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  safeStorage,
  shell,
} = require("electron");

const { validateAuthentication } = require("./lib/qwep-client");
const { logError, logInfo, toSafeError } = require("./lib/logger");
const {
  clearConfig,
  configureStorage,
  getConfig,
  getLocalLogs,
  getPublicConfig,
  getRuntimeState,
  patchRuntimeState,
  resetRuntimeState,
  saveConfig,
  setAutoStart,
} = require("./lib/storage");
const {
  resetQueueRuntime,
  runAutomaticPollingCycle,
  runHeartbeat,
} = require("./lib/message-queue");
const {
  configureWhatsAppBridge,
  getWhatsAppStatus,
  openWhatsAppWeb,
} = require("./lib/whatsapp-bridge");

const TRAY_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAHKSURBVFhH7VehUsNAEI1EIpFIJLLugC9A1oEqCQYksg7DDJ+ArERW8AF8QEXlTTIDDIpBRYa3uaXlcpvkrrk43swTbXb37d3tbTbJP3aFutbH6kqfbIjf/GgcqAu9B6HL0yxfgCVYiUzzZ5XpVN3ofXYdDgqIwB+iYBvT/Eul+pYS5zDhoFUg2KsTPIxr7Nwhh/QHOcFZN4LtRtoN1AmH7gevPI74LymJmT5iiXbQmcFh6La3UfcWJxWO4GjxYVXJ+PyuMsHeZvHIUi7q1XtU+7AE8hI944AlbdTXTXayuEnAT9DhWVbcs6QNrH4pOTQ5NAFwzZJbcOW3d7g/jJBA5dwIFN9EMpTYVgNvL++ivUQc9zlLG9AfkqHEKAngtrG0gW8BEmMcAThnaQNkNBWMREapgVTfsbQB9WrJUGKkBKYsbUDNQTKUGCmBCUtvgQdjvQNsotuypA08nDvGo7B4YkkbfAxezWgIO+dHeltJTtGImZGlZNS7EDr/+bP0G0pMW45+FM7V6wIZwylmEnbn80HdnDDLCcFCWAatvAm+GfQxIgXvJn2k+Jy5D+jq0P3tLVCzY4ugMTwUVKQgDa/UuGrS71FFx0GS/AAUOpxEZFP3TQAAAABJRU5ErkJggg==";

const APP_ICON_PATH = path.join(__dirname, "assets", "icon.ico");

let mainWindow = null;
let whatsappWindow = null;
let tray = null;
let heartbeatTimer = null;
let pollingTimer = null;
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showMainWindow();
  });
}

app.whenReady().then(async () => {
  configureStorage({
    dataDir: app.getPath("userData"),
    legacyDataDirs: [
      path.join(app.getPath("appData"), "Queue SaaS Bot"),
      path.join(app.getPath("appData"), "queue-saas-desktop-bot"),
    ],
    safeStorage,
  });

  configureWhatsAppBridge(getOrCreateWhatsAppWindow);
  await applyStoredAutoStart();
  createMainWindow();
  createTray();

  const state = await getRuntimeState();
  await patchRuntimeState({ botRunning: Boolean(state.botRunning) });

  if (state.botRunning) {
    try {
      await startBot();
    } catch (error) {
      await patchRuntimeState({
        botRunning: false,
        lastError: toSafeError(error),
      });
      await logError("startup_failed", toSafeError(error));
      await broadcastState();
    }
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  clearTimers();
});

app.on("window-all-closed", () => {
  // O app permanece ativo na bandeja ate o usuario escolher Sair.
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    title: "FasaWait Bot",
    icon: APP_ICON_PATH,
    backgroundColor: "#f7f9fc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }

  mainWindow.show();
  mainWindow.focus();
}

async function getOrCreateWhatsAppWindow({ createIfMissing = false, show = false } = {}) {
  if (whatsappWindow && !whatsappWindow.isDestroyed()) {
    if (show) {
      whatsappWindow.show();
      whatsappWindow.focus();
    }

    return whatsappWindow;
  }

  if (!createIfMissing) {
    return null;
  }

  whatsappWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    show,
    title: "WhatsApp Web - FasaWait Bot",
    icon: APP_ICON_PATH,
    backgroundColor: "#111b21",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "persist:queue-saas-whatsapp",
    },
  });

  whatsappWindow.webContents.setUserAgent(buildChromeUserAgent());
  whatsappWindow.loadURL("https://web.whatsapp.com/");

  whatsappWindow.on("closed", () => {
    whatsappWindow = null;
  });

  whatsappWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return whatsappWindow;
}

function buildChromeUserAgent() {
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
}

function createTray() {
  const image = nativeImage.createFromDataURL(TRAY_ICON);
  tray = new Tray(image);
  tray.setToolTip("FasaWait Bot");
  updateTrayMenu();
  tray.on("click", showMainWindow);
}

async function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const state = await getRuntimeState();
  const menu = Menu.buildFromTemplate([
    {
      label: "Abrir painel",
      click: showMainWindow,
    },
    {
      label: "Abrir WhatsApp Web",
      click: () => openWhatsAppWeb().catch(reportBackgroundError),
    },
    { type: "separator" },
    {
      label: state.botRunning ? "Pausar bot" : "Iniciar bot",
      click: () => (state.botRunning ? stopBot() : startBot()).catch(reportBackgroundError),
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

function clearTimers() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

async function scheduleTimers() {
  clearTimers();
  const state = await getRuntimeState();
  const heartbeatSeconds = Math.max(Number(state.heartbeatIntervalSeconds || 30), 30);
  const pollingSeconds = Math.min(
    Math.max(Number(state.pollingIntervalSeconds || 30), 20),
    30,
  );

  heartbeatTimer = setInterval(() => {
    runHeartbeat().then(broadcastState).catch(reportBackgroundError);
  }, heartbeatSeconds * 1000);

  pollingTimer = setInterval(() => {
    runAutomaticPollingCycle().then(broadcastState).catch(reportBackgroundError);
  }, pollingSeconds * 1000);

  await runHeartbeat().catch(reportBackgroundError);
}

async function startBot() {
  const config = await getConfig();

  if (!config?.baseUrl || !config?.token || !config?.signingSecret) {
    await patchRuntimeState({
      botRunning: false,
      authStatus: "not_configured",
      lastError: "Informe URL, token e signing secret.",
    });
    await broadcastState();
    throw new Error("Informe URL, token e signing secret.");
  }

  const response = await validateAuthentication(config);

  if (response.is_primary_sender === false) {
    const message =
      "Dispositivo autenticado, mas nao e emissor principal. Defina este dispositivo como emissor principal em Configuracoes > WhatsApp.";
    await patchRuntimeState({
      botRunning: false,
      lastError: message,
    });
    await logError("primary_sender_required", message);
    await broadcastState();
    throw new Error(message);
  }

  await patchRuntimeState({ botRunning: true, lastError: "" });
  await scheduleTimers();
  await logInfo("bot_started", "Bot iniciado.");
  await updateTrayMenu();
  await broadcastState();
  return { ok: true };
}

async function stopBot() {
  clearTimers();
  resetQueueRuntime();
  await patchRuntimeState({ botRunning: false, localQueueSize: 0 });
  await logInfo("bot_stopped", "Bot pausado.");
  await updateTrayMenu();
  await broadcastState();
  return { ok: true };
}

async function testConnection() {
  try {
    const config = await getConfig();

    if (!config?.baseUrl || !config?.token || !config?.signingSecret) {
      await patchRuntimeState({
        authStatus: "not_configured",
        lastError: "Informe URL, token e signing secret.",
      });
      throw new Error("Informe URL, token e signing secret.");
    }

    await patchRuntimeState({ authStatus: "authenticating", lastError: "" });
    const response = await validateAuthentication(config);
    await logInfo("auth_ok", "Dispositivo autenticado.", {
      company: response.company_name,
      primary:
        typeof response.is_primary_sender === "boolean"
          ? response.is_primary_sender
          : "nao informado",
    });
    await broadcastState();
    return { ok: true, response };
  } catch (error) {
    const safeError = toSafeError(error);
    await patchRuntimeState({ authStatus: "error", lastError: safeError });
    await logError("auth_failed", safeError);
    await broadcastState();
    return { ok: false, error: safeError };
  }
}

async function getSnapshot() {
  return {
    config: await getPublicConfig(),
    state: await getRuntimeState(),
    logs: await getLocalLogs(),
  };
}

async function broadcastState() {
  const snapshot = await getSnapshot();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("bot:state-updated", snapshot);
  }

  await updateTrayMenu();
}

async function applyStoredAutoStart() {
  const config = await getPublicConfig();
  app.setLoginItemSettings({
    openAtLogin: Boolean(config?.autoStart),
    path: process.execPath,
  });
}

async function reportBackgroundError(error) {
  const safeError = toSafeError(error);
  await logError("background_error", safeError);
  await broadcastState();
}

ipcMain.handle("bot:get-state", async () => getSnapshot());

ipcMain.handle("bot:save-config", async (_event, config) => {
  const publicConfig = await saveConfig(config ?? {});
  app.setLoginItemSettings({
    openAtLogin: Boolean(publicConfig?.autoStart),
    path: process.execPath,
  });
  await patchRuntimeState({ lastError: "" });
  await broadcastState();
  return { ok: true, config: publicConfig };
});

ipcMain.handle("bot:clear-config", async () => {
  await stopBot().catch(() => null);
  await clearConfig();
  app.setLoginItemSettings({ openAtLogin: false, path: process.execPath });
  await broadcastState();
  return { ok: true };
});

ipcMain.handle("bot:test-connection", async () => testConnection());

ipcMain.handle("bot:start", async () => startBot());

ipcMain.handle("bot:stop", async () => stopBot());

ipcMain.handle("bot:reset-state", async () => {
  clearTimers();
  resetQueueRuntime();
  await resetRuntimeState();
  await patchRuntimeState({ botRunning: false });
  await logInfo("state_reset", "Estado local resetado.");
  await broadcastState();
  return { ok: true };
});

ipcMain.handle("bot:open-whatsapp", async () => {
  await openWhatsAppWeb();
  await broadcastState();
  return { ok: true };
});

ipcMain.handle("bot:refresh-whatsapp-status", async () => {
  const status = await getWhatsAppStatus();
  await broadcastState();
  return { ok: true, status };
});

ipcMain.handle("bot:set-auto-start", async (_event, autoStart) => {
  const config = await setAutoStart(Boolean(autoStart));
  app.setLoginItemSettings({
    openAtLogin: Boolean(autoStart),
    path: process.execPath,
  });
  await broadcastState();
  return { ok: true, config };
});
