import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { hasSupabaseSessionCookie } from "@/lib/auth";
import { env, isSupabaseConfigured } from "@/lib/env";
import { errorContext, logServerEvent } from "@/lib/observability";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can read cookies during SSR, but writing refreshed auth
          // cookies here can throw when the request is not in a mutable response context.
          // In that case, we let the render continue and defer cookie updates to
          // middleware, route handlers, or the next navigation.
        }
      },
    },
  });
}

export async function safeGetUser(route: string): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  sessionCookiePresent: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  const sessionCookiePresent = hasSupabaseSessionCookie(cookieStore.getAll());

  if (!supabase) {
    return {
      supabase: null,
      user: null,
      sessionCookiePresent,
    };
  }

  try {
    const result = await supabase.auth.getUser();

    return {
      supabase,
      user: result.data.user,
      sessionCookiePresent,
    };
  } catch (error) {
    logServerEvent("error", "safeGetUser failed during SSR", {
      route,
      sessionCookiePresent,
      ...errorContext(error),
    });

    return {
      supabase,
      user: null,
      sessionCookiePresent,
    };
  }
}
