import { appendLocalLog, patchRuntimeState } from "./storage.js";

export async function logInfo(event, message, metadata = {}) {
  await appendLocalLog({ level: "info", event, message, metadata });
}

export async function logWarn(event, message, metadata = {}) {
  await appendLocalLog({ level: "warn", event, message, metadata });
}

export async function logError(event, message, metadata = {}) {
  await appendLocalLog({ level: "error", event, message, metadata });
  await patchRuntimeState({ lastError: message });
}

export function toSafeError(error) {
  if (!error) {
    return "Erro desconhecido.";
  }

  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/qwep_(live|sig)_[A-Za-z0-9_-]+/g, "[secret]")
    .slice(0, 500);
}
