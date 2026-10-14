import { revalidatePath } from 'next/cache'
import { ctx, g } from '@/lib/data'
import { adminClient } from '@/lib/admin'
import { T, Box, Grid, I, S, B, Tbl, Badge } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const guard = async () => { const c = await ctx(); if (!c.admin) throw new Error('Solo administradores'); return c }
async function crearUsuario(fd: FormData) {
  'use server'; await guard()
  const { error } = await adminClient().auth.admin.createUser({ email: g(fd, 'email')!, password: g(fd, 'password')!, email_confirm: true, user_metadata: { nombre: g(fd, 'nombre'), rol: g(fd, 'rol') || 'gestor' } })
  if (error) throw new Error(error.message); revalidatePath('/admin')
}
async function editarUsuario(fd: FormData) {
  'use server'; const { sb } = await guard()
  await sb.from('profiles').update({ rol: g(fd, 'rol'), activo: fd.get('activo') === 'on', nombre: g(fd, 'nombre') }).eq('id', g(fd, 'id')); revalidatePath('/admin')
}
async function importar(fd: FormData) {
  'use server'; const { sb } = await guard()
  const tabla = g(fd, 'tabla')!, lineas = (g(fd, 'lineas') || '').split('\n').map(l => l.trim()).filter(Boolean)
  if (tabla === 'clientes') {
    const [{ data: ru }, { data: ve }] = await Promise.all([sb.from('rutas').select('id,nombre'), sb.from('vendedores').select('id,nombre')])
    const id = (arr: any[], n?: string) => arr?.find(x => x.nombre.toLowerCase() === (n || '').trim().toLowerCase())?.id || null
    const rows = lineas.map(l => { const [codigo, nombre, telefono, ruta, vendedor] = l.split(/[;\t]/); return { codigo: codigo.trim(), nombre: (nombre || codigo).trim(), telefono: telefono?.trim() || null, ruta_id: id(ru, ruta), vendedor_id: id(ve, vendedor) } })
    for (let i = 0; i < rows.length; i += 500) await sb.from('clientes').upsert(rows.slice(i, i + 500), { onConflict: 'codigo' })
  } else if (tabla === 'motivos_devolucion') {
    const rows = lineas.map(l => { const [codigo, nombre] = l.split(/[;\t]/); return { codigo: codigo.trim(), nombre: (nombre || codigo).trim() } })
    await sb.from('motivos_devolucion').upsert(rows, { onConflict: 'codigo' })
  } else await sb.from(tabla).upsert(lineas.map(nombre => ({ nombre })), { onConflict: 'nombre', ignoreDuplicates: true })
  revalidatePath('/admin')
}
async function alternar(fd: FormData) { 'use server'; const { sb } = await guard(); await sb.from(g(fd, 'tabla')!).update({ activo: fd.get('activo') !== 'true' }).eq('id', g(fd, 'id')); revalidatePath('/admin') }
async function config(fd: FormData) {
  'use server'; const { sb } = await guard()
  for (const [k, v] of Array.from((fd as any).entries()) as [string, any][]) if (k.startsWith('c_')) await sb.from('config').update({ valor: Number(v) }).eq('clave', k.slice(2))
  revalidatePath('/admin')
}
const ETQ: Record<string, string> = { horas_sin_gestion: 'Horas sin gestión (alerta)', horas_proximo_vencer: 'Horas para "próximo a vencer"', canastas_dias_alerta: 'Días con canastas pendientes (alerta)', canastas_max_pendientes: 'Máx. canastas pendientes por cliente', canastas_recuperacion_minima: '% mínimo de recuperación por ruta' }
export default async function Admin() {
  const { sb, admin } = await ctx()
  if (!admin) return <p>Solo administradores.</p>
  const [{ data: us }, { data: cf }, { count: nc }, ru, ve, mo] = await Promise.all([sb.from('profiles').select('*').order('nombre'), sb.from('config').select('*').order('clave'),
    sb.from('clientes').select('*', { count: 'exact', head: true }), sb.from('rutas').select('*').order('nombre'), sb.from('vendedores').select('*').order('nombre'), sb.from('motivos_devolucion').select('*').order('nombre')])
  const lista = (tabla: string, rows: any[] | null) => <Box title={tabla.replace('_', ' ')}><div className="flex flex-wrap gap-2">{(rows || []).map(r =>
    <form key={r.id} action={alternar}><input type="hidden" name="tabla" value={tabla} /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="activo" value={String(r.activo)} />
      <button className={`text-xs px-2 py-1 rounded border ${r.activo ? 'bg-white' : 'bg-slate-200 line-through text-slate-400'}`} title="Clic para activar/desactivar">{r.codigo ? r.codigo + ' · ' : ''}{r.nombre}</button></form>)}</div></Box>
  return <div><T>Administración</T>
    <Box title="Usuarios"><Tbl cols={['Nombre', 'Rol', 'Activo', '']} rows={(us || []).map((u: any) => [<form key="f" id={u.id} action={editarUsuario} className="contents"><input type="hidden" name="id" value={u.id} /><input name="nombre" defaultValue={u.nombre} className="inp" /></form>,
      <select key="r" form={u.id} name="rol" defaultValue={u.rol} className="inp"><option value="gestor">Gestor</option><option value="admin">Administrador</option></select>,
      <input key="a" form={u.id} type="checkbox" name="activo" defaultChecked={u.activo} />, <button key="b" form={u.id} className="btn">Guardar</button>])} />
      <form action={crearUsuario} className="grid sm:grid-cols-5 gap-2 items-end mt-4"><I n="nombre" l="Nombre" req /><I n="email" l="Correo" type="email" req /><I n="password" l="Contraseña (mín. 6)" req />
        <S n="rol" l="Rol" def="gestor" o={[['gestor', 'Gestor de devoluciones'], ['admin', 'Administrador']]} /><B>Crear usuario</B></form></Box>
    <Grid>{lista('rutas', ru.data)}{lista('vendedores', ve.data)}{lista('motivos_devolucion', mo.data)}
      <Box title={`Importar catálogos (clientes: ${nc})`}><form action={importar} className="grid gap-2"><S n="tabla" l="Catálogo" req o={[['clientes', 'Clientes'], ['rutas', 'Rutas'], ['vendedores', 'Vendedores'], ['motivos_devolucion', 'Motivos']]} />
        <label className="text-sm">Una línea por registro, pegada desde Excel. Clientes: <code>código, nombre, teléfono, ruta, vendedor</code> (5 columnas). Motivos: <code>código, nombre</code> (2 columnas). Rutas y vendedores: 1 columna.<textarea name="lineas" rows={6} className="inp mt-1 font-mono text-xs" required /></label><B>Importar</B></form></Box></Grid>
    <Box title="Umbrales de alertas"><form action={config} className="grid sm:grid-cols-3 gap-3">{(cf || []).map((c: any) => <I key={c.clave} n={`c_${c.clave}`} l={ETQ[c.clave] || c.clave} type="number" def={c.valor} />)}<div className="sm:col-span-3"><B>Guardar umbrales</B></div></form></Box></div>
}
