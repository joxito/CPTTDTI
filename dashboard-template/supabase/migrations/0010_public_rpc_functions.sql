-- Ejecutar en el SQL Editor de Supabase, después de 0009.
-- Cierra el acceso directo de la anon key a clients/service_requests/
-- service_request_changes. El formulario público de solicitud y la página
-- de firma (que no tienen login) pasan a usar estas funciones en vez de
-- tocar las tablas directamente — cada función hace exactamente una cosa
-- puntual y acotada, no expone el resto de la tabla.

-- Busca un cliente existente por RNC (o cédula si no hay RNC) y lo
-- actualiza, o crea uno nuevo si no existe. Devuelve el id del cliente.
-- Replica la lógica de service-request.tsx (búsqueda + update-o-insert).
create or replace function find_or_create_client(p_client jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rnc text := p_client ->> 'rnc_number';
  v_id_number text := p_client ->> 'id_number';
  v_client_id uuid;
begin
  if v_rnc is not null then
    select id into v_client_id from clients
      where rnc_number = v_rnc and deleted_at is null;
  else
    select id into v_client_id from clients
      where id_number = v_id_number and deleted_at is null;
  end if;

  if v_client_id is not null then
    update clients set
      business_name = p_client ->> 'business_name',
      has_rnc = p_client ->> 'has_rnc',
      rnc_number = v_rnc,
      province = p_client ->> 'province',
      municipality = p_client ->> 'municipality',
      representative_name = p_client ->> 'representative_name',
      sex = p_client ->> 'sex',
      age = (p_client ->> 'age')::int,
      phone = p_client ->> 'phone',
      is_owner = p_client ->> 'is_owner',
      id_number = v_id_number,
      email = p_client ->> 'email',
      address = p_client ->> 'address'
    where id = v_client_id;
    return v_client_id;
  end if;

  insert into clients (
    business_name, has_rnc, rnc_number, province, municipality,
    representative_name, sex, age, phone, is_owner, id_number, email, address
  ) values (
    p_client ->> 'business_name',
    p_client ->> 'has_rnc',
    v_rnc,
    p_client ->> 'province',
    p_client ->> 'municipality',
    p_client ->> 'representative_name',
    p_client ->> 'sex',
    (p_client ->> 'age')::int,
    p_client ->> 'phone',
    p_client ->> 'is_owner',
    v_id_number,
    p_client ->> 'email',
    p_client ->> 'address'
  ) returning id into v_client_id;

  return v_client_id;
end;
$$;

grant execute on function find_or_create_client(jsonb) to anon, authenticated;

-- Cuenta los servicios activos que un cliente ya tiene en un año dado,
-- para el aviso de "máximo dos servicios por año".
create or replace function count_client_services_this_year(p_client_id uuid, p_year int)
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int from service_requests
    where client_id = p_client_id
      and deleted_at is null
      and created_at >= (p_year || '-01-01')::timestamptz
      and created_at < ((p_year + 1) || '-01-01')::timestamptz;
$$;

grant execute on function count_client_services_this_year(uuid, int) to anon, authenticated;

-- Crea el servicio y registra la entrada de "creado" en el historial.
-- Devuelve el id del servicio nuevo.
create or replace function submit_service_request(
  p_client_id uuid,
  p_service jsonb,
  p_actor text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_business_name text;
begin
  insert into service_requests (
    client_id, sector, sector_other, business_description, start_date,
    employee_count, services, referral, referral_other, confidentiality,
    signature
  )
  values (
    p_client_id,
    p_service ->> 'sector',
    p_service ->> 'sector_other',
    p_service ->> 'business_description',
    (p_service ->> 'start_date')::date,
    (p_service ->> 'employee_count')::int,
    array(select jsonb_array_elements_text(p_service -> 'services')),
    p_service ->> 'referral',
    p_service ->> 'referral_other',
    p_service ->> 'confidentiality',
    p_service ->> 'signature'
  )
  returning id into v_request_id;

  select business_name into v_business_name from clients where id = p_client_id;

  insert into service_request_changes (service_request_id, business_name, action, actor)
  values (v_request_id, v_business_name, 'creado', p_actor);

  return v_request_id;
end;
$$;

grant execute on function submit_service_request(uuid, jsonb, text) to anon, authenticated;

-- Datos mínimos para la página pública de firma: no expone el resto de la
-- fila de service_requests ni de clients.
create or replace function get_signing_info(p_request_id uuid)
returns table (
  id uuid,
  signature text,
  business_name text,
  representative_name text
)
language sql
security definer
set search_path = public
as $$
  select sr.id, sr.signature, c.business_name, c.representative_name
  from service_requests sr
  join clients c on c.id = sr.client_id
  where sr.id = p_request_id and sr.deleted_at is null;
$$;

grant execute on function get_signing_info(uuid) to anon, authenticated;

-- Guarda la firma de un cliente y registra el cambio en el historial con
-- actor 'Cliente'.
create or replace function sign_service_request(p_request_id uuid, p_signature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_business_name text;
begin
  update service_requests
    set signature = p_signature
    where id = p_request_id and deleted_at is null
    returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'Solicitud no encontrada';
  end if;

  select business_name into v_business_name from clients where id = v_client_id;

  insert into service_request_changes (service_request_id, business_name, action, actor, changed_fields)
  values (
    p_request_id,
    v_business_name,
    'editado',
    'Cliente',
    jsonb_build_object(
      'signature', jsonb_build_object('from', '(sin firma)', 'to', '(firma nueva)')
    )
  );
end;
$$;

grant execute on function sign_service_request(uuid, text) to anon, authenticated;

-- Con las funciones de arriba cubriendo los flujos públicos, se cierra el
-- acceso directo de la anon key a las tablas: de acá en adelante todo pasa
-- por el dashboard (con sesión) o por estas funciones.

drop policy if exists "Cualquiera puede crear un cliente" on clients;
drop policy if exists "Cualquiera puede ver los clientes" on clients;
drop policy if exists "Cualquiera puede editar los clientes" on clients;

create policy "Staff autenticado crea clientes"
  on clients for insert
  to authenticated
  with check (true);

create policy "Staff autenticado ve los clientes"
  on clients for select
  to authenticated
  using (true);

create policy "Staff autenticado edita los clientes"
  on clients for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Cualquiera puede enviar una solicitud" on service_requests;
drop policy if exists "Cualquiera puede ver las solicitudes" on service_requests;
drop policy if exists "Cualquiera puede editar las solicitudes" on service_requests;

create policy "Staff autenticado crea solicitudes"
  on service_requests for insert
  to authenticated
  with check (true);

create policy "Staff autenticado ve las solicitudes"
  on service_requests for select
  to authenticated
  using (true);

create policy "Staff autenticado edita las solicitudes"
  on service_requests for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Cualquiera puede ver el historial" on service_request_changes;
drop policy if exists "Cualquiera puede registrar cambios en el historial" on service_request_changes;

create policy "Staff autenticado ve el historial"
  on service_request_changes for select
  to authenticated
  using (true);

create policy "Staff autenticado registra cambios en el historial"
  on service_request_changes for insert
  to authenticated
  with check (true);

drop policy if exists "Cualquiera puede ver las notas" on notes;
drop policy if exists "Cualquiera puede crear notas" on notes;
drop policy if exists "Cualquiera puede eliminar notas" on notes;

create policy "Staff autenticado ve las notas"
  on notes for select
  to authenticated
  using (true);

create policy "Staff autenticado crea notas"
  on notes for insert
  to authenticated
  with check (true);

create policy "Staff autenticado elimina notas"
  on notes for delete
  to authenticated
  using (true);
