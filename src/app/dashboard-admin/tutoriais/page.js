import { Clock3, LibraryBig, ListChecks, PlayCircle, Sparkles } from "lucide-react";
import { PageHero, StatusPill } from "../admin-core";
import { Field, SubmitButton, TextArea } from "@/components/app-shell/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertTutorialAction } from "@/app/admin/actions";
import { DeleteTutorialButton } from "./delete-tutorial-button";

export const metadata = { title: "Tutoriais admin | NexaWi Barbearias" };
export const dynamic = "force-dynamic";

async function loadTutorials() {
  const { data, error } = await supabaseAdmin
    .from("barbearia_tutoriais")
    .select("id, titulo, descricao_curta, descricao, categoria, video_url, thumbnail_url, duracao_minutos, ordem, passos, destaque, ativo, created_at, updated_at")
    .order("destaque", { ascending: false })
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

function TutorialForm({ tutorial = null }) {
  return (
    <form action={upsertTutorialAction} className="space-y-5">
      {tutorial?.id ? <input type="hidden" name="id" value={tutorial.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Título da aula" name="titulo" placeholder="Ex.: Como configurar a agenda" defaultValue={tutorial?.titulo || ""} required />
        </div>
        <Field label="Categoria" name="categoria" placeholder="Primeiros passos" defaultValue={tutorial?.categoria || "Primeiros passos"} required />
        <Field label="Duração em minutos" name="duracao_minutos" type="number" defaultValue={tutorial?.duracao_minutos ?? 5} required />
        <div className="md:col-span-2">
          <Field label="URL do vídeo" name="video_url" type="url" placeholder="https://youtube.com/watch?v=..." defaultValue={tutorial?.video_url || ""} required />
          <p className="mt-2 text-xs leading-5 text-neutral-500">Use YouTube (inclusive não listado), Vimeo ou uma URL pública de MP4/WebM.</p>
        </div>
        <div className="md:col-span-2">
          <Field label="URL da capa (opcional)" name="thumbnail_url" type="url" placeholder="Se ficar vazio, o YouTube fornece a capa automaticamente" defaultValue={tutorial?.thumbnail_url || ""} />
        </div>
        <Field label="Ordem de exibição" name="ordem" type="number" defaultValue={tutorial?.ordem ?? 0} />
        <div className="flex flex-wrap items-end gap-3 pb-1">
          <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold text-neutral-700">
            <input type="checkbox" name="destaque" defaultChecked={tutorial?.destaque || false} />
            Destacar aula
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold text-neutral-700">
            <input type="checkbox" name="ativo" defaultChecked={tutorial ? tutorial.ativo : true} />
            Publicada
          </label>
        </div>
        <div className="md:col-span-2">
          <TextArea label="Resumo para o card" name="descricao_curta" placeholder="Explique em uma frase o que o cliente aprenderá." defaultValue={tutorial?.descricao_curta || ""} />
        </div>
        <div className="md:col-span-2">
          <TextArea label="Descrição completa" name="descricao" placeholder="Contexto, resultado esperado e orientações importantes." defaultValue={tutorial?.descricao || ""} />
        </div>
        <div className="md:col-span-2">
          <TextArea label="O que o cliente vai aprender" name="passos" placeholder={"Um tópico por linha\nCadastrar um barbeiro\nDefinir horários\nPublicar a agenda"} defaultValue={Array.isArray(tutorial?.passos) ? tutorial.passos.join("\n") : ""} />
          <p className="mt-2 text-xs leading-5 text-neutral-500">Adicione um resultado por linha. Esses itens aparecem ao lado do vídeo.</p>
        </div>
      </div>
      <SubmitButton>{tutorial ? "Salvar alterações" : "Publicar tutorial"}</SubmitButton>
    </form>
  );
}

export default async function DashboardAdminTutoriaisPage({ searchParams }) {
  const [tutorials, params] = await Promise.all([loadTutorials(), searchParams]);
  const activeCount = tutorials.filter((item) => item.ativo).length;
  const categories = new Set(tutorials.map((item) => item.categoria).filter(Boolean));
  const okMessages = {
    criado: "Tutorial publicado com sucesso.",
    atualizado: "Tutorial atualizado com sucesso.",
    excluido: "Tutorial excluído com sucesso.",
  };

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Central de aprendizagem" title="Tutoriais da plataforma" description="Publique aulas curtas e objetivas para que qualquer cliente consiga configurar a barbearia, operar o sistema e cuidar do site sem depender de suporte." />

      {okMessages[params?.ok] ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{okMessages[params.ok]}</div> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Aulas cadastradas", value: tutorials.length, icon: LibraryBig },
          { label: "Aulas publicadas", value: activeCount, icon: PlayCircle },
          { label: "Categorias", value: categories.size, icon: ListChecks },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-sm font-semibold text-neutral-500">{item.label}</p><strong className="mt-2 block text-3xl font-black">{item.value}</strong></div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[var(--nexawi-primary)]"><Icon size={22} /></span>
              </div>
            </article>
          );
        })}
      </section>

      <details open={!tutorials.length} className="group overflow-hidden rounded-[1.75rem] border border-orange-200/70 bg-white shadow-[0_24px_70px_var(--nexawi-primary-glow-soft)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[linear-gradient(135deg,#fff7ed,#ffffff)] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nexawi-primary)] text-white shadow-[0_14px_35px_var(--nexawi-primary-glow)]"><Sparkles size={20} /></span>
            <div><h2 className="font-black text-neutral-950">Adicionar nova aula</h2><p className="mt-1 text-sm text-neutral-500">Cadastre o vídeo e transforme-o em um passo a passo simples.</p></div>
          </div>
          <span className="text-2xl font-light text-[var(--nexawi-primary)] transition group-open:rotate-45">+</span>
        </summary>
        <div className="border-t border-orange-100 p-5 sm:p-7"><TutorialForm /></div>
      </details>

      <section className="space-y-4">
        <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--nexawi-primary)]">Biblioteca publicada</p><h2 className="mt-2 text-2xl font-black tracking-tight">Gerencie cada aula</h2></div>
        {!tutorials.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">Nenhum tutorial cadastrado ainda.</div>
        ) : tutorials.map((tutorial, index) => (
          <article key={tutorial.id} className="overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-white shadow-sm">
            <details>
              <summary className="cursor-pointer list-none p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1c1c1c] font-black text-orange-300">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-neutral-950">{tutorial.titulo}</h3>
                        <StatusPill tone={tutorial.ativo ? "ok" : "neutral"}>{tutorial.ativo ? "publicada" : "rascunho"}</StatusPill>
                        {tutorial.destaque ? <StatusPill tone="accent">destaque</StatusPill> : null}
                      </div>
                      <p className="mt-2 text-sm text-neutral-500">{tutorial.categoria} · ordem {tutorial.ordem}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500"><Clock3 size={16} /> {tutorial.duracao_minutos} min</span>
                </div>
              </summary>
              <div className="border-t border-neutral-100 p-5 sm:p-6">
                <TutorialForm tutorial={tutorial} />
                <div className="mt-5 border-t border-neutral-100 pt-5"><DeleteTutorialButton id={tutorial.id} title={tutorial.titulo} /></div>
              </div>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
