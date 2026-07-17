select
  b.slug,
  (select count(*) from barbearia_servicos x where x.barbearia_id = b.id) as servicos,
  (select count(*) from barbearia_pacotes x where x.barbearia_id = b.id) as pacotes,
  (select count(*) from barbearia_produtos x where x.barbearia_id = b.id) as produtos,
  (select count(*) from barbearia_barbeiros x where x.barbearia_id = b.id) as barbeiros,
  s.versao as snapshot_versao,
  position('127.0.0.1' in s.snapshot::text) = 0 as urls_remotas
from barbearias b
left join barbearia_demo_snapshots s on s.barbearia_id = b.id
where b.slug = 'navalha-nobre-demo';