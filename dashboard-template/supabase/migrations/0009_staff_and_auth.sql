-- Ejecutar en el SQL Editor de Supabase.
-- Fase final de la hoja de ruta: sistema de usuarios. Antes de correr esto,
-- creá la cuenta cptt@ipl.edu.do desde el Dashboard de Supabase
-- (Authentication > Users > Add user) — esta migración inserta su fila en
-- staff automáticamente en cuanto esa cuenta exista.

create table if not exists staff (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('administrador', 'editor')),
  -- Foto de perfil como data URL base64, mismo patrón que la firma en
  -- service_requests — no hay bucket de Storage en el proyecto.
  photo text,
  created_at timestamptz not null default now(),

  -- Refuerzo a nivel de esquema: si la fila es la de la cuenta creadora,
  -- su rol no puede ser otra cosa que administrador.
  constraint creator_is_admin
    check (email <> 'cptt@ipl.edu.do' or role = 'administrador')
);

alter table staff enable row level security;

-- Todo el staff autenticado puede ver el directorio completo (la vista
-- staff_directory, más abajo, es la que se usa para ocultar el correo a
-- quien no sea la cuenta creadora).
create policy "Staff autenticado puede ver el staff"
  on staff for select
  to authenticated
  using (true);

-- Solo cptt@ipl.edu.do agrega usuarios. Nadie más, ni siquiera otra cuenta
-- con rol administrador.
create policy "Solo la cuenta creadora agrega usuarios"
  on staff for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cptt@ipl.edu.do');

-- Solo la cuenta creadora edita filas de otros. Cada quien puede editar su
-- propia fila (para cambiar su nombre/foto desde Configuración).
create policy "Creador edita cualquiera, cada quien su propio perfil"
  on staff for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cptt@ipl.edu.do' or auth.uid() = id)
  with check ((auth.jwt() ->> 'email') = 'cptt@ipl.edu.do' or auth.uid() = id);

-- Solo la cuenta creadora elimina usuarios, y no puede eliminarse a sí
-- misma (la fila de cptt@ipl.edu.do queda excluida de la condición).
create policy "Solo la cuenta creadora elimina, y no a sí misma"
  on staff for delete
  to authenticated
  using (
    (auth.jwt() ->> 'email') = 'cptt@ipl.edu.do'
    and email <> 'cptt@ipl.edu.do'
  );

-- Refuerzo extra: ni siquiera la propia cuenta (vía su política de "cada
-- quien su propio perfil") puede cambiarse el rol a sí misma. Cambiar de
-- rol es exclusivo de la cuenta creadora.
create or replace function staff_prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and (auth.jwt() ->> 'email') <> 'cptt@ipl.edu.do' then
    raise exception 'Solo cptt@ipl.edu.do puede cambiar roles de usuario';
  end if;
  return new;
end;
$$;

create trigger staff_role_guard
  before update on staff
  for each row execute function staff_prevent_self_role_change();

-- Vista de solo lectura sin correo, para quien no sea la cuenta creadora
-- (se filtra en el frontend, no en RLS, cuál de las dos consultar).
create or replace view staff_directory as
  select id, name, role, photo from staff;

grant select on staff_directory to authenticated;

-- Inserta la fila de la cuenta creadora en cuanto exista en auth.users.
-- No hace nada si ya está insertada o si todavía no se creó la cuenta.
insert into staff (id, email, name, role)
select id, email, 'CPTT Loyola', 'administrador'
from auth.users
where email = 'cptt@ipl.edu.do'
on conflict (id) do nothing;
