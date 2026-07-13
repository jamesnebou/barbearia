insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbearia-clientes',
  'barbearia-clientes',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.barbearia_cliente_fotos is
  'Referencias, resultados e documentos privados dos clientes da barbearia.';
