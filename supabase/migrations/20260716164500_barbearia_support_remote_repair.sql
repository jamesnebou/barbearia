-- Repara as estruturas SaaS próprias da barbearia no Supabase compartilhado.
-- Não cria, altera ou reaproveita tabelas da clínica.

-- Estruturas complementares usadas pelo SaaS e pelo historico do cliente.

alter table public.barbearias drop constraint if exists barbearias_status_check;
alter table public.barbearias
  add constraint barbearias_status_check check (status in ('trial', 'ativa', 'inadimplente', 'cancelada', 'inativa', 'bloqueada')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists billing_email text,
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists assinatura_status text not null default 'trial' check (assinatura_status in ('trial', 'ativa', 'atrasada', 'cancelada', 'isenta')),
  add column if not exists proxima_cobranca_em date,
  add column if not exists bloqueada_em timestamptz,
  add column if not exists bloqueio_motivo text;

update public.barbearias
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days'),
    billing_email = coalesce(billing_email, email);

create table if not exists public.barbearia_planos_sistema (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  preco_mensal numeric(12,2) not null default 0 check (preco_mensal >= 0),
  limite_usuarios integer not null default 1 check (limite_usuarios > 0),
  limite_barbeiros integer not null default 1 check (limite_barbeiros > 0),
  limite_clientes integer not null default 100 check (limite_clientes > 0),
  limite_agendamentos_mes integer not null default 100 check (limite_agendamentos_mes > 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.barbearia_planos_sistema (slug, nome, descricao, preco_mensal, limite_usuarios, limite_barbeiros, limite_clientes, limite_agendamentos_mes, ordem)
values
  ('starter', 'Starter', 'Operacao individual em validacao.', 97, 3, 3, 300, 500, 1),
  ('growth', 'Growth', 'Equipe e agenda em crescimento.', 197, 8, 10, 2000, 3000, 2),
  ('premium', 'Premium', 'Operacao com equipe ampliada.', 397, 25, 50, 10000, 15000, 3)
on conflict (slug) do nothing;

create table if not exists public.barbearia_cobrancas_saas (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  asaas_payment_id text unique,
  asaas_subscription_id text,
  evento text,
  status text not null default 'pendente',
  valor numeric(12,2) not null default 0 check (valor >= 0),
  vencimento date,
  pago_em timestamptz,
  invoice_url text,
  bank_slip_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id)
);

create table if not exists public.barbearia_cliente_consentimentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid not null,
  tipo text not null default 'lgpd' check (tipo in ('lgpd', 'imagem', 'atendimento', 'marketing', 'outro')),
  titulo text not null,
  versao text not null default 'v1',
  texto text not null,
  aceito boolean not null default true,
  aceito_em timestamptz not null default now(),
  aceito_por_nome text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  foreign key (barbearia_id, cliente_id) references public.barbearia_clientes(barbearia_id, id) on delete cascade
);

create table if not exists public.barbearia_cliente_fotos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid not null,
  consentimento_id uuid,
  tipo text not null default 'referencia' check (tipo in ('referencia', 'resultado', 'perfil', 'documento')),
  titulo text,
  url text,
  storage_path text,
  mime_type text,
  tamanho_bytes bigint,
  observacoes text,
  data_foto date not null default current_date,
  autorizacao_uso_imagem boolean not null default false,
  visibilidade text not null default 'restrito' check (visibilidade in ('restrito', 'interno', 'marketing')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  foreign key (barbearia_id, cliente_id) references public.barbearia_clientes(barbearia_id, id) on delete cascade,
  foreign key (barbearia_id, consentimento_id) references public.barbearia_cliente_consentimentos(barbearia_id, id) on delete restrict
);

create table if not exists public.barbearia_site_agendamentos_publicos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  cliente_id uuid,
  agendamento_id uuid,
  servico_id uuid,
  barbeiro_id uuid,
  nome text not null,
  telefone text,
  email text,
  data_hora timestamptz not null,
  valor_total numeric(12,2) not null default 0 check (valor_total >= 0),
  valor_sinal numeric(12,2) not null default 0 check (valor_sinal >= 0),
  pagamento_status text not null default 'pendente' check (pagamento_status in ('sem_sinal', 'pendente', 'pago', 'cancelado', 'erro')),
  asaas_payment_id text unique,
  invoice_url text,
  visualizado_em timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbearia_id, id),
  foreign key (barbearia_id, cliente_id) references public.barbearia_clientes(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, agendamento_id) references public.barbearia_agendamentos(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, servico_id) references public.barbearia_servicos(barbearia_id, id) on delete restrict,
  foreign key (barbearia_id, barbeiro_id) references public.barbearia_barbeiros(barbearia_id, id) on delete restrict
);

