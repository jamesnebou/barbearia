create table if not exists public.barbearia_tutoriais (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao_curta text,
  descricao text,
  categoria text not null default 'Primeiros passos',
  video_url text not null,
  thumbnail_url text,
  duracao_minutos integer not null default 5 check (duracao_minutos > 0),
  ordem integer not null default 0,
  passos jsonb not null default '[]'::jsonb check (jsonb_typeof(passos) = 'array'),
  destaque boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barbearia_tutoriais_publicacao_idx
  on public.barbearia_tutoriais (ativo, destaque desc, ordem, created_at);

alter table public.barbearia_tutoriais enable row level security;

comment on table public.barbearia_tutoriais is
  'Central global de tutoriais exibida nas dashboards das barbearias.';

comment on column public.barbearia_tutoriais.video_url is
  'URL HTTPS de YouTube, Vimeo ou arquivo MP4/WebM publicada pelo admin interno.';

grant all on table public.barbearia_tutoriais to service_role;
revoke all on table public.barbearia_tutoriais from anon, authenticated;
