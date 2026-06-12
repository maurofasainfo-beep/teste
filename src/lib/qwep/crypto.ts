import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { getSupabaseServiceKey } from "@/lib/env";

const TOKEN_HASH_PREFIX = "qwep-access-token:";
const SIGNING_SECRET_HASH_PREFIX = "qwep-signing-secret:";
const RESERVATION_TOKEN_HASH_PREFIX = "qwep-reservation-token:";

function base64UrlSecret(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function generateDeviceCredentials() {
  const token = base64UrlSecret("qwep_live");
  const signingSecret = base64UrlSecret("qwep_sig");

  return {
    token,
    signingSecret,
    tokenHash: hashDeviceToken(token),
    signingSecretHash: hashSigningSecret(signingSecret),
    signingSecretEncrypted: encryptSecret(signingSecret),
  };
}

function hashWithPrefix(prefix: string, value: string) {
  return createHash("sha256").update(`${prefix}${value}`).digest("hex");
}

export function hashDeviceToken(token: string) {
  return hashWithPrefix(TOKEN_HASH_PREFIX, token.trim());
}

export function hashSigningSecret(secret: string) {
  return hashWithPrefix(SIGNING_SECRET_HASH_PREFIX, secret.trim());
}

export function hashReservationToken(token: string) {
  return hashWithPrefix(RESERVATION_TOKEN_HASH_PREFIX, token.trim());
}

function getEncryptionKey() {
  const secret =
    process.env.QWEP_SECRET_ENCRYPTION_KEY ?? getSupabaseServiceKey();

  if (!secret) {
    throw new Error(
      "Defina QWEP_SECRET_ENCRYPTION_KEY ou SUPABASE_SERVICE_ROLE_KEY para proteger signing secrets.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(encryptedSecret: string) {
  const [version, ivValue, tagValue, encryptedValue] = encryptedSecret.split(":");

  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Formato de segredo criptografado invalido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createQwepSignature({
  method,
  pathname,
  timestamp,
  nonce,
  bodyHash,
  signingSecret,
}: {
  method: string;
  pathname: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  signingSecret: string;
}) {
  const canonical = [
    method.toUpperCase(),
    pathname,
    timestamp,
    nonce,
    bodyHash,
  ].join("\n");

  return createHmac("sha256", signingSecret).update(canonical).digest("hex");
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

