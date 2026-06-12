import "server-only";

const usedNonces = new Map<string, number>();

export function rememberNonce(key: string, ttlMs: number) {
  const now = Date.now();

  for (const [nonceKey, expiresAt] of usedNonces.entries()) {
    if (expiresAt <= now) {
      usedNonces.delete(nonceKey);
    }
  }

  if (usedNonces.has(key)) {
    return false;
  }

  usedNonces.set(key, now + ttlMs);
  return true;
}

