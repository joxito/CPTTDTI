-- Ejecutar en el SQL Editor de Supabase para vaciar los datos de prueba.
-- El orden importa: primero el historial (depende de service_requests por
-- la llave foránea), después los clientes.

delete from service_request_changes;
delete from service_requests;
