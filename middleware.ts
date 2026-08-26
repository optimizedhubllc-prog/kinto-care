import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove this.
  // Supabase rotates refresh tokens on every use. If a stale session
  // (an old cached PWA install, a second tab, etc.) tries to reuse a
  // token that was already rotated elsewhere, this throws instead of
  // just returning no user. Treat that specific case as "logged out"
  // rather than letting it hard-fail the request — clear the stale
  // auth cookies so the next request starts clean.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    const isStaleRefreshToken =
      err instanceof Error &&
      (err.message.includes("Refresh Token") || err.message.includes("refresh_token"));
    if (!isStaleRefreshToken) throw err;

    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) supabaseResponse.cookies.delete(name);
    });
  }

  // Protected routes — redirect to login if not authenticated
  const protectedPaths = ["/dashboard", "/medications", "/appointments", "/care-logistics", "/medical-contacts", "/hub-settings", "/webhook-settings", "/event-history", "/onboarding"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login page
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Exclude /api/* — tRPC's protectedProcedure already enforces auth server-side
  // for every API call, and running the Supabase session-refresh check on API
  // routes breaks POST requests with a real body (confirmed: this is the only
  // POST that's ever hit this middleware, and it consistently 500s here while
  // every GET page-load request succeeds).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
