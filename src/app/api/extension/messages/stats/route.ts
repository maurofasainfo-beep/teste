import { NextResponse } from "next/server";
import { authenticateQwepRequest } from "@/lib/qwep/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const trackedStatuses = [
  "pending",
  "retry",
  "reserved",
  "processing",
  "sent",
  "failed",
] as const;

type TrackedStatus = (typeof trackedStatuses)[number];

async function countStatus({
  admin,
  companyId,
  status,
}: {
  admin: ReturnType<typeof createAdminClient>;
  companyId: string;
  status: TrackedStatus;
}) {
  const { count, error } = await admin
    .from("message_events")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("provider", "whatsapp_extension")
    .eq("status", status);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET(request: Request) {
  const auth = await authenticateQwepRequest(request, {
    bodyText: "",
    requirePrimarySender: true,
    requireHmac: true,
    rateLimitKey: "qwep-message-stats",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const admin = createAdminClient();

  try {
    const entries = await Promise.all(
      trackedStatuses.map(async (status) => [
        status,
        await countStatus({
          admin,
          companyId: auth.device.company_id,
          status,
        }),
      ]),
    );
    const stats = Object.fromEntries(entries) as Record<TrackedStatus, number>;

    return NextResponse.json({
      stats,
      waiting_to_send:
        stats.pending + stats.retry + stats.reserved + stats.processing,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao consultar estatisticas de mensagens.",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
