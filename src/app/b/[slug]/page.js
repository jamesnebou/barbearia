import {
  CalendarDays,
  Clock3,
  MapPin,
  PackageCheck,
  MessageCircle,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createBarbershopPublicBooking } from "./actions";
import { publicImageSrcSet, publicImageUrl } from "@/lib/public-image";

export const dynamic = "force-dynamic";

function safeColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function displayPrice(service) {
  return service.preco_promocional ?? service.preco;
}

function InstagramMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function whatsappHref(barbershop, message = "Ola! Quero agendar um horario.") {
  const number = String(barbershop.whatsapp || barbershop.telefone || "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "#agendar";
}

async function loadBarbershop(slug) {
  const { data, error } = await supabaseAdmin
    .from("barbearias")
    .select("id, nome, nome_fantasia, slug, telefone, whatsapp, email, endereco, numero, bairro, cidade, estado, status, site_publicado, site_titulo, site_subtitulo, site_sobre, site_cta, site_logo_url, site_capa_url, site_cor_primaria, site_cor_destaque, site_instagram_url, site_google_maps_url, horario_funcionamento, site_configuracoes")
    .eq("slug", slug)
    .in("status", ["trial", "ativa"])
    .eq("site_publicado", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const barbershop = await loadBarbershop(slug);
  const brand = barbershop?.nome_fantasia || barbershop?.nome || "Barbearia";
  const faviconUrl = publicImageUrl(barbershop?.site_logo_url, { width: 128, height: 128, quality: 80, resize: "contain" });
  return {
    title: `${brand} | Cortes e barba`,
    description: barbershop?.site_subtitulo || `Agende seu horario na ${brand}.`,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
  };
}

function EmptyVisual({ children }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.035] px-6 text-center text-sm text-white/55">
      {children}
    </div>
  );
}

