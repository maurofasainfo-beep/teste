import { notFound } from "next/navigation";
import { CustomerStatusCard } from "@/components/customer-queue/customer-status-card";
import { SetupWarning } from "@/components/layout/setup-warning";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerQueuePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <SetupWarning />
      </main>
    );
  }

  const { token } = await params;

  if (!/^[a-f0-9]{64}$/.test(token)) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_customer_queue_entry", {
    customer_token: token,
  });
  const entry = data?.[0];

  if (error || !entry) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <CustomerStatusCard initialEntry={entry} token={token} />
    </main>
  );
}
