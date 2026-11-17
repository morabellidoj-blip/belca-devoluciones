import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const db=new PGlite();let n=0;
await db.exec(`create role authenticated;create role anon;create schema auth;create schema storage;create schema extensions;create schema net;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.uid',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
for(const name of ['001_schema.sql','002_unificar_llamadas.sql','003_choferes.sql','004_avisos_teams.sql','006_televentas_y_crear.sql','007_casos_sin_cliente.sql','008_areas_responsables.sql','009_calidad_meta_resumen.sql','011_errores_por_responsable.sql','012_error_almacen_pima.sql','013_rol_consulta.sql','014_gestion_profesional.sql']){
 let sql=await fs.readFile(root+'/supabase/migrations/'+name,'utf8');sql=sql.replace(/create extension if not exists \w+;/g,'');await db.exec(sql);
}
console.log('PASS: las migraciones anteriores y nuevas se aplican en PostgreSQL aislado.');n++;
// Rerun new migration to verify safe repeat.
await db.exec(await fs.readFile(root+'/supabase/migrations/014_gestion_profesional.sql','utf8'));console.log('PASS: migración 014 repetible.');n++;
const admin='10000000-0000-0000-0000-000000000001',gestor='10000000-0000-0000-0000-000000000002',lector='10000000-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users(id,email) values('${admin}','admin@example.test'),('${gestor}','gestor@example.test'),('${lector}','consulta@example.test');update profiles set activo=true;update profiles set rol='admin' where id='${admin}';update profiles set rol='consulta' where id='${lector}';grant usage on schema public,auth,storage to authenticated;grant select,insert,update,delete on all tables in schema public,storage to authenticated;grant usage,select on all sequences in schema public to authenticated;`);
const asUser=async(id,sql)=>{await db.exec(`set role authenticated;select set_config('app.uid','${id}',false)`);try{return await db.query(sql)}finally{await db.exec("reset role;select set_config('app.uid','',false)")}};
const {rows:[caso]}=await asUser(gestor,`insert into casos(monto,observaciones) values(100,'Pedido duplicado') returning id`);const id=caso.id;
assert.equal((await asUser(lector,`select * from casos where id='${id}'`)).rows.length,1);console.log('PASS: consulta puede leer casos.');n++;
assert.equal((await asUser(lector,`update casos set monto=999 where id='${id}' returning id`)).rows.length,0);
await assert.rejects(asUser(lector,"insert into casos(monto) values(999)"),/row-level security/);await assert.rejects(asUser(lector,`insert into seguimientos(caso_id,comentario) values('${id}','No autorizado')`),/row-level security/);await assert.rejects(asUser(lector,"select generar_alertas()"),/consulta/);console.log('PASS: consulta no puede editar, crear gestiones ni ejecutar alertas.');n++;
await assert.rejects(asUser(gestor,`update casos set estado='cerrado' where id='${id}'`),/Complete la gestión/);assert.equal((await db.query(`select estado from casos where id='${id}'`)).rows[0].estado,'nuevo');console.log('PASS: cierre incompleto se rechaza sin alterar el caso.');n++;
await asUser(gestor,`update casos set gestion_resumen='Confirmé la devolución con el cliente y almacén',resultado_mercaderia='almacen',resultado_economico='sin_perdida',estado='cerrado' where id='${id}'`);
const cerrado=(await db.query(`select * from casos where id='${id}'`)).rows[0];assert.equal(cerrado.estado,'cerrado');assert.equal(cerrado.responsable_cierre,gestor);assert.ok(cerrado.fecha_cierre);
const auditoria=(await db.query(`select * from seguimientos where caso_id='${id}'`)).rows;assert.equal(auditoria.length,1);assert.equal(auditoria[0].usuario_id,gestor);assert.equal(auditoria[0].cambios.estado.despues,'cerrado');console.log('PASS: cierre completo identifica gestor, fecha y auditoría sin recursión.');n++;
await asUser(gestor,`insert into seguimientos(caso_id,usuario_id,accion,comentario,contacto,respuesta) values('${id}','${admin}','Contacté al cliente','Confirmé la recepción','Cliente','Recibido')`);
assert.equal((await db.query(`select usuario_id from seguimientos where comentario='Confirmé la recepción'`)).rows[0].usuario_id,gestor);assert.equal((await asUser(lector,`select * from seguimientos where caso_id='${id}'`)).rows.length,2);console.log('PASS: se conserva autor real y consulta puede leer historial.');n++;
assert.equal((await asUser(gestor,`update seguimientos set comentario='Ocultar' where caso_id='${id}' returning id`)).rows.length,0);console.log('PASS: gestor no puede reescribir bitácora.');n++;
await asUser(gestor,`update casos set estado='en_proceso' where id='${id}'`);const reabierto=(await db.query(`select fecha_cierre,responsable_cierre from casos where id='${id}'`)).rows[0];assert.equal(reabierto.fecha_cierre,null);assert.equal(reabierto.responsable_cierre,null);console.log('PASS: reapertura limpia cierre y queda auditada.');n++;
await db.exec(`update profiles set activo=false where id='${lector}'`);assert.equal((await asUser(lector,'select * from casos')).rows.length,0);console.log('PASS: usuario inactivo no accede a casos.');n++;
const fake='10000000-0000-0000-0000-000000000004';await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values('${fake}','fake@example.test','{"rol":"admin"}')`);assert.equal((await db.query(`select rol from profiles where id='${fake}'`)).rows[0].rol,'gestor');console.log('PASS: metadatos no permiten autoasignarse administrador.');n++;
console.log(`${n} comprobaciones SQL aprobadas.`);await db.close();
