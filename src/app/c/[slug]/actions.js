"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAsaasCustomerForPatient, createAsaasPaymentForBooking, isAsaasConfigured } from "@/lib/asaas/client";
import { createInfinitePayCheckout } from "@/lib/infinitepay/client";
import { resolveBarbershopPaymentProvider } from "@/lib/payments/provider";
import { notifyClinicPublicBooking } from "@/lib/notifications/booking";
import { clinicTimeZone, dateFromClinicLocal, isWithinWorkingPeriods } from "@/lib/clinic/schedule";
import { totalAppointmentMinutes } from "@/lib/domain/schedule-core.mjs";
import { decryptBarbeariaSecrets } from "@/lib/security/barbearia-secrets";

function text(formData, key) {
  return String(formData.get(key) || "").trim();
}

function nullableText(formData, key) {
  const value = text(formData, key);
  return value || null;
}

function uniqueTexts(formData, key) {
  return Array.from(new Set(formData.getAll(key).map((value) => String(value || "").trim()).filter(Boolean)));
}

function serviceSummary(services) {
  return services.map((item) => item.nome).join(", ");
}

function calculateTotalDeposit(services) {
  return Number(services.reduce((total, item) => total + calculateDeposit(item), 0).toFixed(2));
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

function activePrice(procedimento) {
  return Number(procedimento?.preco_promocional ?? procedimento?.preco ?? 0);
}

function calculateDeposit(procedimento) {
  const price = activePrice(procedimento);
  const fixed = Number(procedimento?.sinal_valor || 0);
  const percent = Number(procedimento?.sinal_percentual || 0);
  const value = fixed > 0 ? fixed : percent > 0 ? price * (percent / 100) : 0;
  return Math.max(0, Math.min(price, Number(value.toFixed(2))));
}

function assertWorkingHours({ clinic, start, end, slug, timeZone }) {
  const schedule = clinic?.metadata?.horario_funcionamento || {};

  if (!isWithinWorkingPeriods({ schedule, startDate: start, endDate: end, timeZone })) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Este horário está fora do expediente da barbearia." });
  }
}

