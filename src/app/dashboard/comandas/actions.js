"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinic } from "@/lib/auth/session";
import { assertSectionAccess, getCurrentMembership } from "@/lib/auth/permissions";
import { supabaseAdmin } from "@/lib/supabase/admin";

function text(formData, key, max = 500) {
  return String(formData.get(key) || "").trim().slice(0, max);
}

function numberValue(formData, key, fallback = 0) {
  const value = Number(text(formData, key).replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

function redirectMessage(type, message) {
  const query = new URLSearchParams({ [type]: "1", mensagem: message }).toString();
  redirect(`/dashboard/comandas?${query}`);
}

async function getContext() {
  const context = await requireClinic();
  const clinicId = context.activeClinic?.id;
  if (!clinicId) redirect("/login-cliente");
  const membership = getCurrentMembership(context.memberships, clinicId);
  assertSectionAccess(membership?.papel || "recepcao", "comandas", membership);
  return { clinicId, userId: context.user?.id || null };
}

async function loadOpenTicket(clinicId, id) {
  const { data, error } = await supabaseAdmin
    .from("barbearia_comandas")
    .select("id, cliente_id, status, subtotal, desconto, acrescimo, total")
    .eq("barbearia_id", clinicId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) redirectMessage("erro", "Comanda não encontrada.");
  if (data.status !== "aberta") redirectMessage("erro", "Esta comanda já foi finalizada.");
  return data;
}

async function recalculateTicket(clinicId, ticketId) {
  const [{ data: ticket, error: ticketError }, { data: items, error: itemsError }] = await Promise.all([
    supabaseAdmin.from("barbearia_comandas").select("desconto, acrescimo").eq("barbearia_id", clinicId).eq("id", ticketId).single(),
    supabaseAdmin.from("barbearia_comanda_itens").select("total").eq("barbearia_id", clinicId).eq("comanda_id", ticketId),
  ]);
  if (ticketError) throw ticketError;
  if (itemsError) throw itemsError;
  const subtotal = Number((items || []).reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2));
  const total = Number(Math.max(0, subtotal - Number(ticket.desconto || 0) + Number(ticket.acrescimo || 0)).toFixed(2));
  const { error } = await supabaseAdmin
    .from("barbearia_comandas")
    .update({ subtotal, total, updated_at: new Date().toISOString() })
    .eq("barbearia_id", clinicId)
    .eq("id", ticketId);
  if (error) throw error;
}

export async function createTicketAction(formData) {
  const { clinicId, userId } = await getContext();
  const { error } = await supabaseAdmin.from("barbearia_comandas").insert({
    barbearia_id: clinicId,
    cliente_id: text(formData, "cliente_id") || null,
    barbeiro_id: text(formData, "barbeiro_id") || null,
    observacoes: text(formData, "observacoes") || null,
    created_by: userId,
  });
  if (error) redirectMessage("erro", error.message);
  revalidatePath("/dashboard/comandas");
  redirectMessage("ok", "Comanda aberta com sucesso.");
}

export async function addTicketItemAction(formData) {
  const { clinicId } = await getContext();
  const ticketId = text(formData, "comanda_id");
  await loadOpenTicket(clinicId, ticketId);
  const itemType = text(formData, "tipo");
  const referenceId = text(formData, "referencia_id") || null;
  const quantity = Math.max(0.001, numberValue(formData, "quantidade", 1));
  const discount = Math.max(0, numberValue(formData, "desconto", 0));

  let description = text(formData, "descricao", 240);
  let unitPrice = Math.max(0, numberValue(formData, "valor_unitario", 0));
  const payload = {
    barbearia_id: clinicId,
    comanda_id: ticketId,
    tipo: itemType,
    quantidade: quantity,
    desconto: discount,
  };

  if (itemType === "servico") {
    const { data } = await supabaseAdmin.from("barbearia_servicos").select("id, nome, preco").eq("barbearia_id", clinicId).eq("id", referenceId).maybeSingle();
    if (!data) redirectMessage("erro", "Serviço não encontrado.");
    payload.servico_id = data.id;
    description = data.nome;
    unitPrice = Number(data.preco || 0);
  } else if (itemType === "produto") {
    const { data } = await supabaseAdmin.from("barbearia_produtos").select("id, nome, preco").eq("barbearia_id", clinicId).eq("id", referenceId).maybeSingle();
    if (!data) redirectMessage("erro", "Produto não encontrado.");
    payload.produto_id = data.id;
    description = data.nome;
    unitPrice = Number(data.preco || 0);
  } else if (itemType !== "outro" || !description) {
    redirectMessage("erro", "Informe um serviço, produto ou item avulso válido.");
  }

  payload.descricao = description;
  payload.valor_unitario = unitPrice;
  payload.total = Number(Math.max(0, quantity * unitPrice - discount).toFixed(2));

  const { error } = await supabaseAdmin.from("barbearia_comanda_itens").insert(payload);
  if (error) redirectMessage("erro", error.message);
  await recalculateTicket(clinicId, ticketId);
  revalidatePath("/dashboard/comandas");
  redirectMessage("ok", "Item adicionado à comanda.");
}

export async function removeTicketItemAction(formData) {
  const { clinicId } = await getContext();
  const ticketId = text(formData, "comanda_id");
  await loadOpenTicket(clinicId, ticketId);
  const { error } = await supabaseAdmin
    .from("barbearia_comanda_itens")
    .delete()
    .eq("barbearia_id", clinicId)
    .eq("comanda_id", ticketId)
    .eq("id", text(formData, "item_id"));
  if (error) redirectMessage("erro", error.message);
  await recalculateTicket(clinicId, ticketId);
  revalidatePath("/dashboard/comandas");
  redirectMessage("ok", "Item removido.");
}

export async function updateTicketTotalsAction(formData) {
  const { clinicId } = await getContext();
  const ticketId = text(formData, "comanda_id");
  await loadOpenTicket(clinicId, ticketId);
  const { error } = await supabaseAdmin.from("barbearia_comandas").update({
    desconto: Math.max(0, numberValue(formData, "desconto", 0)),
    acrescimo: Math.max(0, numberValue(formData, "acrescimo", 0)),
    observacoes: text(formData, "observacoes") || null,
  }).eq("barbearia_id", clinicId).eq("id", ticketId);
  if (error) redirectMessage("erro", error.message);
  await recalculateTicket(clinicId, ticketId);
  revalidatePath("/dashboard/comandas");
  redirectMessage("ok", "Totais da comanda atualizados.");
}

export async function closeTicketAction(formData) {
  const { clinicId, userId } = await getContext();
  const ticketId = text(formData, "comanda_id");
  const ticket = await loadOpenTicket(clinicId, ticketId);
  const paymentMethod = text(formData, "forma_pagamento") || "pix";
  if (Number(ticket.total || 0) > 0) {
    const { error: paymentError } = await supabaseAdmin.from("barbearia_pagamentos").insert({
      barbearia_id: clinicId,
      cliente_id: ticket.cliente_id,
      comanda_id: ticketId,
      valor: ticket.total,
      forma: paymentMethod,
      status: "pago",
      pago_em: new Date().toISOString(),
      created_by: userId,
      observacoes: "Pagamento registrado no fechamento da comanda.",
    });
    if (paymentError) redirectMessage("erro", paymentError.message);
  }
  const { error } = await supabaseAdmin.from("barbearia_comandas").update({
    status: "fechada",
    fechada_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("barbearia_id", clinicId).eq("id", ticketId);
  if (error) redirectMessage("erro", error.message);
  revalidatePath("/dashboard/comandas");
  revalidatePath("/dashboard/financeiro");
  redirectMessage("ok", "Comanda fechada e pagamento registrado.");
}

export async function cancelTicketAction(formData) {
  const { clinicId } = await getContext();
  const ticketId = text(formData, "comanda_id");
  await loadOpenTicket(clinicId, ticketId);
  const { error } = await supabaseAdmin.from("barbearia_comandas").update({
    status: "cancelada",
    fechada_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("barbearia_id", clinicId).eq("id", ticketId);
  if (error) redirectMessage("erro", error.message);
  revalidatePath("/dashboard/comandas");
  redirectMessage("ok", "Comanda cancelada.");
}