create table if not exists public.barbearia_configuracoes_plataforma (
  chave text primary key,
  valor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barbearia_cobrancas_periodo_idx on public.barbearia_cobrancas_saas(barbearia_id, created_at desc);
create index if not exists barbearia_cliente_consentimentos_idx on public.barbearia_cliente_consentimentos(barbearia_id, cliente_id, aceito_em desc);
create index if not exists barbearia_cliente_fotos_idx on public.barbearia_cliente_fotos(barbearia_id, cliente_id, data_foto desc);
create index if not exists barbearia_site_agendamentos_idx on public.barbearia_site_agendamentos_publicos(barbearia_id, data_hora desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'barbearia_planos_sistema', 'barbearia_cobrancas_saas', 'barbearia_cliente_consentimentos',
    'barbearia_cliente_fotos', 'barbearia_site_agendamentos_publicos', 'barbearia_configuracoes_plataforma'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'set_updated_at_' || table_name, table_name);
    execute format('create trigger %I before update on public.%I for each row execute function app_private.set_barbearia_updated_at()', 'set_updated_at_' || table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

drop policy if exists barbearia_planos_select on public.barbearia_planos_sistema;
create policy barbearia_planos_select on public.barbearia_planos_sistema for select to authenticated using (ativo = true);
drop policy if exists barbearia_cobrancas_select on public.barbearia_cobrancas_saas;
create policy barbearia_cobrancas_select on public.barbearia_cobrancas_saas for select to authenticated using (app_private.usuario_admin_barbearia(barbearia_id));
drop policy if exists barbearia_cliente_consentimentos_crud on public.barbearia_cliente_consentimentos;
create policy barbearia_cliente_consentimentos_crud on public.barbearia_cliente_consentimentos for all to authenticated using (app_private.usuario_tem_acesso_barbearia(barbearia_id)) with check (app_private.usuario_tem_acesso_barbearia(barbearia_id));
drop policy if exists barbearia_cliente_fotos_crud on public.barbearia_cliente_fotos;
create policy barbearia_cliente_fotos_crud on public.barbearia_cliente_fotos for all to authenticated using (app_private.usuario_tem_acesso_barbearia(barbearia_id)) with check (app_private.usuario_tem_acesso_barbearia(barbearia_id));
drop policy if exists barbearia_site_agendamentos_select on public.barbearia_site_agendamentos_publicos;
create policy barbearia_site_agendamentos_select on public.barbearia_site_agendamentos_publicos for select to authenticated using (app_private.usuario_tem_acesso_barbearia(barbearia_id));

grant select on public.barbearia_planos_sistema to authenticated;
grant select on public.barbearia_cobrancas_saas to authenticated;
grant select, insert, update, delete on public.barbearia_cliente_consentimentos, public.barbearia_cliente_fotos to authenticated;
grant select on public.barbearia_site_agendamentos_publicos to authenticated;
grant all privileges on public.barbearia_planos_sistema, public.barbearia_cobrancas_saas, public.barbearia_cliente_consentimentos, public.barbearia_cliente_fotos, public.barbearia_site_agendamentos_publicos, public.barbearia_configuracoes_plataforma to service_role;


-- Colunas de conteúdo e mídia que também haviam sido marcadas como aplicadas sem existir no remoto.
alter table public.barbearia_servicos
  add column if not exists instrucoes_pre_atendimento text,
  add column if not exists instrucoes_pos_atendimento text,
  add column if not exists imagem_storage_path text,
  add column if not exists imagem_mime_type text,
  add column if not exists imagem_tamanho_bytes bigint
    check (imagem_tamanho_bytes is null or imagem_tamanho_bytes >= 0);

comment on column public.barbearia_servicos.instrucoes_pre_atendimento is
  'Orientacoes operacionais antes do servico de barbearia.';

comment on column public.barbearia_servicos.instrucoes_pos_atendimento is
  'Orientacoes operacionais depois do servico de barbearia.';


-- Mantém no remoto os mesmos planos configurados no painel administrativo local.
insert into public.barbearia_planos_sistema (
  slug, nome, descricao, preco_mensal, limite_usuarios, limite_barbeiros,
  limite_clientes, limite_agendamentos_mes, ativo, ordem
)
values
  (
    'starter', 'Starter', 'Operacao individual em validacao.', 97,
    2, 1, 100,
    300, true, 1
  ),
  (
    'growth', 'Growth', 'Equipe e agenda em crescimento.', 197,
    5, 3, 500,
    1500, true, 2
  ),
  (
    'premium', 'Premium', 'Operacao com equipe ampliada.', 397,
    11, 10, 2000,
    10000, true, 3
  )
on conflict (slug) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco_mensal = excluded.preco_mensal,
  limite_usuarios = excluded.limite_usuarios,
  limite_barbeiros = excluded.limite_barbeiros,
  limite_clientes = excluded.limite_clientes,
  limite_agendamentos_mes = excluded.limite_agendamentos_mes,
  ativo = excluded.ativo,
  ordem = excluded.ordem,
  updated_at = now();
