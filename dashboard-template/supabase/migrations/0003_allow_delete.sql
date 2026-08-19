-- Ejecutar en el SQL Editor de Supabase.
-- Permite eliminar service_requests desde el panel de Clientes. Sin login
-- todavía: revisar cuando se agregue autenticación al dashboard.

create policy "Cualquiera puede eliminar las solicitudes"
  on service_requests for delete
  to anon, authenticated
  using (true);
