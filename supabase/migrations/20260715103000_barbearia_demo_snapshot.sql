-- Congela o estado atual da barbearia demo e permite restaura-lo de forma atomica.
-- O snapshot fica protegido por RLS e so pode ser manipulado com service_role.

create table if not exists public.barbearia_demo_snapshots (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null unique references public.barbearias(id) on delete cascade,
  snapshot jsonb not null,
  versao integer not null default 1,
  congelado_em timestamptz not null default now(),
  restaurado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.barbearia_demo_snapshots enable row level security;
revoke all on public.barbearia_demo_snapshots from public, anon, authenticated;
grant all privileges on public.barbearia_demo_snapshots to service_role;

create or replace function public.capture_barbearia_demo_snapshot(p_barbearia_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_rows jsonb;
  v_table text;
  v_tables text[] := array[
    'barbearia_clientes',
    'barbearia_barbeiros',
    'barbearia_servicos',
    'barbearia_pacotes',
    'barbearia_pacote_servicos',
    'barbearia_cliente_pacotes',
    'barbearia_produtos',
    'barbearia_agendamentos',
    'barbearia_comandas',
    'barbearia_comanda_itens',
    'barbearia_crm_oportunidades',
    'barbearia_dominios',
    'barbearia_integracoes',
    'barbearia_cliente_consentimentos',
    'barbearia_cliente_fotos',
    'barbearia_site_agendamentos_publicos',
    'barbearia_cupons',
    'barbearia_pedidos',
    'barbearia_pedido_itens',
    'barbearia_estoque_reservas',
    'barbearia_estoque_movimentos',
    'barbearia_carrinhos_abandonados',
    'barbearia_pagamentos'
  ];
begin
  if p_barbearia_id is null then
    raise exception 'Barbearia demo nao informada.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('barbearia-demo:' || p_barbearia_id::text, 0));

  if exists (
    select 1 from public.barbearia_demo_snapshots where barbearia_id = p_barbearia_id
  ) then
    return false;
  end if;

  select jsonb_build_object('barbearias', to_jsonb(b))
    into v_snapshot
  from public.barbearias b
  where b.id = p_barbearia_id;

  if v_snapshot is null then
    raise exception 'Barbearia demo nao encontrada.';
  end if;

  foreach v_table in array v_tables loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(row_data)), ''[]''::jsonb) from public.%I row_data where barbearia_id = $1',
      v_table
    ) using p_barbearia_id into v_rows;
    v_snapshot := jsonb_set(v_snapshot, array[v_table], coalesce(v_rows, '[]'::jsonb), true);
  end loop;

  insert into public.barbearia_demo_snapshots (barbearia_id, snapshot)
  values (p_barbearia_id, v_snapshot);

  return true;
end;
$$;

