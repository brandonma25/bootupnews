import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildAuthConfigErrorPath,
  hasSupabaseCodeVerifierCookie,
  hasSupabaseSessionCookie,
  safePostAuthRedirectPath,
} from "@/lib/auth";
import { bootstrapUserDefaults } from "@/lib/default-topics";
import { env, isSupabaseConfigured } from "@/lib/env";
import { errorContext, logServerEvent } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  if (
    requestUrl.searchParams.get("error") ||
    requestUrl.searchParams.get("error_code") ||
    requestUrl.searchParams.get("error_description")
  ) {
    return NextResponse.redirect(
      new URL("/?auth=callback-error", requestUrl.origin),
    );
  }

  const requestCookies = request.cookies.getAll();
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorCode = requestUrl.searchParams.get("error_code");
  const providerErrorDescription = requestUrl.searchParams.get("error_description");
  const next = safePostAuthRedirectPath(requestUrl.searchParams.get("next"));
  const sessionCookiePresent = hasSupabaseSessionCookie(requestCookies);
  const codeVerifierCookiePresent = hasSupabaseCodeVerifierCookie(requestCookies);
  const supabaseUrlHost = env.supabaseUrl
    ? new URL(env.supabaseUrl).host
    : null;

  logServerEvent("info", "Auth callback received", {
    route: "/auth/callback",
    requestOrigin: requestUrl.origin,
    requestPath: requestUrl.pathname,
    next,
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    otpType: type,
    providerError,
    providerErrorCode,
    providerErrorDescription,
    sessionCookiePresent,
    codeVerifierCookiePresent,
    appUrl: env.appUrl,
    supabaseUrlHost,
  });

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL(buildAuthConfigErrorPath(), request.url));
  }

  if (providerError || providerErrorCode || providerErrorDescription) {
    logServerEvent("error", "Auth callback returned provider error params", {
      route: "/auth/callback",
      requestOrigin: requestUrl.origin,
      next,
      providerError,
      providerErrorCode,
      providerErrorDescription,
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      otpType: type,
      sessionCookiePresent,
      codeVerifierCookiePresent,
    });

    return NextResponse.redirect(new URL("/?auth=callback-error", request.url));
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
      logServerEvent("info", "Auth callback exchanging code for session", {
        route: "/auth/callback",
        requestOrigin: requestUrl.origin,
        next,
        hasCode: true,
        sessionCookiePresent,
        codeVerifierCookiePresent,
      });

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
      logServerEvent("error", "Auth callback missing exchange params", {
        route: "/auth/callback",
        requestOrigin: requestUrl.origin,
        next,
        providerError,
        providerErrorCode,
        providerErrorDescription,
        hasCode: false,
        hasTokenHash: Boolean(tokenHash),
        otpType: type,
        sessionCookiePresent,
        codeVerifierCookiePresent,
      });

      return NextResponse.redirect(new URL("/?auth=callback-error", request.url));
    }
  } catch (error) {
    logServerEvent("error", "Auth callback failed", {
      route: "/auth/callback",
      requestOrigin: requestUrl.origin,
      next,
      providerError,
      providerErrorCode,
      providerErrorDescription,
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      otpType: type,
      sessionCookiePresent,
      codeVerifierCookiePresent,
      ...errorContext(error),
    });

    return NextResponse.redirect(new URL("/?auth=callback-error", request.url));
  }

  logServerEvent("info", "Auth callback exchanged session successfully", {
    route: "/auth/callback",
    requestOrigin: requestUrl.origin,
    next,
    sessionCookiePresent,
    codeVerifierCookiePresent,
    responseSessionCookiePresent: hasSupabaseSessionCookie(response.cookies.getAll()),
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapUserDefaults(supabase, user);
    }
  } catch (error) {
    logServerEvent("warn", "Auth callback completed but post-login bootstrap failed", {
      route: "/auth/callback",
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      otpType: type,
      ...errorContext(error),
    });
  }

  return response;
}
