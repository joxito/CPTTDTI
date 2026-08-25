-- Ejecutar en el SQL Editor de Supabase, después de 0013.
-- Cualquier cuenta con rol administrador puede agregar usuarios (antes
-- era exclusivo de cptt@ipl.edu.do). Eliminar usuarios sigue siendo
-- exclusivo de la cuenta creadora — esa política no cambia.

drop policy if exists "Solo la cuenta creadora agrega usuarios" on staff;

create policy "Un administrador agrega usuarios"
  on staff for insert
  to authenticated
  with check (
    (select role from staff where id = auth.uid()) = 'administrador'
  );
