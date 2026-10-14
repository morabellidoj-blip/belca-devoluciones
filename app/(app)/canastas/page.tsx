import { revalidatePath } from 'next/cache'
import { ctx, cat, g, num, rango, subir } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { T, Kpi, Kpis, Grid, Box, I, S, A, F, B, Tbl, Badge, Filtros, opts, grp, top, byKey, ratio, semana, pct, fmt, hoy, ESTADOS_CANASTA } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const estadoAuto = (est: string, ent: number, rec: number) => ['perdida', 'facturada'].includes(est) ? est : rec >= ent ? 'recuperada' : rec > 0 ? 'parcial' : 'pendiente'
async function crear(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const ent = num(fd, 'entregada'), rec = Math.min(num(fd, 'recuperada'), ent)
  const { data, error } = await sb.from('canastas').insert({ fecha: g(fd, 'fecha') || hoy(), cliente_id: g(fd, 'cliente_id'), ruta_id: g(fd, 'ruta_id'), vendedor_id: g(fd, 'vendedor_id'),
    chofer: g(fd, 'chofer'), ayudante: g(fd, 'ayudante'), tipo_canasta: g(fd, 'tipo_canasta'), entregada: ent, recuperada: rec, estado: estadoAuto(g(fd, 'estado') || 'pendiente', ent, rec), observaciones: g(fd, 'observaciones') }).select('id').single()
  if (error) throw new Error(error.message)
  await subir(sb, fd, 'fotos', { canasta_id: data.id }); revalidatePath('/canastas')
}
async function actualizar(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const ent = num(fd, 'entregada'), rec = Math.min(num(fd, 'recuperada'), ent)
  await sb.from('canastas').update({ recuperada: rec, estado: estadoAuto(g(fd, 'estado') || 'pendiente', ent, rec) }).eq('id', g(fd, 'id')); revalidatePath('/canastas')
}
async function borrar(fd: FormData) { 'use server'; const { sb, admin } = await ctx(); if (admin) await sb.from('canastas').delete().eq('id', g(fd, 'id')); revalidatePath('/canastas') }
export default async function Canastas({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams; const { sb, admin } = await ctx()
  let q = rango(sb.from('canastas').select('*,clientes(nombre,codigo),rutas(nombre),vendedores(nombre)').order('fecha', { ascending: false }).limit(5000), 'fecha', sp)
  if (sp.cliente_id) q = q.eq('cliente_id', sp.cliente_id)
  const [{ data }, c] = await Promise.all([q, cat(sb)]); const R: any[] = data || []
  const abiertas = R.filter(r => ['pendiente', 'parcial'].includes(r.estado))
  const ent = R.reduce((a, r) => a + r.entregada, 0), rec = R.reduce((a, r) => a + r.recuperada, 0)
  const pend = abiertas.reduce((a, r) => a + r.pendiente, 0), perd = R.filter(r => r.estado === 'perdida').reduce((a, r) => a + r.pendiente, 0)
  return <div><T>Control de canastas</T>
    <Filtros base="/canastas" sp={sp} cat={c} />
    <Kpis><Kpi t="Entregadas" v={fmt(ent)} /><Kpi t="Recuperadas" v={fmt(rec)} /><Kpi t="Pendientes" v={fmt(pend)} /><Kpi t="Perdidas" v={fmt(perd)} /><Kpi t="% Recuperación" v={`${pct(rec, ent)}%`} /></Kpis>
    <Grid>
      <Box title="Clientes con más pendientes"><Chart horizontal data={top(grp(abiertas, r => r.clientes?.nombre, r => r.pendiente))} /></Box>
      <Box title="Recuperación por ruta (%)"><Chart data={ratio(R, r => r.rutas?.nombre)} suffix="%" /></Box>
      <Box title="Recuperación por chofer (%)"><Chart data={ratio(R, r => r.chofer)} suffix="%" /></Box>
      <Box title="Recuperación semanal (%)"><Chart type="line" suffix="%" data={byKey(ratio(R, r => semana(r.fecha)))} /></Box>
      <Box title="Recuperación mensual (%)"><Chart suffix="%" data={byKey(ratio(R, r => r.fecha.slice(0, 7)))} /></Box>
      <Box title="Pendientes por cliente"><Chart data={top(grp(abiertas, r => r.clientes?.nombre, r => r.pendiente))} /></Box>
      <Box title="Pendientes por ruta"><Chart data={top(grp(abiertas, r => r.rutas?.nombre, r => r.pendiente))} /></Box>
      <Box title="Pendientes por vendedor"><Chart data={top(grp(abiertas, r => r.vendedores?.nombre, r => r.pendiente))} /></Box></Grid>
    <Box title="Registrar canastas"><form action={crear} className="grid sm:grid-cols-3 gap-3">
      <I n="fecha" l="Fecha" type="date" def={hoy()} /><S n="cliente_id" l="Cliente" req o={opts(c.clientes, x => `${x.codigo} · ${x.nombre}`)} /><S n="ruta_id" l="Ruta" o={opts(c.rutas, x => x.nombre)} />
      <S n="vendedor_id" l="Vendedor" o={opts(c.vendedores, x => x.nombre)} /><I n="chofer" l="Chofer" /><I n="ayudante" l="Ayudante" />
      <I n="tipo_canasta" l="Tipo de canasta" req /><I n="entregada" l="Cantidad entregada" type="number" req /><I n="recuperada" l="Cantidad recuperada" type="number" def={0} />
      <S n="estado" l="Estado" def="pendiente" o={ESTADOS_CANASTA.map(e => [e, e])} /><A n="observaciones" l="Observaciones" cls="sm:col-span-2" /><F n="fotos" l="Evidencia fotográfica" />
      <div className="sm:col-span-3"><B>Guardar</B></div></form></Box>
    <Box title="Registros"><Tbl cols={['Fecha', 'Cliente', 'Ruta', 'Chofer', 'Tipo', 'Entreg.', 'Recup.', 'Pend.', 'Estado / actualizar', '']} rows={R.slice(0, 300).map(r => [r.fecha, r.clientes?.nombre, r.rutas?.nombre, r.chofer, r.tipo_canasta, r.entregada, r.recuperada, r.pendiente,
      <form key="f" action={actualizar} className="flex gap-1 items-center"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="entregada" value={r.entregada} />
        <input name="recuperada" type="number" defaultValue={r.recuperada} className="inp w-20" /><select name="estado" defaultValue={r.estado} className="inp w-32">{ESTADOS_CANASTA.map(e => <option key={e}>{e}</option>)}</select><B>OK</B></form>,
      admin ? <form key="d" action={borrar}><input type="hidden" name="id" value={r.id} /><button className="text-red-600 text-xs underline">Eliminar</button></form> : ''])} /></Box></div>
}
