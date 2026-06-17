import { NextResponse } from "next/server";
import { authenticateQwepRequest } from "@/lib/qwep/auth";
import { hashReservationToken, safeEqual } from "@/lib/qwep/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, MessageEvent } from "@/lib/types/database";
import { extensionAckSchema } from "@/lib/validation";

function getRetryDate(attemptCount: number) {
  const delaySeconds = attemptCount <= 1 ? 60 : 300;
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const bodyText = await request.text();
  const auth = await authenticateQwepRequest(request, {
    bodyText,
    requireHmac: true,
    rateLimitKey: "qwep-ack",
  });

  if (!auth.ok) {
    return auth.response;
  }

  let jsonBody: unknown;

  try {
    jsonBody = JSON.parse(bodyText || "{}");
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const parsed = extensionAckSchema.safeParse(jsonBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: event, error } = await admin
    .from("message_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !event || event.company_id !== auth.device.company_id) {
    return NextResponse.json({ error: "Mensagem nao encontrada." }, { status: 404 });
  }

  const messageEvent = event as MessageEvent;

  if (messageEvent.status === "sent" || messageEvent.status === "failed") {
    return NextResponse.json({
      id: messageEvent.id,
      status: messageEvent.status,
      idempotent: true,
    });
  }

  if (
    messageEvent.device_id !== auth.device.id ||
    messageEvent.reservation_id !== parsed.data.reservation_id ||
    !messageEvent.reservation_token_hash ||
    !safeEqual(
      hashReservationToken(parsed.data.reservation_token),
      messageEvent.reservation_token_hash,
    )
  ) {
    return NextResponse.json({ error: "Reserva invalida." }, { status: 409 });
  }

  const providerResponse = (parsed.data.provider_response ?? {}) as Json;

  if (parsed.data.status === "processing") {
    const { data: updated, error: updateError } = await admin
      .from("message_events")
      .update({
        status: "processing",
        processing_started_at:
          messageEvent.processing_started_at ?? new Date().toISOString(),
        provider_response: providerResponse,
      })
      .eq("id", messageEvent.id)
      .eq("company_id", auth.device.company_id)
      .eq("device_id", auth.device.id)
      .eq("reservation_id", parsed.data.reservation_id)
      .in("status", ["reserved", "processing"])
      .select("id,status")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Falha ao marcar processamento." },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  }

  if (parsed.data.status === "sent") {
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("message_events")
      .update({
        status: "sent",
        sent_at: now,
        failed_at: null,
        provider_response: providerResponse,
        error_message: null,
        processing_started_at: messageEvent.processing_started_at ?? now,
      })
      .eq("id", messageEvent.id)
      .eq("company_id", auth.device.company_id)
      .eq("device_id", auth.device.id)
      .eq("reservation_id", parsed.data.reservation_id)
      .in("status", ["reserved", "processing"])
      .select("id,status")
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Falha ao confirmar envio." }, { status: 500 });
    }

    await admin.from("whatsapp_device_logs").insert({
      company_id: auth.device.company_id,
      device_id: auth.device.id,
      event_type: "message_sent_ack",
      message: "ACK de envio recebido.",
      metadata: { message_event_id: messageEvent.id },
    });

    return NextResponse.json(updated);
  }

  const shouldRetry =
    parsed.data.retryable !== false &&
    messageEvent.attempt_count < messageEvent.max_attempts;
  const nextStatus = shouldRetry ? "retry" : "failed";
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("message_events")
    .update({
      status: nextStatus,
      failed_at: shouldRetry ? null : now,
      next_retry_at: shouldRetry ? getRetryDate(messageEvent.attempt_count) : null,
      provider_response: providerResponse,
      error_message: parsed.data.error_message ?? "Falha reportada pela extensao.",
      device_id: shouldRetry ? null : auth.device.id,
      reservation_id: shouldRetry ? null : messageEvent.reservation_id,
      reservation_token_hash: shouldRetry ? null : messageEvent.reservation_token_hash,
      reserved_at: shouldRetry ? null : messageEvent.reserved_at,
      reservation_expires_at: shouldRetry ? null : messageEvent.reservation_expires_at,
      processing_started_at: shouldRetry ? null : messageEvent.processing_started_at,
    })
    .eq("id", messageEvent.id)
    .eq("company_id", auth.device.company_id)
    .eq("device_id", auth.device.id)
    .eq("reservation_id", parsed.data.reservation_id)
    .in("status", ["reserved", "processing"])
    .select("id,status,next_retry_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Falha ao confirmar falha." }, { status: 500 });
  }

  await admin.from("whatsapp_device_logs").insert({
    company_id: auth.device.company_id,
    device_id: auth.device.id,
    event_type: "message_failed_ack",
    message: shouldRetry
      ? "ACK de falha recebido. Evento reagendado."
      : "ACK de falha definitiva recebido.",
    metadata: {
      message_event_id: messageEvent.id,
      retry: shouldRetry,
      error_message: parsed.data.error_message ?? null,
    },
  });

  return NextResponse.json(updated);
}
