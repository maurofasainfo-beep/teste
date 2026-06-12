const { patchRuntimeState } = require("./storage");

const WHATSAPP_URL = "https://web.whatsapp.com/";

let windowProvider = null;

function configureWhatsAppBridge(provider) {
  windowProvider = provider;
}

async function openWhatsAppWeb() {
  const whatsappWindow = await getOrCreateWindow(true);
  const currentUrl = whatsappWindow.webContents.getURL();

  if (!currentUrl.startsWith(WHATSAPP_URL) && !whatsappWindow.webContents.isLoading()) {
    await whatsappWindow.loadURL(WHATSAPP_URL).catch(() => null);
  }

  whatsappWindow.show();
  whatsappWindow.focus();
  return { ok: true };
}

async function getWhatsAppStatus() {
  const whatsappWindow = await getWindow(false);

  if (!whatsappWindow || whatsappWindow.isDestroyed()) {
    const status = {
      whatsapp_status: "disconnected",
      connected_phone: "",
      reason: "whatsapp_window_not_found",
    };
    await patchRuntimeState({ whatsappStatus: status.whatsapp_status });
    return status;
  }

  if (whatsappWindow.webContents.isLoading()) {
    const status = {
      whatsapp_status: "loading",
      connected_phone: "",
      reason: "webcontents_loading",
    };
    await patchRuntimeState({ whatsappStatus: status.whatsapp_status });
    return status;
  }

  try {
    const response = await whatsappWindow.webContents.executeJavaScript(
      `(${detectWhatsAppStatus.toString()})()`,
      true,
    );
    const status = {
      whatsapp_status: response?.whatsapp_status ?? "unknown",
      connected_phone: response?.connected_phone ?? "",
      reason: response?.reason ?? "",
    };

    await patchRuntimeState({
      whatsappStatus: status.whatsapp_status,
      connectedPhone: status.connected_phone,
    });

    return status;
  } catch (error) {
    const status = {
      whatsapp_status: "error",
      connected_phone: "",
      reason: error instanceof Error ? error.message : String(error),
    };
    await patchRuntimeState({ whatsappStatus: status.whatsapp_status });
    return status;
  }
}

async function sendWhatsAppMessage({ messageId, to, text, timeoutMs = 45000 }) {
  const whatsappWindow = await getWindow(false);

  if (!whatsappWindow || whatsappWindow.isDestroyed()) {
    throw new Error("WhatsApp Web nao esta aberto.");
  }

  if (whatsappWindow.webContents.isLoading()) {
    throw new Error("WhatsApp Web ainda esta carregando.");
  }

  const phone = normalizePhoneForWhatsApp(to);
  const message = String(text ?? "").trim();

  if (!phone) {
    throw new Error("Telefone invalido.");
  }

  if (!message) {
    throw new Error("Mensagem vazia.");
  }

  const response = await whatsappWindow.webContents.executeJavaScript(
    `(${sendViaWhatsAppInternals.toString()})(${JSON.stringify(phone)}, ${JSON.stringify(
      message,
    )}, ${Number(timeoutMs) || 45000})`,
    true,
  );

  if (!response?.ok) {
    throw new Error(response?.error ?? "Falha ao enviar pelo WhatsApp Web.");
  }

  await patchRuntimeState({
    lastSendAt: new Date().toISOString(),
    whatsappStatus: response.whatsapp_status ?? "connected",
    lastProcessedMessageId: messageId ?? "",
  });

  return response;
}

async function getWindow(createIfMissing) {
  if (!windowProvider) {
    return null;
  }

  return windowProvider({ createIfMissing });
}

async function getOrCreateWindow(show) {
  if (!windowProvider) {
    throw new Error("Janela do WhatsApp nao configurada.");
  }

  return windowProvider({ createIfMissing: true, show });
}

function normalizePhoneForWhatsApp(value) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return "";
  }

  return digits;
}

function detectWhatsAppStatus() {
  const bodyText = document.body?.textContent?.toLowerCase() ?? "";

  const hasQr =
    document.querySelector('canvas[aria-label*="Scan"]') ||
    document.querySelector('canvas[aria-label*="Escaneie"]') ||
    (document.querySelector("canvas") &&
      (bodyText.includes("use whatsapp on your computer") ||
        bodyText.includes("link a device") ||
        bodyText.includes("vincular um aparelho") ||
        bodyText.includes("usar o whatsapp no computador")));

  if (hasQr) {
    return {
      whatsapp_status: "qr_required",
      connected_phone: "",
      reason: "qr_required",
    };
  }

  const isReady = Boolean(
    document.querySelector('[data-testid="chat-list"]') ||
      document.querySelector('[aria-label="Chat list"]') ||
      document.querySelector('[aria-label="Lista de conversas"]') ||
      document.querySelector('[contenteditable="true"][role="textbox"]') ||
      document.querySelector("#pane-side"),
  );

  if (isReady) {
    return {
      whatsapp_status: "connected",
      connected_phone: "",
      reason: "main_app_ready",
    };
  }

  if (bodyText.includes("loading") || bodyText.includes("carregando")) {
    return {
      whatsapp_status: "loading",
      connected_phone: "",
      reason: "loading",
    };
  }

  return {
    whatsapp_status: "unknown",
    connected_phone: "",
    reason: "status_not_detected",
  };
}

