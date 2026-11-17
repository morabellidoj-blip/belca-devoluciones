-- Gestión y resultados opcionales. Ejecutar después de 014.
-- Permite crear, cerrar y editar después sin perder historial ni datos.
begin;
create or replace function public.auditar_caso() returns trigger language plpgsql security definer set search_path=public as $$
declare dif jsonb;
begin
 if TG_WHEN='BEFORE' and new.estado='cerrado' and old.estado<>'cerrado' then
  new.responsable_cierre=auth.uid();
 elsif TG_WHEN='BEFORE' and new.estado<>'cerrado' and old.estado='cerrado' then
  new.fecha_cierre=null; new.responsable_cierre=null;
 end if;
 select jsonb_object_agg(n.key,jsonb_build_object('antes',o.value,'despues',n.value)) into dif
 from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using(key)
 where n.value is distinct from o.value and n.key not in ('updated_at','ultima_gestion');
 if TG_WHEN='BEFORE' then
  if dif is not null then new.ultima_gestion=now(); end if;
  return new;
 end if;
 if dif is not null then
  insert into seguimientos(caso_id,usuario_id,accion,cambios) values(new.id,auth.uid(),case when new.estado<>old.estado then 'Cambio de estado: '||old.estado||' → '||new.estado else 'Actualización del caso' end,dif);
 end if;
 return new;
end $$;
commit;
