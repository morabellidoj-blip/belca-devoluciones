# Actualización: control profesional de devoluciones

Esta versión amplía la app existente. No se ha conectado a la base real ni se han creado usuarios reales desde este archivo.

## Cómo instalar en la app actual

1. Conserve una copia de su código actual y un respaldo de Supabase. Pruebe la actualización en su proyecto de pruebas si ya lo tiene.
2. En el SQL Editor del mismo proyecto Supabase que usa esta app, ejecute **solamente `supabase/migrations/013_rol_consulta.sql`** y espere la confirmación.
3. En una **ejecución separada**, ejecute `supabase/migrations/014_gestion_profesional.sql`. No vuelva a ejecutar 001–012 en una base existente. La 014 es repetible y conserva los registros previos.
4. Actualice el código de su repositorio con el contenido de esta carpeta. Mantenga las variables de entorno de su proyecto; no hay claves en este paquete. Vercel debe usar el archivo `package-lock.json` incluido.
5. Entre con su administrador. Abra **Informe de devoluciones** y después **Administración → Usuarios** para crear los accesos necesarios.

Los usuarios anteriores conservan su rol y sus datos. Los casos anteriores aparecen con responsabilidad y resultados pendientes; no se inventan soluciones históricas. Los cierres anteriores se conservan. Las nuevas auditorías empiezan al instalar esta actualización.

## Usuarios

| Rol | Acceso |
| --- | --- |
| Administrador | Consulta, gestión, usuarios, catálogos, configuración y eliminación. |
| Gestor de devoluciones | Registra y corrige casos, añade gestiones, evidencia y recuperaciones, y documenta cierres. |
| Consulta / gerencia | Lee informes, casos, historial y evidencias, y descarga reportes. No crea, modifica ni elimina registros. |

Ejemplos de uso: usted como administradora o gestora; una persona de gerencia con rol Consulta. Cree cada usuario con su correo real en Administración y comparta su acceso por el canal habitual. No se incluyen contraseñas ni usuarios de ejemplo activos.

Los accesos creados desde Administración se activan al asignar el rol. Los creados manualmente en Supabase necesitan que el administrador active su perfil. Un alta externa no se activa automáticamente ni puede obtener el rol administrador mediante metadatos.

## Flujo de trabajo

1. **Registrar:** cliente (o Sin asignar), factura, producto, monto, motivo, chofer, vendedor y televenta cuando correspondan.
2. **Investigar:** indicar área y errores atribuidos. La responsabilidad inicia como Por investigar; se puede marcar preliminar, confirmada o no aplica. No confundir asociación a un caso con error confirmado.
3. **Gestionar:** abrir el caso → Registrar mi gestión. Elegir qué hizo, con quién habló, describir la gestión, respuesta, pendiente y fecha de compromiso. El sistema registra el usuario y la fecha de Costa Rica.
4. **Resolver:** completar Mi gestión y solución final; indicar si el cliente conservó la mercadería, hubo devolución total/parcial, reprogramación, recepción en almacén u otra solución documentada. Definir también el resultado económico.
5. **Cerrar:** seleccionar Cerrado y guardar. Los cierres nuevos requieren un resumen y ambos resultados definidos. Si falta algo, el caso sigue abierto.
6. **Revisar:** el informe permite filtrar por motivo, televenta, vendedor, cliente, chofer, área, usuario que registró, estado y resultados. Los rankings permiten abrir los casos asociados o solo aquellos con error atribuido.
7. **Abrir y volver:** toque el número del caso. Use Volver al informe / listado para recuperar filtros y página. Los enlaces desde el dashboard y el informe semanal también conservan el punto de regreso.

## Ejemplo: pedido duplicado por televentas

- Motivo: pedido duplicado; asignar la televenta involucrada.
- Validación inicial: responsabilidad preliminar, después confirmada cuando se investigue.
- Gestión: “Contacté a televentas y al cliente; confirmé la duplicación y coordiné el retorno con transporte”.
- Respuesta: “El cliente acepta conservar únicamente el pedido correcto”.
- Pendiente: “Confirmar ingreso a almacén y trámite de nota de crédito”.
- Mantener abierto mientras esos pasos sigan pendientes. Al concluir, documentar la solución y el resultado económico antes de cerrar.

## Informes y montos

- Valor devuelto es la suma del monto de casos, no una afirmación de pérdida definitiva.
- Los abonos de recuperación se suman. La pérdida base repetida del mismo caso se cuenta una sola vez dentro del período de recuperaciones: se usa la mayor base declarada, asignada al primer abono del período para que los subtotales por tipo concilien.
- Esto evita duplicaciones, pero no reemplaza una conciliación contable ni calcula márgenes o costo de inventario. El campo Resultado económico documenta la conclusión de la gestión.
- Las descargas gerenciales incorporan gestión y solución. Los filtros de casos se respetan en la sección de casos y en las recuperaciones relacionadas; las recuperaciones se fechan por el día del abono. Las canastas son un módulo separado y solo comparten filtros de fecha y cliente.
- Los datos de casos abiertos del dashboard conservan la vista operativa general; el informe nuevo y su descarga muestran los abiertos del período y filtros elegidos.
- El informe semanal histórico refleja el estado actual de los casos de esa semana, no una fotografía guardada del estado que tenían el domingo.
- Los comentarios del informe semanal continúan guardándose en la dirección de esa vista, no como notas persistentes en base de datos.

## Validación realizada

- Compilación de producción de Next.js y revisión de TypeScript.
- Pruebas de regreso con filtros, validación de cierre y cálculo de pérdidas con varios abonos.
- Migraciones ejecutadas en PostgreSQL aislado con tablas de autenticación y almacenamiento simuladas: consulta de solo lectura, bloqueo de escrituras, bitácora, autor real, cierre válido/inválido, reapertura y usuario inactivo.
- Falta la prueba integrada en su Supabase real: inicio de sesión con los tres roles, navegación del informe, carga de fotos, avisos y descargas con datos reales. No se verificaron Teams ni tareas programadas reales.

Para ejecutar las pruebas de lógica, exportaciones y base de datos aislada: `npm ci` y `npm test`. Para compilar: configure las variables de Supabase y ejecute `npm run build`.
