-- Ejecutar en el SQL Editor de Supabase.

-- En vez de borrar la fila de verdad, se marca con deleted_at para poder
-- revertir la eliminación desde el historial. La lista de Clientes filtra
-- las filas con deleted_at is not null.
alter table service_requests add column if not exists deleted_at timestamptz;

create table if not exists service_request_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_request_id uuid not null references service_requests (id),
  business_name text not null,
  action text not null check (action in ('creado', 'editado', 'eliminado', 'restaurado')),
  -- Sin login todavía en el dashboard, no hay forma de saber qué persona
  -- del staff hizo cada cambio: queda fijo en 'Usuario' hasta que se
  -- agregue autenticación.
  actor text not null default 'Usuario',
  changed_fields jsonb
);

alter table service_request_changes enable row level security;

create policy "Cualquiera puede ver el historial"
  on service_request_changes for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede registrar cambios en el historial"
  on service_request_changes for insert
  to anon, authenticated
  with check (true);
