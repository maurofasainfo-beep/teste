import { notFound } from "next/navigation";
import { PublicDisplayBoard } from "@/components/display/public-display-board";
import { SetupWarning } from "@/components/layout/setup-warning";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <SetupWarning />
      </main>
    );
  }

  const { slug } = await params;
  const supabase = await createClient();
  const { data: companies } = await supabase.rpc("get_public_company", {
    queue_slug: slug,
  });
  const company = companies?.[0];

  if (!company) {
    notFound();
  }

  const { data: entries } = await supabase.rpc("get_public_queue_entries", {
    queue_slug: slug,
  });

  return (
    <PublicDisplayBoard company={company} initialEntries={entries ?? []} />
  );
}
