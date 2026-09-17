-- Ejecutar en el SQL Editor de Supabase, después de 0026.
-- El Acuerdo de Acciones ya no incluye firma del cliente: guardarlo
-- transiciona el servicio a "En proceso" directamente, sin enlace de
-- firma público. Se quitan la columna y las funciones que solo existían
-- para ese flujo (mismo patrón, el Acuerdo de Finalización no se toca).

drop function if exists sign_action_agreement(uuid, text);
drop function if exists get_action_agreement_signing_info(uuid);

alter table project_action_agreements drop column client_signature;
