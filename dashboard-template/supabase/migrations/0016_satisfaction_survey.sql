-- Ejecutar en el SQL Editor de Supabase, después de 0015.
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
