const { appendLocalLog, patchRuntimeState } = require("./storage");

async function logInfo(event, message, metadata = {}) {
  await appendLocalLog({ level: "info", event, message, metadata });
}

async function logWarn(event, message, metadata = {}) {
  await appendLocalLog({ level: "warn", event, message, metadata });
}

async function logError(event, message, metadata = {}) {
  const safe = toSafeError(message);
  await appendLocalLog({ level: "error", event, message: safe, metadata });
  await patchRuntimeState({ lastError: safe });
}

function toSafeError(error) {
  if (!error) {
    return "Erro desconhecido.";
  }

  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/qwep_(live|sig)_[A-Za-z0-9_-]+/g, "[secret]")
    .slice(0, 500);
}

module.exports = {
  logError,
  logInfo,
  logWarn,
  toSafeError,
};
