-- Enlace publico para que un cliente pueda (re)subir su cedula, igual que
-- los enlaces de firma remota. Lo usa services.tsx cuando la cedula quedo
-- pendiente o hay que actualizarla (ver upload-id-photos.tsx).
create or replace function get_client_id_photo_upload_info(p_client_id uuid)
returns table (
  business_name text,
  representative_name text,
  has_id_photos boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.business_name,
    c.representative_name,
    (c.id_photo_paths is not null and array_length(c.id_photo_paths, 1) > 0) as has_id_photos
  from clients c
  where c.id = p_client_id;
$$;

grant execute on function get_client_id_photo_upload_info(uuid) to anon, authenticated;
