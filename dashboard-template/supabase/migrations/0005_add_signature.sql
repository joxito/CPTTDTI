-- Ejecutar en el SQL Editor de Supabase.
-- Guarda la firma dibujada como imagen (data URL base64 de un PNG). Es
-- opcional porque la pregunta de Firma en el formulario no es obligatoria.
alter table service_requests add column if not exists signature text;
