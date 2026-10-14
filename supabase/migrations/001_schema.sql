-- BELCA Devoluciones · Esquema completo
create extension if not exists pgcrypto;
create type rol_usuario as enum ('admin','gestor');
create type estado_caso as enum ('nuevo','en_proceso','pendiente_cliente','pendiente_logistica','resuelto','cerrado');
create type estado_canasta as enum ('pendiente','parcial','recuperada','perdida','facturada');
create type tipo_recuperacion as enum ('reventa','cobro_cliente','transportista','proveedor','interna');

-- Usuarios / roles (rol en profiles, enlazado a auth.users)
create table profiles(id uuid primary key references auth.users on delete cascade,
  nombre text not null, rol rol_usuario not null default 'gestor', activo boolean not null default true,
  created_at timestamptz default now());
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,nombre,rol) values(new.id,coalesce(new.raw_user_meta_data->>'nombre',new.email),
  coalesce((new.raw_user_meta_data->>'rol')::rol_usuario,'gestor')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and rol='admin' and activo) $$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and activo) $$;

-- Catálogos
create table vendedores(id uuid primary key default gen_random_uuid(), nombre text not null, activo boolean default true);
create table rutas(id uuid primary key default gen_random_uuid(), nombre text not null unique, activo boolean default true);
create table motivos_devolucion(id uuid primary key default gen_random_uuid(), nombre text not null unique, activo boolean default true);
insert into motivos_devolucion(nombre) values('Producto dañado'),('Producto vencido'),('Error de picking'),('Error de despacho'),
 ('Cliente rechazó producto'),('Producto incorrecto'),('Temperatura incorrecta'),('Calidad'),('Faltante'),('Excedente'),('Otro');
create table clientes(id uuid primary key default gen_random_uuid(), codigo text not null unique, nombre text not null,
  telefono text, vendedor_id uuid references vendedores, ruta_id uuid references rutas, activo boolean default true);
create table config(clave text primary key, valor numeric not null);
insert into config values('horas_sin_gestion',48),('horas_proximo_vencer',24),('canastas_dias_alerta',15),
 ('canastas_max_pendientes',50),('canastas_recuperacion_minima',80);

