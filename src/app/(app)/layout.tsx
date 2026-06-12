import { AppShell } from "@/components/layout/app-shell";
import { requireProfile } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, profile } = await requireProfile();

  return (
    <AppShell company={company} profile={profile}>
      {children}
    </AppShell>
  );
}
