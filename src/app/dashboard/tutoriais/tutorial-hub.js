"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Check, CheckCircle2, Clock3, GraduationCap, ListChecks, Play, Search, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "nexawi-barbearia-tutoriais-concluidos-v1";

function videoData(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let youtubeId = "";

    if (host === "youtu.be") youtubeId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com")) {
      youtubeId = parsed.searchParams.get("v") || "";
      if (!youtubeId) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) youtubeId = parts[1] || "";
      }
    }

    if (youtubeId) {
      const cleanId = youtubeId.replace(/[^a-zA-Z0-9_-]/g, "");
      return {
        type: "embed",
        src: `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1`,
        thumbnail: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
      };
    }

    if (host.endsWith("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      if (id) return { type: "embed", src: `https://player.vimeo.com/video/${id}`, thumbnail: "" };
    }

    if (/\.(mp4|webm)(\?|$)/i.test(parsed.href)) return { type: "video", src: parsed.href, thumbnail: "" };
    return { type: "embed", src: parsed.href, thumbnail: "" };
  } catch {
    return { type: "invalid", src: "", thumbnail: "" };
  }
}

function TutorialArtwork({ tutorial, className = "" }) {
  const source = videoData(tutorial.video_url);
  const image = tutorial.thumbnail_url || source.thumbnail;

  if (image) {
    return (
      <div className={`relative overflow-hidden bg-neutral-900 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_20%_15%,color-mix(in_srgb,var(--clinic-accent)_45%,transparent),transparent_34%),linear-gradient(135deg,#111827,#030712)] ${className}`}>
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:28px_28px]" />
      <GraduationCap className="absolute bottom-5 right-5 text-white/12" size={92} />
    </div>
  );
}

