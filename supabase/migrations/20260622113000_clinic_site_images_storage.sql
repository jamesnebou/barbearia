-- Public storage bucket for clinic public website images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinica-site-images',
  'clinica-site-images',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
