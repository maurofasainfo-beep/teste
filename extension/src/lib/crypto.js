const encoder = new TextEncoder();

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bufferToHex(digest);
}

export async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bufferToHex(signature);
}

export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createQwepHeaders({
  method,
  pathname,
  bodyText,
  token,
  signingSecret,
}) {
  const timestamp = String(Date.now());
  const nonce = createNonce();
  const bodyHash = await sha256Hex(bodyText);
  const canonical = [
    method.toUpperCase(),
    pathname,
    timestamp,
    nonce,
    bodyHash,
  ].join("\n");
  const signature = await hmacSha256Hex(signingSecret, canonical);

  return {
    Authorization: `Bearer ${token}`,
    "X-QWEP-Version": "1",
    "X-QWEP-Timestamp": timestamp,
    "X-QWEP-Nonce": nonce,
    "X-QWEP-Body-SHA256": bodyHash,
    "X-QWEP-Body-Hash": bodyHash,
    "X-QWEP-Signature": signature,
  };
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
