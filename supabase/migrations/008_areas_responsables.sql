-- 008: área responsable por motivo y por caso (para no atribuir a vendedores/clientes lo que no les corresponde)
alter table motivos_devolucion add column if not exists area text;
alter table casos add column if not exists area text;

-- Asignación sugerida (se puede cambiar en Administración). Solo se llena donde aún no hay área.
update motivos_devolucion set area = case codigo
  when '8' then 'ventas' when '68' then 'ventas' when '74' then 'ventas' when '28' then 'ventas' when '32' then 'ventas'
  when '3' then 'logistica'
  when '75' then 'almacen' when '72' then 'almacen' when '51' then 'almacen'
  when '4' then 'calidad' when '6' then 'calidad' when '14' then 'calidad' when '63' then 'calidad' when '64' then 'calidad'
  when '21' then 'cliente' when '22' then 'cliente' when '40' then 'cliente' when '77' then 'cliente' when '12' then 'cliente'
  else 'investigar' end
where area is null;

-- Los casos que ya existen heredan el área de su motivo
update casos c set area = coalesce(m.area,'investigar') from motivos_devolucion m where c.motivo_id = m.id and c.area is null;
update casos set area = 'investigar' where area is null;
create index if not exists casos_area_idx on casos(area);
