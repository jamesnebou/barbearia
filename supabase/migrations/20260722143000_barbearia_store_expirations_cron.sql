-- A Vercel Hobby aceita cron apenas uma vez por dia. Como as reservas de
-- estoque expiram em minutos, o agendamento fica junto do banco de dados.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'barbearia-expirar-pedidos-loja',
  '*/10 * * * *',
  $cron$select public.barbearia_expirar_pedidos_loja();$cron$
);
