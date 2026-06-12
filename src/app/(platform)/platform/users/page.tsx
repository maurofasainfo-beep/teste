import {
  createPlatformUserAction,
  updatePlatformUserAction,
} from "@/lib/platform/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformUser } from "@/lib/auth/platform-session";
import { canManagePlatformUsers } from "@/lib/platform/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformUsersPage() {
  const { platformProfile } = await requirePlatformUser();
  const admin = createAdminClient();
  const { data: users } = await admin
    .from("platform_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const canManage = canManagePlatformUsers(platformProfile.role);

  return (
    <>
      <PageHeader
        title="Equipe da Plataforma"
        description="Usuarios da empresa proprietaria do SaaS."
        action={<StatusBadge status={platformProfile.role} />}
      />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {canManage ? (
          <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-foreground">
                Novo usuario da plataforma
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesso sem company_id.
              </p>
            </div>
            <form action={createPlatformUserAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select id="role" name="role" defaultValue="support">
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="support">Support</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha temporaria</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              <Button className="w-full" type="submit">
                Criar usuario
              </Button>
            </form>
          </section>
        ) : null}

        <section
          className={
            canManage
              ? "rounded-lg border bg-card shadow-[var(--shadow-soft)]"
              : "rounded-lg border bg-card shadow-[var(--shadow-soft)] xl:col-span-2"
          }
        >
          <div className="border-b p-5">
            <h2 className="text-base font-semibold text-foreground">Equipe</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {users?.length ?? 0} usuarios cadastrados.
            </p>
          </div>
          <div className="divide-y">
            {(users ?? []).map((user) => (
              <div
                className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"
                key={user.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Avatar label={user.email} name={user.name} />
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={user.role} />
                    <StatusBadge status={user.status} />
                  </div>
                </div>
                {canManage ? (
                  <form action={updatePlatformUserAction} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="platform_profile_id" value={user.id} />
                    <Select name="role" defaultValue={user.role} className="sm:w-32">
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="support">Support</option>
                    </Select>
                    <Select
                      name="status"
                      defaultValue={user.status}
                      className="sm:w-32"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </Select>
                    <Button type="submit" variant="outline">
                      Salvar
                    </Button>
                  </form>
                ) : (
                  <span className="text-sm text-muted-foreground">Somente leitura</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
