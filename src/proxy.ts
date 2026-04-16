import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildAuthCallbackExchangeUrl, hasAuthReturnParams } from "@/lib/auth";
import { env, isSupabaseConfigured } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const isAuthCallbackRequest = requestUrl.pathname === "/auth/callback";

  if (
    isSupabaseConfigured &&
    !isAuthCallbackRequest &&
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
