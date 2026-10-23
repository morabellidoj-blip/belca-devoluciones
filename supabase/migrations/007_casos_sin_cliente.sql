-- 007: permitir casos sin cliente ("Sin asignar")
alter table casos alter column cliente_id drop not null;

-- El aviso de un caso sin cliente dice "Sin cliente asignado"
create or replace function casos_insert_evento() returns trigger language plpgsql security definer set search_path=public as $$
declare cli text; mot text; msg text;
begin
  select nombre into cli from clientes where id=new.cliente_id;
  select trim(coalesce(codigo||' · ','')||nombre) into mot from motivos_devolucion where id=new.motivo_id;
  msg := coalesce(cli,'Sin cliente asignado')||' · '||coalesce(mot,'Sin motivo')||' · Monto '||coalesce(new.monto,0);
  insert into notificaciones(tipo,titulo,mensaje,caso_id,origen) values('nuevo_caso','Nuevo caso '||new.numero,msg,new.id,new.gestor_id);
  if new.critico then
    insert into notificaciones(tipo,titulo,mensaje,caso_id,origen) values('critica','Incidencia crítica '||new.numero,msg,new.id,new.gestor_id);
  end if;
  return new;
end $$;
