begin;

alter table public.barbearia_site_agendamentos_publicos
  add column if not exists pagamento_gateway text,
  add column if not exists pagamento_external_id text,
  add column if not exists pagamento_transaction_id text,
  add column if not exists pagamento_receipt_url text;

create index if not exists barbearia_site_agendamento_gateway_idx
  on public.barbearia_site_agendamentos_publicos (barbearia_id, pagamento_gateway, pagamento_external_id);

alter table public.barbearia_pedidos
  add column if not exists pagamento_gateway text,
  add column if not exists pagamento_external_id text,
  add column if not exists pagamento_transaction_id text,
  add column if not exists pagamento_receipt_url text;

create index if not exists barbearia_pedidos_gateway_idx
  on public.barbearia_pedidos (barbearia_id, pagamento_gateway, pagamento_external_id);

commit;
