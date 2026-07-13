"use server";

import { isIP } from "node:net";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

function field(formData, name) {
  return String(formData.get(name) || "").trim();
}

function nullable(value) {
  return value || null;
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function publicRedirect(slug, params) {
  const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
  const query = new URLSearchParams(params).toString();
  redirect(`/b/${safeSlug}${query ? `?${query}` : ""}#agendar`);
}

function timeZoneOffset(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return representedAsUtc - date.getTime();
}

function localDateTimeToUtc(value, timeZone) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const wallClockAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const initial = new Date(wallClockAsUtc);

  if (
    initial.getUTCFullYear() !== Number(year)
    || initial.getUTCMonth() !== Number(month) - 1
    || initial.getUTCDate() !== Number(day)
    || initial.getUTCHours() !== Number(hour)
    || initial.getUTCMinutes() !== Number(minute)
  ) {
    return null;
  }

  try {
    let result = new Date(wallClockAsUtc - timeZoneOffset(initial, timeZone));
    result = new Date(wallClockAsUtc - timeZoneOffset(result, timeZone));
    return Number.isNaN(result.getTime()) ? null : result;
  } catch {
    return null;
  }
}

async function requestIp() {
  const headerList = await headers();
  const candidate = String(headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "")
    .split(",")[0]
    .trim();
  return isIP(candidate) ? candidate : null;
}

