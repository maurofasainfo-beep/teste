import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { getNotificationProvider } from "@/lib/notifications/get-notification-provider";
import { buildCustomerQueueLink } from "@/lib/queue/customer-link";
import { createClient } from "@/lib/supabase/server";
import { queueEntrySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const context = await getSessionContext();

  if (!context.user || !context.profile || !context.company) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (context.profile.status !== "active" || context.company.status !== "active") {
    return NextResponse.json({ error: "Empresa ou usuário inativo." }, { status: 403 });
  }

  const parsed = queueEntrySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: queueEntry, error } = await supabase
    .from("queue_entries")
    .insert({
      company_id: context.company.id,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      party_size: parsed.data.party_size,
      created_by: context.profile.id,
      status: "waiting",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await getNotificationProvider().sendQueueCreatedMessage({
    company: context.company,
    queueEntry,
    customerLink: buildCustomerQueueLink(queueEntry.public_customer_token),
  });

  return NextResponse.json(
    {
      data: queueEntry,
      customer_link: buildCustomerQueueLink(queueEntry.public_customer_token),
    },
    { status: 201 },
  );
}
