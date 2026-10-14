import { ctx, cat, rango, rangoTs } from '@/lib/data'
import { motLabel } from '@/lib/ui'
import { Chart } from '@/lib/chart'
import { Kpi, Kpis, Grid, Box, Filtros, grp, top, byKey, semana, pct, fmt, hoy } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export default async function Dashboard({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams
  const { sb, admin } = await ctx()
  await sb.rpc('generar_alertas')
  let q = rango(sb.from('casos').select('fecha,estado,monto,cliente_id,created_at,clientes(nombre),vendedores(nombre),motivos_devolucion(codigo,nombre)').limit(10000), 'fecha', sp)
  for (const k of ['cliente_id', 'estado', 'gestor_id']) if (sp[k]) q = q.eq(k, sp[k])
  const [{ data: casos }, { data: rec }, c, { data: gest }] = await Promise.all([
    q, rangoTs(sb.from('recuperaciones').select('monto_perdida,monto_recuperado,created_at'), 'created_at', sp),
    cat(sb),
    sb.from('profiles').select('id,nombre').eq('activo', true)])
  const R: any[] = casos || [], H = hoy()
  const cerr = R.filter(r => r.estado === 'cerrado').length
  const abiertos = R.filter(r => !['resuelto', 'cerrado'].includes(r.estado)).length
  const pend = R.filter(r => r.estado.startsWith('pendiente')).length
  const gestionadas = R.filter(r => ['resuelto', 'cerrado'].includes(r.estado)).length
  const recup = (rec || []).reduce((a: number, r: any) => a + Number(r.monto_recuperado), 0)
  const perd = (rec || []).reduce((a: number, r: any) => a + Number(r.monto_perdida), 0)
  const meses = [...new Set(R.map(r => r.fecha.slice(0, 7)))].sort()
  const cierre = meses.map(m => ({ name: m, value: pct(R.filter(r => r.fecha.startsWith(m) && r.estado === 'cerrado').length, R.filter(r => r.fecha.startsWith(m)).length) }))
  return <div>
    <h1 className="text-2xl font-semibold text-belca-navy mb-5">Dashboard</h1>
    <Filtros base="/dashboard" sp={sp} cat={c} estados gestores={admin ? gest : undefined} />
    <Kpis>
      <Kpi t="Casos recibidos hoy" v={R.filter(r => r.fecha === H).length} /><Kpi t="Casos abiertos" v={abiertos} />
      <Kpi t="Casos cerrados" v={cerr} /><Kpi t="Casos pendientes" v={pend} />
      <Kpi t="Monto recuperado" v={fmt(recup)} /><Kpi t="Monto perdido" v={fmt(perd)} />
      <Kpi t="Devoluciones gestionadas" v={gestionadas} /><Kpi t="Clientes atendidos" v={new Set(R.map(r => r.cliente_id)).size} />
      <Kpi t="Llamadas recibidas" v={R.length} /><Kpi t="Efectividad" v={`${pct(cerr, R.length)}%`} />
    </Kpis>
    <Grid>
      <Box title="Casos por día"><Chart data={byKey(grp(R, r => r.fecha))} type="line" /></Box>
      <Box title="Casos por semana (inicio lunes)"><Chart data={byKey(grp(R, r => semana(r.fecha)))} /></Box>
      <Box title="Casos por motivo"><Chart horizontal data={top(grp(R, r => motLabel(r?.motivos_devolucion)))} /></Box>
      <Box title="Casos por cliente"><Chart horizontal data={top(grp(R, r => r.clientes?.nombre))} /></Box>
      <Box title="Casos por vendedor"><Chart horizontal data={top(grp(R, r => r.vendedores?.nombre))} /></Box>
      <Box title="Monto recuperado por mes"><Chart data={byKey(grp(rec || [], r => r.created_at.slice(0, 7), r => r.monto_recuperado))} /></Box>
      <Box title="Tasa de cierre por mes (%)"><Chart data={cierre} type="line" suffix="%" /></Box>
    </Grid></div>
}
