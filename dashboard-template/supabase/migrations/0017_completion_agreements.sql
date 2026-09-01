-- Ejecutar en el SQL Editor de Supabase, después de 0016.
-- Acuerdo de Finalización de Proyecto (CPTTAPR03): el asesor y el
-- cliente firman en persona cuando se cierra un servicio. La firma del
-- asesor se guarda una vez en su perfil (columna staff.signature, igual
-- patrón que la foto) y se copia al acuerdo en el momento de crearlo,
-- para que el documento no cambie si el asesor actualiza su firma
-- después. La firma del cliente se dibuja en el momento, no hay enlace
-- público — por eso no hace falta una función RPC ni política para anon,
-- solo las políticas normales de staff autenticado.

alter table staff
  add column if not exists signature text;

create table completion_agreements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  service_request_id uuid not null references service_requests (id),
  advisor_id uuid not null references staff (id),
  advisor_signature text not null,
  client_signature text not null,
  agreement_date date not null default current_date
);

alter table completion_agreements enable row level security;

create policy "Staff autenticado ve los acuerdos de finalización"
  on completion_agreements for select
  to authenticated
  using (true);

create policy "Staff autenticado crea acuerdos de finalización"
  on completion_agreements for insert
  to authenticated
  with check (true);
