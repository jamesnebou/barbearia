import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptBarbeariaSecrets } from "@/lib/security/barbearia-secrets";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function getWebhookToken(request) {
  return request.headers.get("asaas-access-token") || request.headers.get("x-webhook-token") || "";
}

async function isAllowedWebhookToken(request, token) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expectedToken && token === expectedToken) return true;
  if (!token) return false;

  const clinicId = request.nextUrl.searchParams.get("barbearia");
  let query = supabaseAdmin
    .from("barbearia_integracoes")
    .select("barbearia_id, segredos_criptografados")
    .eq("provedor", "asaas")
    .eq("ativo", true);
  if (clinicId) query = query.eq("barbearia_id", clinicId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).some((integration) => decryptBarbeariaSecrets(integration.segredos_criptografados).webhookToken === token);
}

function normalizePaymentStatus(status) {
  const value = String(status || "").toUpperCase();

  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(value)) return "pago";
  if (["OVERDUE"].includes(value)) return "vencido";
  if (["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"].includes(value)) return "estornado";
  if (["DELETED", "CANCELED"].includes(value)) return "cancelado";
  return "pendente";
}

function commercialStatusFromPayment(status) {
  const normalized = normalizePaymentStatus(status);
  if (normalized === "pago") return { status: "ativa", assinatura_status: "ativa", bloqueada_em: null, bloqueio_motivo: null };
  if (normalized === "vencido") return { status: "inadimplente", assinatura_status: "atrasada", bloqueada_em: new Date().toISOString(), bloqueio_motivo: "Pagamento Asaas vencido." };
  if (normalized === "cancelado") return { status: "cancelada", assinatura_status: "cancelada", bloqueada_em: new Date().toISOString(), bloqueio_motivo: "Cobranca/assinatura Asaas cancelada." };
  return null;
}

function commercialStatusFromSubscription(event, subscription) {
  const eventName = String(event || "").toUpperCase();
  const status = String(subscription?.status || "").toUpperCase();

  if (eventName === "SUBSCRIPTION_DELETED" || eventName === "SUBSCRIPTION_INACTIVATED" || subscription?.deleted === true || status === "INACTIVE") {
    return { status: "cancelada", assinatura_status: "cancelada", bloqueada_em: new Date().toISOString(), bloqueio_motivo: "Assinatura Asaas inativada ou removida." };
  }

  if (eventName === "SUBSCRIPTION_CREATED" || eventName === "SUBSCRIPTION_UPDATED" || status === "ACTIVE") {
    return { status: "ativa", assinatura_status: "ativa", bloqueada_em: null, bloqueio_motivo: null };
  }

  return null;
}

async function findClinicByPayment(payment) {
  const subscriptionId = payment?.subscription || "";
  const customerId = payment?.customer || "";
  const externalReference = payment?.externalReference || "";

  if (subscriptionId) {
    const { data } = await supabaseAdmin.from("barbearias").select("id").eq("asaas_subscription_id", subscriptionId).maybeSingle();
    if (data?.id) return data;
  }

  if (externalReference) {
    const { data } = await supabaseAdmin.from("barbearias").select("id").eq("id", externalReference).maybeSingle();
    if (data?.id) return data;
  }

  if (customerId) {
    const { data } = await supabaseAdmin.from("barbearias").select("id").eq("asaas_customer_id", customerId).maybeSingle();
    if (data?.id) return data;
  }

  return null;
}

