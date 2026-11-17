-- Ejecutar primero, en una ejecución separada de 014.
-- PostgreSQL requiere confirmar el nuevo valor antes de utilizarlo.
alter type public.rol_usuario add value if not exists 'consulta';
