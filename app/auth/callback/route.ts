import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);

    // Check if user exists in hub_members
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: member } = await supabase
        .from("hub_members")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!member) {
        return NextResponse.redirect(new URL("/access-pending", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}