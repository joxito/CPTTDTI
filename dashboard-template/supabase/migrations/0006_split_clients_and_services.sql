-- Ejecutar en el SQL Editor de Supabase.
-- Fase 1 de la hoja de ruta: separa los datos del cliente (negocio y
-- representante) de los datos del servicio solicitado. Antes vivían
-- mezclados en una sola fila de service_requests.

-- 1. Tabla de clientes.
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

  -- Borrado suave, igual que service_requests.
  deleted_at timestamptz
);

alter table clients enable row level security;

create policy "Cualquiera puede crear un cliente"
  on clients for insert
  to anon, authenticated
  with check (true);

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

-- 2. Vincular cada solicitud existente a un cliente nuevo.
alter table service_requests add column if not exists client_id uuid references clients (id);

do $$
declare
  r record;
  new_client_id uuid;
begin
  for r in select * from service_requests where client_id is null loop
    insert into clients (
      business_name, has_rnc, rnc_number, province, municipality,
      representative_name, sex, age, phone, is_owner, id_number, email,
      address, deleted_at, created_at
    )
    values (
      r.business_name, r.has_rnc, r.rnc_number, r.province, r.municipality,
      r.representative_name, r.sex, r.age, r.phone, r.is_owner, r.id_number,
      r.email, r.address, r.deleted_at, r.created_at
    )
    returning id into new_client_id;

    update service_requests set client_id = new_client_id where id = r.id;
  end loop;
end $$;

alter table service_requests alter column client_id set not null;

-- 3. Quitar de service_requests los campos que ahora viven en clients.
alter table service_requests
  drop column if exists business_name,
  drop column if exists has_rnc,
  drop column if exists rnc_number,
  drop column if exists province,
  drop column if exists municipality,
  drop column if exists representative_name,
  drop column if exists sex,
  drop column if exists age,
  drop column if exists phone,
  drop column if exists is_owner,
  drop column if exists id_number,
  drop column if exists email,
  drop column if exists address;
