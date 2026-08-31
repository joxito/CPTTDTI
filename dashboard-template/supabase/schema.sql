-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query)
-- Esquema completo para un proyecto nuevo. Si ya tenés datos cargados con
-- un esquema viejo, usá en cambio las migraciones en supabase/migrations
-- en orden. Después de correr este archivo, creá la cuenta
-- cptt@ipl.edu.do desde Authentication > Users > Add user en el Dashboard
-- de Supabase — su fila en staff se inserta sola en cuanto esa cuenta
-- exista (ver el final de este archivo).

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

  -- Rutas dentro del bucket de Storage "cedulas" (privado). No son URLs
  -- públicas — hay que pedir una signed URL para verlas.
  id_photo_paths text[],

  -- Borrado suave: al "eliminar" un cliente se marca esta columna en vez
  -- de borrar la fila, para poder revertirlo desde el historial.
  deleted_at timestamptz
);

alter table clients enable row level security;

-- El dashboard requiere sesión (ver "staff" y las políticas al final de
-- este archivo). El formulario público y la firma no tienen login: pasan
-- por las funciones security definer de abajo, que no dependen de estas
-- políticas.
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

  -- Quien lleva el servicio no siempre es quien lo creó, así que se
  -- puede asignar/reasignar por separado. La referencia a staff se
  -- agrega más abajo (esa tabla todavía no existe en este punto del
  -- archivo).
  assigned_advisor_id uuid,

  -- Borrado suave, igual que clients.
  deleted_at timestamptz
);

alter table service_requests enable row level security;

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

-- No hay política de DELETE: "eliminar" un cliente desde el panel en
-- realidad hace un UPDATE que marca deleted_at (ver arriba), para poder
-- revertirlo desde el historial.

create table if not exists service_request_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_request_id uuid not null references service_requests (id),
  business_name text not null,
  action text not null check (action in ('creado', 'editado', 'eliminado', 'restaurado')),
  -- 'Cliente' cuando la acción vino del formulario público o del enlace de
  -- firma; 'Usuario' (o el nombre real, una vez con sesión) desde el
  -- dashboard.
  actor text not null default 'Usuario',
  changed_fields jsonb
);

alter table service_request_changes enable row level security;

create policy "Staff autenticado ve el historial"
  on service_request_changes for select
  to authenticated
  using (true);

create policy "Staff autenticado registra cambios en el historial"
  on service_request_changes for insert
  to authenticated
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

create index if not exists notes_client_id_idx on notes (client_id);
create index if not exists notes_service_request_id_idx on notes (service_request_id);

-- Sistema de usuarios: cada fila de staff corresponde a una cuenta de
-- auth.users. cptt@ipl.edu.do es la cuenta creadora: intocable (no se
-- puede eliminar ni cambiarle el rol) y la única que puede agregar,
-- editar o eliminar otras cuentas.
create table if not exists staff (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('administrador', 'editor')),
  -- Foto de perfil como data URL base64, mismo patrón que la firma.
  photo text,
  -- Firma del asesor para el Acuerdo de Finalización de Proyecto, misma
  -- codificación que la firma del cliente (data URL base64 de un PNG).
  signature text,
  created_at timestamptz not null default now(),

  constraint creator_is_admin
    check (email <> 'cptt@ipl.edu.do' or role = 'administrador')
);

alter table staff enable row level security;

create policy "Staff autenticado puede ver el staff"
  on staff for select
  to authenticated
  using (true);

create policy "Un administrador agrega usuarios"
  on staff for insert
  to authenticated
  with check (
    (select role from staff where id = auth.uid()) = 'administrador'
  );

create policy "Creador edita cualquiera, cada quien su propio perfil"
  on staff for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cptt@ipl.edu.do' or auth.uid() = id)
  with check ((auth.jwt() ->> 'email') = 'cptt@ipl.edu.do' or auth.uid() = id);

create policy "Solo la cuenta creadora elimina, y no a sí misma"
  on staff for delete
  to authenticated
  using (
    (auth.jwt() ->> 'email') = 'cptt@ipl.edu.do'
    and email <> 'cptt@ipl.edu.do'
  );

-- Nadie que no sea la cuenta creadora puede cambiarse el rol a sí mismo,
-- ni siquiera vía la política de "cada quien su propio perfil".
create or replace function staff_prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and (auth.jwt() ->> 'email') <> 'cptt@ipl.edu.do' then
    raise exception 'Solo cptt@ipl.edu.do puede cambiar roles de usuario';
  end if;
  return new;
end;
$$;

create trigger staff_role_guard
  before update on staff
  for each row execute function staff_prevent_self_role_change();

alter table service_requests
  add constraint service_requests_assigned_advisor_id_fkey
  foreign key (assigned_advisor_id) references staff (id) on delete set null;

-- Vista sin correo, para quien no sea la cuenta creadora.
create or replace view staff_directory as
  select id, name, role, photo from staff;

grant select on staff_directory to authenticated;

-- Funciones para los dos flujos públicos (sin login): el formulario de
-- solicitud de servicios y la página de firma. Cada una hace exactamente
-- una cosa puntual y acotada — no exponen el resto de la tabla a la anon
-- key, a diferencia de un acceso directo con RLS abierta.

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

