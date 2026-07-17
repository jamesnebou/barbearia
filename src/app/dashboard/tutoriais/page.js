import { requireClinicSection } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TutorialHub } from "./tutorial-hub";

export const metadata = { title: "Tutoriais | Dashboard" };
export const dynamic = "force-dynamic";

async function loadPublishedTutorials() {
  const { data, error } = await supabaseAdmin
    .from("barbearia_tutoriais")
    .select("id, titulo, descricao_curta, descricao, categoria, video_url, thumbnail_url, duracao_minutos, ordem, passos, destaque")
    .eq("ativo", true)
    .order("destaque", { ascending: false })
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export default async function DashboardTutoriaisPage() {
  const [{ activeClinic }, tutorials] = await Promise.all([
    requireClinicSection("tutoriais"),
    loadPublishedTutorials(),
  ]);
  const brandName = activeClinic?.metadata?.brand_name || activeClinic?.nome || "sua barbearia";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <TutorialHub tutorials={tutorials} brandName={brandName} />
    </div>
  );
}
