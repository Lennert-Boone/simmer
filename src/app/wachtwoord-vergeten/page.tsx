import WachtwoordVergetenForm from "@/components/WachtwoordVergetenForm";

export default function WachtwoordVergetenPagina() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <p className="cijfer mb-4 text-xs uppercase tracking-[0.3em] text-kruid">Simmer</p>
      <WachtwoordVergetenForm />
    </main>
  );
}