async function updatePublicBookingPayment({ payment, payload, event, paymentStatus, paidAt }) {
  const paymentId = payment?.id || "";
  const externalReference = payment?.externalReference || "";

  let query = supabaseAdmin
    .from("barbearia_site_agendamentos_publicos")
    .select("id, barbearia_id, cliente_id, agendamento_id, valor_sinal")
    .limit(1);

  if (paymentId) {
    query = query.eq("asaas_payment_id", paymentId);
  } else if (externalReference) {
    query = query.eq("agendamento_id", externalReference);
  } else {
    return false;
  }

  const { data, error } = await query;
  if (error) throw error;
  const booking = data?.[0];
  if (!booking?.id) return false;

  const publicStatus = paymentStatus === "pago" ? "pago" : paymentStatus === "cancelado" ? "cancelado" : "pendente";

  const { error: publicError } = await supabaseAdmin
    .from("barbearia_site_agendamentos_publicos")
    .update({
      pagamento_status: publicStatus,
      asaas_payment_id: paymentId || null,
      invoice_url: payment?.invoiceUrl || null,
      payload,
    })
    .eq("id", booking.id);

  if (publicError) throw publicError;

  if (booking.agendamento_id && paymentStatus === "pago") {
    const paidValue = Number(booking.valor_sinal || payment?.value || 0);
    const { error: agendaError } = await supabaseAdmin
      .from("barbearia_agendamentos")
      .update({
        pagamento_status: "parcial",
        status: "confirmado",
      })
      .eq("id", booking.agendamento_id);

    if (agendaError) throw agendaError;

    if (paidValue > 0) {
      const { error: paymentError } = await supabaseAdmin.from("barbearia_pagamentos").upsert({
        barbearia_id: booking.barbearia_id,
        cliente_id: booking.cliente_id,
        agendamento_id: booking.agendamento_id,
        valor: paidValue,
        forma: "outro",
        status: "pago",
        provedor: "asaas",
        provedor_pagamento_id: paymentId || null,
        link_pagamento: payment?.invoiceUrl || null,
        pago_em: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        payload,
      }, { onConflict: "barbearia_id,provedor,provedor_pagamento_id" });
      if (paymentError) throw paymentError;
    }
  }

  return true;
}

async function updateStoreOrderPayment({ payment, payload, paymentStatus, paidAt }) {
  const paymentId = payment?.id || "";
  const externalReference = String(payment?.externalReference || "");
  const externalOrderId = externalReference.startsWith("loja:") ? externalReference.slice(5) : "";
  if (!paymentId && !externalOrderId) return false;

  let order = null;
  if (paymentId) {
    const { data, error } = await supabaseAdmin
      .from("barbearia_pedidos")
      .select("id, barbearia_id, cliente_id, total, pagamento_status, status")
      .eq("asaas_payment_id", paymentId)
      .limit(1);
    if (error) throw error;
    order = data?.[0] || null;
  }
  if (!order && externalOrderId) {
    const { data, error } = await supabaseAdmin
      .from("barbearia_pedidos")
      .select("id, barbearia_id, cliente_id, total, pagamento_status, status")
      .eq("id", externalOrderId)
      .limit(1);
    if (error) throw error;
    order = data?.[0] || null;
  }
  if (!order?.id) return false;

  const invoiceUrl = payment?.invoiceUrl || payment?.bankSlipUrl || null;
  const { error: orderPayloadError } = await supabaseAdmin.from("barbearia_pedidos").update({
    asaas_payment_id: paymentId || null,
    invoice_url: invoiceUrl,
    payload_pagamento: payload,
  }).eq("id", order.id).eq("barbearia_id", order.barbearia_id);
  if (orderPayloadError) throw orderPayloadError;

  if (paymentStatus === "pago") {
    const { error: confirmError } = await supabaseAdmin.rpc("barbearia_confirmar_pagamento_pedido_loja", {
      p_pedido_id: order.id,
      p_asaas_payment_id: paymentId || null,
      p_payload: payload,
      p_pago_em: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
    });
    if (confirmError) throw confirmError;
  } else if (paymentStatus === "estornado" && order.pagamento_status === "pago") {
    const { error: refundError } = await supabaseAdmin.rpc("barbearia_estornar_pedido_loja", { p_pedido_id: order.id, p_motivo: "Estorno confirmado pelo webhook Asaas." });
    if (refundError) throw refundError;
  } else if (["cancelado", "vencido"].includes(paymentStatus) && order.pagamento_status !== "pago") {
    const { error: cancelError } = await supabaseAdmin.rpc("barbearia_cancelar_pedido_loja", { p_pedido_id: order.id, p_motivo: `Pagamento ${paymentStatus} no Asaas.` });
    if (cancelError) throw cancelError;
  }

  const billingType = String(payment?.billingType || "").toUpperCase();
  const forma = billingType === "PIX" ? "pix" : billingType === "BOLETO" ? "boleto" : billingType === "CREDIT_CARD" ? "cartao_credito" : "link";
  const internalStatus = paymentStatus === "pago" ? "pago" : paymentStatus === "estornado" ? "estornado" : paymentStatus === "cancelado" ? "cancelado" : paymentStatus === "vencido" ? "falhou" : "pendente";
  const { error: paymentError } = await supabaseAdmin.from("barbearia_pagamentos").upsert({
    barbearia_id: order.barbearia_id,
    cliente_id: order.cliente_id,
    pedido_id: order.id,
    valor: Number(payment?.value || order.total || 0),
    forma,
    status: internalStatus,
    provedor: "asaas",
    provedor_pagamento_id: paymentId || null,
    link_pagamento: invoiceUrl,
    pago_em: paymentStatus === "pago" ? (paidAt ? new Date(paidAt).toISOString() : new Date().toISOString()) : null,
    vencimento_em: payment?.dueDate ? new Date(`${payment.dueDate}T23:59:59`).toISOString() : null,
    payload,
    observacoes: "Atualizado automaticamente pelo webhook da lojinha.",
  }, { onConflict: "barbearia_id,provedor,provedor_pagamento_id" });
  if (paymentError) throw paymentError;
  return true;
}

