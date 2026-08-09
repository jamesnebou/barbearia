import { redirect } from "next/navigation";
import { Scissors } from "lucide-react";
import { getUserClinics, requireUser } from "@/lib/auth/session";
import BarbershopForm from "./barbershop-form";

export const metadata = { title: "Criar barbearia | NexaWi Barbearias" };

export default async function OnboardingPage() {
  const user = await requireUser("/login-cliente");
  const { activeClinic } = await getUserClinics();

  if (activeClinic) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(31,109,238,0.14),transparent_28rem),#f7f7f4] px-5 py-10 text-neutral-950">
      <section className="mx-auto max-w-3xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c1c1c] text-white shadow-lg"><Scissors size={22} /></div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[#1f6dee]">Primeiros passos</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Crie sua primeira barbearia</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">Cadastre os dados principais para iniciar o período de teste. Sua conta será vinculada como proprietária da barbearia.</p>
        <BarbershopForm userEmail={user.email} />
      </section>
    </main>
  );
}
