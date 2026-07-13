-- Estrutura inicial e independente do SaaS de barbearias.
-- Esta migration e totalmente isolada dos schemas legados do repositorio.

create schema if not exists app_private;
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table public.barbearias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_fantasia text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  documento text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text check (estado is null or char_length(estado) = 2),
  cep text,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'trial' check (status in ('trial', 'ativa', 'inativa', 'bloqueada', 'cancelada')),
  plano text not null default 'starter',
  site_publicado boolean not null default false,
  site_titulo text,
  site_subtitulo text,
  site_sobre text,
  site_cta text not null default 'Agende seu horario',
  site_logo_url text,
  site_capa_url text,
  site_cor_primaria text not null default '#111111' check (site_cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  site_cor_destaque text not null default '#D4A853' check (site_cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  site_instagram_url text,
  site_google_maps_url text,
  horario_funcionamento jsonb not null default '{}'::jsonb,
  site_configuracoes jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index barbearias_documento_unique
  on public.barbearias (regexp_replace(documento, '\\D', '', 'g'))
  where documento is not null and documento <> '';
create index barbearias_status_idx on public.barbearias (status);

create table public.barbearia_usuarios (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nome text,
  email text not null,
  papel text not null default 'recepcao' check (papel in ('owner', 'gerente', 'recepcao', 'barbeiro', 'financeiro')),
  ativo boolean not null default true,
  permissoes jsonb not null default '{}'::jsonb,
  convidado_em timestamptz,
  aceito_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  unique (barbearia_id, email),
  unique (barbearia_id, user_id)
);

create index barbearia_usuarios_user_idx on public.barbearia_usuarios (user_id);
create index barbearia_usuarios_email_idx on public.barbearia_usuarios (lower(email));

create table public.barbearia_clientes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null,
  telefone text,
  telefone_normalizado text,
  email text,
  cpf text,
  data_nascimento date,
  endereco text,
  bairro text,
  cidade text,
  origem text not null default 'cadastro' check (origem in ('cadastro', 'site', 'whatsapp', 'instagram', 'google', 'indicacao', 'importacao', 'outro')),
  status text not null default 'ativo' check (status in ('lead', 'ativo', 'inativo', 'bloqueado')),
  preferencias text,
  observacoes text,
  consentimento_lgpd boolean not null default false,
  consentimento_lgpd_em timestamptz,
  consentimento_lgpd_ip inet,
  consentimento_lgpd_versao text,
  ultima_visita_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id)
);

create index barbearia_clientes_nome_idx on public.barbearia_clientes (barbearia_id, nome);
create index barbearia_clientes_telefone_idx on public.barbearia_clientes (barbearia_id, telefone_normalizado);
create index barbearia_clientes_email_idx on public.barbearia_clientes (barbearia_id, lower(email));

create table public.barbearia_barbeiros (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  usuario_id uuid,
  nome text not null,
  apelido text,
  telefone text,
  email text,
  bio text,
  especialidades text[] not null default '{}'::text[],
  foto_url text,
  comissao_servico_percentual numeric(5,2) not null default 0 check (comissao_servico_percentual between 0 and 100),
  comissao_produto_percentual numeric(5,2) not null default 0 check (comissao_produto_percentual between 0 and 100),
  ordem_site integer not null default 0,
  publicado_site boolean not null default true,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  unique (barbearia_id, usuario_id),
  foreign key (barbearia_id, usuario_id)
    references public.barbearia_usuarios(barbearia_id, id) on delete restrict
);

create index barbearia_barbeiros_nome_idx on public.barbearia_barbeiros (barbearia_id, nome);

create table public.barbearia_servicos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null,
  categoria text,
  descricao text,
  duracao_minutos integer not null default 30 check (duracao_minutos > 0),
  intervalo_minutos integer not null default 0 check (intervalo_minutos >= 0),
  preco numeric(12,2) not null default 0 check (preco >= 0),
  preco_promocional numeric(12,2) check (preco_promocional is null or preco_promocional >= 0),
  sinal_percentual numeric(5,2) not null default 0 check (sinal_percentual between 0 and 100),
  sinal_valor numeric(12,2) not null default 0 check (sinal_valor >= 0),
  imagem_url text,
  ordem_site integer not null default 0,
  destaque_site boolean not null default false,
  publicado_site boolean not null default true,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id)
);

create index barbearia_servicos_nome_idx on public.barbearia_servicos (barbearia_id, nome);
create index barbearia_servicos_site_idx on public.barbearia_servicos (barbearia_id, publicado_site, ativo, ordem_site);

