-- Ejecutar en el SQL Editor de Supabase, después de 0020.
-- Vincula la Encuesta de Satisfacción a un servicio puntual. El
-- vínculo es opcional (la encuesta general sigue existiendo tal cual
-- estaba) — se usa cuando el asesor envía la encuesta desde un
-- servicio ya "Completo" (ver services.tsx), generando un enlace
-- público por servicio, mismo patrón que /firmar/:id.

alter table satisfaction_surveys
  add column if not exists service_request_id uuid references service_requests (id);

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
    suggestion, service_request_id
  )
  values (
    p_survey ->> 'email',
    p_survey ->> 'business_name',
    p_survey ->> 'overall_rating',
    p_survey ->> 'staff_knowledge_satisfaction',
    p_survey ->> 'response_time_satisfaction',
    (p_survey ->> 'recommend_likelihood')::int,
    p_survey ->> 'suggested_referrals',
    p_survey ->> 'suggestion',
    nullif(p_survey ->> 'service_request_id', '')::uuid
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Lectura pública mínima para precargar el nombre del negocio cuando
-- la encuesta se abre desde un enlace vinculado a un servicio — mismo
-- patrón que get_signing_info.
create or replace function get_survey_link_info(p_request_id uuid)
returns table (
  business_name text
)
language sql
security definer
set search_path = public
as $$
  select c.business_name
  from service_requests sr
  join clients c on c.id = sr.client_id
  where sr.id = p_request_id and sr.deleted_at is null;
$$;

grant execute on function get_survey_link_info(uuid) to anon, authenticated;
