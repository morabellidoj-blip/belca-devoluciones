import Link from 'next/link'
import { motLabel } from '@/lib/ui'
import { ctx, cat, rango } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { T, Kpi, Kpis, Grid, Box, Tbl, Badge, Filtros, grp, byKey, horaCR, ESTADOS } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export default async function Llamadas({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams; const { sb } = await ctx()
  let q = rango(sb.from('casos').select('id,numero,fecha,created_at,estado,chofer,duracion_min,clientes(nombre),vendedores(nombre),motivos_devolucion(codigo,nombre)').order('created_at', { ascending: false }).limit(2000), 'fecha', sp)
  if (sp.cliente_id) q = q.eq('cliente_id', sp.cliente_id)
  const [{ data }, c] = await Promise.all([q, cat(sb)]); const R: any[] = data || []
  const dias = new Set(R.map(r => r.fecha)).size
  const conDur = R.filter(r => r.duracion_min != null)
  const prom = conDur.length ? conDur.reduce((a, r) => a + Number(r.duracion_min), 0) / conDur.length : 0
  return <div>
    <div className="flex justify-between items-center mb-5"><T>Llamadas recibidas</T><Link href="/casos/nuevo" className="bg-belca-orange text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Registrar llamada / caso</Link></div>
    <p className="text-sm text-slate-500 mb-4 -mt-3">Cada llamada de devolución se registra como un caso. Aquí se miden esas llamadas por día y por hora.</p>
    <Filtros base="/llamadas" sp={sp} cat={c} />
    <Kpis><Kpi t="Llamadas recibidas" v={R.length} /><Kpi t="Promedio diario" v={dias ? (R.length / dias).toFixed(1) : 0} />
      <Kpi t="Tiempo promedio de atención (min)" v={conDur.length ? prom.toFixed(1) : '—'} /><Kpi t="Casos aún abiertos" v={R.filter(r => !['resuelto', 'cerrado'].includes(r.estado)).length} /></Kpis>
    <Grid><Box title="Llamadas por día"><Chart data={byKey(grp(R, r => r.fecha))} type="line" /></Box>
      <Box title="Llamadas por hora"><Chart data={byKey(grp(R, r => horaCR(r.created_at).slice(0, 2) + 'h'))} /></Box></Grid>
    <Box title="Detalle"><Tbl cols={['Fecha', 'Hora', 'Caso', 'Cliente', 'Motivo', 'Chofer', 'Vendedor', 'Min', 'Estado']} rows={R.slice(0, 300).map(r => [r.fecha, horaCR(r.created_at),
      <Link key="n" className="underline text-belca-navy" href={`/casos/${r.id}`}>{r.numero}</Link>, r.clientes?.nombre, motLabel(r?.motivos_devolucion), r.chofer, r.vendedores?.nombre, r.duracion_min ?? '', <Badge key="e">{ESTADOS[r.estado]}</Badge>])} /></Box></div>
}
