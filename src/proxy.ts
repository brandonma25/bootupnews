import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildAuthCallbackExchangeUrl, hasAuthReturnParams } from "@/lib/auth";
import { env, isSupabaseConfigured } from "@/lib/env";

const CANONICAL_HOST = "bootupnews.com";
const LEGACY_REDIRECT_HOSTS = new Set(["bootupnews.vercel.app", "www.bootupnews.com"]);

function buildCanonicalHostRedirectUrl(requestUrl: URL, host: string) {
  const normalizedHost = host.split(":")[0]?.toLowerCase() ?? "";

  if (!LEGACY_REDIRECT_HOSTS.has(normalizedHost)) {
    return null;
  }

  const redirectUrl = new URL(requestUrl);
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = CANONICAL_HOST;
  redirectUrl.port = "";
  return redirectUrl;
}

export async function proxy(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const canonicalRedirectUrl = buildCanonicalHostRedirectUrl(
    requestUrl,
    request.headers?.get("host") ?? requestUrl.host,
  );

  if (canonicalRedirectUrl) {
    return NextResponse.redirect(canonicalRedirectUrl, 301);
  }

  const isAuthCallbackRequest = requestUrl.pathname === "/auth/callback";
  const isPasswordResetRequest = requestUrl.pathname === "/reset-password";

  if (
    isSupabaseConfigured &&
    !isAuthCallbackRequest &&
    !isPasswordResetRequest &&
    hasAuthReturnParams(requestUrl.searchParams)
  ) {
    return NextResponse.redirect(buildAuthCallbackExchangeUrl(requestUrl));
  }

  if (isAuthCallbackRequest) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
