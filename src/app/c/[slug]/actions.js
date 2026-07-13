"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAsaasCustomerForPatient, createAsaasPaymentForBooking, isAsaasConfigured } from "@/lib/asaas/client";
import { notifyClinicPublicBooking } from "@/lib/notifications/booking";
import { isWithinWorkingPeriods } from "@/lib/clinic/schedule";
import { decryptBarbeariaSecrets } from "@/lib/security/barbearia-secrets";

function text(formData, key) {
  return String(formData.get(key) || "").trim();
}

function nullableText(formData, key) {
  const value = text(formData, key);
  return value || null;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function publicRedirect(slug, params) {
  const query = new URLSearchParams(params).toString();
  redirect(`/c/${slug}${query ? `?${query}` : ""}#agendar`);
}

function publicLeadRedirect(slug, params) {
  const query = new URLSearchParams(params).toString();
  redirect(`/c/${slug}${query ? `?${query}` : ""}#form`);
}

function calculateDeposit(procedimento) {
  const price = Number(procedimento?.preco || 0);
  const fixed = Number(procedimento?.sinal_valor || 0);
  const percent = Number(procedimento?.sinal_percentual || 0);
  const value = fixed > 0 ? fixed : percent > 0 ? price * (percent / 100) : 0;
  return Math.max(0, Math.min(price, Number(value.toFixed(2))));
}

function assertWorkingHours({ clinic, start, end, slug }) {
  const schedule = clinic?.metadata?.horario_funcionamento || {};

  if (!isWithinWorkingPeriods({ schedule, startDate: start, endDate: end })) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Este horário esta fora do expediente da barbearia." });
  }
}

async function assertSlotAvailable({ clinicId, profissionalId, startISO, endISO, slug }) {
  if (!profissionalId) return;

  const { data, error } = await supabaseAdmin
    .from("barbearia_agendamentos")
    .select("id")
    .eq("barbearia_id", clinicId)
    .eq("barbeiro_id", profissionalId)
    .not("status", "eq", "cancelado")
    .lt("inicio", endISO)
    .gt("fim", startISO)
    .limit(1);

  if (error) throw error;
  if (data?.length) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Este horário acabou de ser preenchido. Escolha outro horário." });
  }
}

