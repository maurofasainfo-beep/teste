"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Search, UserPlus, UsersRound } from "lucide-react";
import { createUserAction, updateUserAction } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Profile } from "@/lib/types/database";

type UsersWorkspaceProps = {
  profiles: Profile[];
};

export function UsersWorkspace({ profiles }: UsersWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const filteredProfiles = useMemo(() => {
    const search = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesSearch =
        !search ||
        profile.name.toLowerCase().includes(search) ||
        profile.email.toLowerCase().includes(search);
      const matchesRole = role === "all" || profile.role === role;
      const matchesStatus = status === "all" || profile.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, query, role, status]);

  const admins = profiles.filter((profile) => profile.role === "admin").length;
  const active = profiles.filter((profile) => profile.status === "active").length;

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-foreground">Novo usuario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso vinculado a empresa atual.
          </p>
        </div>
        <form action={createUserAction} className="space-y-4">
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
            <Select id="role" name="role" defaultValue="employee">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha temporaria</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <SubmitButton label="Criar usuario" />
        </form>
      </section>

      <section className="rounded-lg border bg-card shadow-[var(--shadow-soft)]">
        <div className="border-b p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Equipe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {profiles.length} usuarios | {admins} admins | {active} ativos
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_150px_150px]">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9"
                  placeholder="Buscar"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="all">Todos perfis</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </Select>
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Todos status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-5">
          {filteredProfiles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ultimo acesso</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <Avatar label={profile.email} name={profile.name} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={profile.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={profile.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      Nao registrado
                    </TableCell>
                    <TableCell>
                      <form action={updateUserAction} className="flex justify-end gap-2">
                        <input type="hidden" name="profile_id" value={profile.id} />
                        <Select name="role" defaultValue={profile.role} className="w-32">
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </Select>
                        <Select
                          name="status"
                          defaultValue={profile.status}
                          className="w-28"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </Select>
                        <SubmitButton label="Salvar" variant="outline" />
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="Nenhum usuario encontrado"
              description="Ajuste os filtros para visualizar outros usuarios."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SubmitButton({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full sm:w-auto" disabled={pending} type="submit" variant={variant}>
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus aria-hidden className="h-4 w-4" />
      )}
      {pending ? "Processando" : label}
    </Button>
  );
}