-- Casos
create sequence seq_caso;
create table casos(id uuid primary key default gen_random_uuid(),
  numero text unique not null default 'DEV-'||lpad(nextval('seq_caso')::text,6,'0'),
  fecha date not null default current_date,
  cliente_id uuid not null references clientes, vendedor_id uuid references vendedores, ruta_id uuid references rutas,
  chofer text, ayudante text, factura text, pedido text, producto text, cantidad numeric, monto numeric(14,2) default 0,
  motivo_id uuid references motivos_devolucion, estado estado_caso not null default 'nuevo',
  critico boolean default false, observaciones text, firma_url text,
  gestor_id uuid references profiles default auth.uid(), ultima_gestion timestamptz default now(),
  fecha_vencimiento date, fecha_cierre timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create index on casos(estado); create index on casos(fecha); create index on casos(cliente_id);
create index on casos(ruta_id); create index on casos(vendedor_id); create index on casos(motivo_id); create index on casos(gestor_id);

create table seguimientos(id uuid primary key default gen_random_uuid(), caso_id uuid not null references casos on delete cascade,
  usuario_id uuid references profiles default auth.uid(), comentario text, accion text, proximo_paso text,
  fecha_compromiso date, created_at timestamptz default now());
create index on seguimientos(caso_id);

create table llamadas(id uuid primary key default gen_random_uuid(), fecha date not null default current_date,
  hora time not null default localtime, cliente_id uuid references clientes, contacto text, telefono text,
  motivo text, descripcion text, resultado text, duracion_seg int default 0, requiere_seguimiento boolean default false,
  caso_id uuid references casos, gestor_id uuid references profiles default auth.uid(), created_at timestamptz default now());
create index on llamadas(fecha); create index on llamadas(cliente_id);

-- Canastas retornables
create table canastas(id uuid primary key default gen_random_uuid(), fecha date not null default current_date,
  cliente_id uuid not null references clientes, ruta_id uuid references rutas, vendedor_id uuid references vendedores,
  chofer text, ayudante text, tipo_canasta text not null,
  entregada int not null check(entregada>=0), recuperada int not null default 0 check(recuperada>=0),
  pendiente int generated always as (entregada-recuperada) stored,
  estado estado_canasta not null default 'pendiente', observaciones text,
  gestor_id uuid references profiles default auth.uid(), created_at timestamptz default now(), updated_at timestamptz default now(),
  check(recuperada<=entregada));
create index on canastas(cliente_id); create index on canastas(ruta_id); create index on canastas(estado); create index on canastas(fecha);

-- Recuperación económica
create table recuperaciones(id uuid primary key default gen_random_uuid(), caso_id uuid not null references casos on delete cascade,
  cliente_id uuid references clientes, monto_perdida numeric(14,2) not null default 0,
  monto_recuperado numeric(14,2) not null default 0, tipo tipo_recuperacion not null,
  created_by uuid references profiles default auth.uid(), created_at timestamptz default now());
create index on recuperaciones(caso_id); create index on recuperaciones(cliente_id);

create table archivos(id uuid primary key default gen_random_uuid(), caso_id uuid references casos on delete cascade,
  canasta_id uuid references canastas on delete cascade, ruta_storage text not null, nombre text, tipo text,
  subido_por uuid references profiles default auth.uid(), created_at timestamptz default now());
create table notificaciones(id uuid primary key default gen_random_uuid(), usuario_id uuid references profiles,
  tipo text not null, titulo text not null, mensaje text, caso_id uuid references casos, canasta_id uuid references canastas,
  leida boolean default false, created_at timestamptz default now());
create index on notificaciones(usuario_id, leida);

-- Triggers
create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger t_casos_upd before update on casos for each row execute function set_updated_at();
create trigger t_canastas_upd before update on canastas for each row execute function set_updated_at();

create or replace function casos_insert_evento() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.critico then
  insert into notificaciones(tipo,titulo,mensaje,caso_id) values('critica','Incidencia crítica','Caso '||new.numero,new.id); end if;
  return new; end $$;
create trigger t_casos_ins after insert on casos for each row execute function casos_insert_evento();

create or replace function casos_cierre() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.estado='cerrado' and old.estado<>'cerrado' then
  new.fecha_cierre=now();
  insert into notificaciones(tipo,titulo,mensaje,caso_id) values('cierre','Caso cerrado','Caso '||new.numero||' cerrado',new.id); end if;
  return new; end $$;
create trigger t_casos_cierre before update on casos for each row execute function casos_cierre();

create or replace function seguimiento_toca_caso() returns trigger language plpgsql security definer set search_path=public as $$
begin update casos set ultima_gestion=now() where id=new.caso_id; return new; end $$;
create trigger t_seg after insert on seguimientos for each row execute function seguimiento_toca_caso();

-- Alertas (ejecutar cada hora con pg_cron)
create or replace function generar_alertas() returns void language plpgsql security definer set search_path=public as $$
declare h int:=(select valor from config where clave='horas_sin_gestion');
 hv int:=(select valor from config where clave='horas_proximo_vencer');
 d int:=(select valor from config where clave='canastas_dias_alerta');
 mx numeric:=(select valor from config where clave='canastas_max_pendientes');
 mn numeric:=(select valor from config where clave='canastas_recuperacion_minima');
begin
 insert into notificaciones(tipo,titulo,mensaje,caso_id) select 'sin_gestion','Caso sin gestión','Caso '||numero||' con más de '||h||'h sin gestión',id
  from casos c where estado not in('resuelto','cerrado') and ultima_gestion<now()-make_interval(hours=>h)
  and not exists(select 1 from notificaciones n where n.caso_id=c.id and n.tipo='sin_gestion' and n.created_at>now()-interval '24 hours');
 insert into notificaciones(tipo,titulo,mensaje,caso_id) select 'por_vencer','Caso por vencer','Caso '||numero||' vence '||fecha_vencimiento,id
  from casos c where estado not in('resuelto','cerrado') and fecha_vencimiento<=current_date+(hv/24)
  and not exists(select 1 from notificaciones n where n.caso_id=c.id and n.tipo='por_vencer' and n.created_at>now()-interval '24 hours');
 insert into notificaciones(tipo,titulo,mensaje) select 'canasta_antigua','Canastas pendientes > '||d||' días',cl.nombre
  from canastas c join clientes cl on cl.id=c.cliente_id where c.pendiente>0 and c.estado in('pendiente','parcial') and c.fecha<current_date-d
  group by cl.id,cl.nombre having not exists(select 1 from notificaciones n where n.tipo='canasta_antigua' and n.mensaje=cl.nombre and n.created_at>now()-interval '24 hours');
 insert into notificaciones(tipo,titulo,mensaje) select 'canasta_exceso','Cliente supera pendientes permitidos',cl.nombre||': '||sum(c.pendiente)
  from canastas c join clientes cl on cl.id=c.cliente_id where c.estado in('pendiente','parcial') group by cl.nombre having sum(c.pendiente)>mx
  and not exists(select 1 from notificaciones n where n.tipo='canasta_exceso' and n.mensaje like cl.nombre||'%' and n.created_at>now()-interval '24 hours');
 insert into notificaciones(tipo,titulo,mensaje) select 'ruta_baja','Ruta con baja recuperación',r.nombre||': '||round(100.0*sum(c.recuperada)/nullif(sum(c.entregada),0))||'%'
  from canastas c join rutas r on r.id=c.ruta_id where c.fecha>=current_date-30 group by r.nombre
  having 100.0*sum(c.recuperada)/nullif(sum(c.entregada),0)<mn
  and not exists(select 1 from notificaciones n where n.tipo='ruta_baja' and n.mensaje like r.nombre||'%' and n.created_at>now()-interval '24 hours');
end $$;

-- KPIs (vistas; respetan RLS)
create view kpi_casos_dia with(security_invoker=true) as
 select fecha, count(*) recibidos, count(*) filter(where estado='cerrado') cerrados,
 round(100.0*count(*) filter(where estado='cerrado')/count(*),1) efectividad from casos group by fecha;
create view kpi_resolucion with(security_invoker=true) as
 select gestor_id, date_trunc('month',created_at) mes, count(*) casos,
 round(avg(extract(epoch from fecha_cierre-created_at)/3600)::numeric,1) horas_promedio from casos where fecha_cierre is not null group by 1,2;
create view kpi_canastas_ruta with(security_invoker=true) as
 select r.nombre ruta, sum(entregada) entregadas, sum(recuperada) recuperadas, sum(pendiente) pendientes,
 round(100.0*sum(recuperada)/nullif(sum(entregada),0),1) pct_recuperacion from canastas c join rutas r on r.id=c.ruta_id group by r.nombre;
create view kpi_canastas_chofer with(security_invoker=true) as
 select chofer, sum(entregada) entregadas, sum(recuperada) recuperadas, round(100.0*sum(recuperada)/nullif(sum(entregada),0),1) pct_recuperacion
 from canastas group by chofer;
create view kpi_recuperacion_motivo with(security_invoker=true) as
 select m.nombre motivo, sum(r.monto_perdida) perdida, sum(r.monto_recuperado) recuperado,
 round(100.0*sum(r.monto_recuperado)/nullif(sum(r.monto_perdida),0),1) pct
 from recuperaciones r join casos c on c.id=r.caso_id join motivos_devolucion m on m.id=c.motivo_id group by m.nombre;
create view kpi_gestor with(security_invoker=true) as
 select p.id gestor_id, p.nombre,
 (select count(*) from llamadas l where l.gestor_id=p.id) llamadas,
 (select count(*) from casos c where c.gestor_id=p.id) casos,
 (select count(*) from casos c where c.gestor_id=p.id and estado='cerrado') cerrados,
 (select count(*) from seguimientos s where s.usuario_id=p.id) seguimientos,
 (select coalesce(sum(monto_recuperado),0) from recuperaciones r where r.created_by=p.id) recuperado from profiles p;

-- RLS
do $$ declare t text; begin
 foreach t in array array['casos','seguimientos','llamadas','canastas','recuperaciones','archivos','notificaciones'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy "%1$s_sel" on %1$I for select to authenticated using(is_staff())',t);
  execute format('create policy "%1$s_ins" on %1$I for insert to authenticated with check(is_staff())',t);
  execute format('create policy "%1$s_upd" on %1$I for update to authenticated using(is_staff())',t);
  execute format('create policy "%1$s_del" on %1$I for delete to authenticated using(is_admin())',t);
 end loop;
 foreach t in array array['clientes','vendedores','rutas','motivos_devolucion','config','profiles'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy "%1$s_sel" on %1$I for select to authenticated using(true)',t);
  execute format('create policy "%1$s_w" on %1$I for all to authenticated using(is_admin()) with check(is_admin())',t);
 end loop; end $$;

-- Storage (evidencias)
insert into storage.buckets(id,name,public) values('evidencias','evidencias',false) on conflict do nothing;
create policy "evid_rw" on storage.objects for all to authenticated using(bucket_id='evidencias' and is_staff()) with check(bucket_id='evidencias' and is_staff());
