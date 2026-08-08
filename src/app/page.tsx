import { redirect } from "next/navigation";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const context = await getGezinsContext();
  redirect(context ? "/week" : "/onboarding");
}
