import { ProductShell } from "@/components/layout/product-shell";
import type { Company, Profile } from "@/lib/types/database";

type AppShellProps = {
  company: Company;
  profile: Profile;
  children: React.ReactNode;
};

export function AppShell({ company, profile, children }: AppShellProps) {
  return (
    <ProductShell
      context="tenant"
      role={profile.role}
      status={company.status}
      userEmail={profile.email}
      userName={profile.name}
      workspaceLabel="Queue SaaS"
      workspaceName={company.trade_name}
    >
      {children}
    </ProductShell>
  );
}
