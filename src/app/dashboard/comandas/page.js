import { CircleDollarSign, ClipboardList, Plus, ReceiptText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireClinicSection } from "@/lib/auth/session";
import { EmptyClinicState, Field, PageHeader, SubmitButton, TextArea } from "@/components/app-shell/ui";
import {
  addTicketItemAction,
  cancelTicketAction,
  closeTicketAction,
  createTicketAction,
  removeTicketItemAction,
  updateTicketTotalsAction,
} from "./actions";

export const metadata = { title: "Comandas | Barbearia SaaS" };

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SelectField({ label, name, defaultValue = "", required = false, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <select name={name} defaultValue={defaultValue} required={required} className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-[var(--clinic-primary)]">
        {children}
      </select>
    </label>
  );
}

function ItemForm({ ticketId, type, options = [] }) {
  return (
    <form action={addTicketItemAction} className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[minmax(0,1fr)_100px_100px_auto] sm:items-end">
      <input type="hidden" name="comanda_id" value={ticketId} />
      <input type="hidden" name="tipo" value={type} />
      {type === "outro" ? (
        <Field label="Item avulso" name="descricao" placeholder="Descrição do item" required />
      ) : (
        <SelectField label={type === "servico" ? "Serviço" : "Produto"} name="referencia_id" required>
          <option value="">Selecione</option>
          {options.map((item) => <option key={item.id} value={item.id}>{item.nome} · {money(item.preco)}</option>)}
        </SelectField>
      )}
      <Field label="Qtd." name="quantidade" type="number" defaultValue="1" />
      {type === "outro" ? <Field label="Valor" name="valor_unitario" type="number" defaultValue="0" /> : <Field label="Desconto" name="desconto" type="number" defaultValue="0" />}
      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-bold text-white transition active:scale-[0.98]"><Plus size={16} />Adicionar</button>
    </form>
  );
}