async function sendViaWhatsAppInternals(phone, text, timeoutMs) {
  const startedAt = Date.now();
  const limit = Number(timeoutMs) || 45000;
  const chatId = `${phone}@c.us`;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getWebpackRequire() {
    const chunk = self.webpackChunkwhatsapp_web_client;

    if (!Array.isArray(chunk) || chunk.__qwepDesktopRequire) {
      return chunk?.__qwepDesktopRequire;
    }

    const moduleId = `qwep-desktop-${Date.now()}`;
    chunk.push([
      [moduleId],
      {},
      (require) => {
        chunk.__qwepDesktopRequire = require;
      },
    ]);

    return chunk.__qwepDesktopRequire;
  }

  function getNamedModule(name) {
    try {
      if (typeof self.require === "function") {
        return self.require(name);
      }
    } catch {
      // Some WhatsApp builds do not expose named modules.
    }

    try {
      if (typeof self.importNamespace === "function") {
        return self.importNamespace(name);
      }
    } catch {
      // Ignore unavailable named modules.
    }

    return null;
  }

  function getDebugModules() {
    try {
      const modulesMap = self.require?.("__debug")?.modulesMap;

      if (!modulesMap) {
        return [];
      }

      return Object.keys(modulesMap)
        .filter((key) => key.includes("WA"))
        .map((key) => {
          const debugModule = modulesMap[key];
          const result = {
            default: debugModule?.defaultExport,
            factory: debugModule?.factory,
            ...debugModule,
          };

          if (
            result.default &&
            typeof result.default === "object" &&
            Object.keys(result.default).length === 0 &&
            typeof self.importNamespace === "function"
          ) {
            try {
              self.ErrorGuard?.skipGuardGlobal?.(true);
              Object.assign(result, self.importNamespace(key));
            } catch {
              // Ignore modules that cannot be imported directly.
            }
          }

          return result;
        });
    } catch {
      return [];
    }
  }

  function getWebpackModules() {
    const webpackRequire = getWebpackRequire();
    const cache = webpackRequire?.c;

    if (!cache) {
      return [];
    }

    return Object.values(cache)
      .map((cachedModule) => cachedModule?.exports)
      .filter(Boolean);
  }

  function findModuleValue(selector) {
    const modules = [...getDebugModules(), ...getWebpackModules()];

    for (const exports of modules) {
      const candidates = [
        exports,
        exports?.default,
        ...(exports && typeof exports === "object" ? Object.values(exports) : []),
      ];

      for (const candidate of candidates) {
        try {
          const value = candidate && selector(candidate);

          if (value) {
            return value;
          }
        } catch {
          // Ignore incompatible WhatsApp modules.
        }
      }
    }

    return null;
  }

  function scanModules(predicate) {
    return findModuleValue((candidate) => (predicate(candidate) ? candidate : null));
  }

  function getWhatsAppStore() {
    if (
      self.__qwepDesktopStore?.Chat &&
      (self.__qwepDesktopStore.SendMessage ||
        self.__qwepDesktopStore.SendTextMsgToChat)
    ) {
      return self.__qwepDesktopStore;
    }

    const collections =
      getNamedModule("WAWebCollections") ||
      findModuleValue((candidate) =>
        candidate?.Chat && candidate?.Msg
          ? candidate
          : candidate?.default?.Chat && candidate?.default?.Msg
            ? candidate.default
            : null,
      );

    const wapQuery = findModuleValue((candidate) =>
      candidate?.queryWidExists || candidate?.queryExists || candidate?.queryExist
        ? candidate
        : null,
    );

    const store = {
      Chat: collections?.Chat,
      Msg: collections?.Msg,
      WidFactory:
        getNamedModule("WAWebWidFactory") ||
        scanModules(
          (candidate) =>
            typeof candidate.isWidlike === "function" &&
            typeof candidate.createWid === "function" &&
            typeof candidate.createWidFromWidLike === "function",
        ),
      MsgKey: getNamedModule("WAWebMsgKey"),
      UserMe: getNamedModule("WAWebUserPrefsMeUser"),
      SendMessage: getNamedModule("WAWebSendMsgChatAction"),
      EphemeralFields: getNamedModule("WAWebGetEphemeralFieldsMsgActionsUtils"),
      FindOrCreateChat: findModuleValue((candidate) =>
        candidate?.findOrCreateLatestChat
          ? candidate
          : candidate?.default?.findOrCreateLatestChat
            ? candidate.default
            : null,
      ),
      SendTextMsgToChat: findModuleValue((candidate) =>
        typeof candidate.sendTextMsgToChat === "function"
          ? candidate.sendTextMsgToChat
          : null,
      ),
      checkNumber:
        wapQuery?.queryWidExists || wapQuery?.queryExists || wapQuery?.queryExist,
    };

    self.__qwepDesktopStore = store;
    return store;
  }

  function buildWid(store) {
    const widFactory =
      store?.WidFactory ||
      scanModules(
        (candidate) =>
          typeof candidate.createWid === "function" ||
          typeof candidate.createUserWid === "function",
      );

    if (widFactory?.createWid) {
      return widFactory.createWid(chatId);
    }

    if (widFactory?.createUserWid) {
      return widFactory.createUserWid(phone);
    }

    return chatId;
  }

  async function resolveChat(store) {
    let chatWid = buildWid(store);

    if (typeof store.checkNumber === "function") {
      const contact = await store.checkNumber(chatWid).catch(() => null);

      if (contact?.wid) {
        chatWid = contact.wid;
      } else {
        const error = new Error("Contato nao encontrado no WhatsApp.");
        error.code = "contact_not_found";
        throw error;
      }
    }

    let chat =
      store.Chat?.get?.(chatWid) ||
      (await store.FindOrCreateChat?.findOrCreateLatestChat?.(chatWid))?.chat;

    if (
      chat &&
      store.Chat?.modelClass &&
      !(chat instanceof store.Chat.modelClass) &&
      chat.id
    ) {
      chat = store.Chat.get(chat.id) || chat;
    }

    return chat;
  }

  async function sendWithAddAndSend(store, chat) {
    if (
      !store.SendMessage?.addAndSendMsgToChat ||
      !store.MsgKey?.newId ||
      !store.UserMe ||
      !store.EphemeralFields
    ) {
      return null;
    }

    const lidUser = store.UserMe.getMaybeMeLidUser?.();
    const meUser = store.UserMe.getMaybeMePnUser?.();
    const from = chat.id?.isLid?.() ? lidUser : meUser;

    if (!from) {
      return null;
    }

    const newId = await store.MsgKey.newId();
    const newMsgKey = new store.MsgKey({
      from,
      to: chat.id,
      id: newId,
      participant: undefined,
      selfDir: "out",
    });
    const ephemeralFields = store.EphemeralFields.getEphemeralFields?.(chat) ?? {};
    const message = {
      id: newMsgKey,
      ack: 0,
      body: text,
      from,
      to: chat.id,
      local: true,
      self: "out",
      t: Math.floor(Date.now() / 1000),
      isNewMsg: true,
      type: "chat",
      ...ephemeralFields,
    };
    const result = store.SendMessage.addAndSendMsgToChat(chat, message);
    const [msgPromise, sendMsgResultPromise] = Array.isArray(result)
      ? result
      : [result, null];

    await msgPromise;

    if (sendMsgResultPromise?.then) {
      await sendMsgResultPromise;
    }

    const sentMessage = store.Msg?.get?.(newMsgKey._serialized);

    return {
      ok: true,
      status: "sent_without_navigation_add_and_send",
      whatsapp_status: "connected",
      provider_message_id: sentMessage?.id?.id ?? newMsgKey._serialized ?? newId,
      sent_at: new Date().toISOString(),
    };
  }

  async function sendWithTextFunction(store, chat) {
    if (typeof store.SendTextMsgToChat !== "function") {
      return null;
    }

    await store.SendTextMsgToChat(chat, text);

    return {
      ok: true,
      status: "sent_without_navigation_send_text",
      whatsapp_status: "connected",
      sent_at: new Date().toISOString(),
    };
  }

  while (Date.now() - startedAt <= limit) {
    const statusText = document.body?.textContent?.toLowerCase() ?? "";

    if (
      statusText.includes("link a device") ||
      statusText.includes("vincular um aparelho") ||
      statusText.includes("use whatsapp on your computer") ||
      statusText.includes("usar o whatsapp no computador")
    ) {
      return {
        ok: false,
        error: "WhatsApp Web nao esta conectado.",
        whatsapp_status: "qr_required",
      };
    }

    const store = getWhatsAppStore();

    if (store.Chat && (store.SendMessage || store.SendTextMsgToChat)) {
      const chat = await resolveChat(store);

      if (!chat) {
        return {
          ok: false,
          error:
            "Conversa nao encontrada sem navegar. Envio automatico cancelado.",
          whatsapp_status: "connected",
        };
      }

      const result =
        (await sendWithAddAndSend(store, chat)) ||
        (await sendWithTextFunction(store, chat));

      if (result) {
        return result;
      }
    }

    await wait(500);
  }

  return {
    ok: false,
    error: "API interna do WhatsApp Web indisponivel. Envio cancelado.",
    whatsapp_status: "connected",
  };
}

module.exports = {
  configureWhatsAppBridge,
  getWhatsAppStatus,
  openWhatsAppWeb,
  sendWhatsAppMessage,
};
