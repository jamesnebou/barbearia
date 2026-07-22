begin;

create table if not exists public.barbearia_marketing_leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  email text,
  barbearia_nome text,
  barbeiros_qtd integer not null default 1 check (barbeiros_qtd between 1 and 100),
  agendamentos_mes integer check (agendamentos_mes is null or agendamentos_mes >= 0),
  plano_interesse text not null default 'nao_sei' check (plano_interesse in ('starter', 'growth', 'premium', 'nao_sei')),
  origem text not null default 'site',
  status text not null default 'novo' check (status in ('novo', 'contatado', 'qualificado', 'convertido', 'perdido')),
  observacoes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  session_id text,
  pagina text,
  referrer text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barbearia_marketing_leads_status_idx on public.barbearia_marketing_leads (status, created_at desc);
create index if not exists barbearia_marketing_leads_whatsapp_idx on public.barbearia_marketing_leads (whatsapp);
create index if not exists barbearia_marketing_leads_campaign_idx on public.barbearia_marketing_leads (utm_campaign, created_at desc);
create index if not exists barbearia_marketing_leads_ip_idx on public.barbearia_marketing_leads (ip_hash, created_at desc);

drop trigger if exists set_updated_at_barbearia_marketing_leads on public.barbearia_marketing_leads;
create trigger set_updated_at_barbearia_marketing_leads
before update on public.barbearia_marketing_leads
for each row execute function app_private.set_barbearia_updated_at();

