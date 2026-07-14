import { supabaseAdmin } from "../supabase/admin.js";

export const DEMO_EMAIL = String(process.env.DEMO_EMAIL || "demo@barbearia.local").toLowerCase();
export const DEMO_PASSWORD = String(process.env.DEMO_PASSWORD || "Demo@123456");

const DEMO_SLUG = "navalha-nobre-demo";

const DEMO_BARBERS = [
  {
    nome: "Rafael Santos",
    apelido: "Rafa",
    telefone: "5571999990001",
    bio: "Especialista em degradê, cortes modernos e acabamento com navalha.",
    especialidades: ["Degradê", "Corte masculino", "Navalha"],
    comissao_servico_percentual: 40,
    ordem_site: 1,
  },
  {
    nome: "Lucas Oliveira",
    apelido: "Lucca",
    telefone: "5571999990002",
    bio: "Barbeiro clássico, referência em barba desenhada e visuais executivos.",
    especialidades: ["Barba", "Corte executivo", "Visagismo"],
    comissao_servico_percentual: 38,
    ordem_site: 2,
  },
  {
    nome: "Diego Nascimento",
    apelido: "DG",
    telefone: "5571999990003",
    bio: "Cortes infantis, freestyle e transformações para quem busca personalidade.",
    especialidades: ["Freestyle", "Corte infantil", "Pigmentação"],
    comissao_servico_percentual: 35,
    ordem_site: 3,
  },
];

const DEMO_SERVICES = [
  { nome: "Corte Clássico", categoria: "Cabelo", descricao: "Corte masculino sob medida, lavagem e finalização.", duracao_minutos: 45, intervalo_minutos: 10, preco: 55, sinal_percentual: 20, destaque_site: true },
  { nome: "Degradê Navalhado", categoria: "Cabelo", descricao: "Degradê preciso com acabamento de navalha e styling profissional.", duracao_minutos: 50, intervalo_minutos: 10, preco: 70, sinal_percentual: 20, destaque_site: true },
  { nome: "Corte Executivo", categoria: "Cabelo", descricao: "Visual elegante, alinhado ao formato do rosto e à rotina profissional.", duracao_minutos: 45, intervalo_minutos: 10, preco: 65, sinal_percentual: 20, destaque_site: false },
  { nome: "Barba Premium", categoria: "Barba", descricao: "Desenho, toalha quente, navalha e finalização com balm.", duracao_minutos: 35, intervalo_minutos: 10, preco: 45, sinal_percentual: 20, destaque_site: true },
  { nome: "Ritual da Barba", categoria: "Barba", descricao: "Experiência completa com esfoliação, toalha quente, massagem e hidratação.", duracao_minutos: 50, intervalo_minutos: 10, preco: 65, sinal_percentual: 20, destaque_site: false },
  { nome: "Corte + Barba", categoria: "Combos", descricao: "Cabelo e barba alinhados no mesmo atendimento, com acabamento premium.", duracao_minutos: 75, intervalo_minutos: 15, preco: 105, preco_promocional: 99, sinal_percentual: 25, destaque_site: true },
  { nome: "Corte Infantil", categoria: "Cabelo", descricao: "Atendimento paciente e confortável para crianças de até 12 anos.", duracao_minutos: 40, intervalo_minutos: 10, preco: 50, sinal_percentual: 20, destaque_site: false },
  { nome: "Camuflagem de Fios", categoria: "Tratamentos", descricao: "Tonalização discreta para suavizar fios brancos e uniformizar o visual.", duracao_minutos: 60, intervalo_minutos: 15, preco: 85, sinal_percentual: 25, destaque_site: false },
  { nome: "Pigmentação de Barba", categoria: "Barba", descricao: "Correção de falhas e definição do desenho com resultado natural.", duracao_minutos: 45, intervalo_minutos: 10, preco: 60, sinal_percentual: 20, destaque_site: false },
  { nome: "Acabamento e Pezinho", categoria: "Manutenção", descricao: "Contornos, pezinho e limpeza rápida para manter o corte em dia.", duracao_minutos: 20, intervalo_minutos: 5, preco: 30, sinal_percentual: 0, destaque_site: false },
  { nome: "Sobrancelha na Navalha", categoria: "Acabamento", descricao: "Limpeza e alinhamento masculino com acabamento natural.", duracao_minutos: 15, intervalo_minutos: 5, preco: 20, sinal_percentual: 0, destaque_site: false },
  { nome: "Dia do Noivo Premium", categoria: "Experiências", descricao: "Corte, barba, limpeza facial, styling e preparação completa para o grande dia.", duracao_minutos: 120, intervalo_minutos: 20, preco: 220, sinal_percentual: 30, destaque_site: true },
];

