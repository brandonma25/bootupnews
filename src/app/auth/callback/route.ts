import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildAuthConfigErrorPath, safeRedirectPath } from "@/lib/auth";
import { bootstrapUserDefaults } from "@/lib/default-topics";
import { env, isSupabaseConfigured } from "@/lib/env";
import { errorContext, logServerEvent } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL(buildAuthConfigErrorPath(), request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    if (code) {
      const exchangeResult = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeResult.error) {
        throw exchangeResult.error;
      }
    } else if (tokenHash && type) {
      const verifyResult = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "recovery" | "invite" | "email_change" | "magiclink",
      });
      if (verifyResult.error) {
        throw verifyResult.error;
      }
    } else {
      return NextResponse.redirect(new URL("/?auth=callback-error", request.url));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapUserDefaults(supabase, user);
    }

    return response;
  } catch (error) {
    logServerEvent("error", "Auth callback failed", {
      route: "/auth/callback",
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      otpType: type,
      ...errorContext(error),
    });

    return NextResponse.redirect(new URL("/?auth=callback-error", request.url));
  }
}