async function findClinicBySubscription(subscription) {
  const subscriptionId = subscription?.id || "";
  const customerId = subscription?.customer || "";
  const externalReference = subscription?.externalReference || "";

  if (subscriptionId) {
    const { data } = await supabaseAdmin.from("barbearias").select("id").eq("asaas_subscription_id", subscriptionId).maybeSingle();
    if (data?.id) return data;
  }

  if (externalReference) {
    const { data } = await supabaseAdmin.from("barbearias").select("id").eq("id", externalReference).maybeSingle();
    if (data?.id) return data;
  }

  if (customerId) {
    const { data } = await supabaseAdmin.from("barbearias").select("id").eq("asaas_customer_id", customerId).maybeSingle();
    if (data?.id) return data;
  }

  return null;
}

export async function POST(request) {
  if (!(await isAllowedWebhookToken(request, getWebhookToken(request)))) {
    return unauthorized();
  }

  const payload = await request.json();
  const event = payload?.event || "";
  const subscription = payload?.subscription || null;

  if (subscription?.id || String(event).startsWith("SUBSCRIPTION_")) {
    const clinic = await findClinicBySubscription(subscription);

    if (!clinic?.id) {
      return NextResponse.json({ ok: true, matched: false, type: "subscription" });
    }

    const commercialStatus = commercialStatusFromSubscription(event, subscription);
    const { error } = await supabaseAdmin
      .from("barbearias")
      .update({
        ...(commercialStatus || {}),
        asaas_subscription_id: subscription?.id || null,
        asaas_customer_id: subscription?.customer || null,
        proxima_cobranca_em: subscription?.nextDueDate || null,
      })
      .eq("id", clinic.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, matched: true, type: "subscription" });
  }

  const payment = payload?.payment || payload?.data || payload;
  const paymentStatus = normalizePaymentStatus(payment?.status);
  const paidAt = payment?.paymentDate || payment?.confirmedDate || payment?.clientPaymentDate || null;

  const storeOrderUpdated = await updateStoreOrderPayment({ payment, payload, event, paymentStatus, paidAt });
  if (storeOrderUpdated) {
    return NextResponse.json({ ok: true, matched: true, type: "store-order-payment" });
  }

  const publicBookingUpdated = await updatePublicBookingPayment({ payment, payload, event, paymentStatus, paidAt });
  if (publicBookingUpdated) {
    return NextResponse.json({ ok: true, matched: true, type: "public-booking-payment" });
  }

  const clinic = await findClinicByPayment(payment);

  if (!clinic?.id) {
    return NextResponse.json({ ok: true, matched: false, type: "payment" });
  }

  const { error: billingError } = await supabaseAdmin.from("barbearia_cobrancas_saas").upsert({
    barbearia_id: clinic.id,
    asaas_payment_id: payment?.id || null,
    asaas_subscription_id: payment?.subscription || null,
    evento: event || null,
    status: paymentStatus,
    valor: Number(payment?.value || payment?.netValue || 0),
    vencimento: payment?.dueDate || null,
    pago_em: paidAt ? new Date(paidAt).toISOString() : null,
    invoice_url: payment?.invoiceUrl || null,
    bank_slip_url: payment?.bankSlipUrl || null,
    payload,
  }, { onConflict: "asaas_payment_id" });

  if (billingError) {
    return NextResponse.json({ ok: false, error: billingError.message }, { status: 500 });
  }

  const commercialStatus = commercialStatusFromPayment(payment?.status);
  if (commercialStatus) {
    const { error: clinicError } = await supabaseAdmin
      .from("barbearias")
      .update({
        ...commercialStatus,
        proxima_cobranca_em: payment?.dueDate || null,
      })
      .eq("id", clinic.id);

    if (clinicError) {
      return NextResponse.json({ ok: false, error: clinicError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, matched: true, type: "payment" });
}
