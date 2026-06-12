import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/types/database";

const publicPrefixes = [
  "/api/extension",
  "/login",
  "/auth",
  "/display",
  "/forbidden",
  "/queue/customer",
];

function isPublicPath(pathname: string) {
  return publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabasePublicConfig();

  const supabase = createServerClient<Database>(url!, anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );

        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    const urlToRedirect = request.nextUrl.clone();
    urlToRedirect.pathname = "/login";
    urlToRedirect.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(urlToRedirect);
  }

  if (user && pathname === "/login") {
    const urlToRedirect = request.nextUrl.clone();
    urlToRedirect.pathname = "/auth/redirect";
    urlToRedirect.search = "";
    return NextResponse.redirect(urlToRedirect);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
