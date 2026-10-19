import Link from 'next/link'
import { all, ctx, cat, rango, rangoTs } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { PrintButton } from '@/lib/print'
import { Kpi, Kpis, Grid, Box, H, Tbl, Badge, Rank, Filtros, grp, top, byKey, semana, pct, fmt, hoy, horaCR, motLabel, ESTADOS } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const dd = (s: string) => new Date(s + 'T00:00:00Z')
const addD = (s: string, n: number) => { const d = dd(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const delta = (a: number, b: number) => (b ? Math.round((1000 * (a - b)) / b) / 10 : null)
const META = 80
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
    all(filt(rango(sb.from('casos').select('fecha,estado,monto,cliente_id,created_at,fecha_cierre,televenta_id,clientes(nombre),vendedores(nombre),televentas(nombre),motivos_devolucion(codigo,nombre)'), 'fecha', sp))),
    prev ? all(filt(rango(sb.from('casos').select('estado,monto'), 'fecha', prev))) : Promise.resolve({ data: null }),
    all(rangoTs(sb.from('recuperaciones').select('monto_perdida,monto_recuperado,created_at'), 'created_at', sp)),
    prev ? all(rangoTs(sb.from('recuperaciones').select('monto_recuperado'), 'created_at', prev)) : Promise.resolve({ data: null }),
    all((sp.cliente_id ? (q: any) => q.eq('cliente_id', sp.cliente_id) : (q: any) => q)(rango(sb.from('canastas').select('entregada,recuperada,pendiente,estado'), 'fecha', sp))),
    sb.from('casos').select('id,numero,created_at,estado,clientes(nombre),motivos_devolucion(codigo,nombre)').not('estado', 'in', '(resuelto,cerrado)').order('created_at').limit(8),
    cat(sb), sb.from('profiles').select('id,nombre').eq('activo', true)])
  const R: any[] = casos || [], P: any[] = pc || [], K: any[] = can || []
  const sum = (a: any[] | null, k: string) => (a || []).reduce((t: number, r: any) => t + Number(r[k] || 0), 0)
  const total = R.length, cerr = R.filter(r => r.estado === 'cerrado').length
  const abiertos = R.filter(r => !['resuelto', 'cerrado'].includes(r.estado)).length
  const pend = R.filter(r => r.estado.startsWith('pendiente')).length
  const gestionadas = R.filter(r => ['resuelto', 'cerrado'].includes(r.estado)).length
  const conCierre = R.filter(r => r.fecha_cierre)
  const hrs = conCierre.length ? conCierre.reduce((a, r) => a + (+new Date(r.fecha_cierre) - +new Date(r.created_at)) / 36e5, 0) / conCierre.length : null
  const valor = sum(R, 'monto'), pValor = sum(P, 'monto'), recup = sum(rec, 'monto_recuperado'), perd = sum(rec, 'monto_perdida')
  const efect = pct(cerr, total), pTotal = P.length, pEfect = pct(P.filter(r => r.estado === 'cerrado').length, pTotal)
  const kEnt = sum(K, 'entregada'), kRec = sum(K, 'recuperada'), kPend = K.filter(r => ['pendiente', 'parcial'].includes(r.estado)).reduce((a, r) => a + r.pendiente, 0)
  const meses = [...new Set(R.map(r => r.fecha.slice(0, 7)))].sort()
  const cierre = meses.map(m => ({ name: m, value: pct(R.filter(r => r.fecha.startsWith(m) && r.estado === 'cerrado').length, R.filter(r => r.fecha.startsWith(m)).length) }))
  const gM = grp(R, r => motLabel(r.motivos_devolucion), r => r.monto), gC = grp(R, r => r.clientes?.nombre, r => r.monto), gV = grp(R, r => r.vendedores?.nombre, r => r.monto)
  const gT = grp(R.filter(r => r.televenta_id), r => r.televentas?.nombre)
  const periodo = todo ? 'todo el historial' : `${sp.desde || 'inicio'} al ${sp.hasta || 'hoy'}`
  const dV = delta(valor, pValor), diasViejo = viejos?.[0] ? Math.floor((Date.now() - +new Date(viejos[0].created_at)) / 864e5) : 0
  const m1 = top(gM, 1)[0], c1 = top(gC, 1)[0]
  const ins: React.ReactNode[] = []
  if (total) {
    ins.push(<>Se recibieron <b>{fmt(total)}</b> casos por un valor de <b>{fmt(valor)}</b>{dV != null && <> ({dV > 0 ? '+' : ''}{dV}% frente al período anterior)</>}.</>)
    if (m1 && valor) ins.push(<>El motivo de mayor valor es <b>{m1.name}</b>: concentra el <b>{pct(m1.value, valor)}%</b> de lo devuelto.</>)
    if (c1 && valor) ins.push(<>El cliente con más valor devuelto es <b>{c1.name}</b> ({fmt(c1.value)}; {pct(c1.value, valor)}% del total).</>)
    ins.push(<>La efectividad de cierre es <b>{efect}%</b>{efect >= META ? <> y supera la meta del {META}%.</> : <>, a {Math.round(META - efect)} puntos de la meta del {META}%.</>}</>)
    if (abiertos && viejos?.[0]) ins.push(<>Hay <b>{abiertos}</b> casos abiertos; el más antiguo lleva <b>{diasViejo}</b> {diasViejo === 1 ? 'día' : 'días'}.</>)
    if (perd) ins.push(<>De lo registrado como pérdida se ha recuperado el <b>{pct(recup, perd)}%</b> ({fmt(recup)} de {fmt(perd)}).</>)
  }
  if (kEnt) ins.push(<>Canastas: se ha recuperado el <b>{pct(kRec, kEnt)}%</b> de las entregadas y quedan <b>{fmt(kPend)}</b> pendientes.</>)
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 className="text-2xl font-semibold text-belca-navy">Panel gerencial</h1>
        <p className="text-sm text-slate-500">Devoluciones, canastas y recuperación económica · <span className="font-medium">{periodo}</span></p></div>
      <div className="flex items-center gap-3"><p className="text-xs text-slate-400">Actualizado {H0} {horaCR(new Date().toISOString())}</p><PrintButton /></div></div>
    <Filtros base="/dashboard" sp={sp} cat={c} estados gestores={admin ? gest : undefined} todo />

    <H>Resumen ejecutivo</H>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi hero t="Valor devuelto" v={fmt(valor)} delta={delta(valor, pValor)} sub={`${fmt(total)} casos`} />
      <Kpi hero t="Efectividad de cierre" v={`${efect}%`} tone={!total ? undefined : efect >= META ? 'ok' : efect >= 60 ? 'warn' : 'bad'} delta={pTotal ? Math.round((efect - pEfect) * 10) / 10 : null} unit=" pp" good="up" sub={`${cerr} de ${total} cerrados · meta ${META}%`} />
      <Kpi hero t="Monto recuperado" v={fmt(recup)} delta={delta(recup, sum(prec, 'monto_recuperado'))} good="up" sub={`de ${fmt(perd)} en pérdidas`} />
      <Kpi hero t="% Recuperación económica" v={`${pct(recup, perd)}%`} sub={`No recuperado ${fmt(perd - recup)}`} /></div>
    {!!ins.length && <Box title="Lectura rápida" cls="mt-4"><ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">{ins.map((x, i) => <li key={i}>{x}</li>)}</ul></Box>}

    <H>Devoluciones</H>
    <Kpis>
      <Kpi t="Casos recibidos" v={fmt(total)} delta={delta(total, pTotal)} /><Kpi t="Recibidos hoy" v={R.filter(r => r.fecha === H0).length} />
      <Kpi t="Abiertos" v={abiertos} /><Kpi t="Cerrados" v={cerr} /><Kpi t="Pendientes" v={pend} />
      <Kpi t="Gestionadas (resueltas + cerradas)" v={gestionadas} /><Kpi t="Clientes atendidos" v={new Set(R.map(r => r.cliente_id)).size} />
      <Kpi t="Tiempo promedio de resolución" v={hrs == null ? '—' : hrs < 48 ? `${hrs.toFixed(1)} h` : `${(hrs / 24).toFixed(1)} días`} />
      <Kpi t="Valor promedio por caso" v={total ? fmt(valor / total) : '—'} /></Kpis>

    <H>Canastas retornables</H>
    <Kpis><Kpi t="Entregadas" v={fmt(kEnt)} /><Kpi t="Recuperadas" v={fmt(kRec)} /><Kpi t="% Recuperación" v={`${pct(kRec, kEnt)}%`} tone={!kEnt ? undefined : pct(kRec, kEnt) >= 80 ? 'ok' : pct(kRec, kEnt) >= 60 ? 'warn' : 'bad'} />
      <Kpi t="Pendientes" v={fmt(kPend)} /><Kpi t="Perdidas" v={fmt(K.filter(r => r.estado === 'perdida').reduce((a, r) => a + r.pendiente, 0))} /></Kpis>

    <H>Dónde se concentra el valor devuelto</H>
    <Grid>
      <Box title="Por motivo"><Rank items={top(gM, 6)} total={valor} /></Box>
      <Box title="Por cliente"><Rank items={top(gC, 6)} total={valor} /></Box>
      <Box title="Por vendedor"><Rank items={top(gV, 6)} total={valor} /></Box>
      <Box title="Casos por televenta"><Rank items={top(gT, 6)} total={gT.reduce((a, x) => a + x.value, 0)} /></Box></Grid>

    <H>Atención requerida</H>
    <Box title="Casos abiertos con más antigüedad"><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado', 'Días abiertos']} rows={(viejos || []).map((v: any) => {
      const dias = Math.floor((Date.now() - +new Date(v.created_at)) / 864e5)
      return [<Link key="n" href={`/casos/${v.id}`} className="underline text-belca-navy font-medium">{v.numero}</Link>, v.clientes?.nombre, motLabel(v.motivos_devolucion), <Badge key="e">{ESTADOS[v.estado]}</Badge>,
        <span key="d" className={dias >= 2 ? 'text-red-600 font-semibold' : ''}>{dias}</span>]
    })} /></Box>

    <H>Tendencias</H>
    <Grid>
      <Box title="Casos por día"><Chart data={byKey(grp(R, r => r.fecha))} type="line" /></Box>
      <Box title="Valor devuelto por día"><Chart data={byKey(grp(R, r => r.fecha, r => r.monto))} type="line" /></Box>
      <Box title="Casos por semana (inicio lunes)"><Chart data={byKey(grp(R, r => semana(r.fecha)))} /></Box>
      <Box title="Llamadas por hora del día"><Chart data={byKey(grp(R, r => horaCR(r.created_at).slice(0, 2) + 'h'))} /></Box>
      <Box title="Tasa de cierre por mes (%)"><Chart data={cierre} type="line" suffix="%" /></Box>
      <Box title="Monto recuperado por mes"><Chart data={byKey(grp(rec || [], r => r.created_at.slice(0, 7), r => r.monto_recuperado))} /></Box>
    </Grid></div>
}
