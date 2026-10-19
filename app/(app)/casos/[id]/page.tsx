import { redirect } from 'next/navigation'
import { motLabel } from '@/lib/ui'
import { revalidatePath } from 'next/cache'
import { ctx, g, num, subir, urls } from '@/lib/data'
import { T, Box, Grid, I, S, A, F, B, Tbl, Badge, ESTADOS, TIPOS_REC, fmt, horaCR } from '@/lib/ui'
export const dynamic = 'force-dynamic'
async function actualizar(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const id = g(fd, 'id')!; const estado = g(fd, 'estado')!
  const upd: any = { estado, observaciones: g(fd, 'observaciones'), critico: fd.get('critico') === 'on', ultima_gestion: new Date().toISOString() }
  if (estado !== 'cerrado') upd.fecha_cierre = null
  await sb.from('casos').update(upd).eq('id', id); revalidatePath(`/casos/${id}`)
}
async function seguimiento(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const id = g(fd, 'id')!
  await sb.from('seguimientos').insert({ caso_id: id, comentario: g(fd, 'comentario'), accion: g(fd, 'accion'), proximo_paso: g(fd, 'proximo_paso'), fecha_compromiso: g(fd, 'fecha_compromiso') })
  revalidatePath(`/casos/${id}`)
}
async function recuperacion(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const id = g(fd, 'id')!
  const { data: c } = await sb.from('casos').select('cliente_id,monto').eq('id', id).single()
  await sb.from('recuperaciones').insert({ caso_id: id, cliente_id: c?.cliente_id, monto_perdida: g(fd, 'monto_perdida') ? num(fd, 'monto_perdida') : Number(c?.monto || 0), monto_recuperado: num(fd, 'monto_recuperado'), tipo: g(fd, 'tipo') })
  revalidatePath(`/casos/${id}`)
}
async function archivo(fd: FormData) { 'use server'; const { sb } = await ctx(); const id = g(fd, 'id')!; await subir(sb, fd, 'archivo', { caso_id: id }, g(fd, 'tipo') || 'foto'); revalidatePath(`/casos/${id}`) }
async function borrar(fd: FormData) { 'use server'; const { sb, admin } = await ctx(); if (!admin) return; await sb.from('casos').delete().eq('id', g(fd, 'id')); redirect('/casos') }
export default async function Caso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { sb, admin } = await ctx()
  const { data: c } = await sb.from('casos').select('*,clientes(codigo,nombre),vendedores(nombre),televentas(nombre),rutas(nombre),motivos_devolucion(codigo,nombre),profiles(nombre)').eq('id', id).single()
  if (!c) return <p>Caso no encontrado.</p>
  const [{ data: seg }, { data: rec }, { data: arch }] = await Promise.all([
    sb.from('seguimientos').select('*,profiles(nombre)').eq('caso_id', id).order('created_at', { ascending: false }),
    sb.from('recuperaciones').select('*').eq('caso_id', id).order('created_at'), sb.from('archivos').select('*').eq('caso_id', id).order('created_at')])
  const files = await urls(sb, arch || [])
  const dato = (l: string, v: any) => <div><p className="text-xs text-slate-500">{l}</p><p className="text-sm font-medium">{v || '—'}</p></div>
  return <div>
    <div className="flex items-center gap-3 mb-5"><T>{c.numero}</T><Badge>{ESTADOS[c.estado]}</Badge>{c.critico && <span className="text-red-600 text-xs font-bold">CRÍTICO</span>}</div>
    <Box><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {dato('Fecha', c.fecha)}{dato('Cliente', `${c.clientes?.codigo} · ${c.clientes?.nombre}`)}{dato('Televenta', c.televentas?.nombre)}{dato('Vendedor', c.vendedores?.nombre)}{dato('Ruta', c.rutas?.nombre)}
      {dato('Chofer', c.chofer)}{dato('Factura', c.factura)}
      {dato('Producto', c.producto)}{dato('Cantidad', c.cantidad)}{dato('Monto', fmt(c.monto))}{dato('Motivo', motLabel(c?.motivos_devolucion))}
      {dato('Registrado', c.created_at?.slice(0, 10) + ' ' + horaCR(c.created_at))}{dato('Gestor', c.profiles?.nombre)}{dato('Cierre', c.fecha_cierre?.slice(0, 16).replace('T', ' '))}</div></Box>
    <Grid>
      <Box title="Actualizar caso"><form action={actualizar} className="grid gap-3"><input type="hidden" name="id" value={id} />
        <S n="estado" l="Estado" def={c.estado} o={Object.entries(ESTADOS)} />
        <A n="observaciones" l="Observaciones" def={c.observaciones} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="critico" defaultChecked={c.critico} /> Incidencia crítica</label><B>Guardar cambios</B></form></Box>
      <Box title="Nuevo seguimiento"><form action={seguimiento} className="grid gap-3"><input type="hidden" name="id" value={id} />
        <A n="comentario" l="Comentario" /><I n="accion" l="Acción realizada" /><I n="proximo_paso" l="Próximo paso" /><I n="fecha_compromiso" l="Fecha compromiso" type="date" /><B>Registrar</B></form></Box>
    </Grid>
    <Box title="Bitácora"><Tbl cols={['Fecha', 'Usuario', 'Comentario', 'Acción', 'Próximo paso', 'Compromiso']} rows={(seg || []).map((s: any) =>
      [s.created_at.slice(0, 16).replace('T', ' '), s.profiles?.nombre, s.comentario, s.accion, s.proximo_paso, s.fecha_compromiso])} /></Box>
    <Grid>
      <Box title="Recuperación económica"><Tbl cols={['Tipo', 'Pérdida', 'Recuperado']} rows={(rec || []).map((r: any) => [TIPOS_REC[r.tipo], fmt(r.monto_perdida), fmt(r.monto_recuperado)])} />
        <form action={recuperacion} className="grid sm:grid-cols-4 gap-2 items-end mt-3"><input type="hidden" name="id" value={id} />
          <I n="monto_perdida" l="Pérdida (vacío = monto del caso)" type="number" /><I n="monto_recuperado" l="Recuperado" type="number" req /><S n="tipo" l="Tipo" req o={Object.entries(TIPOS_REC)} /><B>Agregar</B></form></Box>
      <Box title="Evidencias">
        <div className="flex flex-wrap gap-3 mb-3">{files.map((f: any) => f.tipo === 'documento' ? <a key={f.id} href={f.url} target="_blank" className="underline text-sm">{f.nombre}</a> :
          <a key={f.id} href={f.url} target="_blank"><img src={f.url} alt={f.nombre} className="h-24 rounded border" /><span className="text-[10px] text-slate-500">{f.tipo}</span></a>)}</div>
        <form action={archivo} className="grid sm:grid-cols-3 gap-2 items-end"><input type="hidden" name="id" value={id} />
          <F n="archivo" l="Archivos" /><S n="tipo" l="Tipo" def="foto" o={[['foto', 'Foto'], ['firma', 'Firma'], ['documento', 'Documento']]} /><B>Subir</B></form></Box>
    </Grid>
    {admin && <form action={borrar}><input type="hidden" name="id" value={id} /><button className="text-red-600 text-sm underline">Eliminar caso (admin)</button></form>}
  </div>
}
