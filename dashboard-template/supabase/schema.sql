-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query)

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Sección 1 — Datos del Negocio y del Representante
  business_name text not null,
  has_rnc text not null check (has_rnc in ('si', 'no')),
  rnc_number text,
  province text not null,
  municipality text not null,
  representative_name text not null,
  sex text not null check (sex in ('femenino', 'masculino')),
  age integer not null,
  phone text not null,
  is_owner text not null check (is_owner in ('si', 'no')),
  id_number text not null,
  email text not null,
  sector text not null,
  sector_other text,
  business_description text not null,
  start_date date not null,
  employee_count integer not null,
  address text,
  services text[] not null,
  referral text not null,
  referral_other text,

  -- Sección 2 — Acuerdo y Confidencialidad
  confidentiality text not null check (confidentiality in ('si', 'no')),
  -- Firma dibujada, como imagen (data URL base64 de un PNG). Opcional.
  signature text,

  -- Borrado suave: al "eliminar" un cliente desde el panel se marca esta
  -- columna en vez de borrar la fila, para poder revertirlo desde el
  -- historial. La lista de Clientes filtra las filas con deleted_at is not null.
  deleted_at timestamptz
);

alter table service_requests enable row level security;

-- Cualquiera (incluyendo el formulario público, sin login) puede crear una solicitud.
create policy "Cualquiera puede enviar una solicitud"
  on service_requests for insert
  to anon
  with check (true);

-- Sin login todavía en el dashboard: cualquiera con la anon key puede leer
-- las solicitudes. Esto expone datos personales (cédula, teléfono, correo)
-- a quien inspeccione las peticiones de red del sitio. Revisar cuando se
-- agregue autenticación al dashboard.
create policy "Cualquiera puede ver las solicitudes"
  on service_requests for select
  to anon, authenticated
  using (true);

-- Sin login todavía: cualquiera con la anon key puede editar una solicitud
-- desde el panel de Clientes. Revisar cuando se agregue autenticación.
create policy "Cualquiera puede editar las solicitudes"
  on service_requests for update
  to anon, authenticated
  using (true)
  with check (true);

-- No hay política de DELETE: "eliminar" un cliente desde el panel en
-- realidad hace un UPDATE que marca deleted_at (ver arriba), para poder
-- revertirlo desde el historial.

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
