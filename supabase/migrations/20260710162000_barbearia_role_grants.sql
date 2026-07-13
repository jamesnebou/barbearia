-- Privilegios de banco para os papeis da API Supabase.
-- RLS continua responsavel por limitar cada usuario a sua barbearia.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table
  public.barbearias,
  public.barbearia_usuarios,
  public.barbearia_clientes,
  public.barbearia_barbeiros,
  public.barbearia_servicos,
  public.barbearia_pacotes,
  public.barbearia_pacote_servicos,
  public.barbearia_cliente_pacotes,
  public.barbearia_produtos,
  public.barbearia_agendamentos,
  public.barbearia_comandas,
  public.barbearia_comanda_itens,
  public.barbearia_pagamentos,
  public.barbearia_crm_oportunidades,
  public.barbearia_dominios,
  public.barbearia_integracoes
to authenticated;

grant all privileges on table
  public.barbearias,
  public.barbearia_usuarios,
  public.barbearia_clientes,
  public.barbearia_barbeiros,
  public.barbearia_servicos,
  public.barbearia_pacotes,
  public.barbearia_pacote_servicos,
  public.barbearia_cliente_pacotes,
  public.barbearia_produtos,
  public.barbearia_agendamentos,
  public.barbearia_comandas,
  public.barbearia_comanda_itens,
  public.barbearia_pagamentos,
  public.barbearia_crm_oportunidades,
  public.barbearia_dominios,
  public.barbearia_integracoes
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
