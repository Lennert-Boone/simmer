import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";


// "/wachtwoord-herstellen" staat er bewust niet bij: dat vereist de sessie die
// de herstellink via /auth/callback aanmaakt.
const PUBLIEKE_PADEN = ["/login", "/auth", "/wachtwoord-vergeten"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Niet tussen createServerClient en getUser() schrijven — dat kan de sessie
  // laten verlopen zonder dat de cookies meegeschreven worden.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pad = request.nextUrl.pathname;
  const isPubliek = PUBLIEKE_PADEN.some((p) => pad.startsWith(p));

  if (!user && !isPubliek) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
