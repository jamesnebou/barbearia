import { CreateClinicForm, PageHero } from "../admin-core";
import { getSystemPlans } from "@/lib/saas/plans";

export const metadata = { title: "Nova barbearia admin | NexaWi Barbearias" };

export default async function DashboardAdminNovaClinicaPage() {
  const plans = await getSystemPlans();

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Nova barbearia" title="Cadastrar nova barbearia" description="Crie a barbearia, defina o plano inicial e entregue o primeiro acesso owner sem depender de e-mail de convite." />
      <CreateClinicForm plans={plans} />
    </div>
  );
}

