import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Globe2,
  Scissors,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { getMarketingHomeConfig } from "@/lib/marketing/home-config";
import { getSystemPlans } from "@/lib/saas/plans";
import { ConversionTracker } from "@/components/marketing/conversion-tracker";
import { TrackedAnchor, TrackedLink } from "@/components/marketing/tracked-link";
import { PlanCta } from "@/components/marketing/plan-cta";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { LeadCaptureForm } from "@/components/marketing/lead-capture-form";

export const dynamic = "force-dynamic";

const modules = [
  {
    title: "Agenda que protege sua cadeira",
    description: "Horários reais, conflito por barbeiro, confirmação rápida e sinal online para reduzir furos na agenda.",
    icon: CalendarDays,
  },
  {
    title: "Cliente que volta",
    description: "Preferências de corte e barba, fotos de referência, histórico e contexto para cada atendimento começar melhor.",
    icon: ClipboardCheck,
  },
  {
    title: "CRM que não esquece ninguém",
    description: "Leads, origem, próxima ação e oportunidades organizadas para o interesse não morrer no WhatsApp.",
    icon: UsersRound,
  },
  {
    title: "Dinheiro sem adivinhação",
    description: "Pagamentos, pacotes, comissões, previsto, recebido e pendências visíveis para o dono decidir com números.",
    icon: WalletCards,
  },
  {
    title: "Sua vitrine aberta 24 horas",
    description: "Um site premium com sua marca, serviços, prova social, WhatsApp e agendamento conectado à operação.",
    icon: Globe2,
  },
  {
    title: "Operação pronta para crescer",
    description: "Planos, usuários, permissões e limites que acompanham a barbearia da primeira cadeira até uma equipe maior.",
    icon: ShieldCheck,
  },
];

const workflow = [
  "O cliente encontra sua barbearia e escolhe o serviço",
  "Vê horários reais e reserva sem troca de mensagens",
  "Paga o sinal e protege o horário do barbeiro",
  "Agenda, CRM e financeiro são atualizados na hora",
  "Depois do atendimento, o histórico ajuda a trazer o cliente de volta",
];


const planPresentation = {
  starter: {
    badge: "Entrada",
    differentiator: "O essencial para organizar a casa, receber agendamentos e cobrar sinal.",
    indicatedFor: "Começar",
    finance: "Básico",
  },
  growth: {
    badge: "Mais vendido",
    differentiator: "Mais controle para vender, acompanhar comissão e transformar movimento em resultado.",
    indicatedFor: "Crescer",
    finance: "Completo",
  },
  premium: {
    badge: "Escala",
    differentiator: "Estrutura para múltiplas agendas, mais gestão e uma operação comercial madura.",
    indicatedFor: "Escalar",
    finance: "Avançado",
  },
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatPlanPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  });
}

function marketingPlan(plan, index, total) {
  const presentation = planPresentation[plan.slug] || {};
  return {
    ...plan,
    name: plan.nome,
    price: formatPlanPrice(plan.preco_mensal),
    badge: presentation.badge || "Plano",
    description: plan.descricao || "Plano preparado para acompanhar a operação da sua barbearia.",
    limits: `${formatNumber(plan.limite_barbeiros)} ${Number(plan.limite_barbeiros) === 1 ? "barbeiro" : "barbeiros"}, ${formatNumber(plan.limite_clientes)} clientes e ${formatNumber(plan.limite_agendamentos_mes)} agendamentos por mês.`,
    differentiator: presentation.differentiator || "Recursos integrados para agenda, clientes, financeiro e crescimento.",
    indicatedFor: presentation.indicatedFor || plan.nome,
    finance: presentation.finance || "Completo",
    highlight: plan.slug === "growth" || (!planPresentation.growth && index === Math.floor(total / 2)),
  };
}