-- Bucket privado para las fotos de cédula: cualquiera puede subir desde
-- el formulario público, solo el staff logueado puede verlas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cedulas', 'cedulas', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "Cualquiera puede subir fotos de cédula"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'cedulas');

create policy "Staff autenticado ve las fotos de cédula"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cedulas');

create policy "Staff autenticado borra fotos de cédula"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cedulas');

-- Guarda las rutas de las fotos ya subidas al bucket. Security definer
-- porque clients ya no acepta update directo de la anon key.
create or replace function set_client_id_photos(p_client_id uuid, p_paths text[])
returns void
language sql
security definer
set search_path = public
as $$
  update clients set id_photo_paths = p_paths where id = p_client_id;
$$;

grant execute on function set_client_id_photos(uuid, text[]) to anon, authenticated;

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

-- Solo un administrador puede revertir una eliminación desde el
-- Historial — un editor puede eliminar, pero no deshacer una eliminación.
create or replace function restore_service_request(p_service_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_actor_name text;
  v_client_id uuid;
  v_business_name text;
begin
  select role, name into v_role, v_actor_name from staff where id = auth.uid();

  if v_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede revertir una eliminación';
  end if;

  update service_requests
    set deleted_at = null
    where id = p_service_request_id
    returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'Solicitud no encontrada';
  end if;

  select business_name into v_business_name from clients where id = v_client_id;

  insert into service_request_changes (service_request_id, business_name, action, actor)
  values (p_service_request_id, v_business_name, 'restaurado', coalesce(v_actor_name, 'Usuario'));
end;
$$;

grant execute on function restore_service_request(uuid) to authenticated;

-- Encuesta de satisfacción de asistencia técnica: formulario público,
-- sin login, calcado del formulario de Google Forms existente
-- (CPTTAPR04). No se vincula a un cliente/servicio interno porque el
-- formulario original tampoco lo hace — solo pide correo y nombre o
-- empresa como texto libre. Por ahora solo se guardan las respuestas;
-- todavía no hay pantalla para verlas, así que no se agrega política
-- de lectura (RLS queda activo sin políticas, solo la función abajo
-- puede insertar).
create table satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  email text not null,
  business_name text not null,

  overall_rating text not null
    check (overall_rating in ('Excelente', 'Muy bueno', 'Bueno', 'Regular', 'Deficiente')),
  staff_knowledge_satisfaction text not null
    check (staff_knowledge_satisfaction in ('Muy satisfecho', 'Bastante satisfecho', 'Satisfecho', 'Poco satisfecho', 'Nada satisfecho')),
  response_time_satisfaction text not null
    check (response_time_satisfaction in ('Muy satisfecho', 'Bastante satisfecho', 'Satisfecho', 'Poco satisfecho', 'Nada satisfecho')),
  recommend_likelihood int not null check (recommend_likelihood between 1 and 5),

  suggested_referrals text,
  suggestion text
);

alter table satisfaction_surveys enable row level security;

create or replace function submit_satisfaction_survey(p_survey jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into satisfaction_surveys (
    email, business_name, overall_rating, staff_knowledge_satisfaction,
    response_time_satisfaction, recommend_likelihood, suggested_referrals,
    suggestion
  )
  values (
    p_survey ->> 'email',
    p_survey ->> 'business_name',
    p_survey ->> 'overall_rating',
    p_survey ->> 'staff_knowledge_satisfaction',
    p_survey ->> 'response_time_satisfaction',
    (p_survey ->> 'recommend_likelihood')::int,
    p_survey ->> 'suggested_referrals',
    p_survey ->> 'suggestion'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function submit_satisfaction_survey(jsonb) to anon, authenticated;

-- Acuerdo de Finalización de Proyecto (CPTTAPR03): el asesor y el
-- cliente firman en persona cuando se cierra un servicio. La firma del
-- asesor se guarda una vez en su perfil (staff.signature) y se copia
-- al acuerdo en el momento de crearlo, para que el documento no cambie
-- si el asesor actualiza su firma después. La firma del cliente se
-- dibuja en el momento, no hay enlace público — por eso no hace falta
-- una función RPC ni política para anon, solo las políticas normales
-- de staff autenticado.
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

-- Evidencia fotográfica por servicio brindado: dentro de una solicitud
-- de servicios, cada ítem marcado en "Servicios solicitados" puede
-- tener sus propias fotos como prueba de que se brindó. Se guarda el
-- texto del servicio tal cual, no un id, porque `services` en
-- service_requests ya es un array de texto libre (mismo patrón que
-- ahí). Solo staff logueado sube/ve/borra evidencia — no hay flujo
-- público.
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

-- Inserta la fila de la cuenta creadora en cuanto exista en auth.users.
-- No hace nada si ya está insertada o si todavía no se creó la cuenta.
insert into staff (id, email, name, role)
select id, email, 'CPTT Loyola', 'administrador'
from auth.users
where email = 'cptt@ipl.edu.do'
on conflict (id) do nothing;
