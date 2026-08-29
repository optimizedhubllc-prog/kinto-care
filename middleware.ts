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
  // token that was already rotated elsewhere, getUser() returns this
  // as an ERROR VALUE on the response — it does not throw. Check the
  // returned error directly rather than try/catch, and treat a stale
  // refresh token as "logged out" instead of leaking the raw error.
  const { data, error } = await supabase.auth.getUser();
  let user = data?.user ?? null;

  if (error) {
    const isStaleRefreshToken =
      error.message?.includes("Refresh Token") ||
      error.code === "refresh_token_already_used";

    if (isStaleRefreshToken) {
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith("sb-")) supabaseResponse.cookies.delete(name);
      });
    } else {
      console.error("[middleware] Unexpected auth error:", error);
    }
    user = null;
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
