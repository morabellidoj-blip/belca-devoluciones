-- 009: motivos que pueden ir sin monto (p. ej. sobrante), meta editable y resumen semanal a Teams
alter table motivos_devolucion add column if not exists permite_monto_cero boolean not null default false;
update motivos_devolucion set permite_monto_cero = true where codigo = '72';          -- sobrante: no lleva factura
insert into config(clave, valor) values('meta_efectividad', 80) on conflict do nothing;

-- Resumen de los últimos 7 días completos, enviado al canal de Teams (usa el mismo webhook de Administración)
create or replace function resumen_semanal() returns text language plpgsql security definer set search_path=public,extensions as $$
declare u text; app text; d1 date := current_date - 7; d2 date := current_date - 1;
  n int; v numeric; cer int; ef numeric; ab int; inv int; rec numeric; perd numeric; topm text; topa text; payload jsonb;
begin
  if auth.uid() is not null and not is_admin() then raise exception 'Solo administradores'; end if;
  select valor into u from ajustes where clave='teams_url';
  if coalesce(u,'')='' then return 'Falta configurar la dirección del webhook de Teams en Administración.'; end if;
  app := coalesce((select valor from ajustes where clave='app_url'),'');
  select count(*), coalesce(sum(monto),0), count(*) filter (where estado='cerrado') into n, v, cer from casos where fecha between d1 and d2;
  ef := case when n=0 then 0 else round(100.0*cer/n,1) end;
  select count(*) into ab from casos where estado not in ('resuelto','cerrado');
  select count(*) into inv from casos where coalesce(area,'investigar')='investigar' and estado not in ('resuelto','cerrado');
  select coalesce(sum(monto_recuperado),0), coalesce(sum(monto_perdida),0) into rec, perd from recuperaciones where created_at::date between d1 and d2;
  select trim(coalesce(m.codigo||' · ','')||m.nombre) into topm from casos c join motivos_devolucion m on m.id=c.motivo_id
    where c.fecha between d1 and d2 group by m.id, m.codigo, m.nombre order by sum(c.monto) desc, count(*) desc limit 1;
  select a into topa from (select coalesce(area,'investigar') a, sum(monto) s from casos where fecha between d1 and d2 group by 1 order by 2 desc limit 1) x;
  payload := jsonb_build_object('type','message','attachments',jsonb_build_array(jsonb_build_object(
    'contentType','application/vnd.microsoft.card.adaptive','contentUrl',null,
    'content',jsonb_build_object('$schema','http://adaptivecards.io/schemas/adaptive-card.json','type','AdaptiveCard','version','1.4',
      'body',jsonb_build_array(
        jsonb_build_object('type','TextBlock','weight','Bolder','size','Medium','wrap',true,'text','📊 Resumen semanal de devoluciones'),
        jsonb_build_object('type','TextBlock','wrap',true,'isSubtle',true,'text','Del '||d1||' al '||d2),
        jsonb_build_object('type','FactSet','facts',jsonb_build_array(
          jsonb_build_object('title','Casos recibidos','value',n::text),
          jsonb_build_object('title','Valor devuelto','value',to_char(v,'FM999G999G999G990')),
          jsonb_build_object('title','Efectividad de cierre','value',ef::text||'%'),
          jsonb_build_object('title','Monto recuperado','value',to_char(rec,'FM999G999G999G990')||' de '||to_char(perd,'FM999G999G999G990')),
          jsonb_build_object('title','Casos abiertos hoy','value',ab::text),
          jsonb_build_object('title','Por investigar','value',inv::text),
          jsonb_build_object('title','Motivo principal','value',coalesce(topm,'—')),
          jsonb_build_object('title','Área principal','value',coalesce(topa,'—'))))),
      'actions',case when app='' then '[]'::jsonb else jsonb_build_array(jsonb_build_object('type','Action.OpenUrl','title','Abrir panel','url',rtrim(app,'/')||'/dashboard')) end))));
  perform net.http_post(url := u, body := payload);
  return 'Resumen enviado a Teams.';
end $$;
