alter table public.barbearia_servicos
  add column if not exists instrucoes_pre_atendimento text,
  add column if not exists instrucoes_pos_atendimento text,
  add column if not exists imagem_storage_path text,
  add column if not exists imagem_mime_type text,
  add column if not exists imagem_tamanho_bytes bigint check (imagem_tamanho_bytes is null or imagem_tamanho_bytes >= 0);

comment on column public.barbearia_servicos.instrucoes_pre_atendimento is
  'Orientacoes operacionais antes do servico de barbearia.';

comment on column public.barbearia_servicos.instrucoes_pos_atendimento is
  'Orientacoes operacionais depois do servico de barbearia.';
