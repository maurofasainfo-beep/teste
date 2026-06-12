import { redirect } from "next/navigation";
import { Activity, LockKeyhole, Radio } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { SetupWarning } from "@/components/layout/setup-warning";
import { getSessionContext } from "@/lib/auth/session";
import { getPostLoginRedirectPath } from "@/lib/auth/platform-session";
import { isSupabaseConfigured } from "@/lib/env";

export default async function LoginPage() {
  const isConfigured = isSupabaseConfigured();
  const { user } = await getSessionContext();

  if (user) {
    redirect(await getPostLoginRedirectPath());
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
        <section className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            SaaS Multi-Tenant
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal text-foreground sm:text-6xl">
            Gerenciamento de filas em tempo real
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Painel operacional, display publico e administracao de tenants em uma
            base segura com Supabase.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { label: "RLS por empresa", icon: LockKeyhole },
              { label: "Realtime", icon: Radio },
              { label: "Operacao ativa", icon: Activity },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className="rounded-lg border bg-card p-4 shadow-[var(--shadow-soft)]"
                  key={item.label}
                >
                  <Icon aria-hidden className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        {isConfigured ? <LoginForm isConfigured={isConfigured} /> : <SetupWarning />}
      </div>
    </main>
  );
}
