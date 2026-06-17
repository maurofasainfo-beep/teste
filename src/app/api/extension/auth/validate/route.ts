import { NextResponse } from "next/server";
import { hashDeviceToken, hashSigningSecret, safeEqual } from "@/lib/qwep/crypto";
import { checkRateLimit, getClientIp } from "@/lib/qwep/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, WhatsAppDevice } from "@/lib/types/database";
import { extensionAuthValidateSchema } from "@/lib/validation";

type DeviceWithCompany = WhatsAppDevice & { company: Company | null };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = extensionAuthValidateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tokenHash = hashDeviceToken(parsed.data.token);
  const rateLimit = checkRateLimit({
    key: `qwep-auth:${getClientIp(request)}:${tokenHash}`,
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: rateLimit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_devices")
    .select("*, company:companies(*)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  const device = data as DeviceWithCompany;

  if (!device.company || device.company.status !== "active") {
    return NextResponse.json({ error: "Empresa inativa." }, { status: 403 });
  }

  if (["revoked", "expired", "error"].includes(device.status)) {
    await admin.from("whatsapp_device_logs").insert({
      company_id: device.company_id,
      device_id: device.id,
      event_type: "auth_failed",
      message: "Validacao negada por status do dispositivo.",
      metadata: { status: device.status },
    });

    return NextResponse.json({ error: "Dispositivo bloqueado." }, { status: 403 });
  }

  if (device.signing_secret_hash && !parsed.data.signing_secret) {
    await admin.from("whatsapp_device_logs").insert({
      company_id: device.company_id,
      device_id: device.id,
      event_type: "auth_failed",
      message: "Signing secret ausente.",
    });

    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  if (
    device.signing_secret_hash &&
    parsed.data.signing_secret &&
    !safeEqual(
      hashSigningSecret(parsed.data.signing_secret),
      device.signing_secret_hash,
    )
  ) {
    await admin.from("whatsapp_device_logs").insert({
      company_id: device.company_id,
      device_id: device.id,
      event_type: "auth_failed",
      message: "Signing secret invalido.",
    });

    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  const nextStatus =
    device.status === "pending_activation" || device.status === "created"
      ? "active"
      : device.status;

  const now = new Date().toISOString();
  const { data: updatedDevice, error: updateError } = await admin
    .from("whatsapp_devices")
    .update({
      status: nextStatus,
      extension_version: parsed.data.extension_version ?? device.extension_version,
      browser_name: parsed.data.browser_name ?? device.browser_name,
      user_agent: parsed.data.user_agent ?? device.user_agent,
      last_seen_at: now,
    })
    .eq("id", device.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Falha ao atualizar dispositivo." }, { status: 500 });
  }

  if (device.status === "pending_activation" || device.status === "created") {
    await admin.from("whatsapp_device_logs").insert({
      company_id: device.company_id,
      device_id: device.id,
      event_type: "device_activated",
      message: "Dispositivo ativado pela extensao.",
      metadata: {
        extension_version: parsed.data.extension_version ?? null,
        browser_name: parsed.data.browser_name ?? null,
      },
    });
  }

  return NextResponse.json({
    device_id: updatedDevice.id,
    company_name: device.company.trade_name,
    status: updatedDevice.status,
    is_primary_sender: updatedDevice.is_primary_sender,
    hmac_required: Boolean(updatedDevice.signing_secret_encrypted),
    polling_interval_seconds: 15,
    heartbeat_interval_seconds: 30,
    max_batch_size: 5,
    server_time: now,
  });
}
