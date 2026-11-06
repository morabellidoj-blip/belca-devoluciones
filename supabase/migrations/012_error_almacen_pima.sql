-- 012: casillas de error para Almacén y PIMA
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='casos' and column_name='error_almacen') then
    alter table casos add column error_almacen boolean not null default false;
    alter table casos add column error_pima boolean not null default false;
    -- Los casos existentes del área Almacén quedan marcados (solo la primera vez)
    update casos set error_almacen = true where area = 'almacen';
  end if;
end $$;
