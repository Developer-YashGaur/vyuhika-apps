import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Google sends people back here with a one-time code. We swap it for a signed-in session and send
// the person on to the Dwaar page they came from (only Dwaar pages are allowed, see safeNextPath).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNextPath(searchParams.get("next"))}`);
  }
  return NextResponse.redirect(`${origin}/apps/dwaar?error=signin`);
}
