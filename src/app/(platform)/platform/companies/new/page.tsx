import { Building2, UserRoundPlus } from "lucide-react";
import { createClientCompanyAction } from "@/lib/platform/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";

export default async function NewPlatformCompanyPage() {
  await requirePlatformAdmin();

  return (
    <>
      <PageHeader
        title="Nova Empresa Cliente"
        description="Cadastro do tenant e administrador inicial."
      />
      <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
        <form action={createClientCompanyAction} className="space-y-8">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Building2 aria-hidden className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Dados da empresa
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public_queue_slug">Slug publico</Label>
                <Input id="public_queue_slug" name="public_queue_slug" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="corporate_name">Razao social</Label>
                <Input id="corporate_name" name="corporate_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trade_name">Nome fantasia</Label>
                <Input id="trade_name" name="trade_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail da empresa</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <UserRoundPlus aria-hidden className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Admin inicial
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Nome</Label>
                <Input id="admin_name" name="admin_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">E-mail</Label>
                <Input id="admin_email" name="admin_email" type="email" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="admin_password">Senha temporaria</Label>
                <Input
                  id="admin_password"
                  name="admin_password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
            </div>
          </div>

          <Button className="w-full sm:w-auto" type="submit">
            Criar empresa e admin
          </Button>
        </form>
      </section>
    </>
  );
}
