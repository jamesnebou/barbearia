-- Dados reproduziveis para desenvolvimento local da Barbearia.
-- Este arquivo e executado somente depois das migrations ativas.

insert into public.barbearias (
  id,
  nome,
  nome_fantasia,
  slug,
  documento,
  telefone,
  whatsapp,
  email,
  endereco,
  numero,
  bairro,
  cidade,
  estado,
  cep,
  timezone,
  status,
  plano,
  site_publicado,
  site_titulo,
  site_subtitulo,
  site_sobre,
  site_cta,
  site_cor_primaria,
  site_cor_destaque,
  site_instagram_url,
  site_google_maps_url,
  horario_funcionamento
)
values (
  '10000000-0000-4000-8000-000000000001',
  'Barbearia Demo NexaWi',
  'Navalha Nobre',
  'navalha-nobre-demo',
  '12.345.678/0001-90',
  '5571999990000',
  '5571999990000',
  'contato@navalhanobre.local',
  'Avenida Sete de Setembro',
  '100',
  'Centro',
  'Salvador',
  'BA',
  '40000-000',
  'America/Bahia',
  'ativa',
  'growth',
  true,
  'Seu estilo. Sua presenca.',
  'Cortes precisos, barba alinhada e atendimento com hora marcada.',
  'Uma barbearia contemporanea para quem trata imagem como assinatura pessoal.',
  'Agende seu horario',
  '#111111',
  '#D4A853',
  'https://instagram.com/',
  'https://maps.google.com/',
  '{
    "segunda":"09:00 - 19:00",
    "terca":"09:00 - 19:00",
    "quarta":"09:00 - 19:00",
    "quinta":"09:00 - 20:00",
    "sexta":"09:00 - 20:00",
    "sabado":"08:00 - 18:00",
    "domingo":"Fechado"
  }'::jsonb
);

insert into public.barbearia_usuarios (
  id,
  barbearia_id,
  nome,
  email,
  papel,
  ativo,
  permissoes,
  convidado_em,
  aceito_em
)
values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Proprietario Demo',
  'demo@barbearia.local',
  'owner',
  true,
  '{"acesso_total":true}'::jsonb,
  now(),
  now()
);

insert into public.barbearia_barbeiros (
  id,
  barbearia_id,
  nome,
  apelido,
  telefone,
  email,
  bio,
  especialidades,
  comissao_servico_percentual,
  comissao_produto_percentual,
  ordem_site,
  publicado_site,
  ativo
)
values
  (
    '12000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Rafael Santos',
    'Rafa',
    '5571999990001',
    'rafa@barbearia.local',
    'Especialista em degradê, cortes modernos e acabamento com navalha.',
    array['Degrade', 'Corte masculino', 'Navalha'],
    40,
    10,
    1,
    true,
    true
  ),
  (
    '12000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Lucas Oliveira',
    'Lucca',
    '5571999990002',
    'lucca@barbearia.local',
    'Barbeiro clássico com foco em barba, tesoura e visagismo masculino.',
    array['Barba', 'Tesoura', 'Visagismo'],
    40,
    10,
    2,
    true,
    true
  );

insert into public.barbearia_servicos (
  id,
  barbearia_id,
  nome,
  categoria,
  descricao,
  duracao_minutos,
  intervalo_minutos,
  preco,
  preco_promocional,
  ordem_site,
  destaque_site,
  publicado_site,
  ativo
)
values
  ('13000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Corte assinatura', 'Cabelo', 'Corte personalizado com acabamento e finalização.', 45, 10, 65, null, 1, true, true, true),
  ('13000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Barba premium', 'Barba', 'Desenho, toalha quente, navalha e hidratação.', 35, 10, 50, null, 2, true, true, true),
  ('13000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Corte e barba', 'Combo', 'Experiencia completa de cabelo e barba.', 75, 15, 105, 95, 3, true, true, true),
  ('13000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Corte infantil', 'Cabelo', 'Atendimento cuidadoso para crianças de até 12 anos.', 40, 10, 55, null, 4, false, true, true),
  ('13000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Acabamento', 'Manutencao', 'Pezinho, contornos e acabamento rápido.', 20, 5, 30, null, 5, false, true, true);

insert into public.barbearia_pacotes (
  id,
  barbearia_id,
  nome,
  descricao,
  preco,
  validade_dias,
  limite_utilizacoes,
  publicado_site,
  ativo
)
values (
  '14000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Clube Navalha Nobre',
  'Quatro cortes assinatura para usar em até 60 dias.',
  220,
  60,
  4,
  true,
  true
);

insert into public.barbearia_pacote_servicos (
  id,
  barbearia_id,
  pacote_id,
  servico_id,
  quantidade
)
values (
  '14100000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000001',
  4
);

insert into public.barbearia_produtos (
  id,
  barbearia_id,
  nome,
  sku,
  categoria,
  descricao,
  custo,
  preco,
  estoque_atual,
  estoque_minimo,
  unidade,
  publicado_site,
  ativo
)
values
  ('15000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Pomada modeladora matte', 'POM-MAT-100', 'Finalizacao', 'Fixação média com efeito seco.', 22, 49.90, 18, 5, 'un', true, true),
  ('15000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Óleo para barba', 'OLE-BAR-030', 'Barba', 'Hidratação e fragrância amadeirada.', 18, 42.90, 12, 4, 'un', true, true),
  ('15000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Shampoo masculino', 'SHA-MAS-250', 'Cuidados', 'Limpeza equilibrada para uso diário.', 20, 44.90, 10, 3, 'un', false, true);

