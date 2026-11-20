import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Runs only for Dwaar pages and the sign-in callback (see `config.matcher` below), so the rest of the
// site stays fast and static. Its one job: keep the person's Supabase sign-in fresh by refreshing the
// session cookie when it is close to expiring. It does NOT decide who may see what; pages and the
// database's row-level security do that.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response; // not set up yet: pages show a friendly message

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refreshes an expiring session. getClaims checks the signed token on this server when it can, instead of a trip to the auth server on every page.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/apps/dwaar/:path*", "/apps/dwaar", "/auth/:path*"],
};
