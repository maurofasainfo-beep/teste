import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerQueueNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-[var(--shadow-panel)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <AlertTriangle aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">
          Link nao encontrado
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Verifique o link recebido ou procure um atendente para entrar na fila.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link href="/login">Area de atendimento</Link>
        </Button>
      </section>
    </main>
  );
}
