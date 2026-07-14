import { supabaseAdmin } from "@/lib/supabase/admin";

export const MARKETING_HOME_CONFIG_KEY = "marketing_home";

export const defaultMarketingHome = {
  hero: {
    eyebrow: "A operação por trás da cadeira cheia",
    title: "Você não precisa de mais correria. Precisa parar de deixar dinheiro na cadeira.",
    subtitle:
      "A NexaWi conecta site, agenda, sinal, CRM, clientes, comissões e financeiro. Você ocupa melhor as cadeiras, reduz furos e sabe onde o dinheiro está.",
    primaryCtaLabel: "Quero uma demonstração",
    secondaryCtaLabel: "Ver como funciona",
    previewEyebrow: "Painel operacional",
    previewTitle: "Navalha Nobre",
    previewStatus: "Ativa",
    previewImageUrl: "/mockup-notebook.png",
    previewImageAlt: "Painel dark premium da NexaWi Barbearias",
    metrics: [
      { label: "Horários protegidos", value: "18" },
      { label: "Receita prevista", value: "R$ 4.680" },
      { label: "Clientes para retorno", value: "12" },
    ],
    topics: [
      "Agenda que trabalha mesmo quando a barbearia está fechada",
      "Sinal online para reduzir furos e proteger a cadeira",
      "Cliente vira relacionamento, não contato perdido",
      "Faturamento e comissão sem adivinhação",
    ],
  },
};

function asString(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeMetrics(value, fallback) {
  if (!Array.isArray(value) || !value.length) return fallback;

  const metrics = value
    .slice(0, 3)
    .map((item, index) => ({
      label: asString(item?.label, fallback[index]?.label || "Métrica " + (index + 1)),
      value: asString(item?.value, fallback[index]?.value || "0"),
    }))
    .filter((item) => item.label || item.value);

  return metrics.length ? metrics : fallback;
}

function normalizeTopics(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const topics = value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6);
  return topics.length ? topics : fallback;
}

export function normalizeMarketingHomeConfig(value = {}) {
  const sourceHero = value?.hero || {};
  const fallback = defaultMarketingHome.hero;

  return {
    hero: {
      eyebrow: asString(sourceHero.eyebrow, fallback.eyebrow),
      title: asString(sourceHero.title, fallback.title),
      subtitle: asString(sourceHero.subtitle, fallback.subtitle),
      primaryCtaLabel: asString(sourceHero.primaryCtaLabel, fallback.primaryCtaLabel),
      secondaryCtaLabel: asString(sourceHero.secondaryCtaLabel, fallback.secondaryCtaLabel),
      previewEyebrow: asString(sourceHero.previewEyebrow, fallback.previewEyebrow),
      previewTitle: asString(sourceHero.previewTitle, fallback.previewTitle),
      previewStatus: asString(sourceHero.previewStatus, fallback.previewStatus),
      previewImageUrl: asString(sourceHero.previewImageUrl, fallback.previewImageUrl),
      previewImageAlt: asString(sourceHero.previewImageAlt, fallback.previewImageAlt),
      metrics: normalizeMetrics(sourceHero.metrics, fallback.metrics),
      topics: normalizeTopics(sourceHero.topics, fallback.topics),
    },
  };
}

export async function getMarketingHomeConfig() {
  try {
    const { data, error } = await supabaseAdmin
      .from("barbearia_configuracoes_plataforma")
      .select("valor")
      .eq("chave", MARKETING_HOME_CONFIG_KEY)
      .maybeSingle();

    if (error) return defaultMarketingHome;
    return normalizeMarketingHomeConfig(data?.valor || {});
  } catch {
    return defaultMarketingHome;
  }
}