create table public.barbearia_pacotes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null default 0 check (preco >= 0),
  validade_dias integer check (validade_dias is null or validade_dias > 0),
  limite_utilizacoes integer check (limite_utilizacoes is null or limite_utilizacoes > 0),
  recorrente boolean not null default false,
  publicado_site boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id)
);

create table public.barbearia_pacote_servicos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  pacote_id uuid not null,
  servico_id uuid not null,
  quantidade integer not null default 1 check (quantidade > 0),
  created_at timestamptz not null default now(),
  unique (pacote_id, servico_id),
  foreign key (barbearia_id, pacote_id)
    references public.barbearia_pacotes(barbearia_id, id) on delete cascade,
  foreign key (barbearia_id, servico_id)
    references public.barbearia_servicos(barbearia_id, id) on delete cascade
);

create table public.barbearia_cliente_pacotes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid not null,
  pacote_id uuid not null,
  adquirido_em timestamptz not null default now(),
  valido_ate date,
  utilizacoes_total integer,
  utilizacoes_consumidas integer not null default 0 check (utilizacoes_consumidas >= 0),
  status text not null default 'ativo' check (status in ('ativo', 'consumido', 'expirado', 'cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  foreign key (barbearia_id, cliente_id)
    references public.barbearia_clientes(barbearia_id, id) on delete cascade,
  foreign key (barbearia_id, pacote_id)
    references public.barbearia_pacotes(barbearia_id, id) on delete restrict
);

create table public.barbearia_produtos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  nome text not null,
  sku text,
  codigo_barras text,
  categoria text,
  descricao text,
  custo numeric(12,2) not null default 0 check (custo >= 0),
  preco numeric(12,2) not null default 0 check (preco >= 0),
  estoque_atual numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  unidade text not null default 'un',
  imagem_url text,
  publicado_site boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  unique (barbearia_id, sku)
);

create index barbearia_produtos_nome_idx on public.barbearia_produtos (barbearia_id, nome);
create index barbearia_produtos_estoque_idx on public.barbearia_produtos (barbearia_id, ativo, estoque_atual);

create table public.barbearia_agendamentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid,
  barbeiro_id uuid not null,
  servico_id uuid not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'solicitado' check (status in ('solicitado', 'agendado', 'confirmado', 'em_atendimento', 'concluido', 'faltou', 'cancelado')),
  origem text not null default 'painel' check (origem in ('painel', 'site', 'whatsapp', 'telefone', 'encaixe', 'outro')),
  valor_tabela numeric(12,2) not null default 0 check (valor_tabela >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  valor_final numeric(12,2) not null default 0 check (valor_final >= 0),
  pagamento_status text not null default 'pendente' check (pagamento_status in ('pendente', 'parcial', 'pago', 'estornado', 'isento')),
  observacoes text,
  cancelado_em timestamptz,
  cancelado_motivo text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim > inicio),
  check (desconto <= valor_tabela),
  unique (barbearia_id, id),
  foreign key (barbearia_id, cliente_id)
    references public.barbearia_clientes(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, barbeiro_id)
    references public.barbearia_barbeiros(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, servico_id)
    references public.barbearia_servicos(barbearia_id, id) on delete restrict,
  exclude using gist (
    barbeiro_id with =,
    tstzrange(inicio, fim, '[)') with &&
  ) where (status in ('solicitado', 'agendado', 'confirmado', 'em_atendimento'))
);

create index barbearia_agendamentos_inicio_idx on public.barbearia_agendamentos (barbearia_id, inicio);
create index barbearia_agendamentos_cliente_idx on public.barbearia_agendamentos (barbearia_id, cliente_id, inicio desc);
create index barbearia_agendamentos_barbeiro_idx on public.barbearia_agendamentos (barbearia_id, barbeiro_id, inicio);