async function publicAppOrigin() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
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
  const serviceIds = uniqueTexts(formData, "servico_ids");
  const legacyServiceId = text(formData, "servico_id");
  if (legacyServiceId && !serviceIds.includes(legacyServiceId)) serviceIds.push(legacyServiceId);
  const profissionalId = nullableText(formData, "barbeiro_id") || nullableText(formData, "barbeiro_disponivel_id");
  const nome = text(formData, "nome");
  const telefone = nullableText(formData, "telefone");
  const email = nullableText(formData, "email");
  const cpf = nullableText(formData, "cpf");
  const dataHora = text(formData, "data_hora");
  const consentimento = formData.get("consentimento_lgpd") === "on";

  if (!slug || !serviceIds.length || !nome || !dataHora) {
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
    if (integration.provedor === "asaas") return {
      ...result,
      asaas_ativo: integration.ativo,
      baseUrl: config.baseUrl,
      apiKey: secrets.apiKey,
      pagamento_gateway: config.principal === true ? "asaas" : result.pagamento_gateway,
    };
    if (integration.provedor === "infinitepay") return {
      ...result,
      infinitepay_ativo: integration.ativo,
      infinitepay_handle: config.handle,
      pagamento_gateway: config.principal === true ? "infinitepay" : result.pagamento_gateway,
    };
    if (integration.provedor === "resend") return { ...result, email_ativo: integration.ativo, email_destino: config.email_destino, email_remetente: config.email_remetente };
    if (integration.provedor === "whatsapp") return { ...result, whatsapp_ativo: integration.ativo, whatsapp_provider: config.provider || integration.nome, whatsapp_numero_destino: config.numero_destino, whatsapp_webhook_url: integration.webhook_url, whatsapp_token: secrets.token };
    return result;
  }, { barbearia_id: clinic.id });
  if (!clinicIntegration.pagamento_gateway && clinicIntegration.asaas_ativo) {
    clinicIntegration.pagamento_gateway = "asaas";
  }
  const paymentProvider = resolveBarbershopPaymentProvider(clinicIntegration);

  const siteConfig = clinic.metadata?.site_publico || {};
  if (siteConfig.publicado === false) {
    publicRedirect(slug, { erro: "site", mensagem: "O agendamento online desta barbearia ainda não está publicado." });
  }

  const { data: selectedServices = [], error: procedimentoError } = await supabaseAdmin
    .from("barbearia_servicos")
    .select("id, nome, descricao, duracao_minutos, intervalo_minutos, preco, preco_promocional, sinal_percentual, sinal_valor, publicado_site, ativo")
    .eq("barbearia_id", clinic.id)
    .in("id", serviceIds)
    .eq("ativo", true)
    .eq("publicado_site", true);

  if (procedimentoError) throw procedimentoError;
  if (selectedServices.length !== serviceIds.length) {
    publicRedirect(slug, { erro: "procedimento", mensagem: "Um ou mais serviços estão indisponíveis para agendamento online." });
  }

  const servicesById = new Map(selectedServices.map((item) => [item.id, item]));
  const services = serviceIds.map((id) => servicesById.get(id)).filter(Boolean);
  const procedimento = services[0];
  const procedimentosTexto = serviceSummary(services);

  const timeZone = clinicTimeZone(clinic);
  const start = dateFromClinicLocal(dataHora, timeZone);
  if (!start || start < new Date()) {
    publicRedirect(slug, { erro: "agenda", mensagem: "Escolha uma data futura válida." });
  }

  const duracaoTotal = totalAppointmentMinutes(services, { defaultDuration: 60, includeIntervals: true });
  const end = new Date(start.getTime() + duracaoTotal * 60000);
  assertWorkingHours({ clinic, start, end, slug, timeZone });

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

  const valorTotal = Number(services.reduce((total, item) => total + activePrice(item), 0).toFixed(2));
  const valorSinal = calculateTotalDeposit(services);
  const pagamentoStatus = valorSinal > 0 ? "pendente" : "sem_sinal";

  if (valorSinal > 0 && !paymentProvider) {
    publicRedirect(slug, { erro: "pagamento", mensagem: "Checkout online indisponível no momento. A barbearia precisa conectar Asaas ou InfinitePay para receber o sinal pelo site." });
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
      pagamento_status: pagamentoStatus === "sem_sinal" ? "pendente" : "parcial",
      observacoes: `Agendamento criado pelo site público. Serviços: ${procedimentosTexto}. Duração total: ${duracaoTotal} min.`,
    })
    .select("id")
    .single();

  if (agendaError) throw agendaError;

  let invoiceUrl = null;
  let asaasPaymentId = null;
  let paymentExternalId = null;
  let paymentPayload = {};

  if (valorSinal > 0 && paymentProvider) {
    try {
      if (paymentProvider === "asaas" && isAsaasConfigured(clinicIntegration)) {
        const customer = await createAsaasCustomerForPatient({ clinicId: clinic.id, nome, email, telefone, cpf, integration: clinicIntegration });
        const payment = await createAsaasPaymentForBooking({
          customerId: customer.id,
          value: valorSinal,
          description: `Sinal ${procedimentosTexto} - ${clinic.nome}`,
          externalReference: agendamento.id,
          billingType: "UNDEFINED",
          integration: clinicIntegration,
        });
        invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl || null;
        asaasPaymentId = payment.id || null;
        paymentExternalId = asaasPaymentId;
        paymentPayload = payment || {};
      } else if (paymentProvider === "infinitepay") {
        const origin = await publicAppOrigin();
        const orderNsu = `agendamento:${agendamento.id}`;
        const checkout = await createInfinitePayCheckout({
          handle: clinicIntegration.infinitepay_handle,
          orderNsu,
          redirectUrl: `${origin}/c/${slug}?pagamento=retorno#agendar`,
          webhookUrl: `${origin}/api/webhooks/infinitepay`,
          items: [{
            quantity: 1,
            price: Math.round(valorSinal * 100),
            description: `Sinal ${procedimentosTexto} - ${clinic.nome}`,
          }],
          customer: { name: nome, email, phone: telefone },
        });
        invoiceUrl = checkout.url;
        paymentExternalId = orderNsu;
        paymentPayload = checkout;
      }
    } catch (error) {
      await supabaseAdmin.from("barbearia_agendamentos").delete().eq("id", agendamento.id).eq("barbearia_id", clinic.id);
      publicRedirect(slug, { erro: "pagamento", mensagem: error.message || "Não foi possível gerar o checkout do sinal. Tente novamente." });
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
    pagamento_status: invoiceUrl ? "pendente" : pagamentoStatus,
    pagamento_gateway: paymentProvider,
    pagamento_external_id: paymentExternalId,
    asaas_payment_id: asaasPaymentId,
    invoice_url: invoiceUrl,
    payload: {
      pagamento: paymentPayload,
      pagamento_gateway: paymentProvider,
      servicos: services.map((item) => ({
        id: item.id,
        nome: item.nome,
        preco: activePrice(item),
        duracao_minutos: Number(item.duracao_minutos || 60),
        intervalo_minutos: Number(item.intervalo_minutos || 0),
        sinal: calculateDeposit(item),
      })),
      duracao_total_minutos: duracaoTotal,
    },
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
    proxima_acao: `Atendimento agendado: ${procedimentosTexto}`,
    observacoes: invoiceUrl
      ? `Criado automaticamente pelo site público com checkout de sinal via ${paymentProvider === "infinitepay" ? "InfinitePay" : "Asaas"}. Serviços: ${procedimentosTexto}.`
      : `Criado automaticamente pelo site público. Serviços: ${procedimentosTexto}.`,
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
