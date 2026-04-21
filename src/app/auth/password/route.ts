import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { buildAuthCallbackUrl, buildAuthConfigErrorPath, safePostAuthRedirectPath } from "@/lib/auth";
import { bootstrapUserDefaults } from "@/lib/default-topics";
import { env, isSupabaseConfigured } from "@/lib/env";
import { errorContext, logServerEvent } from "@/lib/observability";

function createPasswordAuthResponse(request: NextRequest, redirectPath: string) {
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
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

  return { response, supabase };
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL(buildAuthConfigErrorPath(), request.url));
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") ?? "signin");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safePostAuthRedirectPath(String(formData.get("redirectTo") ?? "/"));
  const callbackUrl = buildAuthCallbackUrl({
    origin: new URL(request.url).origin,
    next: redirectTo,
  });

  if (!email || !password) {
    return NextResponse.redirect(new URL("/?auth=invalid", request.url));
  }

  const { response, supabase } = createPasswordAuthResponse(request, redirectTo);

  try {
    if (mode === "signup") {
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (signUpResult.error) {
        logServerEvent("error", "Password sign-up failed", {
          route: "/auth/password",
          email,
          errorMessage: signUpResult.error.message,
        });
        return NextResponse.redirect(new URL("/?auth=signup-error", request.url));
      }

      if (!signUpResult.data.session) {
        const signInResult = await supabase.auth.signInWithPassword({ email, password });
        if (signInResult.error) {
          logServerEvent("error", "Automatic post-signup sign-in failed", {
            route: "/auth/password",
            email,
            errorMessage: signInResult.error.message,
          });
          return NextResponse.redirect(new URL("/?auth=confirm", request.url));
        }
      }
    } else {
      const signInResult = await supabase.auth.signInWithPassword({ email, password });
      if (signInResult.error) {
        logServerEvent("error", "Password sign-in failed", {
          route: "/auth/password",
          email,
          errorMessage: signInResult.error.message,
        });
        return NextResponse.redirect(new URL("/?auth=invalid", request.url));
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapUserDefaults(supabase, user, email);
    }

    return response;
  } catch (error) {
    logServerEvent("error", "Password auth route failed", {
      route: "/auth/password",
      email,
      mode,
      ...errorContext(error),
    });
    return NextResponse.redirect(
      new URL(mode === "signup" ? "/?auth=signup-error" : "/?auth=invalid", request.url),
    );
  }
}
