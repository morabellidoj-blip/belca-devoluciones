import { supabaseServer } from './supabase/server'
import { redirect } from 'next/navigation'
export async function ctx() {
  const sb: any = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: p } = await sb.from('profiles').select('id,nombre,rol,activo').eq('id', user.id).single()
  if (!p?.activo) redirect('/login?inactivo=1')
  return { sb, p: p as any, admin: p.rol === 'admin', puedeEditar: p.rol === 'admin' || p.rol === 'gestor' }
}
export async function escritura() {
  const c = await ctx(); if (!c.puedeEditar) throw new Error('Su usuario es de consulta. No puede modificar registros.'); return c
}
export async function cat(sb: any) {
  const [c, v, r, m, ch, tv] = await Promise.all([
    all(sb.from('clientes').select('id,codigo,nombre').eq('activo', true).order('nombre')),
    sb.from('vendedores').select('id,nombre').eq('activo', true).order('nombre'),
    sb.from('rutas').select('id,nombre').eq('activo', true).order('nombre'),
    sb.from('motivos_devolucion').select('id,codigo,nombre,area').eq('activo', true),
    sb.from('choferes').select('id,nombre').eq('activo', true).order('nombre'),
    sb.from('televentas').select('id,nombre,vendedor_id').eq('activo', true).order('nombre')])
  return { televentas: tv.data || [], choferes: ch.data || [], clientes: c.data || [], vendedores: v.data || [], rutas: r.data || [], motivos: (m.data || []).sort((a: any, b: any) => (Number(a.codigo) || 9999) - (Number(b.codigo) || 9999)) }
}
export async function all(q: any, max = 50000) {
  q = q.order('id', { ascending: true }); const out: any[] = []
  for (let i = 0; i < max; i += 1000) {
    const { data, error } = await q.range(i, i + 999)
    if (error || !data) return i === 0 ? { data: null, error } : { data: out, error }
    out.push(...data); if (data.length < 1000) break
  }
  return { data: out, error: null }
}
export const filtroCliente = (q: any, v: string, pref = '') => (v === 'ninguno' ? q.is(pref+'cliente_id', null) : q.eq(pref+'cliente_id', v))
export async function cerrarCasos(sb: any, ids: string[], nota = 'Cierre rápido desde el listado') {
  const lim = Array.from(new Set(ids.filter(Boolean)))
  if (!lim.length) return { cerrados: 0, error: null as any }
  const { data, error } = await sb.from('casos').update({ estado: 'cerrado', ultima_gestion: new Date().toISOString() }).in('id', lim).neq('estado', 'cerrado').select('id')
  if (error) return { cerrados: 0, error }
  const hechos: string[] = (data || []).map((x: any) => x.id)
  // La base de datos valida el cierre y registra la auditoría en la misma transacción.
  return { cerrados: hechos.length, error: null as any }
}
export const g = (fd: FormData, k: string) => ((fd.get(k) as string) || null)
export const num = (fd: FormData, k: string) => Number(fd.get(k) || 0)
export const rango = (q: any, col: string, sp: any) => { if (sp.desde) q = q.gte(col, sp.desde); if (sp.hasta) q = q.lte(col, sp.hasta); return q }
export const rangoTs = (q: any, col: string, sp: any) => { if (sp.desde) q = q.gte(col, sp.desde + 'T00:00:00-06:00'); if (sp.hasta) q = q.lte(col, sp.hasta + 'T23:59:59.999999-06:00'); return q }
export async function subir(sb: any, fd: FormData, campo: string, ref: { caso_id?: string; canasta_id?: string }, tipo = 'foto') {
  const files = fd.getAll(campo).filter((f): f is File => f instanceof File && f.size > 0)
  for (const f of files) {
    const path = `${ref.caso_id ? 'casos/' + ref.caso_id : 'canastas/' + ref.canasta_id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`
    const { error } = await sb.storage.from('evidencias').upload(path, f, { contentType: f.type })
    if (error) throw new Error('No se pudo subir ' + f.name + ': ' + error.message)
    const { error: registro } = await sb.from('archivos').insert({ ...ref, ruta_storage: path, nombre: f.name, tipo })
    if (registro) { await sb.storage.from('evidencias').remove([path]); throw new Error('No se pudo registrar la evidencia: ' + registro.message) }
  }
}
export async function urls(sb: any, arch: any[]) {
  return Promise.all((arch || []).map(async a => ({ ...a, url: (await sb.storage.from('evidencias').createSignedUrl(a.ruta_storage, 3600)).data?.signedUrl })))
}
