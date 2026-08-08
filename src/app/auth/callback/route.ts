import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Alleen paden binnen de app toestaan — geen open redirect naar elders.
  const gevraagd = searchParams.get("next") ?? "/";
  const next = gevraagd.startsWith("/") && !gevraagd.startsWith("//") ? gevraagd : "/";

  // Google stuurt bij afbreken of weigeren een error-parameter terug.
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?fout=geweigerd`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?fout=ontbrekende-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?fout=verlopen`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
