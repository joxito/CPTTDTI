-- Ejecutar en el SQL Editor de Supabase.
-- Fase 2 de la hoja de ruta: estado del servicio. El estado del cliente
-- (Nuevo/Recurrente) no se guarda en una columna: se calcula contando
-- cuántos servicios tiene ese client_id, así nunca queda desactualizado.

alter table service_requests
  add column if not exists status text not null default 'iniciado'
  check (status in ('iniciado', 'en_proceso', 'completo'));
