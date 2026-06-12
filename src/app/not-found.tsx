import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="max-w-md rounded-lg border bg-card p-8 text-center shadow-[var(--shadow-panel)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SearchX aria-hidden className="h-7 w-7" />
        </div>
        <p className="mt-5 text-sm font-semibold text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Pagina nao encontrada</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A rota solicitada nao existe ou nao esta disponivel.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Voltar</Link>
        </Button>
      </section>
    </main>
  );
}
