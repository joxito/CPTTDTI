-- Ejecutar en el SQL Editor de Supabase, después de 0011.
-- restore_service_request quedaba con actor fijo en 'Usuario'. Ahora
-- usa el nombre real de quien revierte (ya se validó que es
-- administrador antes de este punto).

create or replace function restore_service_request(p_service_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_actor_name text;
  v_client_id uuid;
  v_business_name text;
begin
  select role, name into v_role, v_actor_name from staff where id = auth.uid();

  if v_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede revertir una eliminación';
  end if;

  update service_requests
    set deleted_at = null
    where id = p_service_request_id
    returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'Solicitud no encontrada';
  end if;

  select business_name into v_business_name from clients where id = v_client_id;

  insert into service_request_changes (service_request_id, business_name, action, actor)
  values (p_service_request_id, v_business_name, 'restaurado', coalesce(v_actor_name, 'Usuario'));
end;
$$;

grant execute on function restore_service_request(uuid) to authenticated;