export default async function ComandasPage({ searchParams }) {
  const params = await searchParams;
  const { activeClinic } = await requireClinicSection("comandas");
  if (!activeClinic) return <main className="px-5 py-8 sm:px-8 lg:px-10"><EmptyClinicState /></main>;

  const supabase = await createClient();
  const [ticketsResult, clientsResult, barbersResult, servicesResult, productsResult] = await Promise.all([
    supabase
      .from("barbearia_comandas")
      .select("id, numero, cliente_id, barbeiro_id, status, aberta_em, fechada_em, subtotal, desconto, acrescimo, total, observacoes, clientes:barbearia_clientes(nome), barbeiros:barbearia_barbeiros(nome), itens:barbearia_comanda_itens(id, tipo, descricao, quantidade, valor_unitario, desconto, total)")
      .eq("barbearia_id", activeClinic.id)
      .order("aberta_em", { ascending: false })
      .limit(60),
    supabase.from("barbearia_clientes").select("id, nome").eq("barbearia_id", activeClinic.id).eq("status", "ativo").order("nome"),
    supabase.from("barbearia_barbeiros").select("id, nome").eq("barbearia_id", activeClinic.id).eq("ativo", true).order("nome"),
    supabase.from("barbearia_servicos").select("id, nome, preco").eq("barbearia_id", activeClinic.id).eq("ativo", true).order("nome"),
    supabase.from("barbearia_produtos").select("id, nome, preco").eq("barbearia_id", activeClinic.id).eq("ativo", true).order("nome"),
  ]);

  const tickets = ticketsResult.data || [];
  const clients = clientsResult.data || [];
  const barbers = barbersResult.data || [];
  const services = servicesResult.data || [];
  const products = productsResult.data || [];
  const openTickets = tickets.filter((item) => item.status === "aberta");
  const closedTickets = tickets.filter((item) => item.status !== "aberta").slice(0, 20);

  return (
    <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Operação" title="Comandas da barbearia" description="Abra atendimentos, lance serviços e produtos, aplique ajustes e registre o pagamento no fechamento." />

        {params?.mensagem ? <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${params?.erro ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{params.mensagem}</div> : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form action={createTicketAction} className="h-fit rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ClipboardList size={20} className="text-[var(--clinic-primary)]" /><h2 className="text-lg font-black">Abrir comanda</h2></div>
            <div className="mt-4 space-y-4">
              <SelectField label="Cliente" name="cliente_id"><option value="">Consumidor não identificado</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</SelectField>
              <SelectField label="Barbeiro responsável" name="barbeiro_id"><option value="">Não definido</option>{barbers.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</SelectField>
              <TextArea label="Observações" name="observacoes" />
              <SubmitButton>Abrir comanda</SubmitButton>
            </div>
          </form>

          <div className="min-w-0 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Em atendimento</h2>
              <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-black text-white">{openTickets.length} abertas</span>
            </div>
            {openTickets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-5 py-10 text-center text-sm text-neutral-600">Nenhuma comanda aberta. Use o formulário ao lado para iniciar um atendimento.</div>
            ) : openTickets.map((ticket) => (
              <details key={ticket.id} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm" open={openTickets.length === 1}>
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--clinic-primary)]">Comanda #{ticket.numero}</p>
                      <h3 className="mt-1 text-lg font-black">{ticket.clientes?.nome || "Consumidor não identificado"}</h3>
                      <p className="mt-1 text-sm text-neutral-500">{ticket.barbeiros?.nome || "Sem barbeiro definido"} · {new Date(ticket.aberta_em).toLocaleString("pt-BR")}</p>
                    </div>
                    <strong className="text-2xl font-black">{money(ticket.total)}</strong>
                  </div>
                </summary>

                <div className="mt-5 space-y-4 border-t border-neutral-200 pt-5">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-[0.12em] text-neutral-500"><tr><th className="pb-3">Item</th><th className="pb-3">Qtd.</th><th className="pb-3">Unitário</th><th className="pb-3">Total</th><th className="pb-3 text-right">Ação</th></tr></thead>
                      <tbody className="divide-y divide-neutral-100">
                        {(ticket.itens || []).map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 font-semibold">{item.descricao}<span className="ml-2 text-xs font-normal text-neutral-400">{item.tipo}</span></td>
                            <td className="py-3">{Number(item.quantidade)}</td>
                            <td className="py-3">{money(item.valor_unitario)}</td>
                            <td className="py-3 font-bold">{money(item.total)}</td>
                            <td className="py-3 text-right"><form action={removeTicketItemAction}><input type="hidden" name="comanda_id" value={ticket.id} /><input type="hidden" name="item_id" value={item.id} /><button type="submit" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50" title="Remover item"><Trash2 size={15} /></button></form></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <details className="rounded-lg bg-neutral-50 p-4">
                    <summary className="cursor-pointer text-sm font-black">Adicionar itens</summary>
                    <div className="mt-4 space-y-3">
                      <ItemForm ticketId={ticket.id} type="servico" options={services} />
                      <ItemForm ticketId={ticket.id} type="produto" options={products} />
                      <ItemForm ticketId={ticket.id} type="outro" />
                    </div>
                  </details>

                  <form action={updateTicketTotalsAction} className="grid gap-3 rounded-lg bg-neutral-50 p-4 sm:grid-cols-2 lg:grid-cols-[140px_140px_minmax(0,1fr)_auto] lg:items-end">
                    <input type="hidden" name="comanda_id" value={ticket.id} />
                    <Field label="Desconto" name="desconto" type="number" defaultValue={String(ticket.desconto || 0)} />
                    <Field label="Acréscimo" name="acrescimo" type="number" defaultValue={String(ticket.acrescimo || 0)} />
                    <Field label="Observações" name="observacoes" defaultValue={ticket.observacoes || ""} />
                    <button type="submit" className="h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-bold">Atualizar</button>
                  </form>

                  <div className="grid gap-3 rounded-lg bg-neutral-950 p-4 text-white sm:grid-cols-4">
                    <div><span className="text-xs text-neutral-400">Subtotal</span><strong className="mt-1 block">{money(ticket.subtotal)}</strong></div>
                    <div><span className="text-xs text-neutral-400">Desconto</span><strong className="mt-1 block">{money(ticket.desconto)}</strong></div>
                    <div><span className="text-xs text-neutral-400">Acréscimo</span><strong className="mt-1 block">{money(ticket.acrescimo)}</strong></div>
                    <div><span className="text-xs text-neutral-400">Total</span><strong className="mt-1 block text-xl text-[var(--clinic-accent)]">{money(ticket.total)}</strong></div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <form action={cancelTicketAction}><input type="hidden" name="comanda_id" value={ticket.id} /><button type="submit" className="h-11 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50">Cancelar comanda</button></form>
                    <form action={closeTicketAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <input type="hidden" name="comanda_id" value={ticket.id} />
                      <SelectField label="Forma de pagamento" name="forma_pagamento" defaultValue="pix"><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao_credito">Cartão de crédito</option><option value="cartao_debito">Cartão de débito</option><option value="cortesia">Cortesia</option><option value="outro">Outro</option></SelectField>
                      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--clinic-primary)] px-5 text-sm font-black text-white shadow-sm transition active:scale-[0.98]"><CircleDollarSign size={17} />Fechar e receber</button>
                    </form>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2"><ReceiptText size={20} className="text-[var(--clinic-primary)]" /><h2 className="text-xl font-black">Histórico recente</h2></div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-950 text-xs uppercase tracking-[0.12em] text-white"><tr><th className="px-4 py-3">Comanda</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Responsável</th><th className="px-4 py-3">Fechamento</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {closedTickets.map((ticket) => <tr key={ticket.id}><td className="px-4 py-3 font-bold">#{ticket.numero}</td><td className="px-4 py-3">{ticket.clientes?.nome || "Não identificado"}</td><td className="px-4 py-3">{ticket.barbeiros?.nome || "-"}</td><td className="px-4 py-3">{ticket.fechada_em ? new Date(ticket.fechada_em).toLocaleString("pt-BR") : "-"}</td><td className="px-4 py-3 capitalize">{ticket.status}</td><td className="px-4 py-3 text-right font-black">{money(ticket.total)}</td></tr>)}
                {closedTickets.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Nenhuma comanda finalizada.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