export default async function PublicBarbershopPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const barbershop = await loadBarbershop(slug);
  if (!barbershop) notFound();

  const [
    { data: services = [], error: servicesError },
    { data: barbers = [], error: barbersError },
    { data: packages = [], error: packagesError },
    { data: products = [], error: productsError },
  ] = await Promise.all([
    supabaseAdmin
      .from("barbearia_servicos")
      .select("id, nome, categoria, descricao, duracao_minutos, preco, preco_promocional, imagem_url, destaque_site, ordem_site")
      .eq("barbearia_id", barbershop.id)
      .eq("ativo", true)
      .eq("publicado_site", true)
      .order("destaque_site", { ascending: false })
      .order("ordem_site", { ascending: true })
      .order("nome", { ascending: true }),
    supabaseAdmin
      .from("barbearia_barbeiros")
      .select("id, nome, apelido, bio, especialidades, foto_url, ordem_site")
      .eq("barbearia_id", barbershop.id)
      .eq("ativo", true)
      .eq("publicado_site", true)
      .order("ordem_site", { ascending: true })
      .order("nome", { ascending: true }),
    supabaseAdmin
      .from("barbearia_pacotes")
      .select("id, nome, descricao, preco, validade_dias, limite_utilizacoes, recorrente")
      .eq("barbearia_id", barbershop.id)
      .eq("ativo", true)
      .eq("publicado_site", true)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("barbearia_produtos")
      .select("id, nome, categoria, descricao, preco, estoque_atual, unidade, imagem_url")
      .eq("barbearia_id", barbershop.id)
      .eq("ativo", true)
      .eq("publicado_site", true)
      .gt("estoque_atual", 0)
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true }),
  ]);

  if (servicesError) throw servicesError;
  if (barbersError) throw barbersError;
  if (packagesError) throw packagesError;
  if (productsError) throw productsError;

  const brand = barbershop.nome_fantasia || barbershop.nome;
  const primary = safeColor(barbershop.site_cor_primaria, "#111111");
  const accent = safeColor(barbershop.site_cor_destaque, "#D4A853");
  const cover = safeExternalUrl(barbershop.site_capa_url);
  const logo = safeExternalUrl(barbershop.site_logo_url);
  const instagram = safeExternalUrl(barbershop.site_instagram_url);
  const maps = safeExternalUrl(barbershop.site_google_maps_url);
  const address = [barbershop.endereco, barbershop.numero, barbershop.bairro, barbershop.cidade, barbershop.estado]
    .filter(Boolean)
    .join(" - ");
  const scheduleLines = Object.entries(barbershop.horario_funcionamento || {}).filter(([, value]) => value);
  const canBook = services.length > 0 && barbers.length > 0;
  const cta = barbershop.site_cta || "Agende seu horario";

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#0b0b0b] text-[#f7f2e8]"
      style={{
        "--barber-primary": primary,
        "--barber-accent": accent,
        background: `radial-gradient(circle at 12% 4%, color-mix(in srgb, ${accent} 17%, transparent), transparent 28rem), radial-gradient(circle at 88% 18%, color-mix(in srgb, ${primary} 44%, transparent), transparent 34rem), #0b0b0b`,
      }}
    >
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090909]/85 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <a href="#inicio" className="flex min-w-0 items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicImageUrl(logo, { width: 96, height: 96, quality: 76, resize: "contain" })} alt={`Logo ${brand}`} width="44" height="44" decoding="async" className="h-11 w-11 rounded-full border border-white/15 object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--barber-accent)]/40 bg-[var(--barber-accent)]/10 text-[var(--barber-accent)]">
                <Scissors size={20} />
              </span>
            )}
            <span className="truncate text-sm font-black uppercase tracking-[0.22em]">{brand}</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/65 lg:flex">
            <a href="#servicos" className="transition hover:text-white">Serviços</a>
            <a href="#planos" className="transition hover:text-white">Planos</a>
            <a href="#loja" className="transition hover:text-white">Loja</a>
            <a href="#equipe" className="transition hover:text-white">Equipe</a>
            <a href="#contato" className="transition hover:text-white">Contato</a>
          </nav>
          <a href="#agendar" className="rounded-full bg-[var(--barber-accent)] px-5 py-2.5 text-sm font-black text-[#111] transition hover:-translate-y-0.5">
            Agendar
          </a>
        </div>
      </header>

      <section id="inicio" className="relative flex min-h-[94vh] items-end px-5 pb-20 pt-32 sm:px-8 lg:items-center lg:pb-16">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicImageUrl(cover, { width: 1280, quality: 70 })} srcSet={publicImageSrcSet(cover, [640, 960, 1280, 1600], { quality: 70 })} sizes="100vw" alt={brand} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(120deg,transparent_0_47%,rgba(255,255,255,.035)_48%_49%,transparent_50%),radial-gradient(circle_at_78%_40%,color-mix(in_srgb,var(--barber-accent)_28%,transparent),transparent_28rem)]" />
        )}
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.12fr_.88fr] lg:items-center">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-[var(--barber-accent)]">
              <Sparkles size={14} /> Estilo, precisao e presenca
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[.95] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
              {barbershop.site_titulo || "Seu melhor corte comeca aqui."}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              {barbershop.site_subtitulo || "Escolha seu servico, seu barbeiro e solicite um horario em poucos minutos."}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#agendar" className="rounded-full bg-[var(--barber-accent)] px-7 py-4 text-sm font-black text-[#111] shadow-[0_20px_55px_color-mix(in_srgb,var(--barber-accent)_22%,transparent)]">
                {cta}
              </a>
              <a href={whatsappHref(barbershop)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-7 py-4 text-sm font-black text-white backdrop-blur">
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          </div>
          <div className="hidden justify-self-end rounded-[2rem] border border-white/10 bg-black/35 p-6 backdrop-blur-xl lg:block">
            <div className="grid grid-cols-2 gap-4">
              {[
                [Scissors, `${services.length}`, "servicos"],
                [Users, `${barbers.length}`, "barbeiros"],
                [Clock3, "Online", "agendamento"],
                [Star, "Premium", "experiencia"],
              ].map(([Icon, value, label]) => (
                <div key={label} className="min-w-36 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                  <Icon size={18} className="text-[var(--barber-accent)]" />
                  <p className="mt-4 text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/42">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--barber-accent)]">Menu da casa</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Servicos para sair na regua.</h2>
          <p className="mt-5 text-base leading-7 text-white/55">Valores, duracao e detalhes para voce escolher sem surpresa.</p>
        </div>
        {services.length ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <article key={service.id} className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--barber-accent)]/40">
                {service.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicImageUrl(service.imagem_url, { width: 720, height: 450, quality: 68 })} srcSet={publicImageSrcSet(service.imagem_url, [420, 560, 720], { aspectRatio: 1.6, quality: 68 })} sizes="(max-width: 768px) 100vw, 390px" alt={service.nome} loading="lazy" decoding="async" className="mb-6 aspect-[16/10] w-full rounded-2xl object-cover opacity-85 transition duration-500 group-hover:scale-[1.02]" />
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--barber-accent)]">{service.categoria || `Servico ${index + 1}`}</p>
                    <h3 className="mt-3 text-2xl font-black">{service.nome}</h3>
                  </div>
                  {service.destaque_site ? <Star size={19} className="shrink-0 fill-[var(--barber-accent)] text-[var(--barber-accent)]" /> : null}
                </div>
                {service.descricao ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/52">{service.descricao}</p> : null}
                <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                  <span className="inline-flex items-center gap-2 text-sm text-white/48"><Clock3 size={16} /> {service.duracao_minutos} min</span>
                  <span className="text-xl font-black text-[var(--barber-accent)]">{money(displayPrice(service))}</span>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="mt-10"><EmptyVisual>Os servicos serao publicados em breve.</EmptyVisual></div>}
      </section>

      <section id="planos" className="border-y border-white/10 bg-white/[0.025] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--barber-accent)]">Clubes e combos</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Seu estilo em dia. Com vantagem de cliente da casa.</h2>
            <p className="mt-5 text-base leading-7 text-white/55">Planos pensados para criar rotina, proteger seu horário e entregar mais por um valor especial.</p>
          </div>
          {packages.length ? (
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((item) => (
                <article key={item.id} className="group flex flex-col rounded-[1.75rem] border border-white/10 bg-[#111] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--barber-accent)]/45">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--barber-accent)]/30 bg-[var(--barber-accent)]/10 text-[var(--barber-accent)]">
                      <PackageCheck size={23} />
                    </span>
                    {item.recorrente ? <span className="rounded-full bg-[var(--barber-accent)]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--barber-accent)]">Clube mensal</span> : null}
                  </div>
                  <h3 className="mt-6 text-2xl font-black">{item.nome}</h3>
                  {item.descricao ? <p className="mt-3 flex-1 text-sm leading-6 text-white/52">{item.descricao}</p> : null}
                  <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-white/48">
                    {item.limite_utilizacoes ? <span className="rounded-full border border-white/10 px-3 py-1.5">{item.limite_utilizacoes} utilizações</span> : null}
                    {item.validade_dias ? <span className="rounded-full border border-white/10 px-3 py-1.5">Validade {item.validade_dias} dias</span> : null}
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
                    <strong className="text-2xl font-black text-[var(--barber-accent)]">{money(item.preco)}</strong>
                    <a href={whatsappHref(barbershop, `Olá! Quero conhecer o plano ${item.nome}.`)} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-white transition hover:border-[var(--barber-accent)] hover:text-[var(--barber-accent)]">
                      Quero este
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="mt-10"><EmptyVisual>Os clubes e combos serão publicados em breve.</EmptyVisual></div>}
        </div>
      </section>
      <section id="loja" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--barber-accent)]">Lojinha Navalha Nobre</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">O corte termina na cadeira. O cuidado continua em casa.</h2>
            <p className="mt-5 text-base leading-7 text-white/55">Produtos selecionados pelos barbeiros para manter cabelo e barba no padrão até o próximo atendimento.</p>
          </div>
          <a href={whatsappHref(barbershop, "Olá! Quero ajuda para escolher um produto da lojinha.")} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-black text-white transition hover:border-[var(--barber-accent)] hover:text-[var(--barber-accent)]">
            <MessageCircle size={17} /> Pedir indicação
          </a>
        </div>
        {products.length ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] transition duration-300 hover:-translate-y-1 hover:border-[var(--barber-accent)]/45">
                {product.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicImageUrl(product.imagem_url, { width: 560, height: 420, quality: 68 })} srcSet={publicImageSrcSet(product.imagem_url, [320, 420, 560], { aspectRatio: 4 / 3, quality: 68 })} sizes="(max-width: 640px) 100vw, 280px" alt={product.nome} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle,color-mix(in_srgb,var(--barber-accent)_22%,transparent),transparent_68%)]">
                    <ShoppingBag size={44} className="text-[var(--barber-accent)]" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--barber-accent)]">{product.categoria || "Cuidados"}</p>
                  <h3 className="mt-3 text-lg font-black leading-6">{product.nome}</h3>
                  {product.descricao ? <p className="mt-3 flex-1 text-sm leading-6 text-white/50">{product.descricao}</p> : null}
                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                    <div>
                      <strong className="text-xl font-black text-[var(--barber-accent)]">{money(product.preco)}</strong>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/70">Disponível na loja</p>
                    </div>
                    <a href={whatsappHref(barbershop, `Olá! Quero reservar o produto ${product.nome}.`)} target="_blank" rel="noreferrer" aria-label={`Reservar ${product.nome}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--barber-accent)] text-[#111] transition hover:scale-105">
                      <ShoppingBag size={17} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="mt-10"><EmptyVisual>A seleção de produtos será publicada em breve.</EmptyVisual></div>}
      </section>
      <section id="equipe" className="border-y border-white/10 bg-white/[0.025] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--barber-accent)]">Quem faz acontecer</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Escolha quem cuida do seu estilo.</h2>
          </div>
          {barbers.length ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {barbers.map((barber) => (
                <article key={barber.id} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111]">
                  {barber.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicImageUrl(barber.foto_url, { width: 720, height: 540, quality: 70 })} srcSet={publicImageSrcSet(barber.foto_url, [420, 560, 720], { aspectRatio: 4 / 3, quality: 70 })} sizes="(max-width: 768px) 100vw, 390px" alt={barber.nome} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover grayscale-[.15]" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle,color-mix(in_srgb,var(--barber-accent)_24%,transparent),transparent_68%)]">
                      <Scissors size={48} className="text-[var(--barber-accent)]" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-2xl font-black">{barber.apelido || barber.nome}</h3>
                    {barber.apelido ? <p className="mt-1 text-sm text-white/42">{barber.nome}</p> : null}
                    {barber.bio ? <p className="mt-4 text-sm leading-6 text-white/52">{barber.bio}</p> : null}
                    {barber.especialidades?.length ? <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--barber-accent)]">{barber.especialidades.join(" · ")}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="mt-10"><EmptyVisual>A equipe sera apresentada em breve.</EmptyVisual></div>}
        </div>
      </section>

      <section id="agendar" className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--barber-accent)]">Reserva online</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Seu proximo visual com hora marcada.</h2>
          <p className="mt-6 text-base leading-8 text-white/55">Envie sua preferencia. A equipe confere a agenda e confirma o horario pelo WhatsApp.</p>
          <div className="mt-8 space-y-4 text-sm text-white/58">
            <p className="flex items-center gap-3"><CalendarDays className="text-[var(--barber-accent)]" size={19} /> Escolha data e horario</p>
            <p className="flex items-center gap-3"><Users className="text-[var(--barber-accent)]" size={19} /> Selecione seu barbeiro</p>
            <p className="flex items-center gap-3"><ShieldCheck className="text-[var(--barber-accent)]" size={19} /> Dados protegidos pela LGPD</p>
          </div>
        </div>

        <form action={createBarbershopPublicBooking} className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl sm:p-9">
          <input type="hidden" name="slug" value={slug} />
          <label className="absolute -left-[10000px]" aria-hidden="true">
            Empresa
            <input name="empresa" tabIndex={-1} autoComplete="off" />
          </label>

          {query?.erro ? <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{query.mensagem || "Não foi possível solicitar o horário."}</div> : null}
          {query?.ok ? <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{query.mensagem || "Solicitacao enviada."}</div> : null}

          {canBook ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-sm font-bold text-white/72">Servico</span>
                  <select name="servico_id" required defaultValue="" className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm text-white outline-none focus:border-[var(--barber-accent)]">
                    <option value="" disabled>Selecione</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.nome} · {money(displayPrice(service))} · {service.duracao_minutos} min</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-bold text-white/72">Barbeiro</span>
                  <select name="barbeiro_id" required defaultValue="" className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm text-white outline-none focus:border-[var(--barber-accent)]">
                    <option value="" disabled>Selecione</option>
                    {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.apelido || barber.nome}</option>)}
                  </select>
                </label>
                <label>
                  <span className="text-sm font-bold text-white/72">Data e horario</span>
                  <input name="data_hora" type="datetime-local" required className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm text-white outline-none focus:border-[var(--barber-accent)]" />
                </label>
                <label>
                  <span className="text-sm font-bold text-white/72">Nome</span>
                  <input name="nome" required maxLength={120} autoComplete="name" className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm text-white outline-none focus:border-[var(--barber-accent)]" />
                </label>
                <label>
                  <span className="text-sm font-bold text-white/72">WhatsApp</span>
                  <input name="telefone" required maxLength={24} inputMode="tel" autoComplete="tel" className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm text-white outline-none focus:border-[var(--barber-accent)]" />
                </label>
                <label>
                  <span className="text-sm font-bold text-white/72">E-mail <span className="text-white/35">(opcional)</span></span>
                  <input name="email" type="email" maxLength={254} autoComplete="email" className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 text-sm text-white outline-none focus:border-[var(--barber-accent)]" />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-sm font-bold text-white/72">Observacoes <span className="text-white/35">(opcional)</span></span>
                  <textarea name="observacoes" maxLength={600} rows={3} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-sm text-white outline-none focus:border-[var(--barber-accent)]" />
                </label>
              </div>
              <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-white/58">
                <input type="checkbox" name="consentimento_lgpd" required className="mt-1 accent-[var(--barber-accent)]" />
                <span>Concordo com o uso dos meus dados para contato e agendamento, conforme a <a href="/privacidade" className="font-bold text-[var(--barber-accent)] underline">Política de Privacidade</a>.</span>
              </label>
              <button type="submit" className="mt-7 w-full rounded-full bg-[var(--barber-accent)] px-7 py-4 text-sm font-black text-[#111] transition hover:-translate-y-0.5 hover:brightness-110">
                Solicitar horario
              </button>
            </>
          ) : (
            <EmptyVisual>O agendamento online sera liberado assim que os servicos e a equipe forem publicados.</EmptyVisual>
          )}
        </form>
      </section>

      <section id="contato" className="border-t border-white/10 bg-[#070707] px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--barber-accent)]">Onde estamos</p>
            <h2 className="mt-4 text-4xl font-black">Chegue, sente e deixe com a gente.</h2>
            {barbershop.site_sobre ? <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-8 text-white/55">{barbershop.site_sobre}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <MapPin className="text-[var(--barber-accent)]" size={21} />
              <p className="mt-4 text-sm font-black">Endereço</p>
              <p className="mt-2 text-sm leading-6 text-white/48">{address || "Consulte pelo WhatsApp"}</p>
              {maps ? <a href={maps} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-[var(--barber-accent)]">Abrir no mapa</a> : null}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <Clock3 className="text-[var(--barber-accent)]" size={21} />
              <p className="mt-4 text-sm font-black">Funcionamento</p>
              {scheduleLines.length ? scheduleLines.slice(0, 7).map(([day, hours]) => <p key={day} className="mt-2 text-sm text-white/48"><span className="capitalize">{day}</span>: {String(hours)}</p>) : <p className="mt-2 text-sm text-white/48">Confirme os horarios pelo WhatsApp.</p>}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#070707] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-white/35">© {new Date().getFullYear()} {brand}. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            {instagram ? <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-white/48 transition hover:text-[var(--barber-accent)]"><InstagramMark /></a> : null}
            <a href={whatsappHref(barbershop)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="text-white/48 transition hover:text-[var(--barber-accent)]"><MessageCircle size={19} /></a>
          </div>
        </div>
      </footer>
    </main>
  );
}
