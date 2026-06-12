const crypto = require("node:crypto");

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function hmacSha256Hex(secret, value) {
  return crypto
    .createHmac("sha256", String(secret))
    .update(String(value), "utf8")
    .digest("hex");
}

function createNonce() {
  return crypto.randomBytes(16).toString("hex");
}

function createQwepHeaders({ method, pathname, bodyText, token, signingSecret }) {
  const timestamp = String(Date.now());
  const nonce = createNonce();
  const bodyHash = sha256Hex(bodyText);
  const canonical = [
    String(method).toUpperCase(),
    pathname,
    timestamp,
    nonce,
    bodyHash,
  ].join("\n");
  const signature = hmacSha256Hex(signingSecret, canonical);

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

module.exports = {
  createNonce,
  createQwepHeaders,
  hmacSha256Hex,
  sha256Hex,
};
