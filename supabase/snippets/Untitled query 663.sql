select
  b.id,
  b.nome,
  b.slug,
  (select count(*) from barbearia_servicos s where s.barbearia_id = b.id) as servicos,
  (select count(*) from barbearia_pacotes p where p.barbearia_id = b.id) as pacotes,
  (select count(*) from barbearia_produtos p where p.barbearia_id = b.id) as produtos,
  (select count(*) from barbearia_barbeiros br where br.barbearia_id = b.id) as barbeiros
from barbearias b
where b.slug = 'navalha-nobre-demo';