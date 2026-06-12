import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth/session";
import { getNotificationProvider } from "@/lib/notifications/get-notification-provider";
import { buildCustomerQueueLink } from "@/lib/queue/customer-link";
import { createClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  status: z.enum(["released", "completed", "cancelled"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionContext();

  if (!session.user || !session.profile || !session.company) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
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

  const { data: queueEntry, error } = await supabase
    .from("queue_entries")
    .update(updatePayload)
    .eq("id", id)
    .eq("company_id", session.company.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
