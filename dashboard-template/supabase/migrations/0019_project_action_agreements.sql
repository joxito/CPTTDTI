-- Ejecutar en el SQL Editor de Supabase, después de 0018.
-- Acuerdo de Acciones del Proyecto (CPTTAPR02): acta de arranque que se
-- llena cuando un servicio "Inició" pasa a estar "En proceso" — mismo
-- patrón que el Acuerdo de Finalización, que mueve "En proceso" a
-- "Completo". Llenar este formulario es lo único que puede mover un
-- servicio a "En proceso" (ver services.tsx).
--
-- La firma del asesor se autocompleta desde su perfil (staff.signature,
-- igual que en completion_agreements). La firma del cliente y la del
-- coordinador(a) se dibujan en el momento — el coordinador no está
-- atado a una cuenta de staff en particular, así que también se guarda
-- su nombre como texto libre. No hay enlace público.

create table project_action_agreements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  service_request_id uuid not null references service_requests (id),

  project_name text not null,
  service_type text not null,
  service_quantity text,
  estimated_completion_time text,

  identified_need text not null,
  service_scope text not null,
  proposed_solution text not null,
  agreements text not null,

  -- Hasta 3 actividades: [{ description, start_date, end_date, responsible }]
  activities jsonb not null default '[]'::jsonb,

  advisor_id uuid not null references staff (id),
  advisor_signature text not null,

  coordinator_name text not null,
  coordinator_signature text not null,

  client_signature text not null,

  agreement_date date not null default current_date
);

alter table project_action_agreements enable row level security;

create policy "Staff autenticado ve los acuerdos de acciones"
  on project_action_agreements for select
  to authenticated
  using (true);

create policy "Staff autenticado crea acuerdos de acciones"
  on project_action_agreements for insert
  to authenticated
  with check (true);
