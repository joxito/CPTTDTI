-- Ejecutar en el SQL Editor de Supabase, después de 0021.
-- satisfaction_surveys tiene RLS activado desde su creación pero nunca
-- tuvo una política de SELECT — el envío público funciona porque pasa
-- por submit_satisfaction_survey (security definer), pero el personal
-- autenticado no podía leer las encuestas ya guardadas (por ejemplo,
-- para saber cuáles servicios completados todavía no tienen encuesta
-- en el Resumen). Sin política, RLS deniega todo por defecto.

create policy "Staff autenticado ve las encuestas de satisfacción"
  on satisfaction_surveys for select
  to authenticated
  using (true);
