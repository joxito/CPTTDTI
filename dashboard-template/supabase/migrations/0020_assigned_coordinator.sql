-- Ejecutar en el SQL Editor de Supabase, después de 0019.
-- "Coordinador(a) encargado": mismo patrón que assigned_advisor_id —
-- se asigna/reasigna por separado, y permite autocompletar su firma
-- (guardada en su perfil, staff.signature) en el Acuerdo de Acciones
-- del Proyecto, igual que ya pasa con el asesor.

alter table service_requests
  add column if not exists assigned_coordinator_id uuid references staff (id) on delete set null;
