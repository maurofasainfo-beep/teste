import { PlatformShell } from "@/components/platform/platform-shell";
import { requirePlatformUser } from "@/lib/auth/platform-session";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { platformProfile } = await requirePlatformUser();

  return <PlatformShell profile={platformProfile}>{children}</PlatformShell>;
}
