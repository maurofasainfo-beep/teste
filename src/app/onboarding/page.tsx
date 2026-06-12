import { redirect } from "next/navigation";
import { createCompanyOnboardingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSessionContext, requireUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  await requireUser();
  const { profile } = await getSessionContext();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Configurar empresa</CardTitle>
          <CardDescription>
            Esta etapa cria a empresa e vincula seu usuário como admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCompanyOnboardingAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin_name">Nome do admin</Label>
              <Input id="admin_name" name="admin_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" inputMode="numeric" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public_queue_slug">Slug público</Label>
              <Input id="public_queue_slug" name="public_queue_slug" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="corporate_name">Razão social</Label>
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
            <Button className="sm:col-span-2" type="submit">
              Criar empresa
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
