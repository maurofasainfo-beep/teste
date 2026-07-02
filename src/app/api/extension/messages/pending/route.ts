import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { authenticateQwepRequest } from "@/lib/qwep/auth";
import { hashReservationToken } from "@/lib/qwep/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, MessageEvent } from "@/lib/types/database";

type ReservedMessageEvent =
  Database["public"]["Functions"]["reserve_pending_message_events"]["Returns"][number];
type FallbackReservedMessageEvent = MessageEvent & { reservation_token: string };

function getTextPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { to: "", text: "" };
  }

  const record = payload as Record<string, unknown>;
  let to = "";

  const rawPhone =
    typeof record.recipient_phone === "string"
      ? record.recipient_phone
      : typeof record.customer_phone === "string"
        ? record.customer_phone
        : "";

  if (rawPhone) {
    try {
      to = normalizeBrazilianPhone(rawPhone);
    } catch {
      to = "";
    }
  }
  const text = typeof record.message === "string" ? record.message : "";

  return { to, text };
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000).toISOString();
}

function isMissingReserveRpcError(error: { code?: string; message?: string }) {
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();

  return (
    code === "42883" ||
    code === "PGRST202" ||
    message.includes("function gen_random_bytes") ||
    message.includes("function digest") ||
    message.includes("pgcrypto") ||
    message.includes("reserve_pending_message_events") ||
    message.includes("schema cache")
  );
}

async function reservePendingMessageEvents({
  admin,
  companyId,
  deviceId,
  batchLimit,
}: {
  admin: ReturnType<typeof createAdminClient>;
  companyId: string;
  deviceId: string;
  batchLimit: number;
}) {
  const { data, error } = await admin.rpc("reserve_pending_message_events", {
    target_device_id: deviceId,
    batch_limit: batchLimit,
  });

  if (error) {
    if (isMissingReserveRpcError(error)) {
      return reservePendingMessageEventsFallback({
        admin,
        companyId,
        deviceId,
        batchLimit,
      });
    }

    throw new Error(error.message);
  }

  return (data ?? []) as ReservedMessageEvent[];
}

async function releaseExpiredReservationsFallback({
  admin,
  companyId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  companyId: string;
}) {
  const now = new Date().toISOString();
  const { data: expired, error } = await admin
    .from("message_events")
    .select("id, attempt_count, max_attempts")
    .eq("company_id", companyId)
    .in("status", ["reserved", "processing"])
    .not("reservation_expires_at", "is", null)
    .lt("reservation_expires_at", now);

  if (error) {
    throw new Error(error.message);
  }

  const expiredEvents = (expired ?? []) as Pick<
    MessageEvent,
    "id" | "attempt_count" | "max_attempts"
  >[];
  const failedIds = expiredEvents
    .filter((event) => event.attempt_count >= event.max_attempts)
    .map((event) => event.id);
  const retryIds = expiredEvents
    .filter((event) => event.attempt_count < event.max_attempts)
    .map((event) => event.id);

  if (failedIds.length > 0) {
    const { error: failedError } = await admin
      .from("message_events")
      .update({
        status: "failed",
        next_retry_at: null,
        device_id: null,
        reservation_id: null,
        reservation_token_hash: null,
        reserved_at: null,
        reservation_expires_at: null,
        processing_started_at: null,
        failed_at: now,
        error_message: "Reserva expirada.",
      })
      .eq("company_id", companyId)
      .in("id", failedIds);

    if (failedError) {
      throw new Error(failedError.message);
    }
  }

  if (retryIds.length > 0) {
    const { error: retryError } = await admin
      .from("message_events")
      .update({
        status: "retry",
        next_retry_at: now,
        device_id: null,
        reservation_id: null,
        reservation_token_hash: null,
        reserved_at: null,
        reservation_expires_at: null,
        processing_started_at: null,
        error_message: "Reserva expirada.",
      })
      .eq("company_id", companyId)
      .in("id", retryIds);

    if (retryError) {
      throw new Error(retryError.message);
    }
  }
}

async function reservePendingMessageEventsFallback({
  admin,
  companyId,
  deviceId,
  batchLimit,
}: {
  admin: ReturnType<typeof createAdminClient>;
  companyId: string;
  deviceId: string;
  batchLimit: number;
}) {
  await releaseExpiredReservationsFallback({ admin, companyId });

  const now = new Date();
  const { data, error } = await admin
    .from("message_events")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", "whatsapp_extension")
    .in("status", ["pending", "retry"])
    .order("created_at", { ascending: true })
    .limit(Math.max(batchLimit * 5, 5));

  if (error) {
    throw new Error(error.message);
  }

  const candidates = ((data ?? []) as MessageEvent[])
    .filter((event) => {
      if (event.attempt_count >= event.max_attempts) {
        return false;
      }

      if (event.status === "pending") {
        return true;
      }

      return (
        event.status === "retry" &&
        (!event.next_retry_at || new Date(event.next_retry_at) <= now)
      );
    })
    .slice(0, batchLimit);

  const reserved: FallbackReservedMessageEvent[] = [];

  for (const event of candidates) {
    const reservationId = randomUUID();
    const reservationToken = randomBytes(32).toString("hex");
    const reservedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("message_events")
      .update({
        status: "reserved",
        device_id: deviceId,
        reservation_id: reservationId,
        reservation_token_hash: hashReservationToken(reservationToken),
        reserved_at: reservedAt,
        reservation_expires_at: addSeconds(new Date(reservedAt), 120),
        processing_started_at: null,
        attempt_count: event.attempt_count + 1,
        error_message: null,
      })
      .eq("id", event.id)
      .eq("company_id", companyId)
      .is("device_id", null)
      .in("status", ["pending", "retry"])
      .select("*")
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (updated) {
      reserved.push({
        ...(updated as MessageEvent),
        reservation_token: reservationToken,
      });
    }
  }

  return reserved;
}

export async function GET(request: Request) {
  const auth = await authenticateQwepRequest(request, {
    bodyText: "",
    requirePrimarySender: true,
    requireHmac: true,
    rateLimitKey: "qwep-pending",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "5");
  const batchLimit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 5, 1), 10);
  const admin = createAdminClient();

  let data;

  try {
    data = await reservePendingMessageEvents({
      admin,
      companyId: auth.device.company_id,
      deviceId: auth.device.id,
      batchLimit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao reservar mensagens.",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }

  if (data.length > 0) {
    await admin.from("whatsapp_device_logs").insert({
      company_id: auth.device.company_id,
      device_id: auth.device.id,
      event_type: "message_batch_reserved",
      message: "Lote de mensagens reservado.",
      metadata: { count: data.length },
    });
  }

  return NextResponse.json({
    messages: data.map((event) => {
      const { to, text } = getTextPayload(event.payload);

      return {
        id: event.id,
        type: event.type,
        to,
        text,
        reservation_id: event.reservation_id,
        reservation_token: event.reservation_token,
        idempotency_key: event.idempotency_key,
        attempt_count: event.attempt_count,
        max_attempts: event.max_attempts,
      };
    }),
    server_time: new Date().toISOString(),
    config: {
      polling_interval_seconds: 30,
      heartbeat_interval_seconds: 30,
      send_delay_ms: 3000,
    },
  });
}
