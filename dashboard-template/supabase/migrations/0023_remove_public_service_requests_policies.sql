-- Ejecutar en el SQL Editor de Supabase, después de 0022.
-- service_requests tenía 3 políticas heredadas de una etapa temprana
-- del proyecto que daban acceso total (SELECT/UPDATE/DELETE, sin
-- restricción) a "anon" -- cualquier visitante sin sesión, no solo el
-- staff logueado. Ningún flujo público actual las necesita: firmar,
-- la solicitud pública y la encuesta pasan por funciones RPC
-- security definer (submit_service_request, sign_service_request,
-- submit_satisfaction_survey), que no dependen de RLS a nivel de
-- tabla para "anon". Dejarlas expuestas permitía leer o borrar
-- cualquier solicitud (datos de clientes, cédulas, firmas) sin
-- autenticarse.

drop policy if exists "Cualquiera puede ver las solicitudes" on service_requests;
drop policy if exists "Cualquiera puede editar las solicitudes" on service_requests;
drop policy if exists "Cualquiera puede eliminar las solicitudes" on service_requests;