export async function createBarbershopPublicBooking(formData) {
  const slug = field(formData, "slug");
  const nome = field(formData, "nome");
  const telefone = field(formData, "telefone");
  const telefoneNormalizado = digits(telefone);
  const email = field(formData, "email").toLowerCase();
  const servicoId = field(formData, "servico_id");
  const barbeiroId = field(formData, "barbeiro_id");
  const dataHoraLocal = field(formData, "data_hora");
  const observacoes = field(formData, "observacoes");
  const consentimento = formData.get("consentimento_lgpd") === "on";
  const honeypot = field(formData, "empresa");

  if (honeypot) {
    publicRedirect(slug, { ok: "1", mensagem: "Solicitacao recebida." });
  }

  if (!slug || !nome || !telefoneNormalizado || !servicoId || !barbeiroId || !dataHoraLocal) {
    publicRedirect(slug, { erro: "dados", mensagem: "Preencha nome, WhatsApp, servico, barbeiro, data e horario." });
  }

  if (!consentimento) {
    publicRedirect(slug, { erro: "lgpd", mensagem: "Aceite a Politica de Privacidade para solicitar o horario." });
  }

  if (nome.length > 120 || telefoneNormalizado.length < 10 || telefoneNormalizado.length > 15) {
    publicRedirect(slug, { erro: "dados", mensagem: "Revise o nome e o numero de WhatsApp informados." });
  }

  if (email && (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))) {
    publicRedirect(slug, { erro: "email", mensagem: "Informe um e-mail valido ou deixe o campo em branco." });
  }

  const { data: barbearia, error: barbeariaError } = await supabaseAdmin
    .from("barbearias")
    .select("id, slug, status, site_publicado, timezone")
    .eq("slug", slug)
    .in("status", ["trial", "ativa"])
    .eq("site_publicado", true)
    .maybeSingle();

  if (barbeariaError || !barbearia) {
    publicRedirect(slug, { erro: "indisponivel", mensagem: "Esta barbearia nao esta recebendo agendamentos online agora." });
  }

  const [{ data: servico, error: servicoError }, { data: barbeiro, error: barbeiroError }] = await Promise.all([
    supabaseAdmin
      .from("barbearia_servicos")
      .select("id, nome, duracao_minutos, intervalo_minutos, preco, preco_promocional")
      .eq("barbearia_id", barbearia.id)
      .eq("id", servicoId)
      .eq("ativo", true)
      .eq("publicado_site", true)
      .maybeSingle(),
    supabaseAdmin
      .from("barbearia_barbeiros")
      .select("id, nome")
      .eq("barbearia_id", barbearia.id)
      .eq("id", barbeiroId)
      .eq("ativo", true)
      .eq("publicado_site", true)
      .maybeSingle(),
  ]);

  if (servicoError || barbeiroError || !servico || !barbeiro) {
    publicRedirect(slug, { erro: "agenda", mensagem: "O servico ou barbeiro selecionado nao esta mais disponivel." });
  }

  const inicio = localDateTimeToUtc(dataHoraLocal, barbearia.timezone || "America/Sao_Paulo");
  const now = Date.now();
  if (!inicio || inicio.getTime() < now + 15 * 60 * 1000 || inicio.getTime() > now + 180 * 24 * 60 * 60 * 1000) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Escolha um horario valido entre os proximos 15 minutos e 180 dias." });
  }

  const duracaoBloqueio = Number(servico.duracao_minutos || 30) + Number(servico.intervalo_minutos || 0);
  const fim = new Date(inicio.getTime() + duracaoBloqueio * 60 * 1000);
  const preco = Number(servico.preco_promocional ?? servico.preco ?? 0);

  const { data: clientes, error: clienteBuscaError } = await supabaseAdmin
    .from("barbearia_clientes")
    .select("id")
    .eq("barbearia_id", barbearia.id)
    .eq("telefone_normalizado", telefoneNormalizado)
    .limit(1);

  if (clienteBuscaError) {
    publicRedirect(slug, { erro: "sistema", mensagem: "Nao foi possivel validar seu cadastro. Tente novamente." });
  }

  let clienteId = clientes?.[0]?.id || null;
  if (!clienteId) {
    const { data: novoCliente, error: clienteError } = await supabaseAdmin
      .from("barbearia_clientes")
      .insert({
        barbearia_id: barbearia.id,
        nome,
        telefone,
        telefone_normalizado: telefoneNormalizado,
        email: nullable(email),
        origem: "site",
        status: "lead",
        observacoes: nullable(observacoes),
        consentimento_lgpd: true,
        consentimento_lgpd_em: new Date().toISOString(),
        consentimento_lgpd_ip: await requestIp(),
        consentimento_lgpd_versao: "site-barbearia-v1",
      })
      .select("id")
      .single();

    if (clienteError || !novoCliente) {
      publicRedirect(slug, { erro: "cadastro", mensagem: "Nao foi possivel concluir seu cadastro. Tente novamente." });
    }
    clienteId = novoCliente.id;
  }

  const { data: agendamento, error: agendamentoError } = await supabaseAdmin
    .from("barbearia_agendamentos")
    .insert({
      barbearia_id: barbearia.id,
      cliente_id: clienteId,
      barbeiro_id: barbeiro.id,
      servico_id: servico.id,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: "solicitado",
      origem: "site",
      valor_tabela: preco,
      desconto: 0,
      valor_final: preco,
      pagamento_status: "pendente",
      observacoes: nullable(observacoes),
    })
    .select("id")
    .single();

  if (agendamentoError?.code === "23P01") {
    publicRedirect(slug, { erro: "ocupado", mensagem: "Esse horario acabou de ser reservado. Escolha outro horario." });
  }

  if (agendamentoError || !agendamento) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Nao foi possivel solicitar o horario. Tente novamente." });
  }

  await supabaseAdmin.from("barbearia_crm_oportunidades").insert({
    barbearia_id: barbearia.id,
    cliente_id: clienteId,
    nome,
    telefone,
    email: nullable(email),
    origem: "site",
    status: "agendamento_marcado",
    valor_estimado: preco,
    proxima_acao_em: inicio.toISOString(),
    proxima_acao: `Confirmar ${servico.nome} com ${barbeiro.nome}`,
    observacoes: `Agendamento ${agendamento.id} solicitado pelo site publico.`,
  });

  revalidatePath(`/b/${slug}`);
  publicRedirect(slug, { ok: "agendamento", mensagem: "Horario solicitado. A barbearia vai confirmar pelo WhatsApp." });
}
