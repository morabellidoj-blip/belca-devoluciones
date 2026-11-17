-- Ejecutar después de 013. No borra casos ni recuperaciones existentes.
begin;
alter table public.casos add column if not exists responsabilidad_estado text not null default 'investigar' check (responsabilidad_estado in ('investigar','preliminar','confirmada','no_aplica'));
alter table public.casos add column if not exists gestion_resumen text;
alter table public.casos add column if not exists resultado_mercaderia text not null default 'pendiente' check (resultado_mercaderia in ('pendiente','cliente_conserva','devolucion_total','devolucion_parcial','reprogramada','almacen','otra_solucion'));
alter table public.casos add column if not exists resultado_economico text not null default 'pendiente' check (resultado_economico in ('pendiente','sin_perdida','recuperado','parcial','perdida'));
alter table public.casos add column if not exists responsable_cierre uuid references public.profiles(id);
alter table public.seguimientos add column if not exists contacto text;
alter table public.seguimientos add column if not exists respuesta text;
alter table public.seguimientos add column if not exists cambios jsonb;

create or replace function public.puede_consultar() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and activo and rol in ('admin','gestor','consulta')) $$;
-- is_staff se utiliza para las escrituras y el acceso al almacenamiento.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and activo and rol in ('admin','gestor')) $$;
-- El rol no se toma de metadatos que el usuario pueda modificar.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,nombre,rol,activo) values(new.id,coalesce(new.raw_user_meta_data->>'nombre',new.email),'gestor',false); return new; end $$;

do $$ declare t text; begin
 foreach t in array array['casos','seguimientos','llamadas','canastas','recuperaciones','archivos','notificaciones','clientes','vendedores','rutas','motivos_devolucion','config','profiles','choferes','televentas'] loop
  execute format('drop policy if exists %I on public.%I',t||'_sel',t);
  execute format('create policy %I on public.%I for select to authenticated using(public.puede_consultar())',t||'_sel',t);
 end loop;
end $$;
drop policy if exists evid_rw on storage.objects;
drop policy if exists evid_read on storage.objects;
drop policy if exists evid_insert on storage.objects;
drop policy if exists evid_update on storage.objects;
drop policy if exists evid_delete on storage.objects;
create policy evid_read on storage.objects for select to authenticated using(bucket_id='evidencias' and public.puede_consultar());
create policy evid_insert on storage.objects for insert to authenticated with check(bucket_id='evidencias' and public.is_staff());
create policy evid_update on storage.objects for update to authenticated using(bucket_id='evidencias' and public.is_staff()) with check(bucket_id='evidencias' and public.is_staff());
create policy evid_delete on storage.objects for delete to authenticated using(bucket_id='evidencias' and public.is_admin());

-- Bitácora automática de las correcciones; se registra quién cambió cada campo.
create or replace function public.auditar_caso() returns trigger language plpgsql security definer set search_path=public as $$
declare dif jsonb;
begin
 if TG_WHEN='BEFORE' and new.estado='cerrado' and old.estado<>'cerrado' then
  if nullif(trim(new.gestion_resumen),'') is null or new.resultado_mercaderia='pendiente' or new.resultado_economico='pendiente' then
   raise exception 'Complete la gestión realizada, el resultado de la mercadería y el resultado económico antes de cerrar.';
  end if;
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
drop trigger if exists t_auditar_caso on public.casos;
-- AFTER orden alfabético: cierre se calcula antes de auditar.
drop trigger if exists t_casos_b_validar on public.casos;
drop trigger if exists t_casos_z_audit on public.casos;
create trigger t_casos_b_validar before update on public.casos for each row execute function public.auditar_caso();
create trigger t_casos_z_audit after update on public.casos for each row execute function public.auditar_caso();
-- La bitácora es inmutable para gestores; el administrador puede corregirla.
drop policy if exists seguimientos_upd on public.seguimientos;
create policy seguimientos_upd on public.seguimientos for update to authenticated using(public.is_admin()) with check(public.is_admin());
-- La identidad de cada gestión la establece el servidor.
create or replace function public.autor_seguimiento() returns trigger language plpgsql set search_path=public as $$
begin if auth.uid() is not null then new.usuario_id=auth.uid(); end if; return new; end $$;
drop trigger if exists t_seg_autor on public.seguimientos;
create trigger t_seg_autor before insert on public.seguimientos for each row execute function public.autor_seguimiento();
-- Encapsula la función existente para que un usuario de consulta no cree alertas.
do $$ begin
 if to_regprocedure('public.generar_alertas_interna()') is null then
  alter function public.generar_alertas() rename to generar_alertas_interna;
 end if;
end $$;
revoke all on function public.generar_alertas_interna() from public, anon, authenticated;
create or replace function public.generar_alertas() returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not public.is_staff() then raise exception 'Su usuario es de consulta.'; end if;
 perform public.generar_alertas_interna();
end $$;
-- Solo personal activo puede solicitar generación de alertas (consulta no escribe).
revoke execute on function public.generar_alertas() from public, anon;
revoke execute on function public.resumen_semanal() from public, anon;
grant execute on function public.generar_alertas() to authenticated;
grant execute on function public.resumen_semanal() to authenticated;
commit;
