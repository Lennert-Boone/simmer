import { redirect } from "next/navigation";
import WachtwoordHerstellenForm from "@/components/WachtwoordHerstellenForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WachtwoordHerstellenPagina() {
  // Je komt hier via de herstellink, die eerst /auth/callback passeert en daar
  // een sessie krijgt. Zonder sessie is de link verlopen of al gebruikt.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/wachtwoord-vergeten?fout=verlopen");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <p className="cijfer mb-4 text-xs uppercase tracking-[0.3em] text-kruid">Simmer</p>
      <WachtwoordHerstellenForm />
    </main>
  );
}
