import Link from "next/link";
import { paidAmount } from "@/lib/barbearia/finance";
import { ArrowLeft, CalendarDays, Camera, FileText, HeartPulse, MessageCircle, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClinic } from "@/lib/auth/session";
import { EmptyClinicState, Field, PageHeader, SubmitButton, TextArea } from "@/components/app-shell/ui";
import { createSignedPhotoUrl } from "@/lib/supabase/storage";
import {
  createClienteConsentimentoAction,
  createClienteFotoAction,
  createClienteFotoUploadAction,
  deleteClienteFotoAction,
  updateClienteAnamneseAction,
  updateClienteFichaAction,
} from "../../actions";
import { ConsentimentoForm } from "./consentimento-form";

export const metadata = { title: "Ficha do cliente | Barbearia SaaS" };

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parsePreferences(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return { observacoes: String(value) };
  }
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function whatsappUrl(phone, name) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá, ${name || "tudo bem"}! Aqui é da barbearia.`)}`;
}

function SelectField({ label, name, defaultValue = "", children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <select name={name} defaultValue={defaultValue || ""} className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--clinic-primary)_18%,transparent)]">
        {children}
      </select>
    </label>
  );
}

export default async function ClienteDetalhePage({ params }) {
  const { id } = await params;
  const { activeClinic, memberships } = await requireClinic();

  if (!activeClinic) {
    return <main className="px-5 py-8 sm:px-8 lg:px-10"><EmptyClinicState /></main>;
  }

  const membership = (memberships || []).find((item) => item.barbearia_id === activeClinic.id) || memberships?.[0];
  const canAccessProntuario = ["owner", "gerente", "barbeiro"].includes(membership?.papel);

  if (!canAccessProntuario) {
    return (
      <main className="px-5 py-8 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <Link href="/dashboard/clientes" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Voltar para clientes</Link>
          <h1 className="mt-6 text-2xl font-semibold">Ficha do cliente restrita</h1>
          <p className="mt-3 text-sm leading-6">Preferências, consentimentos e fotos de referência ficam disponíveis apenas para proprietário, gerente e barbeiro autorizado.</p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const [{ data: cliente }, { data: agendamentos = [] }, { data: fotos = [] }, { data: pacotes = [] }, { data: consentimentos = [] }] = await Promise.all([
    supabase.from("barbearia_clientes").select("*").eq("barbearia_id", activeClinic.id).eq("id", id).maybeSingle(),
    supabase
      .from("barbearia_agendamentos")
      .select("id, inicio, fim, status, valor:valor_final, pagamento_status, observacoes, profissionais:barbearia_barbeiros(nome), procedimentos:barbearia_servicos(nome), pagamentos:barbearia_pagamentos(valor, status)")
      .eq("barbearia_id", activeClinic.id)
      .eq("cliente_id", id)
      .order("inicio", { ascending: false })
      .limit(30),
    supabase
      .from("barbearia_cliente_fotos")
      .select("id, tipo, titulo, url, storage_path, observacoes, data_foto, autorizacao_uso_imagem, visibilidade, consentimento_id, created_at")
      .eq("barbearia_id", activeClinic.id)
      .eq("cliente_id", id)
      .order("data_foto", { ascending: false }),
    supabase
      .from("barbearia_cliente_pacotes")
      .select("id, sessoes_total:utilizacoes_total, sessoes_utilizadas:utilizacoes_consumidas, status, data_compra:adquirido_em, validade_em:valido_ate, pacote:barbearia_pacotes(nome, preco)")
      .eq("barbearia_id", activeClinic.id)
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("barbearia_cliente_consentimentos")
      .select("id, tipo, titulo, versao, texto, aceito, aceito_em, aceito_por_nome, observacoes")
      .eq("barbearia_id", activeClinic.id)
      .eq("cliente_id", id)
      .order("aceito_em", { ascending: false }),
  ]);

  if (!cliente) notFound();

  const fotosComUrl = await Promise.all((fotos || []).map(async (foto) => ({
    ...foto,
    displayUrl: foto.storage_path ? await createSignedPhotoUrl(foto.storage_path) : foto.url,
  })));
  const preferences = parsePreferences(cliente.preferencias);
  const whats = whatsappUrl(cliente.telefone, cliente.nome);
  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <Link href="/dashboard/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950">
          <ArrowLeft size={16} /> Voltar para clientes
        </Link>

        <div className="mt-5">
          <PageHeader
            eyebrow="Ficha do cliente"
            title={cliente.nome}
            description={`${cliente.telefone || "Sem telefone"}${cliente.email ? ` · ${cliente.email}` : ""}`}
            action={whats ? <a className="inline-flex h-11 items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--clinic-primary)_24%,#e5e5e5)] bg-[color-mix(in_srgb,var(--clinic-accent)_10%,white)] px-4 text-sm font-semibold text-[var(--clinic-primary)]" href={whats} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a> : null}
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-sm text-neutral-500">Status</p><strong className="mt-2 block capitalize">{cliente.status}</strong></div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-sm text-neutral-500">Agendamentos</p><strong className="mt-2 block">{agendamentos.length}</strong></div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-sm text-neutral-500">Última visita</p><strong className="mt-2 block">{formatDate(cliente.ultima_visita_em)}</strong></div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-sm text-neutral-500">Consentimento LGPD</p><strong className="mt-2 block">{cliente.consentimento_lgpd ? "Aceito" : "Pendente"}</strong></div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <form action={updateClienteFichaAction} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <input type="hidden" name="id" value={cliente.id} />
              <div className="flex items-center gap-2"><FileText size={20} className="text-[var(--clinic-primary)]" /><h2 className="text-lg font-semibold">Ficha cadastral</h2></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Nome" name="nome" defaultValue={cliente.nome || ""} required />
                <Field label="Telefone" name="telefone" defaultValue={cliente.telefone || ""} />
                <Field label="E-mail" name="email" type="email" defaultValue={cliente.email || ""} />
                <Field label="CPF" name="cpf" defaultValue={cliente.cpf || ""} />
                <Field label="Nascimento" name="data_nascimento" type="date" defaultValue={cliente.data_nascimento || ""} />
                <Field label="Origem" name="origem" defaultValue={cliente.origem || ""} />
                <Field label="Endereço" name="endereco" defaultValue={cliente.endereco || ""} />
                <Field label="Bairro" name="bairro" defaultValue={cliente.bairro || ""} />
                <Field label="Cidade" name="cidade" defaultValue={cliente.cidade || ""} />
                <SelectField label="Status" name="status" defaultValue={cliente.status}>
                  <option value="lead">Lead</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </SelectField>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextArea label="Observações gerais" name="observacoes" defaultValue={cliente.observacoes || ""} />
                <TextArea label="Preferências gerais" name="observacoes_clinicas" defaultValue={preferences.observacoes || ""} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Última visita" name="ultima_visita_em" type="datetime-local" defaultValue={cliente.ultima_visita_em ? cliente.ultima_visita_em.slice(0, 16) : ""} />
                <Field label="Data/hora do aceite LGPD" name="termo_consentimento_aceito_em" type="datetime-local" defaultValue={cliente.consentimento_lgpd_em ? cliente.consentimento_lgpd_em.slice(0, 16) : ""} />
                <Field label="Versão do termo LGPD" name="termo_consentimento_versao" defaultValue={cliente.consentimento_lgpd_versao || "v1"} />
              </div>
              <div className="mt-4 space-y-4">
                <label className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                  <input className="mt-1" name="termo_consentimento_aceito" type="checkbox" defaultChecked={cliente.consentimento_lgpd} />
                  Cliente aceitou o tratamento dos dados conforme a política de privacidade e LGPD.
                </label>
              </div>
              <div className="mt-5"><SubmitButton>Salvar ficha</SubmitButton></div>
            </form>

            <form action={updateClienteAnamneseAction} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <input type="hidden" name="id" value={cliente.id} />
              <div className="flex items-center gap-2"><HeartPulse size={20} className="text-[var(--clinic-primary)]" /><h2 className="text-lg font-semibold">Preferências do cliente</h2></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextArea label="Corte ou estilo preferido" name="corte_preferido" defaultValue={preferences.corte_preferido || ""} />
                <TextArea label="Preferência para barba" name="barba_preferida" defaultValue={preferences.barba_preferida || ""} />
                <TextArea label="Acabamento preferido" name="acabamento_preferido" defaultValue={preferences.acabamento_preferido || ""} />
                <TextArea label="Frequência habitual de visitas" name="frequencia_visitas" defaultValue={preferences.frequencia_visitas || ""} />
                <TextArea label="Produtos preferidos" name="produtos_preferidos" defaultValue={preferences.produtos_preferidos || ""} />
                <TextArea label="Produtos ou fragrâncias a evitar" name="produtos_evitar" defaultValue={preferences.produtos_evitar || ""} />
                <TextArea label="Observações para o atendimento" name="anamnese_observacoes" defaultValue={preferences.observacoes || ""} />
              </div>
              <div className="mt-5"><SubmitButton>Salvar preferências</SubmitButton></div>
            </form>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><CalendarDays size={20} className="text-[var(--clinic-primary)]" /><h2 className="text-lg font-semibold">Histórico</h2></div>
              <div className="mt-4 space-y-3">
                {agendamentos.length === 0 ? <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">Sem histórico.</p> : agendamentos.map((item) => (
                  <div key={item.id} className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-sm font-semibold">{item.procedimentos?.nome || "Serviço"}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatDateTime(item.inicio)} · {item.profissionais?.nome || "Barbeiro"}</p>
                    <p className="mt-1 text-xs text-neutral-500">{item.status} · {formatMoney(item.valor)} · Pagamento: {item.pagamento_status || "pendente"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><Camera size={20} className="text-[var(--clinic-primary)]" /><h2 className="text-lg font-semibold">Fotos de referência e resultado</h2></div>
              <form action={createClienteFotoUploadAction} className="mt-4 space-y-3 rounded-lg bg-neutral-50 p-3">
                <input type="hidden" name="cliente_id" value={cliente.id} />
                <SelectField label="Tipo" name="tipo" defaultValue="referencia">
                  <option value="referencia">Referência de corte ou barba</option>
                  <option value="resultado">Resultado do atendimento</option>
                  <option value="perfil">Foto de perfil</option>
                  <option value="documento">Documento</option>
                </SelectField>
                <SelectField label="Visibilidade" name="visibilidade" defaultValue="restrito">
                  <option value="restrito">Restrito à ficha do cliente</option>
                  <option value="interno">Uso interno da barbearia</option>
                  <option value="marketing">Marketing autorizado</option>
                </SelectField>
                <SelectField label="Termo vinculado" name="consentimento_id" defaultValue="">
                  <option value="">Sem termo vinculado</option>
                  {consentimentos.map((termo) => <option key={termo.id} value={termo.id}>{termo.titulo} - {formatDateTime(termo.aceito_em)}</option>)}
                </SelectField>
                <Field label="Título" name="titulo" />
                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">Arquivo da imagem</span>
                  <input className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" name="arquivo" type="file" accept="image/png,image/jpeg,image/webp" required />
                </label>
                <Field label="Data da foto" name="data_foto" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
                  <input className="mt-1" name="autorizacao_uso_imagem" type="checkbox" />
                  Cliente autorizou o armazenamento/uso da imagem conforme termo vinculado.
                </label>
                <TextArea label="Observações" name="observacoes" />
                <SubmitButton>Enviar foto</SubmitButton>
              </form>

              <details className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-neutral-700">Adicionar por URL externa</summary>
                <form action={createClienteFotoAction} className="mt-3 space-y-3">
                  <input type="hidden" name="cliente_id" value={cliente.id} />
                  <SelectField label="Tipo" name="tipo" defaultValue="referencia">
                    <option value="referencia">Referência de corte ou barba</option>
                    <option value="resultado">Resultado do atendimento</option>
                    <option value="perfil">Foto de perfil</option>
                    <option value="documento">Documento</option>
                  </SelectField>
                  <SelectField label="Visibilidade" name="visibilidade" defaultValue="restrito">
                    <option value="restrito">Restrito à ficha do cliente</option>
                    <option value="interno">Uso interno da barbearia</option>
                    <option value="marketing">Marketing autorizado</option>
                  </SelectField>
                  <SelectField label="Termo vinculado" name="consentimento_id" defaultValue="">
                    <option value="">Sem termo vinculado</option>
                    {consentimentos.map((termo) => <option key={termo.id} value={termo.id}>{termo.titulo} - {formatDateTime(termo.aceito_em)}</option>)}
                  </SelectField>
                  <Field label="Título" name="titulo" />
                  <Field label="URL da imagem" name="url" required />
                  <Field label="Data da foto" name="data_foto" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                  <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
                    <input className="mt-1" name="autorizacao_uso_imagem" type="checkbox" />
                    Cliente autorizou o armazenamento/uso da imagem conforme termo vinculado.
                  </label>
                  <TextArea label="Observações" name="observacoes" />
                  <SubmitButton>Adicionar por URL</SubmitButton>
                </form>
              </details>

              <div className="mt-4 space-y-3">
                {fotosComUrl.length === 0 ? <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">Nenhuma foto cadastrada.</p> : fotosComUrl.map((foto) => (
                  <div key={foto.id} className="rounded-lg border border-neutral-200 p-3">
                    <a href={foto.displayUrl || foto.url || "#"} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto.displayUrl || foto.url} alt={foto.titulo || foto.tipo} className="h-44 w-full object-cover" />
                    </a>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{foto.titulo || foto.tipo}</p>
                        <p className="text-xs text-neutral-500">{foto.tipo} - {formatDate(foto.data_foto)}</p>
                        <p className="mt-1 text-xs text-neutral-500">Visibilidade: {foto.visibilidade || "restrito"} - Imagem autorizada: {foto.autorizacao_uso_imagem ? "sim" : "não"}</p>
                      </div>
                      <form action={deleteClienteFotoAction}>
                        <input type="hidden" name="id" value={foto.id} />
                        <input type="hidden" name="cliente_id" value={cliente.id} />
                        <button type="submit" className="text-xs font-semibold text-red-700">Excluir</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Pacotes comprados</h2>
              <div className="mt-4 space-y-3">
                {pacotes.length === 0 ? <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">Nenhum pacote vendido.</p> : pacotes.map((pacote) => (
                  <div key={pacote.id} className="rounded-lg border border-neutral-200 p-3">
                    <p className="text-sm font-semibold">{pacote.pacote?.nome || "Pacote"}</p>
                    <p className="mt-1 text-xs text-neutral-500">Sessões: {pacote.sessoes_utilizadas}/{pacote.sessoes_total} · {formatMoney(pacote.pacote?.preco)}</p>
                    <p className="mt-1 text-xs text-neutral-500">Status: {pacote.status} · Validade: {formatDate(pacote.validade_em)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[color-mix(in_srgb,var(--clinic-primary)_24%,#e5e5e5)] bg-[color-mix(in_srgb,var(--clinic-accent)_10%,white)] p-5 text-neutral-950">
              <div className="flex items-center gap-2"><ShieldCheck size={20} /><h2 className="text-lg font-semibold">Termos e consentimentos</h2></div>
              <p className="mt-3 text-sm leading-6">Registre o aceite de atendimento, LGPD, comunicação e uso de imagem. Cada registro mantém a versão e a data do consentimento.</p>
              <ConsentimentoForm action={createClienteConsentimentoAction} clienteId={cliente.id} clienteNome={cliente.nome} />
              <div className="mt-4 space-y-3">
                {consentimentos.length === 0 ? <p className="rounded-lg bg-white/70 px-4 py-3 text-sm text-neutral-600">Nenhum consentimento formal registrado.</p> : consentimentos.map((termo) => (
                  <div key={termo.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                    <p className="text-sm font-semibold">{termo.titulo}</p>
                    <p className="mt-1 text-xs text-neutral-500">{termo.tipo} - {termo.versao} - {formatDateTime(termo.aceito_em)}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-neutral-600">{termo.texto}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}


