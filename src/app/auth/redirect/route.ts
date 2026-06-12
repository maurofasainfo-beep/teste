import { redirect } from "next/navigation";
import { getPostLoginRedirectPath } from "@/lib/auth/platform-session";

export async function GET() {
  redirect(await getPostLoginRedirectPath());
}