const DEMO_PACKAGES = [
  { nome: "Clube Corte Essencial", descricao: "Quatro cortes clássicos para manter o visual alinhado o mês inteiro.", preco: 189, validade_dias: 45, limite_utilizacoes: 4, recorrente: true, servicos: [{ nome: "Corte Clássico", quantidade: 4 }] },
  { nome: "Clube Corte Prime", descricao: "Quatro cortes executivos com prioridade de agenda.", preco: 229, validade_dias: 45, limite_utilizacoes: 4, recorrente: true, servicos: [{ nome: "Corte Executivo", quantidade: 4 }] },
  { nome: "Clube Barba em Dia", descricao: "Quatro manutenções de barba premium para usar em até 45 dias.", preco: 159, validade_dias: 45, limite_utilizacoes: 4, recorrente: true, servicos: [{ nome: "Barba Premium", quantidade: 4 }] },
  { nome: "Clube Ritual da Barba", descricao: "Quatro rituais completos com toalha quente e hidratação.", preco: 229, validade_dias: 60, limite_utilizacoes: 4, recorrente: true, servicos: [{ nome: "Ritual da Barba", quantidade: 4 }] },
  { nome: "Clube Navalha Completo", descricao: "Dois atendimentos completos de corte e barba com preço especial.", preco: 189, validade_dias: 45, limite_utilizacoes: 2, recorrente: true, servicos: [{ nome: "Corte + Barba", quantidade: 2 }] },
  { nome: "Combo Pai e Filho", descricao: "Um corte clássico e um corte infantil para viver o ritual juntos.", preco: 95, validade_dias: 30, limite_utilizacoes: 2, recorrente: false, servicos: [{ nome: "Corte Clássico", quantidade: 1 }, { nome: "Corte Infantil", quantidade: 1 }] },
  { nome: "Plano Degradê Semanal", descricao: "Quatro degradês navalhados para quem não abre mão do corte sempre novo.", preco: 249, validade_dias: 40, limite_utilizacoes: 4, recorrente: true, servicos: [{ nome: "Degradê Navalhado", quantidade: 4 }] },
  { nome: "Combo Executivo", descricao: "Três cortes executivos para uma rotina profissional sempre alinhada.", preco: 179, validade_dias: 60, limite_utilizacoes: 3, recorrente: false, servicos: [{ nome: "Corte Executivo", quantidade: 3 }] },
  { nome: "Noivo Navalha Nobre", descricao: "Dia do noivo premium mais um ritual de barba de preparação.", preco: 269, validade_dias: 90, limite_utilizacoes: 2, recorrente: false, servicos: [{ nome: "Dia do Noivo Premium", quantidade: 1 }, { nome: "Ritual da Barba", quantidade: 1 }] },
  { nome: "Passe Livre Acabamento", descricao: "Seis manutenções rápidas de pezinho e contornos.", preco: 139, validade_dias: 60, limite_utilizacoes: 6, recorrente: false, servicos: [{ nome: "Acabamento e Pezinho", quantidade: 6 }] },
];

const DEMO_PRODUCTS = [
  { nome: "Pomada Matte Navalha Nobre 80g", sku: "NN-POM-MATTE-80", categoria: "Modeladores", descricao: "Fixação forte, acabamento seco e fácil remoção.", custo: 19, preco: 45, estoque_atual: 18, estoque_minimo: 5 },
  { nome: "Pomada Efeito Molhado 80g", sku: "NN-POM-WET-80", categoria: "Modeladores", descricao: "Brilho controlado e fixação flexível para penteados clássicos.", custo: 18, preco: 42, estoque_atual: 14, estoque_minimo: 5 },
  { nome: "Cera Modeladora Fiber 60g", sku: "NN-CERA-FIBER-60", categoria: "Modeladores", descricao: "Textura, definição e movimento sem pesar nos fios.", custo: 21, preco: 49, estoque_atual: 12, estoque_minimo: 4 },
  { nome: "Balm para Barba 50ml", sku: "NN-BALM-50", categoria: "Barba", descricao: "Hidrata, reduz o frizz e deixa a barba macia e perfumada.", custo: 22, preco: 52, estoque_atual: 16, estoque_minimo: 5 },
  { nome: "Óleo para Barba 30ml", sku: "NN-OLEO-30", categoria: "Barba", descricao: "Nutrição diária com toque seco e fragrância amadeirada.", custo: 20, preco: 48, estoque_atual: 20, estoque_minimo: 6 },
  { nome: "Shampoo 3 em 1 240ml", sku: "NN-SHAMPOO-3X1", categoria: "Cuidados", descricao: "Limpeza prática para cabelo, barba e corpo.", custo: 16, preco: 39, estoque_atual: 24, estoque_minimo: 8 },
  { nome: "Shampoo para Barba 140ml", sku: "NN-SHAMPOO-BARBA", categoria: "Barba", descricao: "Limpeza suave que preserva a hidratação natural dos fios.", custo: 19, preco: 45, estoque_atual: 15, estoque_minimo: 5 },
  { nome: "Condicionador de Barba 140ml", sku: "NN-COND-BARBA", categoria: "Barba", descricao: "Maciez, controle e desembaraço para barbas médias e longas.", custo: 18, preco: 44, estoque_atual: 13, estoque_minimo: 5 },
  { nome: "Tônico Capilar 100ml", sku: "NN-TONICO-100", categoria: "Tratamentos", descricao: "Sensação refrescante e cuidado diário do couro cabeludo.", custo: 24, preco: 59, estoque_atual: 10, estoque_minimo: 4 },
  { nome: "Pós-Barba Mentolado 120ml", sku: "NN-POSBARBA-120", categoria: "Barba", descricao: "Acalma a pele e prolonga a sensação de frescor após o barbear.", custo: 19, preco: 46, estoque_atual: 17, estoque_minimo: 5 },
  { nome: "Pente de Madeira Antiestático", sku: "NN-PENTE-MADEIRA", categoria: "Acessórios", descricao: "Pente compacto para cabelo e barba, sem eletricidade estática.", custo: 10, preco: 29, estoque_atual: 22, estoque_minimo: 6 },
  { nome: "Escova de Barba Premium", sku: "NN-ESCOVA-BARBA", categoria: "Acessórios", descricao: "Cerdas firmes para alinhar os fios e distribuir balm ou óleo.", custo: 15, preco: 39, estoque_atual: 11, estoque_minimo: 4 },
];

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
    "barbearia_produtos",
    "barbearia_servicos",
    "barbearia_barbeiros",
  ];

  for (const table of tables) {
    const { error } = await supabaseAdmin.from(table).delete().eq("barbearia_id", barbeariaId);
    if (error) throw error;
  }
}

