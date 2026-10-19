import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ctx, g } from '@/lib/data'
import { adminClient } from '@/lib/admin'
import { T, Box, Grid, I, S, B, Tbl, Badge } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
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
  const tabla = g(fd, 'tabla')!
  if (!['clientes', 'rutas', 'vendedores', 'motivos_devolucion', 'choferes', 'televentas'].includes(tabla)) throw new Error('Catálogo no válido')
  const lineas = (g(fd, 'lineas') || '').split('\n').map(l => l.trim()).filter(Boolean)
  const parse = (l: string) => (/[;\t]/.test(l) ? l.split(/[;\t]/) : l.split(/,(.*)/))
  let error: any = null, n = 0
  if (tabla === 'clientes' || tabla === 'motivos_devolucion') {
    const m = new Map<string, any>()
    lineas.forEach(l => { const [codigo, nombre] = parse(l); if (codigo?.trim()) m.set(codigo.trim(), { codigo: codigo.trim(), nombre: (nombre || codigo).trim() }) })
    const rows = Array.from(m.values()); n = rows.length
    for (let i = 0; i < rows.length && !error; i += 500) error = (await sb.from(tabla).upsert(rows.slice(i, i + 500), { onConflict: 'codigo' })).error
  } else if (tabla === 'televentas') {
    const m = new Map<string, any>()
    lineas.forEach(l => { const [nombre, telefono, correo, vendedor] = (/[;\t]/.test(l) ? l.split(/[;\t]/) : l.split(',')).map(x => x.trim()); if (nombre) m.set(nombre, { nombre, telefono: telefono || null, correo: correo || null, vend: vendedor || '' }) })
    const vn = Array.from(new Set(Array.from(m.values()).map(x => x.vend).filter(Boolean)))
    if (vn.length) await sb.from('vendedores').upsert(vn.map(nombre => ({ nombre })), { onConflict: 'nombre', ignoreDuplicates: true })
    const { data: ve } = await sb.from('vendedores').select('id,nombre')
    const idv = (x: string) => ve?.find((v: any) => v.nombre.toLowerCase() === x.toLowerCase())?.id || null
    const rows = Array.from(m.values()).map(x => ({ nombre: x.nombre, telefono: x.telefono, correo: x.correo, vendedor_id: x.vend ? idv(x.vend) : null })); n = rows.length
    for (let i = 0; i < rows.length && !error; i += 500) error = (await sb.from('televentas').upsert(rows.slice(i, i + 500), { onConflict: 'nombre' })).error
  } else {
    const nombres = Array.from(new Set(lineas)); n = nombres.length
    error = (await sb.from(tabla).upsert(nombres.map(nombre => ({ nombre })), { onConflict: 'nombre', ignoreDuplicates: true })).error
  }
  revalidatePath('/admin')
  redirect(error ? `/admin?err=${encodeURIComponent(error.message)}` : `/admin?ok=${n}&t=${tabla}`)
}
const TIPOS_AVISO: [string, string][] = [['critica', 'Incidencias críticas'], ['nuevo_caso', 'Cada caso nuevo'], ['sin_gestion', 'Casos con más de 48 h sin gestión'], ['por_vencer', 'Casos por vencer'],
  ['canasta_antigua', 'Canastas pendientes por muchos días'], ['canasta_exceso', 'Cliente con exceso de canastas'], ['ruta_baja', 'Ruta con baja recuperación'], ['cierre', 'Casos cerrados']]
const tarjeta = (titulo: string, texto: string) => ({ type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
  body: [{ type: 'TextBlock', weight: 'Bolder', size: 'Medium', wrap: true, text: '🔔 ' + titulo }, { type: 'TextBlock', wrap: true, text: texto }] } }] })
