import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F2]">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-10 w-10 text-[#DC2626]" strokeWidth={1.5} />
            <span className="text-3xl font-serif font-semibold text-[#1A2B3C]">Kinto Care</span>
          </div>
          <p className="text-muted-foreground">Care coordination for families navigating complex care situations.</p>
          <Button asChild className="bg-[#DC2626] hover:bg-[#b91c1c]">
            <Link href="/login">Sign In</Link>
          </Button>
          <p className="text-xs text-muted-foreground">Kinto Care is a logistics and coordination tool. No medical diagnosis provided.</p>
        </div>
      </div>
    );
  }

  // Authenticated — find first hub via Supabase client
  const { data: membership } = await supabase
    .from("hub_members")
    .select("hub_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membership?.hub_id) {
    redirect(`/dashboard/${membership.hub_id}`);
  } else {
    redirect("/onboarding");
  }
}

export const dynamic = 'force-dynamic';