function VideoPlayer({ tutorial }) {
  const source = videoData(tutorial.video_url);

  if (source.type === "video") {
    return <video src={source.src} controls playsInline className="aspect-video h-auto w-full bg-black" />;
  }

  if (source.type === "embed") {
    return (
      <iframe
        src={source.src}
        title={tutorial.titulo}
        className="aspect-video h-auto w-full bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return <div className="flex aspect-video items-center justify-center bg-neutral-950 px-6 text-center text-sm text-white/60">O endereço deste vídeo precisa ser atualizado pelo administrador.</div>;
}

export function TutorialHub({ tutorials, brandName }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
        setCompleted(Array.isArray(saved) ? saved : []);
      } catch {
        setCompleted([]);
      }
      setLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }, [completed, loaded]);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => event.key === "Escape" && setSelected(null);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  const categories = useMemo(() => ["Todos", ...new Set(tutorials.map((item) => item.categoria).filter(Boolean))], [tutorials]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return tutorials.filter((item) => {
      const matchesCategory = category === "Todos" || item.categoria === category;
      const haystack = [item.titulo, item.descricao_curta, item.descricao, item.categoria, ...(Array.isArray(item.passos) ? item.passos : [])].join(" ").toLocaleLowerCase("pt-BR");
      return matchesCategory && (!term || haystack.includes(term));
    });
  }, [tutorials, query, category]);

  const completedCount = tutorials.filter((item) => completed.includes(item.id)).length;
  const progress = tutorials.length ? Math.round((completedCount / tutorials.length) * 100) : 0;

  function toggleComplete(id) {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#080b0d] px-6 py-8 text-white shadow-[0_36px_110px_rgba(0,0,0,0.28)] sm:px-8 lg:px-10 lg:py-11">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,color-mix(in_srgb,var(--clinic-accent)_28%,transparent),transparent_28rem),radial-gradient(circle_at_92%_0%,color-mix(in_srgb,var(--clinic-primary)_35%,transparent),transparent_24rem)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[var(--clinic-accent)]"><Sparkles size={14} /> Academia NexaWi</span>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Domine o sistema no seu ritmo.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">Aulas rápidas, diretas e sem termos complicados para você organizar {brandName}, vender mais e aproveitar cada recurso da plataforma.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Seu progresso</p><strong className="mt-1 block text-3xl font-black">{progress}%</strong></div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--clinic-primary)] text-white"><BookOpenCheck size={23} /></span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--clinic-primary),var(--clinic-accent))] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-white/50">{completedCount} de {tutorials.length} aulas concluídas neste navegador.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-neutral-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que você quer aprender?" className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-[var(--clinic-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--clinic-primary)_10%,transparent)]" />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className={`h-10 shrink-0 rounded-xl px-4 text-sm font-bold transition ${category === item ? "bg-[var(--clinic-primary)] text-white shadow-md" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{item}</button>
            ))}
          </div>
        </div>
      </section>

      {!tutorials.length ? (
        <section className="rounded-[2rem] border border-dashed border-neutral-300 bg-white/75 px-6 py-16 text-center shadow-sm">
          <GraduationCap className="mx-auto text-[var(--clinic-primary)]" size={42} />
          <h2 className="mt-5 text-xl font-black">A central está sendo preparada</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-600">Assim que a primeira aula for publicada pelo administrador, ela aparecerá aqui automaticamente.</p>
        </section>
      ) : filtered.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tutorial, index) => {
            const isCompleted = completed.includes(tutorial.id);
            return (
              <article key={tutorial.id} className="group flex min-h-full flex-col overflow-hidden rounded-[1.65rem] border border-neutral-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_75px_color-mix(in_srgb,var(--clinic-primary)_16%,transparent)]">
                <button type="button" onClick={() => setSelected(tutorial)} className="relative block w-full text-left">
                  <TutorialArtwork tutorial={tutorial} className="aspect-video w-full" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-xl backdrop-blur transition group-hover:scale-110 group-hover:bg-[var(--clinic-primary)]"><Play className="ml-1" size={22} fill="currentColor" /></span>
                  </span>
                  {tutorial.destaque ? <span className="absolute left-4 top-4 rounded-full bg-[var(--clinic-accent)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-950">Comece por aqui</span> : null}
                </button>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="uppercase tracking-[0.16em] text-[var(--clinic-primary)]">{tutorial.categoria}</span>
                    <span className="inline-flex items-center gap-1.5 text-neutral-400"><Clock3 size={14} /> {tutorial.duracao_minutos} min</span>
                  </div>
                  <button type="button" onClick={() => setSelected(tutorial)} className="mt-3 text-left"><h2 className="text-xl font-black leading-tight tracking-tight text-neutral-950">{tutorial.titulo}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{tutorial.descricao_curta || tutorial.descricao || "Assista à aula e acompanhe o passo a passo."}</p></button>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-100 pt-5">
                    <span className="text-xs font-bold text-neutral-400">Aula {String(index + 1).padStart(2, "0")}</span>
                    <button type="button" onClick={() => toggleComplete(tutorial.id)} className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black transition ${isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <Check size={16} />}{isCompleted ? "Concluída" : "Marcar como vista"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[1.5rem] border border-dashed border-neutral-300 bg-white p-10 text-center"><Search className="mx-auto text-neutral-300" size={34} /><h2 className="mt-4 font-black">Nenhuma aula encontrada</h2><p className="mt-2 text-sm text-neutral-500">Tente outro termo ou selecione “Todos”.</p></section>
      )}

      {selected ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label={selected.titulo} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <article className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#0b0e10] text-white shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0b0e10]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--clinic-accent)]">{selected.categoria}</p><h2 className="mt-1 truncate text-base font-black sm:text-lg">{selected.titulo}</h2></div>
              <button type="button" onClick={() => setSelected(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/15" aria-label="Fechar tutorial"><X size={20} /></button>
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
              <div className="bg-black"><VideoPlayer tutorial={selected} /></div>
              <aside className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-xs font-bold text-white/45"><Clock3 size={15} /> Aula de aproximadamente {selected.duracao_minutos} minutos</div>
                <p className="mt-5 text-sm leading-7 text-white/65">{selected.descricao || selected.descricao_curta || "Acompanhe o vídeo com calma e pause sempre que precisar repetir uma etapa."}</p>
                {Array.isArray(selected.passos) && selected.passos.length ? (
                  <div className="mt-7"><div className="flex items-center gap-2"><ListChecks className="text-[var(--clinic-accent)]" size={19} /><h3 className="font-black">Você vai aprender</h3></div><ol className="mt-4 space-y-3">{selected.passos.map((step, index) => <li key={`${selected.id}-${index}`} className="flex gap-3 text-sm leading-6 text-white/65"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-[var(--clinic-accent)]">{index + 1}</span>{step}</li>)}</ol></div>
                ) : null}
                <button type="button" onClick={() => toggleComplete(selected.id)} className={`mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition ${completed.includes(selected.id) ? "bg-emerald-500 text-white" : "bg-[var(--clinic-primary)] text-white hover:brightness-110"}`}><CheckCircle2 size={18} />{completed.includes(selected.id) ? "Aula concluída" : "Marcar aula como concluída"}</button>
              </aside>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}