async function guardarTeams(fd: FormData) {
  'use server'; const { sb } = await guard()
  const rows = [{ clave: 'teams_url', valor: (g(fd, 'teams_url') || '').trim() }, { clave: 'app_url', valor: (g(fd, 'app_url') || '').trim() }, { clave: 'teams_tipos', valor: fd.getAll('tipos').join(',') }]
  const { error } = await sb.from('ajustes').upsert(rows, { onConflict: 'clave' }); revalidatePath('/admin')
  redirect(error ? `/admin?err=${encodeURIComponent(error.message)}` : `/admin?msg=${encodeURIComponent('Configuración de Teams guardada.')}`)
}
async function probarTeams() {
  'use server'; const { sb } = await guard()
  const { data } = await sb.from('ajustes').select('valor').eq('clave', 'teams_url').maybeSingle()
  let out = ''
  if (!data?.valor) out = 'err=' + encodeURIComponent('Primero guarde la dirección del webhook de Teams.')
  else {
    try {
      const r = await fetch(data.valor, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tarjeta('Prueba de avisos Belca', 'Si ve este mensaje, los avisos a Teams funcionan.')) })
      out = r.ok ? 'msg=' + encodeURIComponent(`Mensaje de prueba enviado (respuesta ${r.status}). Revise el canal de Teams.`) : 'err=' + encodeURIComponent(`Teams respondió ${r.status}. Revise la dirección del webhook.`)
    } catch (e: any) { out = 'err=' + encodeURIComponent('No se pudo contactar a Teams: ' + (e?.message || 'error')) }
  }
  redirect('/admin?' + out)
}
async function alternar(fd: FormData) { 'use server'; const { sb } = await guard(); await sb.from(g(fd, 'tabla')!).update({ activo: fd.get('activo') !== 'true' }).eq('id', g(fd, 'id')); revalidatePath('/admin') }
async function config(fd: FormData) {
  'use server'; const { sb } = await guard()
  for (const [k, v] of Array.from((fd as any).entries()) as [string, any][]) if (k.startsWith('c_')) await sb.from('config').update({ valor: Number(v) }).eq('clave', k.slice(2))
  revalidatePath('/admin')
}
const ETQ: Record<string, string> = { horas_sin_gestion: 'Horas sin gestión (alerta)', horas_proximo_vencer: 'Horas para "próximo a vencer"', canastas_dias_alerta: 'Días con canastas pendientes (alerta)', canastas_max_pendientes: 'Máx. canastas pendientes por cliente', canastas_recuperacion_minima: '% mínimo de recuperación por ruta' }
export default async function Admin({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams
  const { sb, admin } = await ctx()
  if (!admin) return <p>Solo administradores.</p>
  const [{ data: us }, { data: cf }, { count: nc }, ru, ve, mo, ch, { data: aj }, { data: tv }] = await Promise.all([sb.from('profiles').select('*').order('nombre'), sb.from('config').select('*').order('clave'),
    sb.from('clientes').select('*', { count: 'exact', head: true }), sb.from('rutas').select('*').order('nombre'), sb.from('vendedores').select('*').order('nombre'), sb.from('motivos_devolucion').select('*').order('nombre'), sb.from('choferes').select('*').order('nombre'), sb.from('ajustes').select('clave,valor'), sb.from('televentas').select('*,vendedores(nombre)').order('nombre').limit(300)])
  const A: Record<string, string> = Object.fromEntries((aj || []).map((x: any) => [x.clave, x.valor || '']))
  const sel = (A.teams_tipos || '').split(',')
  const lista = (tabla: string, rows: any[] | null) => <Box title={tabla.replace('_', ' ')}><div className="flex flex-wrap gap-2">{(rows || []).map(r =>
    <form key={r.id} action={alternar}><input type="hidden" name="tabla" value={tabla} /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="activo" value={String(r.activo)} />
      <button className={`text-xs px-2 py-1 rounded border ${r.activo ? 'bg-white' : 'bg-slate-200 line-through text-slate-400'}`} title="Clic para activar/desactivar">{r.codigo ? r.codigo + ' · ' : ''}{r.nombre}</button></form>)}</div></Box>
  return <div><T>Administración</T>
    {sp.ok && <p className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 mb-4 text-sm">Importación lista: {sp.ok} registros procesados ({sp.t}).</p>}
    {sp.msg && <p className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 mb-4 text-sm">{sp.msg}</p>}
    {sp.err && <p className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 mb-4 text-sm">No se pudo importar: {sp.err}</p>}
    <Box title="Usuarios"><Tbl cols={['Nombre', 'Rol', 'Activo', '']} rows={(us || []).map((u: any) => [<form key="f" id={u.id} action={editarUsuario} className="contents"><input type="hidden" name="id" value={u.id} /><input name="nombre" defaultValue={u.nombre} className="inp" /></form>,
      <select key="r" form={u.id} name="rol" defaultValue={u.rol} className="inp"><option value="gestor">Gestor</option><option value="admin">Administrador</option></select>,
      <input key="a" form={u.id} type="checkbox" name="activo" defaultChecked={u.activo} />, <button key="b" form={u.id} className="btn">Guardar</button>])} />
      <form action={crearUsuario} className="grid sm:grid-cols-5 gap-2 items-end mt-4"><I n="nombre" l="Nombre" req /><I n="email" l="Correo" type="email" req /><I n="password" l="Contraseña (mín. 6)" req />
        <S n="rol" l="Rol" def="gestor" o={[['gestor', 'Gestor de devoluciones'], ['admin', 'Administrador']]} /><B>Crear usuario</B></form></Box>
    <Grid>{lista('rutas', ru.data)}{lista('vendedores', ve.data)}{lista('choferes', ch.data)}{lista('motivos_devolucion', mo.data)}
      <Box title={`Importar catálogos (clientes: ${nc})`}><form action={importar} className="grid gap-2"><S n="tabla" l="Catálogo" req o={[['clientes', 'Clientes'], ['choferes', 'Choferes'], ['televentas', 'Televentas'], ['rutas', 'Rutas'], ['vendedores', 'Vendedores'], ['motivos_devolucion', 'Motivos']]} />
        <label className="text-sm">Pegue desde Excel, sin encabezados. Clientes: 2 columnas (<code>código, nombre</code>). Motivos: 2 columnas (<code>código, nombre</code>). Televentas: 4 columnas (<code>nombre, número, correo, vendedor</code>; si el vendedor no existe se crea). Choferes, vendedores y rutas: 1 columna con el nombre.<textarea name="lineas" rows={6} className="inp mt-1 font-mono text-xs" required /></label><B>Importar</B></form></Box></Grid>
    <Box title={`Televentas (${(tv || []).length})`}><Tbl cols={['Nombre', 'Número', 'Correo', 'Vendedor', 'Estado']} rows={(tv || []).map((t: any) => [t.nombre, t.telefono, t.correo, t.vendedores?.nombre,
      <form key="a" action={alternar}><input type="hidden" name="tabla" value="televentas" /><input type="hidden" name="id" value={t.id} /><input type="hidden" name="activo" value={String(t.activo)} />
        <button className={`text-xs px-2 py-1 rounded border ${t.activo ? 'bg-white' : 'bg-slate-200 text-slate-400'}`}>{t.activo ? 'Activa' : 'Inactiva'}</button></form>])} /></Box>
    <Box title="Avisos a Microsoft Teams"><form action={guardarTeams} className="grid gap-3">
      <I n="teams_url" l="Dirección (URL) del webhook de Teams" def={A.teams_url} /><I n="app_url" l="Dirección de la app, para el enlace del mensaje (ej. https://su-app.vercel.app)" def={A.app_url} />
      <fieldset className="text-sm"><legend className="mb-1">Enviar a Teams estos avisos:</legend><div className="grid sm:grid-cols-2 gap-1">{TIPOS_AVISO.map(([k, l]) =>
        <label key={k} className="flex gap-2 items-center"><input type="checkbox" name="tipos" value={k} defaultChecked={sel.includes(k)} /> {l}</label>)}</div></fieldset><B>Guardar configuración de Teams</B></form>
      <form action={probarTeams} className="mt-3"><button className="btn bg-white !text-belca-navy border border-belca-navy">Enviar mensaje de prueba a Teams</button></form></Box>
    <Box title="Umbrales de alertas"><form action={config} className="grid sm:grid-cols-3 gap-3">{(cf || []).map((c: any) => <I key={c.clave} n={`c_${c.clave}`} l={ETQ[c.clave] || c.clave} type="number" def={c.valor} />)}<div className="sm:col-span-3"><B>Guardar umbrales</B></div></form></Box></div>
}
