-- SaaS commercial foundation: plans, clinic subscription status, Asaas billing records.

create table if not exists public.planos_sistema (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  preco_mensal numeric(12,2) not null default 0 check (preco_mensal >= 0),
  limite_usuarios integer not null default 1 check (limite_usuarios > 0),
  limite_profissionais integer not null default 1 check (limite_profissionais > 0),
  limite_clientes integer not null default 100 check (limite_clientes > 0),
  limite_agendamentos_mes integer not null default 100 check (limite_agendamentos_mes > 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.planos_sistema (slug, nome, descricao, preco_mensal, limite_usuarios, limite_profissionais, limite_clientes, limite_agendamentos_mes, ordem)
values
  ('starter', 'Starter', 'Plano inicial para clínicas em validação.', 97, 3, 3, 300, 500, 1),
  ('growth', 'Growth', 'Plano para clínicas com equipe e agenda em crescimento.', 197, 8, 10, 2000, 3000, 2),
  ('premium', 'Premium', 'Plano para operações maiores com múltiplos profissionais.', 397, 25, 50, 10000, 15000, 3)
on conflict (slug) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco_mensal = excluded.preco_mensal,
  limite_usuarios = excluded.limite_usuarios,
  limite_profissionais = excluded.limite_profissionais,
  limite_clientes = excluded.limite_clientes,
  limite_agendamentos_mes = excluded.limite_agendamentos_mes,
  ordem = excluded.ordem,
  updated_at = now();

alter table public.clinicas drop constraint if exists clinicas_status_check;
alter table public.clinicas add constraint clinicas_status_check check (status in ('trial', 'ativa', 'inadimplente', 'cancelada', 'inativa', 'bloqueada'));

alter table public.clinicas
  alter column status set default 'trial',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists billing_email text,
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists assinatura_status text not null default 'trial' check (assinatura_status in ('trial', 'ativa', 'atrasada', 'cancelada', 'isenta')),
  add column if not exists proxima_cobranca_em date,
  add column if not exists bloqueada_em timestamptz,
  add column if not exists bloqueio_motivo text;

update public.clinicas
set
  status = case when status = 'bloqueada' then 'inadimplente' when status = 'inativa' then 'cancelada' else status end,
  assinatura_status = case when status in ('ativa') then 'ativa' when status in ('cancelada', 'inativa') then 'cancelada' else assinatura_status end,
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days'),
  billing_email = coalesce(billing_email, email)
where trial_ends_at is null or billing_email is null or status in ('bloqueada', 'inativa');

create table if not exists public.asaas_cobrancas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
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
  updated_at timestamptz not null default now()
);

create index if not exists idx_planos_sistema_slug on public.planos_sistema(slug);
create index if not exists idx_clinicas_status_plano on public.clinicas(status, plano);
create index if not exists idx_clinicas_asaas_customer on public.clinicas(asaas_customer_id);
create index if not exists idx_asaas_cobrancas_clinica on public.asaas_cobrancas(clinica_id, created_at desc);
create index if not exists idx_asaas_cobrancas_payment on public.asaas_cobrancas(asaas_payment_id);

drop trigger if exists set_updated_at_planos_sistema on public.planos_sistema;
create trigger set_updated_at_planos_sistema before update on public.planos_sistema
for each row execute function app_private.set_updated_at();

drop trigger if exists set_updated_at_asaas_cobrancas on public.asaas_cobrancas;
create trigger set_updated_at_asaas_cobrancas before update on public.asaas_cobrancas
for each row execute function app_private.set_updated_at();

alter table public.planos_sistema enable row level security;
alter table public.asaas_cobrancas enable row level security;

drop policy if exists "planos_select_authenticated" on public.planos_sistema;
create policy "planos_select_authenticated" on public.planos_sistema
for select to authenticated
using (ativo = true);

drop policy if exists "asaas_cobrancas_select_membros" on public.asaas_cobrancas;
create policy "asaas_cobrancas_select_membros" on public.asaas_cobrancas
for select to authenticated
using (app_private.usuario_admin_clinica(clinica_id));
