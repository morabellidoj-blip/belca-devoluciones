-- 002: unifica llamadas y casos (duración opcional) + motivos con código TMOTIV
alter table casos add column if not exists duracion_min numeric;

alter table motivos_devolucion add column if not exists codigo text;
alter table motivos_devolucion drop constraint if exists motivos_devolucion_nombre_key;
create unique index if not exists motivos_codigo_uq on motivos_devolucion(codigo);

-- Retirar los motivos genéricos iniciales (si ya tienen casos, solo se desactivan)
delete from motivos_devolucion where codigo is null and nombre in ('Producto dañado','Producto vencido','Error de picking','Error de despacho',
 'Cliente rechazó producto','Producto incorrecto','Temperatura incorrecta','Calidad','Faltante','Excedente','Otro')
 and not exists(select 1 from casos c where c.motivo_id=motivos_devolucion.id);
update motivos_devolucion set activo=false where codigo is null and nombre in ('Producto dañado','Producto vencido','Error de picking','Error de despacho',
 'Cliente rechazó producto','Producto incorrecto','Temperatura incorrecta','Calidad','Faltante','Excedente','Otro');

insert into motivos_devolucion(codigo,nombre) values
('3','FACTURADO Y CARGADO, PERO NO ENTREGADO AL CLIENTE * TRANSP *'),
('8','PEDIDO MAL FACTURADO (PROD. FACTURADO NO SOLICITADO POR EL CLIENTE)'),
('68','PEDIDO MAL FACTURADO (PROD. FACTURADO NO SOLICITADO POR EL CLIENTE)'),
('4','PRODUCTO PRONTO A VENCER'),
('6','CALIDAD DEL PRODUCTO NO ACEPTADO POR EL CLIENTE'),
('15','PRODUCTO EN MAL ESTADO (DAÑOS FÍSICOS)'),
('21','NEGOCIO CERRADO/FUERA DE HORARIO'),
('22','CLIENTE NO TENIA DINERO (CONTADO Y/O CONTADO-EFECTIVO)'),
('23','DIRECCION INCORRECTA'),
('32','PEDIDO DUPLICADO'),
('40','FUERA DE HORARIO'),
('75','FALTANTE (FACTURADO, PERO NO SE CARGO AL CAMION ) *ALMACÉN*'),
('77','OTROS MOTIVOS POR PARTE DEL CLIENTE'),
('72','SOBRANTE MERCADERIA EN EL CAMION'),
('51','PRODUCTO MAL ENTREGADO (PROD. ENTREGADO DIFERENTE AL FACTURADO)'),
('74','MAL DIGITADO VENTAS'),
('64','DIFERENCIA DE PESOS ENTRE ETIQUETAS'),
('14','PRODUCTO VENCIDO'),
('28','DIFERENCIA DE PRECIO'),
('63','MAL ETIQUETADO'),
('12','NO ACEPTADO EL PRODUCTO POR CLIENTE'),
('20','NOTAS DESARROLLOS HOTELEROS')
on conflict (codigo) do update set nombre=excluded.nombre, activo=true;
insert into motivos_devolucion(codigo,nombre) select null,'NO DEFINIDO' where not exists(select 1 from motivos_devolucion where nombre='NO DEFINIDO');

-- Evita nombres de vendedores repetidos (necesario para importar catálogos)
delete from vendedores a using vendedores b where a.nombre = b.nombre and a.id > b.id;
create unique index if not exists vendedores_nombre_uq on vendedores(nombre);
