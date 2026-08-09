import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkInfinitePayPayment } from "@/lib/infinitepay/client";

export const runtime = "nodejs";

function webhookValue(payload, snakeCase, camelCase) {
  return payload?.[snakeCase] ?? payload?.[camelCase] ?? "";
}

function paymentReference(payload) {
  return String(webhookValue(payload, "order_nsu", "orderNsu") || "");
}

function referenceParts(reference) {
  const separator = reference.indexOf(":");
  if (separator < 1) return { type: "", id: "" };
  return {
    type: reference.slice(0, separator),
    id: reference.slice(separator + 1),
  };
}

function amountInCents(value) {
  return Math.round(Number(value || 0) * 100);
}

async function loadIntegration(clinicId) {
  const { data, error } = await supabaseAdmin
    .from("barbearia_integracoes")
    .select("configuracao_publica")
    .eq("barbearia_id", clinicId)
    .eq("provedor", "infinitepay")
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  return { infinitepay_handle: data?.configuracao_publica?.handle || "" };
}

async function verifyPayment({ payload, clinicId, expectedCents }) {
  const integration = await loadIntegration(clinicId);
  const orderNsu = paymentReference(payload);
  const transactionNsu = String(webhookValue(payload, "transaction_nsu", "transactionNsu") || "");
  const invoiceSlug = String(webhookValue(payload, "invoice_slug", "invoiceSlug") || "");

  if (!integration?.infinitepay_handle || !orderNsu || !transactionNsu || !invoiceSlug) {
    throw new Error("Pagamento InfinitePay sem dados suficientes para verificação.");
  }

  const verification = await checkInfinitePayPayment({
    handle: integration.infinitepay_handle,
    orderNsu,
    transactionNsu,
    slug: invoiceSlug,
  });

  if (verification?.success === false) {
    throw new Error("A InfinitePay não confirmou a autenticidade do pagamento.");
  }

  const verifiedAmount = Number(verification?.amount ?? payload?.amount ?? 0);
  if (!Number.isFinite(verifiedAmount) || Math.round(verifiedAmount) !== expectedCents) {
    throw new Error("O valor confirmado pela InfinitePay não corresponde ao pedido.");
  }

  return {
    paid: verification?.paid === true,
    verification,
    orderNsu,
    transactionNsu,
    invoiceSlug,
    receiptUrl: String(webhookValue(payload, "receipt_url", "receiptUrl") || ""),
  };
}

async function updateBooking({ id, payload }) {
  const { data: booking, error } = await supabaseAdmin
    .from("barbearia_site_agendamentos_publicos")
    .select("id, barbearia_id, cliente_id, agendamento_id, valor_sinal, pagamento_status, payload")
    .eq("agendamento_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!booking) return false;

  const verified = await verifyPayment({
    payload,
    clinicId: booking.barbearia_id,
    expectedCents: amountInCents(booking.valor_sinal),
  });
  if (!verified.paid || booking.pagamento_status === "pago") return true;

  const paidAt = new Date().toISOString();
  const storedPayload = {
    ...(booking.payload || {}),
    pagamento_gateway: "infinitepay",
    infinitepay_webhook: payload,
    infinitepay_verificacao: verified.verification,
  };

  const { error: bookingError } = await supabaseAdmin
    .from("barbearia_site_agendamentos_publicos")
    .update({
      pagamento_status: "pago",
      pagamento_gateway: "infinitepay",
      pagamento_external_id: verified.orderNsu,
      pagamento_transaction_id: verified.transactionNsu,
      pagamento_receipt_url: verified.receiptUrl || null,
      payload: storedPayload,
    })
    .eq("id", booking.id);
  if (bookingError) throw bookingError;

  const { error: agendaError } = await supabaseAdmin
    .from("barbearia_agendamentos")
    .update({
      pagamento_status: "parcial",
      status: "confirmado",
    })
    .eq("id", booking.agendamento_id)
    .eq("barbearia_id", booking.barbearia_id);
  if (agendaError) throw agendaError;

  const captureMethod = String(verified.verification?.capture_method || payload?.capture_method || "").toUpperCase();
  const { error: paymentError } = await supabaseAdmin.from("barbearia_pagamentos").upsert({
    barbearia_id: booking.barbearia_id,
    cliente_id: booking.cliente_id,
    agendamento_id: booking.agendamento_id,
    valor: Number(booking.valor_sinal || 0),
    forma: captureMethod.includes("PIX") ? "pix" : "cartao_credito",
    status: "pago",
    provedor: "infinitepay",
    provedor_pagamento_id: verified.transactionNsu,
    link_pagamento: verified.receiptUrl || null,
    pago_em: paidAt,
    payload: storedPayload,
    observacoes: "Sinal confirmado pela verificação oficial da InfinitePay.",
  }, { onConflict: "barbearia_id,provedor,provedor_pagamento_id" });
  if (paymentError) throw paymentError;
  return true;
}

async function updateStoreOrder({ id, payload }) {
  const { data: order, error } = await supabaseAdmin
    .from("barbearia_pedidos")
    .select("id, barbearia_id, cliente_id, total, pagamento_status, payload_pagamento")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!order) return false;

  const verified = await verifyPayment({
    payload,
    clinicId: order.barbearia_id,
    expectedCents: amountInCents(order.total),
  });
  if (!verified.paid || order.pagamento_status === "pago") return true;

  const paidAt = new Date().toISOString();
  const storedPayload = {
    ...(order.payload_pagamento || {}),
    infinitepay_webhook: payload,
    infinitepay_verificacao: verified.verification,
  };

  const { error: updateError } = await supabaseAdmin.from("barbearia_pedidos").update({
    pagamento_gateway: "infinitepay",
    pagamento_external_id: verified.orderNsu,
    pagamento_transaction_id: verified.transactionNsu,
    pagamento_receipt_url: verified.receiptUrl || null,
    payload_pagamento: storedPayload,
  }).eq("id", order.id).eq("barbearia_id", order.barbearia_id);
  if (updateError) throw updateError;

  const { error: confirmError } = await supabaseAdmin.rpc("barbearia_confirmar_pagamento_pedido_loja", {
    p_pedido_id: order.id,
    p_asaas_payment_id: null,
    p_payload: storedPayload,
    p_pago_em: paidAt,
  });
  if (confirmError) throw confirmError;

  const captureMethod = String(verified.verification?.capture_method || payload?.capture_method || "").toUpperCase();
  const { error: paymentError } = await supabaseAdmin.from("barbearia_pagamentos").upsert({
    barbearia_id: order.barbearia_id,
    cliente_id: order.cliente_id,
    pedido_id: order.id,
    valor: Number(order.total || 0),
    forma: captureMethod.includes("PIX") ? "pix" : "cartao_credito",
    status: "pago",
    provedor: "infinitepay",
    provedor_pagamento_id: verified.transactionNsu,
    link_pagamento: verified.receiptUrl || null,
    pago_em: paidAt,
    payload: storedPayload,
    observacoes: "Pagamento confirmado pela verificação oficial da InfinitePay.",
  }, { onConflict: "barbearia_id,provedor,provedor_pagamento_id" });
  if (paymentError) throw paymentError;
  return true;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const reference = referenceParts(paymentReference(payload));
    if (!reference.id) return NextResponse.json({ ok: true, matched: false });

    const matched = reference.type === "agendamento"
      ? await updateBooking({ id: reference.id, payload })
      : reference.type === "loja"
        ? await updateStoreOrder({ id: reference.id, payload })
        : false;

    return NextResponse.json({ ok: true, matched });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Falha ao validar o pagamento InfinitePay." },
      { status: 400 },
    );
  }
}