create table if not exists public.barbearia_marketing_eventos (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  session_id text,
  lead_id uuid references public.barbearia_marketing_leads(id) on delete set null,
  pagina text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists barbearia_marketing_eventos_name_idx on public.barbearia_marketing_eventos (event_name, created_at desc);
create index if not exists barbearia_marketing_eventos_session_idx on public.barbearia_marketing_eventos (session_id, created_at);
create index if not exists barbearia_marketing_eventos_campaign_idx on public.barbearia_marketing_eventos (utm_campaign, created_at desc);

alter table public.barbearia_marketing_leads enable row level security;
alter table public.barbearia_marketing_eventos enable row level security;
revoke all on public.barbearia_marketing_leads from anon, authenticated;
revoke all on public.barbearia_marketing_eventos from anon, authenticated;
grant all on public.barbearia_marketing_leads to service_role;
grant all on public.barbearia_marketing_eventos to service_role;

update public.barbearia_planos_sistema
set descricao = case slug
  when 'starter' then 'Operação individual em validação.'
  when 'premium' then 'Operação com equipe ampliada.'
  else descricao
end,
updated_at = now()
where (slug = 'starter' and descricao = 'Operacao individual em validacao.')
   or (slug = 'premium' and descricao = 'Operacao com equipe ampliada.');

create or replace function public.rebase_barbearia_demo_timeline(p_barbearia_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.barbearias where id = p_barbearia_id and slug = 'navalha-nobre-demo') then
    return false;
  end if;

  with slots(id, offset_days, start_at, duration_minutes) as (
    values
      ('22000000-0000-4000-8000-000000000001'::uuid, -6, '09:00'::time, 75),
      ('22000000-0000-4000-8000-000000000002'::uuid, -5, '10:30'::time, 35),
      ('22000000-0000-4000-8000-000000000003'::uuid, -4, '14:00'::time, 50),
      ('22000000-0000-4000-8000-000000000004'::uuid, -3, '09:30'::time, 45),
      ('22000000-0000-4000-8000-000000000005'::uuid, -2, '11:00'::time, 50),
      ('22000000-0000-4000-8000-000000000006'::uuid, -1, '15:00'::time, 75),
      ('22000000-0000-4000-8000-000000000007'::uuid,  0, '09:00'::time, 45),
      ('22000000-0000-4000-8000-000000000008'::uuid,  0, '10:00'::time, 35),
      ('22000000-0000-4000-8000-000000000009'::uuid,  0, '11:00'::time, 50),
      ('22000000-0000-4000-8000-000000000010'::uuid,  0, '14:00'::time, 75),
      ('22000000-0000-4000-8000-000000000011'::uuid,  0, '15:30'::time, 45),
      ('22000000-0000-4000-8000-000000000012'::uuid,  1, '09:00'::time, 50),
      ('22000000-0000-4000-8000-000000000013'::uuid,  1, '11:00'::time, 35),
      ('22000000-0000-4000-8000-000000000014'::uuid,  2, '14:00'::time, 75)
  ), resolved as (
    select id, (((current_date + offset_days) + start_at) at time zone 'America/Bahia') as inicio, duration_minutes
    from slots
  )
  update public.barbearia_agendamentos a
  set inicio = r.inicio,
      fim = r.inicio + make_interval(mins => r.duration_minutes),
      created_at = least(now() - interval '30 minutes', r.inicio - interval '2 days'),
      updated_at = now()
  from resolved r
  where a.id = r.id and a.barbearia_id = p_barbearia_id;

  update public.barbearia_pagamentos p
  set pago_em = a.inicio + interval '5 minutes',
      vencimento_em = a.inicio,
      created_at = a.inicio + interval '5 minutes',
      updated_at = now()
  from public.barbearia_agendamentos a
  where p.agendamento_id = a.id and p.barbearia_id = p_barbearia_id;

  update public.barbearia_crm_oportunidades
  set proxima_acao_em = case status
    when 'lead' then now() + interval '2 hours'
    when 'contato_realizado' then now() + interval '1 day'
    when 'em_negociacao' then now() + interval '2 days'
    when 'agendamento_marcado' then now() + interval '1 day'
    else proxima_acao_em end,
    convertido_em = case when status = 'convertido' then now() - interval '3 days' else null end,
    updated_at = now()
  where barbearia_id = p_barbearia_id;

  update public.barbearia_clientes c
  set ultima_visita_em = visits.last_visit,
      updated_at = now()
  from (
    select cliente_id, max(fim) as last_visit
    from public.barbearia_agendamentos
    where barbearia_id = p_barbearia_id and status = 'concluido'
    group by cliente_id
  ) visits
  where c.id = visits.cliente_id and c.barbearia_id = p_barbearia_id;

  return true;
end;
$$;

revoke all on function public.rebase_barbearia_demo_timeline(uuid) from public, anon, authenticated;
grant execute on function public.rebase_barbearia_demo_timeline(uuid) to service_role;

do $demo$
declare
  v_demo_id uuid := '10000000-0000-4000-8000-000000000001';
  v_client_ids uuid[] := array[
    '62a1e0a0-727c-4ee5-9ea4-b4cd371f03f6'::uuid,
    'a73c6ce1-6c04-4b03-9722-a2b2b7d09e7e'::uuid,
    '21000000-0000-4000-8000-000000000003'::uuid,
    '21000000-0000-4000-8000-000000000004'::uuid,
    '21000000-0000-4000-8000-000000000005'::uuid,
    '21000000-0000-4000-8000-000000000006'::uuid,
    '21000000-0000-4000-8000-000000000007'::uuid,
    '21000000-0000-4000-8000-000000000008'::uuid,
    '21000000-0000-4000-8000-000000000009'::uuid,
    '21000000-0000-4000-8000-000000000010'::uuid,
    '21000000-0000-4000-8000-000000000011'::uuid,
    '21000000-0000-4000-8000-000000000012'::uuid
  ];
  v_rafa uuid;
  v_lucas uuid;
  v_diego uuid;
  v_corte uuid;
  v_barba uuid;
  v_degrade uuid;
  v_combo uuid;
begin
  if not exists (select 1 from public.barbearias where id = v_demo_id and slug = 'navalha-nobre-demo') then
    raise notice 'Barbearia demo não encontrada; enriquecimento ignorado.';
    return;
  end if;

  perform public.restore_barbearia_demo_snapshot(v_demo_id);

  select id into v_rafa from public.barbearia_barbeiros where barbearia_id = v_demo_id and nome = 'Rafael Santos' limit 1;
  select id into v_lucas from public.barbearia_barbeiros where barbearia_id = v_demo_id and nome = 'Lucas Oliveira' limit 1;
  select id into v_diego from public.barbearia_barbeiros where barbearia_id = v_demo_id and nome = 'Diego Nascimento' limit 1;
  select id into v_corte from public.barbearia_servicos where barbearia_id = v_demo_id and nome = 'Corte Clássico' limit 1;
  select id into v_barba from public.barbearia_servicos where barbearia_id = v_demo_id and nome = 'Barba Premium' limit 1;
  select id into v_degrade from public.barbearia_servicos where barbearia_id = v_demo_id and nome = 'Degradê Navalhado' limit 1;
  select id into v_combo from public.barbearia_servicos where barbearia_id = v_demo_id and nome = 'Corte + Barba' limit 1;

  if v_rafa is null or v_lucas is null or v_diego is null or v_corte is null or v_barba is null or v_degrade is null or v_combo is null then
    raise exception 'Dados essenciais da demonstração não foram encontrados.';
  end if;

  update public.barbearias
  set nome = 'Navalha Nobre',
      nome_fantasia = 'Navalha Nobre',
      telefone = '5577988656394',
      whatsapp = '5577988656394',
      site_sobre = 'Uma barbearia contemporânea para quem trata imagem, experiência e pontualidade como parte da própria assinatura.',
      metadata = jsonb_set(
        coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'brand_name', 'Navalha Nobre',
          'horario_funcionamento', '{"inicio":"08:00","fim":"19:00","dias":["1","2","3","4","5","6"],"dias_config":{"0":{"ativo":false,"periodos":[]},"1":{"ativo":true,"periodos":[{"inicio":"08:00","fim":"19:00"}]},"2":{"ativo":true,"periodos":[{"inicio":"08:00","fim":"19:00"}]},"3":{"ativo":true,"periodos":[{"inicio":"08:00","fim":"19:00"}]},"4":{"ativo":true,"periodos":[{"inicio":"08:00","fim":"19:00"}]},"5":{"ativo":true,"periodos":[{"inicio":"08:00","fim":"19:00"}]},"6":{"ativo":true,"periodos":[{"inicio":"08:00","fim":"18:00"}]}}}'::jsonb
        ),
        '{site_publico}',
        coalesce(metadata -> 'site_publico', '{}'::jsonb) || jsonb_build_object(
          'nome_profissional', 'Equipe Navalha Nobre',
          'bio_profissional', 'Três especialistas, técnicas complementares e o mesmo padrão de cuidado em cada atendimento.',
          'lojinha_ativa', true,
          'publicado', true
        ),
        true
      ),
      updated_at = now()
  where id = v_demo_id;

  insert into public.barbearia_clientes (id, barbearia_id, nome, telefone, telefone_normalizado, email, origem, status, preferencias, consentimento_lgpd, consentimento_lgpd_em, consentimento_lgpd_versao, created_at, updated_at)
  values
    (v_client_ids[3], v_demo_id, 'André Costa', '(71) 98888-1002', '71988881002', 'andre@demo.local', 'instagram', 'ativo', 'Corte executivo, laterais baixas.', true, now() - interval '70 days', 'demo-v1', now() - interval '70 days', now()),
    (v_client_ids[4], v_demo_id, 'Bruno Lima', '(71) 98888-1003', '71988881003', 'bruno@demo.local', 'indicacao', 'ativo', 'Barba desenhada e toalha quente.', true, now() - interval '60 days', 'demo-v1', now() - interval '60 days', now()),
    (v_client_ids[5], v_demo_id, 'Caio Martins', '(71) 98888-1004', '71988881004', 'caio@demo.local', 'google', 'ativo', 'Degradê médio e acabamento natural.', true, now() - interval '50 days', 'demo-v1', now() - interval '50 days', now()),
    (v_client_ids[6], v_demo_id, 'Daniel Souza', '(71) 98888-1005', '71988881005', 'daniel@demo.local', 'site', 'ativo', 'Corte e barba a cada quinze dias.', true, now() - interval '45 days', 'demo-v1', now() - interval '45 days', now()),
    (v_client_ids[7], v_demo_id, 'Eduardo Rocha', '(71) 98888-1006', '71988881006', 'eduardo@demo.local', 'whatsapp', 'ativo', 'Prefere atendimento no início da manhã.', true, now() - interval '35 days', 'demo-v1', now() - interval '35 days', now()),
    (v_client_ids[8], v_demo_id, 'Felipe Alves', '(71) 98888-1007', '71988881007', 'felipe@demo.local', 'instagram', 'ativo', 'Pomada matte e degradê alto.', true, now() - interval '30 days', 'demo-v1', now() - interval '30 days', now()),
    (v_client_ids[9], v_demo_id, 'Gabriel Melo', '(71) 98888-1008', '71988881008', 'gabriel@demo.local', 'indicacao', 'ativo', 'Corte clássico com tesoura.', true, now() - interval '25 days', 'demo-v1', now() - interval '25 days', now()),
    (v_client_ids[10], v_demo_id, 'Henrique Reis', '(71) 98888-1009', '71988881009', 'henrique@demo.local', 'site', 'ativo', 'Barba curta e contornos marcados.', true, now() - interval '20 days', 'demo-v1', now() - interval '20 days', now()),
    (v_client_ids[11], v_demo_id, 'Igor Nunes', '(71) 98888-1010', '71988881010', 'igor@demo.local', 'google', 'ativo', 'Corte mensal, prefere o Rafa.', true, now() - interval '15 days', 'demo-v1', now() - interval '15 days', now()),
    (v_client_ids[12], v_demo_id, 'João Vitor', '(71) 98888-1011', '71988881011', 'joao@demo.local', 'whatsapp', 'lead', 'Primeiro atendimento em negociação.', true, now() - interval '5 days', 'demo-v1', now() - interval '5 days', now())
  on conflict (id) do update set nome = excluded.nome, telefone = excluded.telefone, telefone_normalizado = excluded.telefone_normalizado, preferencias = excluded.preferencias, updated_at = now();

  delete from public.barbearia_pagamentos where barbearia_id = v_demo_id;
  delete from public.barbearia_agendamentos where barbearia_id = v_demo_id;
  delete from public.barbearia_crm_oportunidades where barbearia_id = v_demo_id;

  insert into public.barbearia_agendamentos (id, barbearia_id, cliente_id, barbeiro_id, servico_id, inicio, fim, status, origem, valor_tabela, desconto, valor_final, pagamento_status, observacoes)
  values
    ('22000000-0000-4000-8000-000000000001', v_demo_id, v_client_ids[1], v_rafa, v_combo, now(), now() + interval '75 minutes', 'concluido', 'site', 105, 6, 99, 'pago', 'Atendimento demonstrativo concluído.'),
    ('22000000-0000-4000-8000-000000000002', v_demo_id, v_client_ids[3], v_lucas, v_barba, now(), now() + interval '35 minutes', 'concluido', 'whatsapp', 45, 0, 45, 'pago', 'Atendimento demonstrativo concluído.'),
    ('22000000-0000-4000-8000-000000000003', v_demo_id, v_client_ids[4], v_diego, v_degrade, now(), now() + interval '50 minutes', 'concluido', 'painel', 70, 0, 70, 'pago', 'Atendimento demonstrativo concluído.'),
    ('22000000-0000-4000-8000-000000000004', v_demo_id, v_client_ids[5], v_lucas, v_corte, now(), now() + interval '45 minutes', 'concluido', 'site', 55, 0, 55, 'pago', 'Atendimento demonstrativo concluído.'),
    ('22000000-0000-4000-8000-000000000005', v_demo_id, v_client_ids[6], v_rafa, v_degrade, now(), now() + interval '50 minutes', 'concluido', 'outro', 70, 0, 70, 'pago', 'Atendimento demonstrativo concluído.'),
    ('22000000-0000-4000-8000-000000000006', v_demo_id, v_client_ids[7], v_lucas, v_combo, now(), now() + interval '75 minutes', 'concluido', 'site', 105, 6, 99, 'pago', 'Atendimento demonstrativo concluído.'),
    ('22000000-0000-4000-8000-000000000007', v_demo_id, v_client_ids[8], v_rafa, v_corte, now() + interval '7 days', now() + interval '7 days 45 minutes', 'confirmado', 'site', 55, 0, 55, 'parcial', 'Sinal recebido pelo checkout.'),
    ('22000000-0000-4000-8000-000000000008', v_demo_id, v_client_ids[9], v_lucas, v_barba, now() + interval '8 days', now() + interval '8 days 35 minutes', 'confirmado', 'whatsapp', 45, 0, 45, 'pendente', null),
    ('22000000-0000-4000-8000-000000000009', v_demo_id, v_client_ids[10], v_diego, v_degrade, now() + interval '9 days', now() + interval '9 days 50 minutes', 'confirmado', 'site', 70, 0, 70, 'parcial', 'Sinal recebido pelo checkout.'),
    ('22000000-0000-4000-8000-000000000010', v_demo_id, v_client_ids[2], v_rafa, v_combo, now() + interval '10 days', now() + interval '10 days 75 minutes', 'confirmado', 'painel', 105, 6, 99, 'pendente', null),
    ('22000000-0000-4000-8000-000000000011', v_demo_id, v_client_ids[11], v_lucas, v_corte, now() + interval '11 days', now() + interval '11 days 45 minutes', 'agendado', 'telefone', 55, 0, 55, 'pendente', null),
    ('22000000-0000-4000-8000-000000000012', v_demo_id, v_client_ids[12], v_diego, v_degrade, now() + interval '12 days', now() + interval '12 days 50 minutes', 'solicitado', 'site', 70, 0, 70, 'pendente', 'Aguardando confirmação da barbearia.'),
    ('22000000-0000-4000-8000-000000000013', v_demo_id, v_client_ids[3], v_rafa, v_barba, now() + interval '13 days', now() + interval '13 days 35 minutes', 'confirmado', 'site', 45, 0, 45, 'parcial', 'Sinal recebido pelo checkout.'),
    ('22000000-0000-4000-8000-000000000014', v_demo_id, v_client_ids[4], v_lucas, v_combo, now() + interval '14 days', now() + interval '14 days 75 minutes', 'agendado', 'whatsapp', 105, 6, 99, 'pendente', null);

  insert into public.barbearia_pagamentos (id, barbearia_id, cliente_id, agendamento_id, valor, forma, status, provedor, provedor_pagamento_id, pago_em, payload, observacoes)
  select ('24000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, v_demo_id, a.cliente_id, a.id, a.valor_final,
    case when n in (2, 5) then 'cartao_debito' else 'pix' end, 'pago', 'demo', 'demo-payment-' || n, now(), '{"demo":true}'::jsonb, 'Pagamento fictício da demonstração.'
  from generate_series(1, 6) n
  join public.barbearia_agendamentos a on a.id = ('22000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;

  insert into public.barbearia_crm_oportunidades (id, barbearia_id, cliente_id, nome, telefone, email, origem, status, valor_estimado, proxima_acao_em, proxima_acao, observacoes, convertido_em)
  values
    ('23000000-0000-4000-8000-000000000001', v_demo_id, v_client_ids[12], 'João Vitor', '(71) 98888-1011', 'joao@demo.local', 'instagram', 'lead', 70, now() + interval '2 hours', 'Enviar opções de horário', 'Pediu valores pelo Instagram.', null),
    ('23000000-0000-4000-8000-000000000002', v_demo_id, null, 'Marcos Vinícius', '(71) 98888-1012', null, 'whatsapp', 'contato_realizado', 105, now() + interval '1 day', 'Confirmar preferência de barbeiro', 'Interessado em corte e barba.', null),
    ('23000000-0000-4000-8000-000000000003', v_demo_id, null, 'Paulo Sérgio', '(71) 98888-1013', 'paulo@demo.local', 'google', 'em_negociacao', 189, now() + interval '2 days', 'Apresentar Clube Corte Essencial', 'Cliente busca plano mensal.', null),
    ('23000000-0000-4000-8000-000000000004', v_demo_id, v_client_ids[8], 'Felipe Alves', '(71) 98888-1007', 'felipe@demo.local', 'site', 'agendamento_marcado', 55, now() + interval '1 day', 'Confirmar sinal', 'Reserva iniciada pelo site.', null),
    ('23000000-0000-4000-8000-000000000005', v_demo_id, v_client_ids[6], 'Daniel Souza', '(71) 98888-1005', 'daniel@demo.local', 'indicacao', 'convertido', 99, null, null, 'Conversão demonstrativa.', now() - interval '3 days'),
    ('23000000-0000-4000-8000-000000000006', v_demo_id, null, 'Ricardo Lopes', '(71) 98888-1014', null, 'trafego_pago', 'perdido', 70, null, null, 'Sem disponibilidade no horário solicitado.', null);

  delete from public.barbearia_demo_snapshots where barbearia_id = v_demo_id;
  perform public.capture_barbearia_demo_snapshot(v_demo_id);
  update public.barbearia_demo_snapshots set versao = 3, congelado_em = now() where barbearia_id = v_demo_id;
  perform public.rebase_barbearia_demo_timeline(v_demo_id);
end;
$demo$;

commit;
