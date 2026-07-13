import { supabaseAdmin } from "@/lib/supabase/admin";

export const DEMO_EMAIL = String(process.env.DEMO_EMAIL || "demo@barbearia.local").toLowerCase();
export const DEMO_PASSWORD = String(process.env.DEMO_PASSWORD || "Demo@123456");

const DEMO_SLUG = "navalha-nobre-demo";

export function isDemoLoginEmail(email) {
  return String(email || "").trim().toLowerCase() === DEMO_EMAIL;
}

export function isDemoPassword(password) {
  return String(password || "") === DEMO_PASSWORD;
}

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data?.users?.find((item) => String(item.email || "").toLowerCase() === email);
    if (user) return user;
    if (!data?.users?.length || data.users.length < 100) return null;
  }
  return null;
}

async function ensureDemoAuthUser() {
  const existing = await findAuthUserByEmail(DEMO_EMAIL);
  if (existing) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), nome: "Proprietário Demo" },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nome: "Proprietário Demo" },
  });
  if (error) throw error;
  return data.user;
}

async function ensureDemoBarbearia(user) {
  const { data: existing, error: findError } = await supabaseAdmin
    .from("barbearias")
    .select("id, slug")
    .eq("slug", DEMO_SLUG)
    .maybeSingle();
  if (findError) throw findError;

  const payload = {
    nome: "Barbearia Demo NexaWi",
    nome_fantasia: "Navalha Nobre",
    slug: DEMO_SLUG,
    telefone: "5571999990000",
    whatsapp: "5571999990000",
    email: DEMO_EMAIL,
    cidade: "Salvador",
    estado: "BA",
    timezone: "America/Bahia",
    status: "ativa",
    plano: "growth",
    site_publicado: true,
    site_titulo: "Seu estilo. Sua presença.",
    site_subtitulo: "Cortes precisos, barba alinhada e atendimento com hora marcada.",
  };

  const query = existing?.id
    ? supabaseAdmin.from("barbearias").update(payload).eq("id", existing.id).select("id, slug").single()
    : supabaseAdmin.from("barbearias").insert(payload).select("id, slug").single();
  const { data: barbearia, error } = await query;
  if (error) throw error;

  const { error: membershipError } = await supabaseAdmin.from("barbearia_usuarios").upsert({
    barbearia_id: barbearia.id,
    user_id: user.id,
    nome: "Proprietário Demo",
    email: DEMO_EMAIL,
    papel: "owner",
    permissoes: { acesso_total: true },
    ativo: true,
    convidado_em: new Date().toISOString(),
    aceito_em: new Date().toISOString(),
  }, { onConflict: "barbearia_id,email" });
  if (membershipError) throw membershipError;
  return barbearia;
}

async function clearDemoOperationalData(barbeariaId) {
  const tables = [
    "barbearia_pagamentos",
    "barbearia_comanda_itens",
    "barbearia_comandas",
    "barbearia_site_agendamentos_publicos",
    "barbearia_agendamentos",
    "barbearia_cliente_pacotes",
    "barbearia_pacote_servicos",
    "barbearia_pacotes",
    "barbearia_crm_oportunidades",
    "barbearia_cliente_fotos",
    "barbearia_cliente_consentimentos",
    "barbearia_clientes",
    "barbearia_servicos",
    "barbearia_barbeiros",
  ];

  for (const table of tables) {
    const { error } = await supabaseAdmin.from(table).delete().eq("barbearia_id", barbeariaId);
    if (error) throw error;
  }
}

async function seedDemoOperationalData(barbearia) {
  const { data: barbeiro, error: barbeiroError } = await supabaseAdmin.from("barbearia_barbeiros").insert({
    barbearia_id: barbearia.id,
    nome: "Rafael Santos",
    apelido: "Rafa",
    telefone: "5571999990001",
    bio: "Especialista em degradê, cortes modernos e acabamento com navalha.",
    especialidades: ["Degradê", "Corte masculino", "Navalha"],
    comissao_servico_percentual: 40,
    publicado_site: true,
    ativo: true,
  }).select("id").single();
  if (barbeiroError) throw barbeiroError;

  const { data: servico, error: servicoError } = await supabaseAdmin.from("barbearia_servicos").insert({
    barbearia_id: barbearia.id,
    nome: "Corte assinatura",
    categoria: "Cabelo",
    descricao: "Corte personalizado com acabamento e finalização.",
    duracao_minutos: 45,
    intervalo_minutos: 10,
    preco: 65,
    destaque_site: true,
    publicado_site: true,
    ativo: true,
  }).select("id").single();
  if (servicoError) throw servicoError;

  const { data: cliente, error: clienteError } = await supabaseAdmin.from("barbearia_clientes").insert({
    barbearia_id: barbearia.id,
    nome: "Carlos Almeida",
    telefone: "(71) 98888-1001",
    telefone_normalizado: "71988881001",
    email: "carlos@demo.local",
    origem: "cadastro",
    status: "ativo",
    preferencias: "Degradê baixo e acabamento discreto.",
    consentimento_lgpd: true,
    consentimento_lgpd_em: new Date().toISOString(),
    consentimento_lgpd_versao: "demo-v1",
  }).select("id").single();
  if (clienteError) throw clienteError;

  const inicio = new Date();
  inicio.setDate(inicio.getDate() + 1);
  inicio.setHours(13, 0, 0, 0);
  const fim = new Date(inicio.getTime() + 55 * 60 * 1000);
  const { error: agendaError } = await supabaseAdmin.from("barbearia_agendamentos").insert({
    barbearia_id: barbearia.id,
    cliente_id: cliente.id,
    barbeiro_id: barbeiro.id,
    servico_id: servico.id,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    status: "confirmado",
    origem: "painel",
    valor_tabela: 65,
    desconto: 0,
    valor_final: 65,
    pagamento_status: "pendente",
    observacoes: "Agendamento restaurado automaticamente para a demonstração.",
  });
  if (agendaError) throw agendaError;
}

export async function ensureDemoAccountAndReset() {
  const user = await ensureDemoAuthUser();
  const barbearia = await ensureDemoBarbearia(user);
  await clearDemoOperationalData(barbearia.id);
  await seedDemoOperationalData(barbearia);
  return { user, clinic: barbearia };
}

export async function resetDemoClinicData() {
  const { data: barbearia, error } = await supabaseAdmin.from("barbearias").select("id, slug").eq("slug", DEMO_SLUG).maybeSingle();
  if (error) throw error;
  if (!barbearia) return null;
  await clearDemoOperationalData(barbearia.id);
  await seedDemoOperationalData(barbearia);
  return barbearia;
}
