# Belca · Devoluciones, Canastas y Recuperación — Guía desde cero

No necesita instalar programas. Solo un navegador y 3 cuentas gratuitas.
Tiempo estimado: 30–40 minutos. Siga los pasos en orden.

## PARTE 1 · Crear cuentas
1. **GitHub**: https://github.com → Sign up.
2. **Supabase**: https://supabase.com → Start your project → entre con su cuenta de GitHub.
3. **Vercel**: https://vercel.com → Sign Up → "Continue with GitHub".

## PARTE 2 · Base de datos (Supabase)
1. **New project** → nombre `belca-devoluciones` → invente una contraseña de base (guárdela) → región más cercana (ej. East US) → Create. Espere 2 minutos.
2. Menú izquierdo **SQL Editor** → **New query**.
3. Abra el archivo `supabase/migrations/001_schema.sql` de este zip con el Bloc de notas, copie TODO, péguelo en Supabase y pulse **Run**. Debe decir "Success". Luego haga lo mismo con `supabase/migrations/002_unificar_llamadas.sql` (esta carga también los 23 motivos de devolución con su código).
4. Menú **Authentication → Users → Add user → Create new user**: ponga su correo y una contraseña, y marque **Auto Confirm User**.
5. Vuelva a **SQL Editor** → New query, ejecute (cambie el correo por el suyo):
   `update profiles set rol='admin' where id=(select id from auth.users where email='SU_CORREO');`
6. Menú **Project Settings (engranaje) → API Keys / Data API**. Copie y guarde en un bloc de notas:
   - **Project URL** (https://xxxx.supabase.co)
   - **anon / publishable key** (clave pública)
   - **service_role / secret key** (clave secreta — nunca la comparta ni la suba a GitHub)

## PARTE 3 · Subir el código (GitHub)
1. Descomprima este zip (clic derecho → Extraer todo).
2. En GitHub: **+ → New repository** → nombre `belca-devoluciones` → **Private** → Create repository.
3. En la página del repo pulse **uploading an existing file**.
4. Abra la carpeta descomprimida, seleccione TODO su contenido (carpetas `app`, `lib`, `public`, `supabase` y los archivos sueltos) y arrástrelo a la ventana de GitHub. Espere a que termine de cargar.
5. Abajo pulse **Commit changes**.

## PARTE 4 · Publicar (Vercel)
1. En Vercel: **Add New → Project** → busque `belca-devoluciones` → **Import**.
2. Despliegue **Environment Variables** y agregue estas 3 (nombre exacto → valor):
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → clave anon/publishable
   - `SUPABASE_SERVICE_ROLE_KEY` → clave service_role/secret
3. Pulse **Deploy**. En 1–3 minutos recibe una dirección `https://belca-devoluciones-xxxx.vercel.app`.
4. Ábrala e ingrese con el correo y contraseña de la Parte 2, paso 4.

## PARTE 5 · Primer uso
1. Menú **Administración → Importar catálogos**: pegue sus **rutas** y **vendedores** (una columna de Excel) y luego sus **clientes** (5 columnas de Excel, sin encabezados: código, nombre, teléfono, ruta, vendedor).
2. **Administración → Usuarios**: cree a los gestores de devoluciones (rol "Gestor").
3. Ajuste los **umbrales de alertas** si lo desea (48 h, 15 días, máx. de canastas, % mínimo de recuperación).
4. Cada llamada de devolución se registra en **Casos → Nuevo caso** (hora automática, duración opcional).

Cada vez que cambie archivos en GitHub, Vercel republica solo.

## Qué incluye
- **Panel gerencial** (Dashboard): resumen ejecutivo con comparación contra el período anterior, KPIs de devoluciones y canastas, casos abiertos más antiguos, 8 gráficos (incluye llamadas por hora) y filtros. Por defecto muestra el mes actual.
- **Casos**: alta con fotos y firma, edición, cierre, bitácora de seguimientos, recuperación económica y evidencias por caso.
- Cada llamada de devolución se registra **una sola vez**, en **Nuevo caso**. Las llamadas por hora se ven en el Dashboard.
- **Canastas**: registro con evidencia, estados automáticos, KPIs y 8 gráficos.
- **Recuperación económica**, **Desempeño operativo** (por gestor), **Reportes** (Excel, PDF, CSV) y **Alertas**.
- **Administración**: usuarios y roles, catálogos, importación masiva y umbrales.

## Notas importantes
- Las alertas se generan al abrir Dashboard o Alertas y se muestran dentro de la app (campana con contador). **No se envían correos.**
- Para generarlas sin que nadie abra la app: Supabase → SQL Editor → `create extension if not exists pg_cron;` y luego
  `select cron.schedule('alertas','0 * * * *','select generar_alertas()');`
- La firma se adjunta como foto/imagen (no hay lienzo de firma en pantalla).
- Solo el administrador puede eliminar registros.
- Zona horaria de los filtros "Hoy/Semana/Mes": Costa Rica.
