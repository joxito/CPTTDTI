-- Ejecutar en el SQL Editor de Supabase.
-- Permite editar service_requests desde el panel de Clientes. Igual que la
-- política de lectura, esto no requiere login todavía: revisar cuando se
-- agregue autenticación al dashboard.

create policy "Cualquiera puede editar las solicitudes"
  on service_requests for update
  to anon, authenticated
  using (true)
  with check (true);
