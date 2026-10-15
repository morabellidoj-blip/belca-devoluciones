import Link from 'next/link'
import { ctx, cat, rango, rangoTs } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { Kpi, Kpis, Grid, Box, H, Tbl, Badge, Filtros, grp, top, byKey, semana, pct, fmt, hoy, horaCR, motLabel, ESTADOS } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const dd = (s: string) => new Date(s + 'T00:00:00Z')
const addD = (s: string, n: number) => { const d = dd(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const delta = (a: number, b: number) => (b ? Math.round((1000 * (a - b)) / b) / 10 : null)
export default async function Dashboard({ searchParams }: { searchParams: Promise<any> }) {
  const sp0 = await searchParams
  const { sb, admin } = await ctx()
  await sb.rpc('generar_alertas')
  const H0 = hoy(), todo = !!sp0.todo
  const sp = !sp0.desde && !sp0.hasta && !todo ? { ...sp0, desde: H0.slice(0, 8) + '01', hasta: H0 } : sp0
  let prev: any = null
  if (sp.desde && sp.hasta) { const len = Math.round((+dd(sp.hasta) - +dd(sp.desde)) / 864e5) + 1; prev = { desde: addD(sp.desde, -len), hasta: addD(sp.desde, -1) } }
  const filt = (q: any) => { for (const k of ['cliente_id', 'estado', 'gestor_id']) if (sp[k]) q = q.eq(k, sp[k]); return q }
  const [{ data: casos }, { data: pc }, { data: rec }, { data: prec }, { data: can }, { data: viejos }, c, { data: gest }] = await Promise.all([
    filt(rango(sb.from('casos').select('fecha,estado,monto,cliente_id,created_at,fecha_cierre,clientes(nombre),vendedores(nombre),motivos_devolucion(codigo,nombre)').limit(10000), 'fecha', sp)),
    prev ? filt(rango(sb.from('casos').select('estado').limit(10000), 'fecha', prev)) : Promise.resolve({ data: null }),
    rangoTs(sb.from('recuperaciones').select('monto_perdida,monto_recuperado,created_at').limit(10000), 'created_at', sp),
    prev ? rangoTs(sb.from('recuperaciones').select('monto_recuperado'), 'created_at', prev) : Promise.resolve({ data: null }),
    (sp.cliente_id ? (q: any) => q.eq('cliente_id', sp.cliente_id) : (q: any) => q)(rango(sb.from('canastas').select('entregada,recuperada,pendiente,estado').limit(10000), 'fecha', sp)),
    sb.from('casos').select('id,numero,created_at,estado,clientes(nombre),motivos_devolucion(codigo,nombre)').not('estado', 'in', '(resuelto,cerrado)').order('created_at').limit(8),
    cat(sb), sb.from('profiles').select('id,nombre').eq('activo', true)])
  const R: any[] = casos || [], P: any[] = pc || [], K: any[] = can || []
  const total = R.length, cerr = R.filter(r => r.estado === 'cerrado').length
  const abiertos = R.filter(r => !['resuelto', 'cerrado'].includes(r.estado)).length
  const pend = R.filter(r => r.estado.startsWith('pendiente')).length
  const gestionadas = R.filter(r => ['resuelto', 'cerrado'].includes(r.estado)).length
  const cerrConFecha = R.filter(r => r.fecha_cierre)
  const hrs = cerrConFecha.length ? cerrConFecha.reduce((a, r) => a + (+new Date(r.fecha_cierre) - +new Date(r.created_at)) / 36e5, 0) / cerrConFecha.length : null
  const sum = (a: any[] | null, k: string) => (a || []).reduce((t: number, r: any) => t + Number(r[k]), 0)
  const recup = sum(rec, 'monto_recuperado'), perd = sum(rec, 'monto_perdida')
  const efect = pct(cerr, total)
  const pTotal = P.length, pEfect = pct(P.filter(r => r.estado === 'cerrado').length, pTotal)
  const kEnt = sum(K, 'entregada'), kRec = sum(K, 'recuperada')
  const meses = [...new Set(R.map(r => r.fecha.slice(0, 7)))].sort()
  const cierre = meses.map(m => ({ name: m, value: pct(R.filter(r => r.fecha.startsWith(m) && r.estado === 'cerrado').length, R.filter(r => r.fecha.startsWith(m)).length) }))
  const periodo = todo ? 'Todo el historial' : `${sp.desde || 'inicio'} al ${sp.hasta || 'hoy'}`
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
      <div><h1 className="text-2xl font-semibold text-belca-navy">Panel gerencial</h1>
        <p className="text-sm text-slate-500">Devoluciones, canastas y recuperación económica · <span className="font-medium">{periodo}</span></p></div>
      <p className="text-xs text-slate-400">Actualizado {H0} {horaCR(new Date().toISOString())}</p></div>
    <Filtros base="/dashboard" sp={sp} cat={c} estados gestores={admin ? gest : undefined} todo />

    <H>Resumen ejecutivo</H>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi hero t="Casos recibidos" v={fmt(total)} delta={delta(total, pTotal)} sub={`${abiertos} abiertos`} />
      <Kpi hero t="Efectividad de cierre" v={`${efect}%`} delta={pTotal ? Math.round((efect - pEfect) * 10) / 10 : null} unit=" pp" good="up" sub={`${cerr} de ${total} cerrados`} />
      <Kpi hero t="Monto recuperado" v={fmt(recup)} delta={delta(recup, sum(prec, 'monto_recuperado'))} good="up" sub={`de ${fmt(perd)} en pérdidas`} />
      <Kpi hero t="% Recuperación económica" v={`${pct(recup, perd)}%`} sub={`Neto no recuperado ${fmt(perd - recup)}`} /></div>

    <H>Devoluciones</H>
    <Kpis>
      <Kpi t="Recibidos hoy" v={R.filter(r => r.fecha === H0).length} /><Kpi t="Abiertos" v={abiertos} /><Kpi t="Cerrados" v={cerr} /><Kpi t="Pendientes" v={pend} />
      <Kpi t="Gestionadas (resueltas + cerradas)" v={gestionadas} /><Kpi t="Clientes atendidos" v={new Set(R.map(r => r.cliente_id)).size} />
      <Kpi t="Tiempo promedio de resolución" v={hrs == null ? '—' : hrs < 48 ? `${hrs.toFixed(1)} h` : `${(hrs / 24).toFixed(1)} días`} /><Kpi t="Monto perdido" v={fmt(perd)} /></Kpis>

    <H>Canastas retornables</H>
    <Kpis><Kpi t="Entregadas" v={fmt(kEnt)} /><Kpi t="Recuperadas" v={fmt(kRec)} /><Kpi t="% Recuperación" v={`${pct(kRec, kEnt)}%`} />
      <Kpi t="Pendientes" v={fmt(K.filter(r => ['pendiente', 'parcial'].includes(r.estado)).reduce((a, r) => a + r.pendiente, 0))} />
      <Kpi t="Perdidas" v={fmt(K.filter(r => r.estado === 'perdida').reduce((a, r) => a + r.pendiente, 0))} /></Kpis>

    <H>Atención requerida</H>
    <Box title="Casos abiertos con más antigüedad"><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado', 'Días abiertos']} rows={(viejos || []).map((v: any) => {
      const dias = Math.floor((Date.now() - +new Date(v.created_at)) / 864e5)
      return [<Link key="n" href={`/casos/${v.id}`} className="underline text-belca-navy font-medium">{v.numero}</Link>, v.clientes?.nombre, motLabel(v.motivos_devolucion), <Badge key="e">{ESTADOS[v.estado]}</Badge>,
        <span key="d" className={dias >= 2 ? 'text-red-600 font-semibold' : ''}>{dias}</span>]
    })} /></Box>

    <H>Tendencias y distribución</H>
    <Grid>
      <Box title="Casos por día"><Chart data={byKey(grp(R, r => r.fecha))} type="line" /></Box>
      <Box title="Casos por semana (inicio lunes)"><Chart data={byKey(grp(R, r => semana(r.fecha)))} /></Box>
      <Box title="Llamadas por hora del día"><Chart data={byKey(grp(R, r => horaCR(r.created_at).slice(0, 2) + 'h'))} /></Box>
      <Box title="Tasa de cierre por mes (%)"><Chart data={cierre} type="line" suffix="%" /></Box>
      <Box title="Casos por motivo"><Chart horizontal data={top(grp(R, r => motLabel(r.motivos_devolucion)))} /></Box>
      <Box title="Casos por cliente"><Chart horizontal data={top(grp(R, r => r.clientes?.nombre))} /></Box>
      <Box title="Casos por vendedor"><Chart horizontal data={top(grp(R, r => r.vendedores?.nombre))} /></Box>
      <Box title="Monto recuperado por mes"><Chart data={byKey(grp(rec || [], r => r.created_at.slice(0, 7), r => r.monto_recuperado))} /></Box>
    </Grid></div>
}