create or replace function public.restore_barbearia_demo_snapshot(p_barbearia_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_clinic public.barbearias%rowtype;
  v_table text;
  v_delete_order text[] := array[
    'barbearia_estoque_reservas',
    'barbearia_estoque_movimentos',
    'barbearia_pedido_itens',
    'barbearia_carrinhos_abandonados',
    'barbearia_pagamentos',
    'barbearia_pedidos',
    'barbearia_cupons',
    'barbearia_comanda_itens',
    'barbearia_comandas',
    'barbearia_site_agendamentos_publicos',
    'barbearia_agendamentos',
    'barbearia_cliente_pacotes',
    'barbearia_pacote_servicos',
    'barbearia_cliente_fotos',
    'barbearia_cliente_consentimentos',
    'barbearia_crm_oportunidades',
    'barbearia_produtos',
    'barbearia_pacotes',
    'barbearia_servicos',
    'barbearia_barbeiros',
    'barbearia_clientes',
    'barbearia_dominios',
    'barbearia_integracoes'
  ];
  v_insert_order text[] := array[
    'barbearia_clientes',
    'barbearia_barbeiros',
    'barbearia_servicos',
    'barbearia_pacotes',
    'barbearia_pacote_servicos',
    'barbearia_cliente_pacotes',
    'barbearia_produtos',
    'barbearia_agendamentos',
    'barbearia_comandas',
    'barbearia_comanda_itens',
    'barbearia_crm_oportunidades',
    'barbearia_dominios',
    'barbearia_integracoes',
    'barbearia_cliente_consentimentos',
    'barbearia_cliente_fotos',
    'barbearia_site_agendamentos_publicos',
    'barbearia_cupons',
    'barbearia_pedidos',
    'barbearia_pedido_itens',
    'barbearia_estoque_reservas',
    'barbearia_estoque_movimentos',
    'barbearia_carrinhos_abandonados',
    'barbearia_pagamentos'
  ];
begin
  if p_barbearia_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('barbearia-demo:' || p_barbearia_id::text, 0));

  select snapshot
    into v_snapshot
  from public.barbearia_demo_snapshots
  where barbearia_id = p_barbearia_id
  for update;

  if v_snapshot is null then
    return false;
  end if;

  select *
    into v_clinic
  from jsonb_populate_record(null::public.barbearias, v_snapshot -> 'barbearias');

  foreach v_table in array v_delete_order loop
    execute format('delete from public.%I where barbearia_id = $1', v_table)
      using p_barbearia_id;
  end loop;

  update public.barbearias
  set
    nome = v_clinic.nome,
    nome_fantasia = v_clinic.nome_fantasia,
    slug = v_clinic.slug,
    documento = v_clinic.documento,
    telefone = v_clinic.telefone,
    whatsapp = v_clinic.whatsapp,
    email = v_clinic.email,
    endereco = v_clinic.endereco,
    numero = v_clinic.numero,
    complemento = v_clinic.complemento,
    bairro = v_clinic.bairro,
    cidade = v_clinic.cidade,
    estado = v_clinic.estado,
    cep = v_clinic.cep,
    timezone = v_clinic.timezone,
    status = v_clinic.status,
    plano = v_clinic.plano,
    site_publicado = v_clinic.site_publicado,
    site_titulo = v_clinic.site_titulo,
    site_subtitulo = v_clinic.site_subtitulo,
    site_sobre = v_clinic.site_sobre,
    site_cta = v_clinic.site_cta,
    site_logo_url = v_clinic.site_logo_url,
    site_capa_url = v_clinic.site_capa_url,
    site_cor_primaria = v_clinic.site_cor_primaria,
    site_cor_destaque = v_clinic.site_cor_destaque,
    site_instagram_url = v_clinic.site_instagram_url,
    site_google_maps_url = v_clinic.site_google_maps_url,
    horario_funcionamento = v_clinic.horario_funcionamento,
    site_configuracoes = v_clinic.site_configuracoes,
    metadata = v_clinic.metadata,
    trial_ends_at = v_clinic.trial_ends_at,
    billing_email = v_clinic.billing_email,
    asaas_customer_id = v_clinic.asaas_customer_id,
    asaas_subscription_id = v_clinic.asaas_subscription_id,
    assinatura_status = v_clinic.assinatura_status,
    proxima_cobranca_em = v_clinic.proxima_cobranca_em,
    bloqueada_em = v_clinic.bloqueada_em,
    bloqueio_motivo = v_clinic.bloqueio_motivo
  where id = p_barbearia_id;

  foreach v_table in array v_insert_order loop
    execute format(
      'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)',
      v_table,
      v_table
    ) using coalesce(v_snapshot -> v_table, '[]'::jsonb);
  end loop;

  update public.barbearia_demo_snapshots
  set restaurado_em = now(), updated_at = now()
  where barbearia_id = p_barbearia_id;

  return true;
end;
$$;

revoke all on function public.capture_barbearia_demo_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.restore_barbearia_demo_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.capture_barbearia_demo_snapshot(uuid) to service_role;
grant execute on function public.restore_barbearia_demo_snapshot(uuid) to service_role;

comment on table public.barbearia_demo_snapshots is
  'Snapshot privado usado para restaurar a conta publica de demonstracao.';