const comparisonFeatures = [
  ["Usuários", (plan) => formatNumber(plan.limite_usuarios)],
  ["Barbeiros", (plan) => formatNumber(plan.limite_barbeiros)],
  ["Clientes cadastrados", (plan) => formatNumber(plan.limite_clientes)],
  ["Agendamentos por mês", (plan) => formatNumber(plan.limite_agendamentos_mes)],
  ["Site premium da barbearia", () => "Incluso"],
  ["CRM de leads e oportunidades", () => "Incluso"],
  ["Ficha do cliente, termos e fotos", () => "Incluso"],
  ["Financeiro e pacotes", (plan) => plan.finance],
  ["Comissões por barbeiro", () => "Incluso"],
  ["Domínio próprio do site", () => "Incluso"],
  ["Checkout de sinal", () => "Incluso"],
  ["Indicado para", (plan) => plan.indicatedFor],
];

const faqs = [
  {
    question: "A NexaWi Barbearias substitui agenda, planilha e CRM separados?",
    answer:
      "Sim. Agenda, clientes, preferências, financeiro, CRM, site e checkout trabalham no mesmo fluxo para reduzir retrabalho e informação perdida.",
  },
  {
    question: "Cada barbearia pode ter o próprio site?",
    answer:
      "Sim. Cada barbearia tem uma página pública editável, com identidade visual, serviços, depoimentos, localização, formulário e agendamento conectado à agenda real.",
  },
  {
    question: "O pagamento do sinal cai direto para a barbearia?",
    answer:
      "Sim, quando a barbearia configura sua própria integração Asaas. Assim cada cliente usa suas credenciais e recebe os pagamentos na própria conta.",
  },
  {
    question: "A barbearia pode usar domínio próprio?",
    answer:
      "Sim. O domínio pode apontar para a Vercel e a plataforma direciona o visitante para o site correto da barbearia.",
  },
  {
    question: "O sistema tem demonstração antes da contratação?",
    answer:
      "Sim. A demo livre usa o painel real com dados fictícios restaurados automaticamente para novos testes.",
  },
  {
    question: "Qual plano faz mais sentido para começar?",
    answer:
      "O Starter organiza uma operação menor. Quando já existe equipe, agenda ativa e volume de clientes, o Growth costuma entregar o melhor equilíbrio.",
  },
];

function LogoMark() {
  return (
    <span className="marketing-brand" aria-label="NexaWi Barbearias">
      <span className="marketing-brand-icon"><Scissors size={20} /></span>
      <span className="marketing-brand-copy">
        <span className="marketing-brand-name"><em>Nexa</em>Wi</span>
        <small>BARBEARIAS</small>
      </span>
    </span>
  );
}

function SectionTitle({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl") + " marketing-section-title"}>
      <p className="text-xs font-black uppercase text-[#ed7009]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-[#1c1c1c] sm:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-8 text-neutral-600">{description}</p> : null}
    </div>
  );
}

export const metadata = {
  title: { absolute: "NexaWi Barbearias | Cadeira ocupada, gestão no controle" },
  description: "Agenda, sinal online, CRM, clientes, comissões, financeiro e site premium no mesmo fluxo para sua barbearia crescer.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NexaWi Barbearias | Cadeira ocupada, gestão no controle",
    description: "Agenda, sinal online, CRM, financeiro e site premium no mesmo fluxo para sua barbearia crescer.",
    url: "/",
    siteName: "NexaWi Barbearias",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NexaWi Barbearias" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexaWi Barbearias",
    description: "Cadeira ocupada, gestão no controle.",
    images: ["/opengraph-image"],
  },
};

