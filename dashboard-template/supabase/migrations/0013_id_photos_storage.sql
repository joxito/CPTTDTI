-- Ejecutar en el SQL Editor de Supabase, después de 0012.
-- Las fotos de la cédula se capturaban en el formulario pero nunca se
-- guardaban. Se agrega un bucket de Storage privado (solo el staff
-- logueado puede verlas, cualquiera puede subir desde el formulario
-- público) y una columna en clients con las rutas de los archivos.

alter table clients add column if not exists id_photo_paths text[];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cedulas', 'cedulas', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "Cualquiera puede subir fotos de cédula"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'cedulas');

create policy "Staff autenticado ve las fotos de cédula"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cedulas');

create policy "Staff autenticado borra fotos de cédula"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cedulas');

-- Guarda las rutas de las fotos ya subidas al bucket. Security definer
-- porque clients ya no acepta update directo de la anon key — el
-- formulario público solo puede llegar a esta columna por acá.
create or replace function set_client_id_photos(p_client_id uuid, p_paths text[])
returns void
language sql
security definer
set search_path = public
as $$
  update clients set id_photo_paths = p_paths where id = p_client_id;
$$;

grant execute on function set_client_id_photos(uuid, text[]) to anon, authenticated;
