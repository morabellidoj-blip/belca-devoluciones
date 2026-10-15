-- 003: catálogo de choferes
create table if not exists choferes(id uuid primary key default gen_random_uuid(), nombre text not null, activo boolean default true);
create unique index if not exists choferes_nombre_uq on choferes(nombre);
alter table choferes enable row level security;
drop policy if exists choferes_sel on choferes;
drop policy if exists choferes_w on choferes;
create policy choferes_sel on choferes for select to authenticated using(true);
create policy choferes_w on choferes for all to authenticated using(is_admin()) with check(is_admin());
