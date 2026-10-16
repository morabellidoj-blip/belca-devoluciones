-- 005: revisar alertas cada 30 minutos aunque nadie tenga la app abierta (requiere pg_cron)
create extension if not exists pg_cron;
select cron.schedule('alertas','*/30 * * * *','select generar_alertas()');
