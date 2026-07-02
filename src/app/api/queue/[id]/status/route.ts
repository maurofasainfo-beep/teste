import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth/session";
import { getNotificationProvider } from "@/lib/notifications/get-notification-provider";
import { buildCustomerQueueLink } from "@/lib/queue/customer-link";
import { createClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  status: z.enum(["released", "completed", "cancelled"]),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionContext();

  if (!session.user || !session.profile || !session.company) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (session.profile.status !== "active" || session.company.status !== "active") {
    return NextResponse.json({ error: "Empresa ou usuário inativo." }, { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const updatePayload =
    parsed.data.status === "released"
      ? {
          status: "released" as const,
          released_by: session.profile.id,
          released_at: now,
          completed_at: null,
          cancelled_at: null,
          cancelled_by_customer: false,
        }
      : parsed.data.status === "completed"
        ? {
            status: "completed" as const,
            completed_at: now,
            cancelled_at: null,
          }
        : {
            status: "cancelled" as const,
            cancelled_at: now,
            cancelled_by_customer: false,
          };
  const allowedCurrentStatuses =
    parsed.data.status === "released"
      ? (["waiting"] as const)
      : (["waiting", "released"] as const);

  const { data: queueEntry, error } = await supabase
    .from("queue_entries")
    .update(updatePayload)
    .eq("id", parsedParams.data.id)
    .eq("company_id", session.company.id)
    .in("status", allowedCurrentStatuses)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!queueEntry) {
    return NextResponse.json(
      { error: "Transição de status não permitida ou entrada já alterada." },
      { status: 409 },
    );
  }

  if (parsed.data.status === "released") {
    await getNotificationProvider().sendCustomerReleasedMessage({
      company: session.company,
      queueEntry,
      customerLink: buildCustomerQueueLink(queueEntry.public_customer_token),
    });
  }

  return NextResponse.json({ data: queueEntry });
}
