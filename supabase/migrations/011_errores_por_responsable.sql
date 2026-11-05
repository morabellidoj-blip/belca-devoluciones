-- 011: marcas de error por responsable (cliente, ventas, televentas, chofer)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='casos' and column_name='error_ventas') then
    alter table casos add column error_cliente boolean not null default false;
    alter table casos add column error_ventas boolean not null default false;
    alter table casos add column error_televentas boolean not null default false;
    alter table casos add column error_chofer boolean not null default false;
    -- Los casos existentes toman la marca sugerida por su área (solo la primera vez)
    update casos set error_ventas = true where area = 'ventas';
    update casos set error_cliente = true where area = 'cliente';
  end if;
end $$;
