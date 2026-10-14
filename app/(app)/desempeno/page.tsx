import { ctx, rango, rangoTs } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { T, Kpi, Kpis, Grid, Box, Tbl, Filtros, grp, byKey, semana, pct, fmt } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export default async function Desempeno({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams; const { sb } = await ctx()
  const [{ data: casos }, { data: can }, { data: seg }, { data: rec }, { data: pr }] = await Promise.all([
    rango(sb.from('casos').select('estado,gestor_id,created_at,fecha_cierre').limit(10000), 'fecha', sp),
    rango(sb.from('canastas').select('entregada,recuperada,pendiente,estado'), 'fecha', sp),
    rangoTs(sb.from('seguimientos').select('usuario_id'), 'created_at', sp),
    rangoTs(sb.from('recuperaciones').select('created_by,monto_recuperado'), 'created_at', sp),
    sb.from('profiles').select('id,nombre').eq('activo', true)])
  const C: any[] = casos || [], K: any[] = can || []
  const cerrados = C.filter(c => c.fecha_cierre)
  const hrs = cerrados.length ? cerrados.reduce((a, c) => a + (+new Date(c.fecha_cierre) - +new Date(c.created_at)) / 36e5, 0) / cerrados.length : 0
  const ent = K.reduce((a, r) => a + r.entregada, 0), rc = K.reduce((a, r) => a + r.recuperada, 0)
  const dias = new Set(cerrados.map(c => c.fecha_cierre.slice(0, 10))).size
  const cnt = (rows: any[] | null, f: (r: any) => string, id: string) => (rows || []).filter(r => f(r) === id).length
  return <div><T>Desempeño operativo</T>
    <Filtros base="/desempeno" sp={sp} cat={null} />
    <h2 className="font-semibold text-belca-navy mb-2">Devoluciones</h2>
    <Kpis><Kpi t="Casos recibidos" v={C.length} /><Kpi t="Casos resueltos" v={C.filter(c => ['resuelto', 'cerrado'].includes(c.estado)).length} /><Kpi t="Tiempo promedio resolución (h)" v={hrs.toFixed(1)} />
      <Kpi t="Efectividad" v={`${pct(C.filter(c => c.estado === 'cerrado').length, C.length)}%`} /><Kpi t="Cierres por día activo" v={dias ? (cerrados.length / dias).toFixed(1) : 0} /></Kpis>
    <h2 className="font-semibold text-belca-navy mb-2">Canastas</h2>
    <Kpis><Kpi t="% Recuperación" v={`${pct(rc, ent)}%`} /><Kpi t="Pendientes" v={fmt(K.filter(r => ['pendiente', 'parcial'].includes(r.estado)).reduce((a, r) => a + r.pendiente, 0))} />
      <Kpi t="Pérdidas" v={fmt(K.filter(r => r.estado === 'perdida').reduce((a, r) => a + r.pendiente, 0))} /></Kpis>
    <Grid><Box title="Casos cerrados por día"><Chart type="line" data={byKey(grp(cerrados, c => c.fecha_cierre.slice(0, 10)))} /></Box>
      <Box title="Casos cerrados por semana"><Chart data={byKey(grp(cerrados, c => semana(c.fecha_cierre.slice(0, 10))))} /></Box>
      <Box title="Casos cerrados por mes"><Chart data={byKey(grp(cerrados, c => c.fecha_cierre.slice(0, 7)))} /></Box></Grid>
    <Box title="Productividad por gestor"><Tbl cols={['Gestor', 'Llamadas / casos registrados', 'Casos cerrados', 'Seguimientos', 'Recuperación generada']} rows={(pr || []).map((p: any) => [p.nombre,
      cnt(C, r => r.gestor_id, p.id), C.filter(c => c.gestor_id === p.id && c.estado === 'cerrado').length, cnt(seg, r => r.usuario_id, p.id),
      fmt((rec || []).filter((r: any) => r.created_by === p.id).reduce((a: number, r: any) => a + Number(r.monto_recuperado), 0))])} /></Box></div>
}
