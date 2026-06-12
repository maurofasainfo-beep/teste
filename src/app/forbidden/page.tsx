import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="max-w-md rounded-lg border bg-card p-8 text-center shadow-[var(--shadow-panel)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ShieldAlert aria-hidden className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Seu usuario nao possui permissao para acessar esta area.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Voltar</Link>
        </Button>
      </section>
    </main>
  );
}
