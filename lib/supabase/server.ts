import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/database";
import { supabaseEnv } from "@/lib/supabase/env";

// A Supabase client for server code, tied to the signed-in person's cookies.
// It uses the public "anon" key, so the database's own rules (row-level security) decide what the person can see.
// Made once per request (React cache), and "who is signed in" is asked of Supabase once per request. A Dwaar page used to ask
// four or five times (top bar, page, nav...), and every ask is a network trip to the auth server: that was a big part of the slowness.
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  const client = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called while rendering a page, where cookies are read-only. proxy.ts refreshes them instead.
        }
      },
    },
  });
  const askWhoIsSignedIn = client.auth.getUser.bind(client.auth);
  let answer: ReturnType<typeof askWhoIsSignedIn> | null = null;
  client.auth.getUser = (jwt?: string) => (jwt ? askWhoIsSignedIn(jwt) : (answer ??= askWhoIsSignedIn()));
  return client;
});
