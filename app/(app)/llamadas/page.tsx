import { revalidatePath } from 'next/cache'
import { ctx, cat, g, num, rango } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { T, Kpi, Kpis, Grid, Box, I, S, A, B, Tbl, Filtros, opts, grp, byKey, hoy } from '@/lib/ui'
export const dynamic = 'force-dynamic'
async function crear(fd: FormData) {
  'use server'
  const { sb } = await ctx()
  await sb.from('llamadas').insert({ fecha: g(fd, 'fecha') || hoy(), hora: g(fd, 'hora') || undefined, cliente_id: g(fd, 'cliente_id'), contacto: g(fd, 'contacto'), telefono: g(fd, 'telefono'),
    motivo: g(fd, 'motivo'), descripcion: g(fd, 'descripcion'), resultado: g(fd, 'resultado'), duracion_seg: Math.round(num(fd, 'minutos') * 60), requiere_seguimiento: fd.get('seg') === 'on' })
  revalidatePath('/llamadas')
}
async function actualizar(fd: FormData) {
  'use server'
  const { sb } = await ctx()
  await sb.from('llamadas').update({ resultado: g(fd, 'resultado'), descripcion: g(fd, 'descripcion'), requiere_seguimiento: fd.get('seg') === 'on' }).eq('id', g(fd, 'id')); revalidatePath('/llamadas')
}
async function borrar(fd: FormData) { 'use server'; const { sb, admin } = await ctx(); if (admin) await sb.from('llamadas').delete().eq('id', g(fd, 'id')); revalidatePath('/llamadas') }
export default async function Llamadas({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams; const { sb, admin } = await ctx()
  let q = rango(sb.from('llamadas').select('*,clientes(nombre)').order('fecha', { ascending: false }).order('hora', { ascending: false }).limit(1000), 'fecha', sp)
  if (sp.cliente_id) q = q.eq('cliente_id', sp.cliente_id)
  const [{ data }, c] = await Promise.all([q, cat(sb)]); const R: any[] = data || []
  const dias = new Set(R.map(r => r.fecha)).size
  const min = R.length ? R.reduce((a, r) => a + r.duracion_seg, 0) / R.length / 60 : 0
  return <div><T>Llamadas</T>
    <Filtros base="/llamadas" sp={sp} cat={c} />
    <Kpis><Kpi t="Llamadas" v={R.length} /><Kpi t="Promedio diario" v={dias ? (R.length / dias).toFixed(1) : 0} /><Kpi t="Tiempo promedio (min)" v={min.toFixed(1)} /><Kpi t="Requieren seguimiento" v={R.filter(r => r.requiere_seguimiento).length} /></Kpis>
    <Grid><Box title="Llamadas por día"><Chart data={byKey(grp(R, r => r.fecha))} type="line" /></Box>
      <Box title="Llamadas por hora"><Chart data={byKey(grp(R, r => String(r.hora).slice(0, 2) + 'h'))} /></Box></Grid>
    <Box title="Registrar llamada"><form action={crear} className="grid sm:grid-cols-3 gap-3">
      <I n="fecha" l="Fecha" type="date" def={hoy()} /><I n="hora" l="Hora" type="time" /><S n="cliente_id" l="Cliente" o={opts(c.clientes, x => `${x.codigo} · ${x.nombre}`)} />
      <I n="contacto" l="Contacto" /><I n="telefono" l="Teléfono" /><I n="motivo" l="Motivo de la llamada" />
      <A n="descripcion" l="Descripción" cls="sm:col-span-2" /><div className="grid gap-3"><I n="resultado" l="Resultado" /><I n="minutos" l="Duración (min)" type="number" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="seg" /> Requiere seguimiento</label><div className="sm:col-span-3"><B>Guardar llamada</B></div></form></Box>
    <Box title="Historial"><Tbl cols={['Fecha', 'Hora', 'Cliente', 'Contacto', 'Motivo', 'Min', 'Resultado / descripción', '']} rows={R.slice(0, 200).map(r => [r.fecha, String(r.hora).slice(0, 5), r.clientes?.nombre, `${r.contacto || ''} ${r.telefono || ''}`, r.motivo, (r.duracion_seg / 60).toFixed(1),
      <details key="e"><summary className="cursor-pointer text-belca-navy underline">{r.resultado || 'editar'}{r.requiere_seguimiento ? ' · seguimiento' : ''}</summary>
        <form action={actualizar} className="grid gap-2 mt-2 w-64"><input type="hidden" name="id" value={r.id} /><I n="resultado" l="Resultado" def={r.resultado} /><A n="descripcion" l="Descripción" def={r.descripcion} />
          <label className="text-sm flex gap-2"><input type="checkbox" name="seg" defaultChecked={r.requiere_seguimiento} /> Seguimiento</label><B>Guardar</B></form></details>,
      admin ? <form key="d" action={borrar}><input type="hidden" name="id" value={r.id} /><button className="text-red-600 text-xs underline">Eliminar</button></form> : ''])} /></Box></div>
}
