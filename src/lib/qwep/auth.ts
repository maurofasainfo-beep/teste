import "server-only";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, WhatsAppDevice } from "@/lib/types/database";
import {
  createQwepSignature,
  decryptSecret,
  hashDeviceToken,
  safeEqual,
  sha256Hex,
} from "./crypto";
import { checkRateLimit } from "./rate-limit";
import { rememberNonce } from "./replay";

type DeviceWithCompany = WhatsAppDevice & { company: Company | null };

export type QwepAuthSuccess = {
  ok: true;
  device: WhatsAppDevice;
  company: Company;
};

export type QwepAuthFailure = {
  ok: false;
  response: NextResponse;
};

function unauthorized(message = "Credenciais invalidas.", status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ error: message }, { status }),
  };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function validateTimestamp(timestamp: string | null) {
  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const requestTime = Number(timestamp);
  const driftMs = Math.abs(Date.now() - requestTime);

  return Number.isFinite(requestTime) && driftMs <= 5 * 60 * 1000;
}

function validateHmac({
  request,
  bodyText,
  signingSecret,
  deviceId,
}: {
  request: Request;
  bodyText: string;
  signingSecret: string;
  deviceId: string;
}) {
  const version = request.headers.get("x-qwep-version");
  const timestamp = request.headers.get("x-qwep-timestamp");
  const nonce = request.headers.get("x-qwep-nonce");
  const signature = request.headers.get("x-qwep-signature");
  const bodyHash = request.headers.get("x-qwep-body-sha256");

  if (version !== "1" || !timestamp || !nonce || !signature || !bodyHash) {
    return false;
  }

  if (!validateTimestamp(timestamp)) {
    return false;
  }

  if (!safeEqual(bodyHash, sha256Hex(bodyText))) {
    return false;
  }

  const nonceAccepted = rememberNonce(
    `${deviceId}:${timestamp}:${nonce}`,
    5 * 60 * 1000,
  );

  if (!nonceAccepted) {
    return false;
  }

  const url = new URL(request.url);
  const expectedSignature = createQwepSignature({
    method: request.method,
    pathname: url.pathname,
    timestamp,
    nonce,
    bodyHash,
    signingSecret,
  });

  return safeEqual(signature, expectedSignature);
}

export async function authenticateQwepRequest(
  request: Request,
  {
    bodyText = "",
    requirePrimarySender = false,
    requireHmac = true,
    rateLimitKey = "qwep",
  }: {
    bodyText?: string;
    requirePrimarySender?: boolean;
    requireHmac?: boolean;
    rateLimitKey?: string;
  } = {},
): Promise<QwepAuthSuccess | QwepAuthFailure> {
  const token = getBearerToken(request);

  if (!token) {
    return unauthorized();
  }

  const tokenHash = hashDeviceToken(token);
  const rateLimit = checkRateLimit({
    key: `${rateLimitKey}:${tokenHash}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limited", retry_after_seconds: rateLimit.retryAfterSeconds },
        { status: 429 },
      ),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_devices")
    .select("*, company:companies(*)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return unauthorized();
  }

  const deviceWithCompany = data as DeviceWithCompany;

  if (!deviceWithCompany.company || deviceWithCompany.company.status !== "active") {
    return unauthorized("Empresa inativa.", 403);
  }

  if (["revoked", "expired"].includes(deviceWithCompany.status)) {
    return unauthorized("Dispositivo bloqueado.", 403);
  }

  if (requirePrimarySender && !deviceWithCompany.is_primary_sender) {
    return unauthorized("Dispositivo nao e emissor principal.", 403);
  }

  if (requireHmac) {
    if (!deviceWithCompany.signing_secret_encrypted) {
      return unauthorized("HMAC nao configurado para o dispositivo.", 403);
    }

    const signingSecret = decryptSecret(deviceWithCompany.signing_secret_encrypted);
    const validHmac = validateHmac({
      request,
      bodyText,
      signingSecret,
      deviceId: deviceWithCompany.id,
    });

    if (!validHmac) {
      return unauthorized("Assinatura QWEP invalida.", 401);
    }
  }

  return {
    ok: true,
    device: deviceWithCompany,
    company: deviceWithCompany.company,
  };
}