insert into public.barbearia_clientes (
  id,
  barbearia_id,
  nome,
  telefone,
  telefone_normalizado,
  email,
  data_nascimento,
  origem,
  status,
  preferencias,
  observacoes,
  consentimento_lgpd,
  consentimento_lgpd_em,
  consentimento_lgpd_versao
)
values
  ('16000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Carlos Almeida', '(71) 98888-1001', '71988881001', 'carlos@demo.local', date '1990-05-12', 'site', 'ativo', 'Degradê baixo e acabamento discreto.', 'Cliente demo com recorrência mensal.', true, now() - interval '30 days', 'site-barbearia-v1'),
  ('16000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Bruno Nascimento', '(71) 98888-1002', '71988881002', 'bruno@demo.local', date '1985-11-03', 'indicacao', 'lead', 'Barba desenhada.', 'Lead interessado no combo.', true, now() - interval '2 days', 'site-barbearia-v1');

insert into public.barbearia_cliente_pacotes (
  id,
  barbearia_id,
  cliente_id,
  pacote_id,
  adquirido_em,
  valido_ate,
  utilizacoes_total,
  utilizacoes_consumidas,
  status
)
values (
  '14200000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '16000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000001',
  now() - interval '10 days',
  current_date + 50,
  4,
  1,
  'ativo'
);

insert into public.barbearia_agendamentos (
  id,
  barbearia_id,
  cliente_id,
  barbeiro_id,
  servico_id,
  inicio,
  fim,
  status,
  origem,
  valor_tabela,
  desconto,
  valor_final,
  pagamento_status,
  observacoes
)
values (
  '17000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '16000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000001',
  date_trunc('day', now()) + interval '1 day 13 hours',
  date_trunc('day', now()) + interval '1 day 13 hours 55 minutes',
  'confirmado',
  'site',
  65,
  0,
  65,
  'pendente',
  'Agendamento criado pelo seed local.'
);

insert into public.barbearia_comandas (
  id,
  barbearia_id,
  cliente_id,
  barbeiro_id,
  status,
  subtotal,
  desconto,
  acrescimo,
  total,
  observacoes
)
values (
  '18000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '16000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002',
  'aberta',
  92.80,
  0,
  0,
  92.80,
  'Comanda demo com serviço e produto.'
);

insert into public.barbearia_comanda_itens (
  id,
  barbearia_id,
  comanda_id,
  tipo,
  servico_id,
  produto_id,
  barbeiro_id,
  descricao,
  quantidade,
  valor_unitario,
  desconto,
  total
)
values
  ('18100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '18000000-0000-4000-8000-000000000001', 'servico', '13000000-0000-4000-8000-000000000002', null, '12000000-0000-4000-8000-000000000002', 'Barba premium', 1, 50, 0, 50),
  ('18100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '18000000-0000-4000-8000-000000000001', 'produto', null, '15000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', 'Óleo para barba', 1, 42.90, 0, 42.90);

insert into public.barbearia_pagamentos (
  id,
  barbearia_id,
  cliente_id,
  comanda_id,
  valor,
  forma,
  status,
  parcelas,
  provedor,
  observacoes
)
values (
  '19000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '16000000-0000-4000-8000-000000000001',
  '18000000-0000-4000-8000-000000000001',
  92.80,
  'pix',
  'pendente',
  1,
  'manual',
  'Pagamento demo ainda não confirmado.'
);

insert into public.barbearia_crm_oportunidades (
  id,
  barbearia_id,
  cliente_id,
  nome,
  telefone,
  email,
  origem,
  status,
  valor_estimado,
  proxima_acao_em,
  proxima_acao,
  observacoes
)
values
  ('1a000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000002', 'Bruno Nascimento', '(71) 98888-1002', 'bruno@demo.local', 'indicacao', 'agendamento_marcado', 95, now() + interval '1 day', 'Confirmar combo pelo WhatsApp.', 'Oportunidade criada pelo seed local.'),
  ('1a000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', null, 'Daniel Souza', '(71) 98888-1003', null, 'instagram', 'lead', 220, now() + interval '2 days', 'Apresentar o Clube Navalha Nobre.', 'Lead ainda sem cadastro de cliente.');

insert into public.barbearia_dominios (
  id,
  barbearia_id,
  dominio,
  status,
  observacoes
)
values (
  '1b000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'navalha-nobre.localhost',
  'pendente',
  'Dominio reservado apenas para desenvolvimento local.'
);

insert into public.barbearia_integracoes (
  id,
  barbearia_id,
  provedor,
  nome,
  ativo,
  ambiente,
  configuracao_publica
)
values (
  '1c000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'asaas',
  'Asaas local desativado',
  false,
  'sandbox',
  '{"mensagem":"Configure credenciais criptografadas antes de ativar."}'::jsonb
);
