import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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