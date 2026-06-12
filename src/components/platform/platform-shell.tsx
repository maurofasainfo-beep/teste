import { ProductShell } from "@/components/layout/product-shell";
import type { PlatformProfile } from "@/lib/types/database";

type PlatformShellProps = {
  profile: PlatformProfile;
  children: React.ReactNode;
};

export function PlatformShell({ profile, children }: PlatformShellProps) {
  return (
    <ProductShell
      context="platform"
      role={profile.role}
      status={profile.status}
      userEmail={profile.email}
      userName={profile.name}
      workspaceLabel="Plataforma SaaS"
      workspaceName="Administracao"
    >
      {children}
    </ProductShell>
  );
}
