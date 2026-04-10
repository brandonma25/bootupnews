import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env, isSupabaseConfigured } from "@/lib/env";

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
