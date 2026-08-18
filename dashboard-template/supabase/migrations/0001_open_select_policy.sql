-- Ejecutar en el SQL Editor de Supabase.
-- Permite leer service_requests sin necesidad de estar logueado (todavía no
-- hay login en el dashboard). Esto expone datos personales de los clientes
-- a quien conozca la anon key del proyecto: revisar cuando se agregue
-- autenticación al dashboard.

drop policy if exists "Usuarios autenticados pueden ver las solicitudes" on service_requests;

create policy "Cualquiera puede ver las solicitudes"
  on service_requests for select
  to anon, authenticated
  using (true);
