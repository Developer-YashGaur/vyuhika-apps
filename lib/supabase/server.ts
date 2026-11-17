import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { supabaseEnv } from "@/lib/supabase/env";

// A Supabase client for server code, tied to the signed-in person's cookies.
// It uses the public "anon" key, so the database's own rules (row-level security) decide what the person can see.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient<Database>(url, anonKey, {
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
}
