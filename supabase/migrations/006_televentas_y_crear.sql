-- 006: catálogo de televentas + permitir crear catálogos desde los formularios
create table if not exists televentas(id uuid primary key default gen_random_uuid(), nombre text not null, telefono text, correo text,
  vendedor_id uuid references vendedores on delete set null, activo boolean default true);
create unique index if not exists televentas_nombre_uq on televentas(nombre);
alter table televentas enable row level security;
drop policy if exists televentas_sel on televentas;
drop policy if exists televentas_w on televentas;
create policy televentas_sel on televentas for select to authenticated using(true);
create policy televentas_w on televentas for all to authenticated using(is_admin()) with check(is_admin());

alter table casos add column if not exists televenta_id uuid references televentas on delete set null;
create index if not exists casos_televenta_idx on casos(televenta_id);

-- Cualquier usuario activo puede AGREGAR registros a los catálogos (editar y borrar sigue siendo solo del administrador)
do $$ declare t text; begin
  foreach t in array array['clientes','vendedores','rutas','motivos_devolucion','choferes','televentas'] loop
    execute format('drop policy if exists "%1$s_ins_staff" on %1$I', t);
    execute format('create policy "%1$s_ins_staff" on %1$I for insert to authenticated with check(is_staff())', t);
  end loop;
end $$;
