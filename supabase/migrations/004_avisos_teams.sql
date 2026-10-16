-- 004: avisos (sonido en la app) + envío automático a Microsoft Teams
create extension if not exists pg_net;

alter table notificaciones add column if not exists origen uuid;   -- quién generó el aviso (para no avisarle a él mismo)

create table if not exists ajustes(clave text primary key, valor text);
alter table ajustes enable row level security;
drop policy if exists ajustes_admin on ajustes;
create policy ajustes_admin on ajustes for all to authenticated using(is_admin()) with check(is_admin());
insert into ajustes values('teams_url',''),('app_url',''),
 ('teams_tipos','critica,sin_gestion,por_vencer,canasta_antigua,canasta_exceso,ruta_baja') on conflict do nothing;

-- Cada caso nuevo genera un aviso (y uno adicional si es crítico), con cliente, motivo y monto
create or replace function casos_insert_evento() returns trigger language plpgsql security definer set search_path=public as $$
declare cli text; mot text; msg text;
begin
  select nombre into cli from clientes where id=new.cliente_id;
  select trim(coalesce(codigo||' · ','')||nombre) into mot from motivos_devolucion where id=new.motivo_id;
  msg := coalesce(cli,'')||' · '||coalesce(mot,'Sin motivo')||' · Monto '||coalesce(new.monto,0);
  insert into notificaciones(tipo,titulo,mensaje,caso_id,origen) values('nuevo_caso','Nuevo caso '||new.numero,msg,new.id,new.gestor_id);
  if new.critico then
    insert into notificaciones(tipo,titulo,mensaje,caso_id,origen) values('critica','Incidencia crítica '||new.numero,msg,new.id,new.gestor_id);
  end if;
  return new;
end $$;

-- Envío a Teams: se dispara con cada aviso nuevo; nunca bloquea el registro si Teams falla
create or replace function notif_a_teams() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare u text; tipos text; app text; link text; payload jsonb;
begin
  select valor into u from ajustes where clave='teams_url';
  if coalesce(u,'')='' then return new; end if;
  select valor into tipos from ajustes where clave='teams_tipos';
  if coalesce(tipos,'')='' or not (new.tipo = any(string_to_array(tipos,','))) then return new; end if;
  app := coalesce((select valor from ajustes where clave='app_url'),'');
  link := case when app='' then null when new.caso_id is not null then rtrim(app,'/')||'/casos/'||new.caso_id else rtrim(app,'/')||'/alertas' end;
  payload := jsonb_build_object('type','message','attachments',jsonb_build_array(jsonb_build_object(
    'contentType','application/vnd.microsoft.card.adaptive','contentUrl',null,
    'content',jsonb_build_object('$schema','http://adaptivecards.io/schemas/adaptive-card.json','type','AdaptiveCard','version','1.4',
      'body',jsonb_build_array(
        jsonb_build_object('type','TextBlock','weight','Bolder','size','Medium','wrap',true,'text','🔔 '||new.titulo),
        jsonb_build_object('type','TextBlock','wrap',true,'text',coalesce(new.mensaje,''))),
      'actions',case when link is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('type','Action.OpenUrl','title','Abrir en Belca','url',link)) end))));
  perform net.http_post(url := u, body := payload);
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists t_notif_teams on notificaciones;
create trigger t_notif_teams after insert on notificaciones for each row execute function notif_a_teams();