create table public.barbearia_comandas (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  numero bigint generated by default as identity,
  cliente_id uuid,
  barbeiro_id uuid,
  agendamento_id uuid,
  status text not null default 'aberta' check (status in ('aberta', 'fechada', 'cancelada')),
  aberta_em timestamptz not null default now(),
  fechada_em timestamptz,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  acrescimo numeric(12,2) not null default 0 check (acrescimo >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  unique (barbearia_id, numero),
  foreign key (barbearia_id, cliente_id)
    references public.barbearia_clientes(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, barbeiro_id)
    references public.barbearia_barbeiros(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, agendamento_id)
    references public.barbearia_agendamentos(barbearia_id, id) on delete restrict
);

create table public.barbearia_comanda_itens (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  comanda_id uuid not null,
  tipo text not null check (tipo in ('servico', 'produto', 'pacote', 'outro')),
  servico_id uuid,
  produto_id uuid,
  pacote_id uuid,
  barbeiro_id uuid,
  descricao text not null,
  quantidade numeric(12,3) not null default 1 check (quantidade > 0),
  valor_unitario numeric(12,2) not null default 0 check (valor_unitario >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  foreign key (barbearia_id, comanda_id)
    references public.barbearia_comandas(barbearia_id, id) on delete cascade,
  foreign key (barbearia_id, servico_id)
    references public.barbearia_servicos(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, produto_id)
    references public.barbearia_produtos(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, pacote_id)
    references public.barbearia_pacotes(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, barbeiro_id)
    references public.barbearia_barbeiros(barbearia_id, id) on delete restrict,
  check (
    (tipo = 'servico' and servico_id is not null and produto_id is null and pacote_id is null)
    or (tipo = 'produto' and produto_id is not null and servico_id is null and pacote_id is null)
    or (tipo = 'pacote' and pacote_id is not null and servico_id is null and produto_id is null)
    or (tipo = 'outro' and servico_id is null and produto_id is null and pacote_id is null)
  )
);

create index barbearia_comandas_status_idx on public.barbearia_comandas (barbearia_id, status, aberta_em desc);
create index barbearia_comanda_itens_comanda_idx on public.barbearia_comanda_itens (barbearia_id, comanda_id);

create table public.barbearia_pagamentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid,
  agendamento_id uuid,
  comanda_id uuid,
  valor numeric(12,2) not null check (valor > 0),
  forma text not null check (forma in ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'link', 'boleto', 'cortesia', 'outro')),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'falhou', 'cancelado', 'estornado')),
  parcelas integer not null default 1 check (parcelas > 0),
  provedor text,
  provedor_pagamento_id text,
  link_pagamento text,
  pago_em timestamptz,
  vencimento_em timestamptz,
  payload jsonb not null default '{}'::jsonb,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  unique (barbearia_id, provedor, provedor_pagamento_id),
  foreign key (barbearia_id, cliente_id)
    references public.barbearia_clientes(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, agendamento_id)
    references public.barbearia_agendamentos(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, comanda_id)
    references public.barbearia_comandas(barbearia_id, id) on delete restrict
);

create index barbearia_pagamentos_status_idx on public.barbearia_pagamentos (barbearia_id, status, created_at desc);
create index barbearia_pagamentos_comanda_idx on public.barbearia_pagamentos (barbearia_id, comanda_id);

create table public.barbearia_crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid,
  nome text not null,
  telefone text,
  email text,
  origem text not null default 'whatsapp' check (origem in ('instagram', 'indicacao', 'google', 'trafego_pago', 'whatsapp', 'site', 'balcao', 'outro')),
  status text not null default 'lead' check (status in ('lead', 'contato_realizado', 'agendamento_marcado', 'em_negociacao', 'convertido', 'perdido')),
  valor_estimado numeric(12,2) not null default 0 check (valor_estimado >= 0),
  proxima_acao_em timestamptz,
  proxima_acao text,
  observacoes text,
  perdido_motivo text,
  convertido_em timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  foreign key (barbearia_id, cliente_id)
    references public.barbearia_clientes(barbearia_id, id) on delete restrict
);

create index barbearia_crm_status_idx on public.barbearia_crm_oportunidades (barbearia_id, status);
create index barbearia_crm_proxima_acao_idx on public.barbearia_crm_oportunidades (barbearia_id, proxima_acao_em);

create table public.barbearia_dominios (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  dominio text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'verificado', 'ativo', 'erro', 'inativo')),
  verificado_em timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id)
);

create index barbearia_dominios_dominio_idx on public.barbearia_dominios (lower(dominio));

create table public.barbearia_integracoes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  provedor text not null check (provedor in ('asaas', 'mercado_pago', 'stripe', 'resend', 'whatsapp', 'google_calendar', 'outro')),
  nome text not null,
  ativo boolean not null default false,
  ambiente text not null default 'sandbox' check (ambiente in ('sandbox', 'producao')),
  configuracao_publica jsonb not null default '{}'::jsonb,
  segredos_criptografados text,
  webhook_url text,
  webhook_segredo_criptografado text,
  ultimo_sync_em timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  unique (barbearia_id, provedor, nome)
);

create index barbearia_integracoes_provedor_idx on public.barbearia_integracoes (barbearia_id, provedor, ativo);

