-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query)
-- Esquema completo para un proyecto nuevo. Si ya tenés datos cargados con
-- el esquema viejo (una sola tabla service_requests), usá en cambio las
-- migraciones en supabase/migrations en orden.

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

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
  address text,

  -- Borrado suave: al "eliminar" un cliente se marca esta columna en vez
  -- de borrar la fila, para poder revertirlo desde el historial.
  deleted_at timestamptz
);

alter table clients enable row level security;

-- Cualquiera (incluyendo el formulario público, sin login) puede crear un
-- cliente al enviar una solicitud.
create policy "Cualquiera puede crear un cliente"
  on clients for insert
  to anon
  with check (true);

-- Sin login todavía en el dashboard: cualquiera con la anon key puede leer
-- y editar los clientes. Esto expone datos personales (cédula, teléfono,
-- correo) a quien inspeccione las peticiones de red del sitio. Revisar
-- cuando se agregue autenticación al dashboard.
create policy "Cualquiera puede ver los clientes"
  on clients for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede editar los clientes"
  on clients for update
  to anon, authenticated
  using (true)
  with check (true);

-- Se busca por RNC (identifica al negocio) o por cédula (identifica a la
-- persona, respaldo cuando no hay RNC) para no duplicar un cliente que ya
-- envió una solicitud antes.
create index if not exists clients_rnc_number_idx on clients (rnc_number);
create index if not exists clients_id_number_idx on clients (id_number);

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients (id),

  -- Sección 1 — Servicio solicitado
  sector text not null,
  sector_other text,
  business_description text not null,
  start_date date not null,
  employee_count integer not null,
  services text[] not null,
  referral text not null,
  referral_other text,

  -- Sección 2 — Acuerdo y Confidencialidad
  confidentiality text not null check (confidentiality in ('si', 'no')),
  -- Firma dibujada, como imagen (data URL base64 de un PNG). Opcional.
  signature text,

  -- Estado del servicio. El estado del cliente (Nuevo/Recurrente) no se
  -- guarda: se calcula contando servicios por client_id.
  status text not null default 'iniciado'
    check (status in ('iniciado', 'en_proceso', 'completo')),

  -- Borrado suave, igual que clients.
  deleted_at timestamptz
);

alter table service_requests enable row level security;

create policy "Cualquiera puede enviar una solicitud"
  on service_requests for insert
  to anon
  with check (true);

create policy "Cualquiera puede ver las solicitudes"
  on service_requests for select
  to anon, authenticated
  using (true);

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

-- Bitácora: una nota es sobre un cliente o sobre un servicio puntual,
-- nunca de ambos.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid references clients (id),
  service_request_id uuid references service_requests (id),
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