async function seedDemoOperationalData(barbearia) {
  const { data: barbeiros, error: barbeirosError } = await supabaseAdmin
    .from("barbearia_barbeiros")
    .insert(DEMO_BARBERS.map((item) => ({
      ...item,
      barbearia_id: barbearia.id,
      publicado_site: true,
      ativo: true,
    })))
    .select("id, nome");
  if (barbeirosError) throw barbeirosError;

  const { data: servicos, error: servicosError } = await supabaseAdmin
    .from("barbearia_servicos")
    .insert(DEMO_SERVICES.map((item, index) => ({
      ...item,
      barbearia_id: barbearia.id,
      ordem_site: index + 1,
      publicado_site: true,
      ativo: true,
      instrucoes_pre_atendimento: "Chegue com cinco minutos de antecedência para confirmar suas preferências.",
      instrucoes_pos_atendimento: "Siga as orientações do barbeiro e use produtos adequados para manter o resultado.",
    })))
    .select("id, nome");
  if (servicosError) throw servicosError;

  const serviceByName = new Map(servicos.map((item) => [item.nome, item.id]));
  const { data: pacotes, error: pacotesError } = await supabaseAdmin
    .from("barbearia_pacotes")
    .insert(DEMO_PACKAGES.map(({ servicos: _servicos, ...item }) => ({
      ...item,
      barbearia_id: barbearia.id,
      publicado_site: true,
      ativo: true,
    })))
    .select("id, nome");
  if (pacotesError) throw pacotesError;

  const packageByName = new Map(pacotes.map((item) => [item.nome, item.id]));
  const packageServices = DEMO_PACKAGES.flatMap((pacote) => pacote.servicos.map((servico) => ({
    barbearia_id: barbearia.id,
    pacote_id: packageByName.get(pacote.nome),
    servico_id: serviceByName.get(servico.nome),
    quantidade: servico.quantidade,
  })));
  if (packageServices.some((item) => !item.pacote_id || !item.servico_id)) {
    throw new Error("Não foi possível vincular todos os planos demo aos serviços.");
  }

  const { error: packageServicesError } = await supabaseAdmin
    .from("barbearia_pacote_servicos")
    .insert(packageServices);
  if (packageServicesError) throw packageServicesError;

  const { error: produtosError } = await supabaseAdmin
    .from("barbearia_produtos")
    .insert(DEMO_PRODUCTS.map((item) => ({
      ...item,
      barbearia_id: barbearia.id,
      unidade: "un",
      publicado_site: true,
      ativo: true,
    })));
  if (produtosError) throw produtosError;

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
  const fim = new Date(inicio.getTime() + 75 * 60 * 1000);
  const agendaService = servicos.find((item) => item.nome === "Corte + Barba") || servicos[0];
  const { error: agendaError } = await supabaseAdmin.from("barbearia_agendamentos").insert({
    barbearia_id: barbearia.id,
    cliente_id: cliente.id,
    barbeiro_id: barbeiros[0].id,
    servico_id: agendaService.id,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    status: "confirmado",
    origem: "painel",
    valor_tabela: 105,
    desconto: 6,
    valor_final: 99,
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
