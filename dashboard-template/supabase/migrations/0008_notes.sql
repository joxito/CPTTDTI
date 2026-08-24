-- Ejecutar en el SQL Editor de Supabase.
-- Fase 3 de la hoja de ruta: bitácora de notas sobre un cliente o sobre
-- un servicio puntual (una nota es de uno de los dos, no de ambos).

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid references clients (id),
  service_request_id uuid references service_requests (id),
  -- Sin login todavía en el dashboard: queda fijo en 'Usuario' hasta que
  -- se agregue autenticación (fase final de la hoja de ruta).
  author text not null default 'Usuario',
  body text not null,

  constraint notes_one_target check (
    (client_id is not null and service_request_id is null)
    or (client_id is null and service_request_id is not null)
  )
);

alter table notes enable row level security;

create policy "Cualquiera puede ver las notas"
  on notes for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede crear notas"
  on notes for insert
  to anon, authenticated
  with check (true);

create policy "Cualquiera puede eliminar notas"
  on notes for delete
  to anon, authenticated
  using (true);

create index if not exists notes_client_id_idx on notes (client_id);
create index if not exists notes_service_request_id_idx on notes (service_request_id);
