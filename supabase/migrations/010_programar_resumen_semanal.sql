-- 010: enviar el resumen cada lunes a las 7:00 a.m. (hora de Costa Rica = 13:00 UTC). Requiere pg_cron (ver 005).
select cron.schedule('resumen-semanal', '0 13 * * 1', 'select resumen_semanal()');