export default async function Home() {
  const [{ hero }, systemPlans] = await Promise.all([
    getMarketingHomeConfig(),
    getSystemPlans(),
  ]);
  const plans = systemPlans.map((plan, index) => marketingPlan(plan, index, systemPlans.length));
  const comparisonGrid = {
    gridTemplateColumns: `minmax(240px, 1.45fr) repeat(${plans.length}, minmax(160px, 1fr))`,
  };

  return (
    <main className="marketing-shell min-h-screen overflow-hidden bg-[#f4f2ed] text-[#09110f]">
      <ConversionTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "NexaWi Barbearias",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: metadata.description,
          offers: plans.map((plan) => ({ "@type": "Offer", name: plan.name, price: Number(plan.preco_mensal), priceCurrency: "BRL" })),
        }).replace(/</g, "\\u003c") }}
      />
      <header className="marketing-header sticky top-0 z-50 border-b border-white/10 bg-[#1c1c1c]/95 text-white shadow-[0_18px_60px_rgba(28,28,28,0.22)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-white/72 lg:flex">
            <a href="#produto">Como funciona</a>
            <a href="#site">Site 24h</a>
            <a href="#planos">Planos</a>
            <a href="#comparativo">Compare</a>
            <a href="#faq">Dúvidas</a>
            <TrackedLink href="/demo" eventName="demo_click" eventData={{ location: "header_nav" }}>Demo</TrackedLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login-cliente" className="hidden rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white/78 shadow-sm transition hover:bg-white/14 hover:text-white sm:inline-flex">
              Entrar
            </Link>
            <TrackedLink href="/demo" eventName="demo_click" eventData={{ location: "header" }} className="marketing-primary-cta inline-flex items-center gap-2 rounded-full bg-[#ed7009] px-5 py-3 text-sm font-black text-white shadow-[0_18px_42px_rgba(237,112,9,0.28)]">
              Quero ver funcionando <ArrowRight size={16} />
            </TrackedLink>
          </div>
        </div>
      </header>

      <section className="marketing-hero relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(237,112,9,0.22),transparent_30rem),radial-gradient(circle_at_92%_0%,rgba(255,178,91,0.08),transparent_28rem)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="marketing-eyebrow inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[#ed7009]/20 bg-white/76 px-4 py-2 text-xs font-black uppercase leading-5 text-[#ed7009] shadow-sm backdrop-blur">
              <BadgeCheck size={15} /> {hero.eyebrow}
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.03] text-[#1c1c1c] sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              {hero.subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href="/demo" eventName="demo_click" eventData={{ location: "hero" }} className="marketing-primary-cta inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[#1c1c1c] px-6 text-sm font-black text-white shadow-[0_22px_56px_rgba(28,28,28,0.26)]">
                {hero.primaryCtaLabel} <ArrowRight size={17} />
              </TrackedLink>
              <a href="#produto" className="marketing-secondary-cta inline-flex h-13 items-center justify-center rounded-full border border-black/10 bg-white/70 px-6 text-sm font-black text-neutral-800 shadow-sm backdrop-blur">
                {hero.secondaryCtaLabel}
              </a>
            </div>
            <p className="mt-3 text-sm font-semibold text-neutral-500">Demo em um clique, sem cadastro e sem cartão.</p>
            <div className="mt-9 grid gap-3 text-sm font-semibold text-neutral-700 sm:grid-cols-2">
              {hero.topics.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#ed7009]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center lg:justify-end">
            <div className="relative w-full max-w-[650px]">
              <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_76%_18%,rgba(237,112,9,0.28),transparent_20rem),radial-gradient(circle_at_8%_92%,rgba(255,178,91,0.10),transparent_18rem)] blur-3xl" />
              <div className="marketing-dashboard-preview" aria-label="Prévia do painel NexaWi Barbearias">
                <div className="marketing-preview-topbar flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">{hero.previewEyebrow}</p>
                    <h2 className="mt-2 text-xl font-black sm:text-2xl">{hero.previewTitle}</h2>
                  </div>
                  <span className="marketing-preview-status inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-black uppercase">{hero.previewStatus}</span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {hero.metrics.map((metric, index) => (
                    <div key={metric.label} className="marketing-preview-card rounded-2xl p-4">
                      <p className="text-xs font-semibold text-white/48">{metric.label}</p>
                      <strong className={"mt-2 block text-xl font-black " + (index === 1 ? "text-orange-300" : "text-white")}>{metric.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="marketing-preview-agenda rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black">Agenda de hoje</p>
                      <CalendarDays size={17} className="text-orange-300" />
                    </div>
                    <div className="mt-4 grid gap-2.5">
                      {[
                        ["09:00", "Corte assinatura", "Confirmado"],
                        ["11:30", "Barba premium", "Sinal pago"],
                        ["14:00", "Corte + barba", "Confirmado"],
                      ].map(([time, service, status]) => (
                        <div key={time} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                          <span className="text-xs font-black text-orange-300">{time}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-white/80">{service}</span>
                          <span className="hidden rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200 sm:inline">{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="marketing-preview-chart rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-white/46">Recebido na semana</p>
                        <strong className="mt-1 block text-lg font-black text-white">R$ 4.680</strong>
                      </div>
                      <WalletCards size={18} className="text-orange-300" />
                    </div>
                    <div className="mt-5 flex h-24 items-end gap-2">
                      {[42, 68, 54, 82, 64, 92, 76].map((height, index) => (
                        <span key={index} className="marketing-preview-bar flex-1 rounded-t-md" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-white/42">Agenda, sinal e caixa no mesmo ritmo.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="marketing-section bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <SectionTitle
            eyebrow="Produto"
            title="Sua barbearia não precisa parecer grande. Precisa operar como uma."
            description="Cada parte conversa com a outra: o cliente agenda, o sinal entra, a equipe atende e o dono enxerga o resultado sem caçar informação."
            align="center"
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <article key={module.title} className="marketing-feature-card group rounded-[1.5rem] border border-neutral-200 bg-[#fbfaf7] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(28,28,28,0.12)]">
                  <div className="marketing-feature-icon flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ed7009]">
                    <Icon size={23} />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{module.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-600">{module.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="marketing-band relative bg-[#1c1c1c] px-5 py-20 text-white sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(237,112,9,0.22),transparent_26rem),radial-gradient(circle_at_82%_18%,rgba(255,178,91,0.07),transparent_22rem)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase text-orange-300">Fluxo comercial</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Do primeiro clique ao próximo corte. Tudo conectado.</h2>
            <p className="mt-5 text-base leading-8 text-white/68">
              Sem informação solta. Sem horário perdido. Sem cliente esquecido. Cada etapa prepara a próxima venda.
            </p>
          </div>
          <div className="marketing-glass-card rounded-[2rem] border border-white/12 bg-white/[0.06] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="grid gap-3">
              {workflow.map((item, index) => (
                <div key={item} className="marketing-workflow-item flex items-center gap-4 rounded-2xl bg-white/[0.06] p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ed7009] text-sm font-black text-white">{index + 1}</span>
                  <span className="font-bold text-white/86">{item}</span>
                  <ChevronRight size={18} className="ml-auto hidden text-white/30 sm:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="site" className="marketing-section mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-10 lg:items-center">
        <div>
          <SectionTitle
            eyebrow="Site de vendas"
            title="Sua barbearia aberta 24 horas — mesmo com a grade abaixada."
            description="Sua marca apresenta os serviços, prova confiança, mostra horários e transforma visita em reserva sem depender da recepção online o dia inteiro."
          />
          <div className="mt-8 grid gap-4">
            {[
              ["Seu endereço, sua marca", "Use domínio próprio, identidade visual e uma presença digital que tenha a mesma assinatura da sua barbearia."],
              ["Agenda sem troca de mensagens", "O cliente vê horários reais, escolhe o barbeiro e reserva sem esperar resposta no WhatsApp."],
              ["Sinal que protege o horário", "O checkout registra o pagamento e ajuda a reduzir desistências que deixam cadeira vazia."],
            ].map(([title, description]) => (
              <div key={title} className="marketing-glass-card rounded-2xl border border-neutral-200 bg-white/70 p-5 shadow-sm">
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_70%_20%,rgba(237,112,9,0.22),transparent_18rem)] blur-2xl" />
          <div className="relative">
            <Image
              src="/mockup-notebook.png"
              alt="Site da barbearia dentro de um notebook"
              width={1400}
              height={900}
              className="pointer-events-none relative z-20 h-auto w-full drop-shadow-[0_34px_70px_rgba(20,18,15,0.22)]"
            />
            <div className="absolute left-[13%] top-[20%] z-10 h-[50%] w-[74%] overflow-hidden rounded-[0.65rem] bg-[#17130f]">
              <div className="h-full w-full overflow-auto">
                <iframe
                  src="/c/navalha-nobre-demo#servicos"
                  title="Site público demonstrativo da barbearia"
                  className="origin-top-left border-0"
                  style={{
                    width: "1280px",
                    height: "920px",
                    transform: "scale(0.33)",
                  }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Recepção", value: "menos correria, mais controle", icon: MessageCircle },
              { label: "Barbeiro", value: "agenda clara, comissão transparente", icon: Scissors },
              { label: "Dono", value: "números na mão, decisão rápida", icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="marketing-role-card rounded-[1.5rem] border border-neutral-200 bg-[#f7f5f0] p-6">
                  <Icon size={24} className="text-[#ed7009]" />
                  <p className="mt-5 text-sm font-bold text-neutral-500">{item.label}</p>
                  <h3 className="mt-2 text-2xl font-black">{item.value}</h3>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="planos" className="marketing-section mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <SectionTitle eyebrow="Planos" title="Comece no tamanho certo. Suba de nível quando a agenda pedir." description="Você recebe a operação pronta e escolhe o plano pelo número de barbeiros, clientes e volume de agenda — sem pagar por complexidade que ainda não usa." align="center" />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`marketing-price-card rounded-[1.75rem] border p-6 shadow-sm ${plan.highlight ? "marketing-plan-featured border-[#ed7009]/60 bg-[#1c1c1c] text-white shadow-[0_30px_90px_rgba(237,112,9,0.20)]" : "border-neutral-200 bg-white"}`}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-black">{plan.name}</h3>
                <span className={"rounded-full px-3 py-1 text-xs font-black " + (plan.highlight ? "bg-[#ed7009] text-white" : "bg-orange-50 text-[#ed7009]")}>
                  {plan.badge}
                </span>
              </div>
              <p className={"mt-3 text-sm leading-7 " + (plan.highlight ? "text-white/68" : "text-neutral-600")}>{plan.description}</p>
              <p className="mt-7 text-4xl font-black">{plan.price}<span className={"text-sm font-bold " + (plan.highlight ? "text-white/58" : "text-neutral-500")}>/mês</span></p>
              <p className={"mt-5 rounded-2xl p-4 text-sm leading-6 " + (plan.highlight ? "bg-white/8 text-white/74" : "bg-neutral-50 text-neutral-600")}>{plan.limits}</p>
              <div className={"mt-4 rounded-2xl border p-4 text-sm leading-6 " + (plan.highlight ? "border-white/10 bg-white/[0.04] text-white/80" : "border-orange-100 bg-orange-50/60 text-neutral-700")}>
                <Sparkles size={17} className="mb-2 text-[#ed7009]" />
                {plan.differentiator}
              </div>
              <PlanCta plan={plan.slug} featured={plan.highlight} />
            </article>
          ))}
        </div>
      </section>

      <section id="comparativo" className="marketing-section bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <SectionTitle
            eyebrow="Comparativo"
            title="Sem plano confuso. Só o que sua operação precisa agora."
            description="Compare capacidade e recursos com clareza. Quando a equipe e a agenda crescerem, o próximo passo já estará pronto."
            align="center"
          />
          <div className="mt-12 -mx-5 overflow-x-auto px-5 pb-3 sm:mx-0 sm:px-0">
            <div className="marketing-comparison min-w-[860px] overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(20,18,15,0.08)]">
              <div className="grid bg-[#1c1c1c] text-sm font-black text-white" style={comparisonGrid}>
                <div className="p-4">Recurso</div>
                {plans.map((plan) => (
                  <div key={plan.slug} className={"p-4 " + (plan.highlight ? "bg-[#ed7009]" : "")}>
                    {plan.name}
                  </div>
                ))}
              </div>
              {comparisonFeatures.map(([feature, valueForPlan], index) => (
                <div key={feature} className={"grid border-t border-neutral-100 text-sm " + (index % 2 === 0 ? "bg-[#fbfaf7]" : "bg-white")} style={comparisonGrid}>
                  <div className="p-4 font-bold text-neutral-800">{feature}</div>
                  {plans.map((plan) => (
                    <div key={`${feature}-${plan.slug}`} className={"whitespace-nowrap p-4 " + (plan.highlight ? "font-bold text-[#ed7009]" : "text-neutral-600")}>
                      {valueForPlan(plan)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 text-center text-sm leading-7 text-neutral-500">
            Os limites podem ser ajustados comercialmente para redes, franquias ou operações com necessidade específica.
          </p>
        </div>
      </section>

      <RoiCalculator />

      <LeadCaptureForm />

      <section id="faq" className="marketing-section mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:px-10">
        <SectionTitle
          eyebrow="FAQ"
          title="Antes de colocar sua barbearia no próximo nível, tire as dúvidas."
          description="Respostas diretas, sem conversa de software complicado."
          align="center"
        />
        <div className="mt-10 grid gap-4">
          {faqs.map((item) => (
            <details key={item.question} className="marketing-faq-card group rounded-[1.35rem] border border-neutral-200 bg-white p-5 shadow-sm open:shadow-[0_24px_70px_rgba(28,28,28,0.10)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-neutral-950">
                {item.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#ed7009] transition group-open:rotate-90">
                  <ChevronRight size={17} />
                </span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="demo" className="marketing-section px-5 pb-20 sm:px-8 lg:px-10">
        <div className="marketing-final-cta mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-[#1c1c1c] p-7 text-white shadow-[0_34px_100px_rgba(28,28,28,0.24)] lg:grid-cols-[1fr_0.85fr] lg:p-10">
          <div>
            <p className="text-xs font-black uppercase text-orange-300">Demonstração</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">A diferença aparece quando você vê a operação rodando.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">
              Veja como site, agenda, sinal, cliente, comissão, CRM e financeiro se comportam juntos em uma barbearia de verdade.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href="/demo" eventName="demo_click" eventData={{ location: "final_cta" }} className="marketing-primary-cta inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#1c1c1c]">
                Ver o painel funcionando <ArrowRight size={17} />
              </TrackedLink>
              <TrackedAnchor href="https://wa.me/5577988656394" target="_blank" rel="noreferrer" eventName="whatsapp_click" eventData={{ location: "final_cta" }} className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/16 px-6 text-sm font-black text-white">
                Falar com um especialista <MessageCircle size={17} />
              </TrackedAnchor>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              ["Agenda protegida", "Horários reais, sinal e status de cada atendimento."],
              ["Cliente que volta", "Preferências, histórico e contexto para o próximo atendimento."],
              ["Dinheiro sob controle", "Sinal, pacotes, pagamentos e comissões sem adivinhação."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="marketing-footer border-t border-white/10 bg-[#1c1c1c] px-5 py-8 text-sm text-white/58 shadow-[0_-24px_70px_rgba(28,28,28,0.14)] sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />
          </div>
          <div className="flex flex-wrap gap-4 font-semibold">
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos</Link>
            <Link href="/login-cliente">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
