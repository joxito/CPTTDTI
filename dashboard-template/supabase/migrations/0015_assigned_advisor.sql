-- Ejecutar en el SQL Editor de Supabase, después de 0014.
-- "Asesor encargado": quien creó el registro no siempre es quien va a
-- llevar el servicio, así que se puede asignar/reasignar por separado.
-- No hace falta política nueva: la de "Staff autenticado edita las
-- solicitudes" ya cubre actualizar esta columna.

alter table service_requests
  add column if not exists assigned_advisor_id uuid references staff (id) on delete set null;