export async function createPublicBookingAction(formData) {
  const slug = text(formData, "slug");
  const procedimentoId = text(formData, "servico_id");
  const profissionalId = nullableText(formData, "barbeiro_id") || nullableText(formData, "barbeiro_disponivel_id");
  const nome = text(formData, "nome");
  const telefone = nullableText(formData, "telefone");
  const email = nullableText(formData, "email");
  const cpf = nullableText(formData, "cpf");
  const dataHora = text(formData, "data_hora");
  const consentimento = formData.get("consentimento_lgpd") === "on";

  if (!slug || !procedimentoId || !nome || !dataHora) {
    publicRedirect(slug || "", { erro: "dados", mensagem: "Preencha os dados obrigatórios para agendar." });
  }

  if (!consentimento) {
    publicRedirect(slug, { erro: "lgpd", mensagem: "Aceite a política de privacidade para concluir o agendamento." });
  }

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from("barbearias")
    .select("id, nome, slug, status, email, telefone, metadata")
    .eq("slug", slug)
    .in("status", ["trial", "ativa"])
    .maybeSingle();

  if (clinicError) throw clinicError;
  if (!clinic) publicRedirect(slug, { erro: "barbearia", mensagem: "Barbearia indisponível para agendamento online." });

  const { data: integrations, error: integrationError } = await supabaseAdmin
    .from("barbearia_integracoes")
    .select("barbearia_id, provedor, nome, ativo, ambiente, configuracao_publica, webhook_url, segredos_criptografados")
    .eq("barbearia_id", clinic.id)
    .eq("ativo", true);

  if (integrationError) throw integrationError;
  const clinicIntegration = (integrations || []).reduce((result, integration) => {
    const config = integration.configuracao_publica || {};
    const secrets = decryptBarbeariaSecrets(integration.segredos_criptografados);
    if (integration.provedor === "asaas") return { ...result, asaas_ativo: integration.ativo, baseUrl: config.baseUrl, apiKey: secrets.apiKey };
    if (integration.provedor === "resend") return { ...result, email_ativo: integration.ativo, email_destino: config.email_destino, email_remetente: config.email_remetente };
    if (integration.provedor === "whatsapp") return { ...result, whatsapp_ativo: integration.ativo, whatsapp_provider: config.provider || integration.nome, whatsapp_numero_destino: config.numero_destino, whatsapp_webhook_url: integration.webhook_url, whatsapp_token: secrets.token };
    return result;
  }, { barbearia_id: clinic.id });

  const siteConfig = clinic.metadata?.site_publico || {};
  if (siteConfig.publicado === false) {
    publicRedirect(slug, { erro: "site", mensagem: "O agendamento online desta barbearia ainda nao esta publicado." });
  }

  const { data: procedimento, error: procedimentoError } = await supabaseAdmin
    .from("barbearia_servicos")
    .select("id, nome, descricao, duracao_minutos, preco, sinal_percentual, sinal_valor, publicado_site, ativo")
    .eq("barbearia_id", clinic.id)
    .eq("id", procedimentoId)
    .eq("ativo", true)
    .eq("publicado_site", true)
    .maybeSingle();

  if (procedimentoError) throw procedimentoError;
  if (!procedimento) publicRedirect(slug, { erro: "procedimento", mensagem: "Serviço indisponível para agendamento online." });

  const start = new Date(dataHora);
  if (Number.isNaN(start.getTime()) || start < new Date()) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Escolha uma data futura valida." });
  }

  const end = new Date(start.getTime() + Number(procedimento.duracao_minutos || 60) * 60000);
  assertWorkingHours({ clinic, start, end, slug });

  if (!profissionalId) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Escolha um horário disponível para concluir o agendamento." });
  }

  await assertSlotAvailable({
    clinicId: clinic.id,
    profissionalId,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    slug,
  });

  let existingQuery = supabaseAdmin.from("barbearia_clientes").select("id").eq("barbearia_id", clinic.id).limit(1);
  if (email) {
    existingQuery = existingQuery.eq("email", email);
  } else {
    existingQuery = existingQuery.eq("telefone", telefone || "__sem_telefone__");
  }

  const { data: existingClientes, error: existingError } = await existingQuery;

  if (existingError) throw existingError;
  let clienteId = existingClientes?.[0]?.id || null;

  if (!clienteId) {
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from("barbearia_clientes")
      .insert({
        barbearia_id: clinic.id,
        nome,
        telefone,
        email,
        cpf,
        origem: "site",
        status: "lead",
        observacoes: `Lead criado pelo site publico. Telefone normalizado: ${normalizePhone(telefone) || "-"}.`,
        consentimento_lgpd: true,
        consentimento_lgpd_em: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (clienteError) throw clienteError;
    clienteId = cliente.id;
  }

  const valorTotal = Number(procedimento.preco || 0);
  const valorSinal = calculateDeposit(procedimento);
  const pagamentoStatus = valorSinal > 0 ? "pendente" : "sem_sinal";

  if (valorSinal > 0 && !isAsaasConfigured(clinicIntegration)) {
    publicRedirect(slug, { erro: "pagamento", mensagem: "Checkout online indisponível no momento. A barbearia precisa configurar o Asaas para receber o sinal pelo site." });
  }

  const { data: agendamento, error: agendaError } = await supabaseAdmin
    .from("barbearia_agendamentos")
    .insert({
      barbearia_id: clinic.id,
      cliente_id: clienteId,
      barbeiro_id: profissionalId,
      servico_id: procedimento.id,
      inicio: start.toISOString(),
      fim: end.toISOString(),
      status: "agendado",
      valor_tabela: valorTotal,
      valor_final: valorTotal,
      pagamento_status: "pendente",
      observacoes: "Agendamento criado pelo site público.",
    })
    .select("id")
    .single();

  if (agendaError) throw agendaError;

  let invoiceUrl = null;
  let asaasPaymentId = null;
  let paymentPayload = {};

  if (valorSinal > 0 && isAsaasConfigured(clinicIntegration)) {
    try {
      const customer = await createAsaasCustomerForPatient({ clinicId: clinic.id, nome, email, telefone, cpf, integration: clinicIntegration });
      const payment = await createAsaasPaymentForBooking({
        customerId: customer.id,
        value: valorSinal,
        description: `Sinal ${procedimento.nome} - ${clinic.nome}`,
        externalReference: agendamento.id,
        billingType: "UNDEFINED",
        integration: clinicIntegration,
      });
      invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl || null;
      asaasPaymentId = payment.id || null;
      paymentPayload = payment || {};
    } catch (error) {
      await supabaseAdmin.from("barbearia_agendamentos").delete().eq("id", agendamento.id).eq("barbearia_id", clinic.id);
      publicRedirect(slug, { erro: "pagamento", mensagem: error.message || "Nao foi possivel gerar o checkout do sinal. Tente novamente." });
    }
  }

  const { data: publicBooking, error: publicError } = await supabaseAdmin.from("barbearia_site_agendamentos_publicos").insert({
    barbearia_id: clinic.id,
    cliente_id: clienteId,
    agendamento_id: agendamento.id,
    servico_id: procedimento.id,
    barbeiro_id: profissionalId,
    nome,
    telefone,
    email,
    data_hora: start.toISOString(),
    valor_total: valorTotal,
    valor_sinal: valorSinal,
    pagamento_status: asaasPaymentId ? "pendente" : pagamentoStatus,
    asaas_payment_id: asaasPaymentId,
    invoice_url: invoiceUrl,
    payload: paymentPayload,
  }).select("id, nome, telefone, email, data_hora, valor_total, valor_sinal").single();

  if (publicError) throw publicError;

  await supabaseAdmin.from("barbearia_crm_oportunidades").insert({
    barbearia_id: clinic.id,
    cliente_id: clienteId,
    nome,
    telefone,
    email,
    origem: "site",
    status: "agendamento_marcado",
    valor_estimado: valorTotal,
    proxima_acao_em: start.toISOString(),
    proxima_acao: `Atendimento agendado: ${procedimento.nome}`,
    observacoes: asaasPaymentId ? "Criado automaticamente pelo site publico com checkout de sinal." : "Criado automaticamente pelo site publico.",
  });

  revalidatePath(`/c/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");

  await notifyClinicPublicBooking({
    clinic,
    booking: publicBooking,
    procedimento,
    invoiceUrl,
    integration: clinicIntegration,
  });

  if (invoiceUrl) {
    redirect(invoiceUrl);
  }

  publicRedirect(slug, { ok: "agendamento", mensagem: "Agendamento solicitado com sucesso." });
}

export async function createPublicLeadAction(formData) {
  const slug = text(formData, "slug");
  const nome = text(formData, "nome");
  const telefone = nullableText(formData, "telefone");
  const email = nullableText(formData, "email");
  const mensagem = nullableText(formData, "mensagem");

  if (!slug || !nome || !telefone) {
    publicLeadRedirect(slug || "", { lead_erro: "dados", mensagem: "Informe nome completo e telefone para enviar sua solicitação." });
  }

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from("barbearias")
    .select("id, nome, slug, status, metadata")
    .eq("slug", slug)
    .in("status", ["trial", "ativa"])
    .maybeSingle();

  if (clinicError) throw clinicError;
  if (!clinic) publicLeadRedirect(slug, { lead_erro: "barbearia", mensagem: "Barbearia indisponível para receber solicitações agora." });

  const siteConfig = clinic.metadata?.site_publico || {};
  if (siteConfig.publicado === false) {
    publicLeadRedirect(slug, { lead_erro: "site", mensagem: "O site desta barbearia ainda não está publicado." });
  }

  const { error } = await supabaseAdmin.from("barbearia_crm_oportunidades").insert({
    barbearia_id: clinic.id,
    nome,
    telefone,
    email,
    origem: "site",
    status: "lead",
    proxima_acao: "Responder solicitação enviada pelo site.",
    observacoes: mensagem || "Lead solicitou mais informações pelo site público.",
  });

  if (error) {
    publicLeadRedirect(slug, { lead_erro: "crm", mensagem: "Não foi possível enviar sua solicitação agora. Tente novamente." });
  }

  revalidatePath("/dashboard/crm");
  revalidatePath(`/c/${slug}`);
  publicLeadRedirect(slug, { lead: "ok" });
}
