-- Ejecutar en el SQL Editor de Supabase, después de 0017.
-- Evidencia fotográfica por servicio brindado: dentro de una solicitud
-- de servicios (p. ej. "Artesanías La Yagua"), cada ítem marcado en
-- "Servicios solicitados" (p. ej. "Digitalización de modelos 3D") puede
-- tener sus propias fotos como prueba de que se brindó. Se guarda el
-- texto del servicio tal cual, no un id, porque `services` en
-- service_requests ya es un array de texto libre (mismo patrón que ahí).
-- Solo staff logueado sube/ve/borra evidencia — no hay flujo público.

create table service_evidence_photos (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references service_requests (id),
  service_label text not null,
  -- Ruta dentro del bucket privado "evidencia-servicios". No es una URL
  -- pública — hay que pedir una signed URL para verla.
  photo_path text not null,
  uploaded_by text,
  created_at timestamptz not null default now()
);

alter table service_evidence_photos enable row level security;

create policy "Staff autenticado ve la evidencia de servicios"
  on service_evidence_photos for select
  to authenticated
  using (true);

create policy "Staff autenticado sube evidencia de servicios"
  on service_evidence_photos for insert
  to authenticated
  with check (true);

create policy "Staff autenticado borra evidencia de servicios"
  on service_evidence_photos for delete
  to authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencia-servicios', 'evidencia-servicios', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "Staff autenticado sube fotos de evidencia"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidencia-servicios');

create policy "Staff autenticado ve fotos de evidencia"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidencia-servicios');

create policy "Staff autenticado borra fotos de evidencia"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'evidencia-servicios');