create or replace function app_private.set_barbearia_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.usuario_tem_acesso_barbearia(p_barbearia_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.barbearia_usuarios bu
    where bu.barbearia_id = p_barbearia_id
      and bu.ativo = true
      and (
        bu.user_id = auth.uid()
        or lower(bu.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function app_private.usuario_admin_barbearia(p_barbearia_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.barbearia_usuarios bu
    where bu.barbearia_id = p_barbearia_id
      and bu.ativo = true
      and bu.papel in ('owner', 'gerente')
      and (
        bu.user_id = auth.uid()
        or lower(bu.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function app_private.usuario_admin_storage_barbearia(object_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then app_private.usuario_admin_barbearia(split_part(object_name, '/', 1)::uuid)
    else false
  end;
$$;

grant usage on schema app_private to authenticated;
grant execute on function app_private.usuario_tem_acesso_barbearia(uuid) to authenticated;
grant execute on function app_private.usuario_admin_barbearia(uuid) to authenticated;
grant execute on function app_private.usuario_admin_storage_barbearia(text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'barbearias',
    'barbearia_usuarios',
    'barbearia_clientes',
    'barbearia_barbeiros',
    'barbearia_servicos',
    'barbearia_pacotes',
    'barbearia_cliente_pacotes',
    'barbearia_produtos',
    'barbearia_agendamentos',
    'barbearia_comandas',
    'barbearia_pagamentos',
    'barbearia_crm_oportunidades',
    'barbearia_dominios',
    'barbearia_integracoes'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function app_private.set_barbearia_updated_at()', 'set_updated_at_' || table_name, table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'barbearias',
    'barbearia_usuarios',
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
    'barbearia_pagamentos',
    'barbearia_crm_oportunidades',
    'barbearia_dominios',
    'barbearia_integracoes'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy barbearias_select_membros on public.barbearias
for select to authenticated
using (app_private.usuario_tem_acesso_barbearia(id));

create policy barbearias_update_admin on public.barbearias
for update to authenticated
using (app_private.usuario_admin_barbearia(id))
with check (app_private.usuario_admin_barbearia(id));

create policy barbearia_usuarios_select_membros on public.barbearia_usuarios
for select to authenticated
using (app_private.usuario_tem_acesso_barbearia(barbearia_id));

create policy barbearia_usuarios_insert_admin on public.barbearia_usuarios
for insert to authenticated
with check (app_private.usuario_admin_barbearia(barbearia_id));

create policy barbearia_usuarios_update_admin on public.barbearia_usuarios
for update to authenticated
using (app_private.usuario_admin_barbearia(barbearia_id))
with check (app_private.usuario_admin_barbearia(barbearia_id));

create policy barbearia_usuarios_delete_admin on public.barbearia_usuarios
for delete to authenticated
using (app_private.usuario_admin_barbearia(barbearia_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
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
    'barbearia_pagamentos',
    'barbearia_crm_oportunidades'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (app_private.usuario_tem_acesso_barbearia(barbearia_id)) with check (app_private.usuario_tem_acesso_barbearia(barbearia_id))',
      table_name || '_crud_membros',
      table_name
    );
  end loop;
end;
$$;

create policy barbearia_dominios_crud_admin on public.barbearia_dominios
for all to authenticated
using (app_private.usuario_admin_barbearia(barbearia_id))
with check (app_private.usuario_admin_barbearia(barbearia_id));

create policy barbearia_integracoes_crud_admin on public.barbearia_integracoes
for all to authenticated
using (app_private.usuario_admin_barbearia(barbearia_id))
with check (app_private.usuario_admin_barbearia(barbearia_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbearia-site',
  'barbearia-site',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy barbearia_site_assets_public_read on storage.objects
for select to public
using (bucket_id = 'barbearia-site');

create policy barbearia_site_assets_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'barbearia-site'
  and app_private.usuario_admin_storage_barbearia(name)
);

create policy barbearia_site_assets_admin_update on storage.objects
for update to authenticated
using (
  bucket_id = 'barbearia-site'
  and app_private.usuario_admin_storage_barbearia(name)
)
with check (
  bucket_id = 'barbearia-site'
  and app_private.usuario_admin_storage_barbearia(name)
);

create policy barbearia_site_assets_admin_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'barbearia-site'
  and app_private.usuario_admin_storage_barbearia(name)
);

comment on table public.barbearias is 'Tenant raiz do produto de barbearias e configuracao do site publico.';
comment on table public.barbearia_agendamentos is 'Agenda propria e isolada de cada barbearia.';
comment on column public.barbearia_integracoes.segredos_criptografados is 'Segredos devem ser criptografados pela aplicacao antes da persistencia.';
