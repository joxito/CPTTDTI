-- Ejecutar en el SQL Editor de Supabase, después de 0023.
-- Permite enviar un enlace público para que el cliente firme el
-- Acuerdo de Acciones o el Acuerdo de Finalización más tarde, en vez
-- de firmar en el momento (mismo patrón que /firmar/:id para la
-- Solicitud de Servicios). El estado del servicio ("En proceso" /
-- "Completo") solo avanza cuando el cliente firma -- nunca al crear
-- el acuerdo con la firma pendiente. Las funciones de lectura
-- devuelven el acuerdo completo (no solo el nombre del negocio) para
-- que el cliente pueda revisar todos los campos, de solo lectura,
-- antes de firmar.

alter table project_action_agreements alter column client_signature drop not null;
alter table completion_agreements alter column client_signature drop not null;

drop function if exists get_action_agreement_signing_info(uuid);

create or replace function get_action_agreement_signing_info(p_agreement_id uuid)
returns table (
  business_name text,
  representative_name text,
  project_name text,
  service_type text,
  service_quantity text,
  estimated_completion_time text,
  identified_need text,
  service_scope text,
  proposed_solution text,
  agreements text,
  activities jsonb,
  advisor_name text,
  advisor_signature text,
  coordinator_name text,
  coordinator_signature text,
  agreement_date date,
  client_signature text
)
language sql
security definer
set search_path = public
as $$
  select
    c.business_name,
    c.representative_name,
    paa.project_name,
    paa.service_type,
    paa.service_quantity,
    paa.estimated_completion_time,
    paa.identified_need,
    paa.service_scope,
    paa.proposed_solution,
    paa.agreements,
    paa.activities,
    s.name,
    paa.advisor_signature,
    paa.coordinator_name,
    paa.coordinator_signature,
    paa.agreement_date,
    paa.client_signature
  from project_action_agreements paa
  join service_requests sr on sr.id = paa.service_request_id
  join clients c on c.id = sr.client_id
  join staff s on s.id = paa.advisor_id
  where paa.id = p_agreement_id;
$$;

grant execute on function get_action_agreement_signing_info(uuid) to anon, authenticated;

create or replace function sign_action_agreement(p_agreement_id uuid, p_signature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid;
  v_business_name text;
  v_already_signed boolean;
begin
  select paa.service_request_id, (paa.client_signature is not null), c.business_name
  into v_service_id, v_already_signed, v_business_name
  from project_action_agreements paa
  join service_requests sr on sr.id = paa.service_request_id
  join clients c on c.id = sr.client_id
  where paa.id = p_agreement_id;

  if v_service_id is null then
    raise exception 'Acuerdo no encontrado';
  end if;

  update project_action_agreements
  set client_signature = p_signature
  where id = p_agreement_id;

  if not v_already_signed then
    update service_requests set status = 'en_proceso' where id = v_service_id;

    insert into service_request_changes (
      service_request_id, business_name, action, changed_fields, actor
    )
    values (
      v_service_id,
      v_business_name,
      'editado',
      jsonb_build_object('status', jsonb_build_object('from', 'iniciado', 'to', 'en_proceso')),
      'Cliente'
    );
  end if;
end;
$$;

grant execute on function sign_action_agreement(uuid, text) to anon, authenticated;

drop function if exists get_completion_agreement_signing_info(uuid);

create or replace function get_completion_agreement_signing_info(p_agreement_id uuid)
returns table (
  business_name text,
  representative_name text,
  advisor_name text,
  advisor_signature text,
  agreement_date date,
  client_signature text
)
language sql
security definer
set search_path = public
as $$
  select
    c.business_name,
    c.representative_name,
    s.name,
    ca.advisor_signature,
    ca.agreement_date,
    ca.client_signature
  from completion_agreements ca
  join service_requests sr on sr.id = ca.service_request_id
  join clients c on c.id = sr.client_id
  join staff s on s.id = ca.advisor_id
  where ca.id = p_agreement_id;
$$;

grant execute on function get_completion_agreement_signing_info(uuid) to anon, authenticated;

create or replace function sign_completion_agreement(p_agreement_id uuid, p_signature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_id uuid;
  v_business_name text;
  v_already_signed boolean;
begin
  select ca.service_request_id, (ca.client_signature is not null), c.business_name
  into v_service_id, v_already_signed, v_business_name
  from completion_agreements ca
  join service_requests sr on sr.id = ca.service_request_id
  join clients c on c.id = sr.client_id
  where ca.id = p_agreement_id;

  if v_service_id is null then
    raise exception 'Acuerdo no encontrado';
  end if;

  update completion_agreements
  set client_signature = p_signature
  where id = p_agreement_id;

  if not v_already_signed then
    update service_requests set status = 'completo' where id = v_service_id;

    insert into service_request_changes (
      service_request_id, business_name, action, changed_fields, actor
    )
    values (
      v_service_id,
      v_business_name,
      'editado',
      jsonb_build_object('status', jsonb_build_object('from', 'en_proceso', 'to', 'completo')),
      'Cliente'
    );
  end if;
end;
$$;

grant execute on function sign_completion_agreement(uuid, text) to anon, authenticated;
