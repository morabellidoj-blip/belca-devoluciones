import Link from 'next/link'
import { cliTxt } from '@/lib/ui'
import { ctx, cat } from '@/lib/data'
import { cargar, calcular, delta, META } from '@/lib/metricas'
import { Chart } from '@/lib/chart'
import { PrintButton } from '@/lib/print'
import { Kpi, Kpis, Grid, Box, H, Tbl, Badge, Rank, Filtros, grp, top, byKey, semana, pct, fmt, horaCR, motLabel, ESTADOS } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const md = (s: string) => s.split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))
export default async function Dashboard({ searchParams }: { searchParams: Promise<any> }) {
  const sp0 = await searchParams
  const { sb, admin } = await ctx()
  await sb.rpc('generar_alertas')
  const [datos, c, { data: gest }] = await Promise.all([cargar(sb, sp0), cat(sb), sb.from('profiles').select('id,nombre').eq('activo', true)])
  const m = calcular(datos)
  const { sp, todo, R, K, rec, viejos, H0, total, cerr, abiertos, pend, gestionadas, hrs, valor, pValor, recup, perd, pRecup, efect, pTotal, pEfect, kEnt, kRec, kPend, kPerd, cierre, gM, gC, gV, gT, periodo, insights } = m
  const qs = new URLSearchParams(); if (todo) qs.set('todo', '1'); else { if (sp.desde) qs.set('desde', sp.desde); if (sp.hasta) qs.set('hasta', sp.hasta) }
  for (const k of ['cliente_id', 'estado', 'gestor_id']) if (sp[k]) qs.set(k, sp[k])
  const bt = 'no-print text-sm rounded-lg border border-belca-navy text-belca-navy px-3 py-1.5 font-semibold hover:bg-slate-50'
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 className="text-2xl font-semibold text-belca-navy">Panel gerencial</h1>
        <p className="text-sm text-slate-500">Devoluciones, canastas y recuperación económica · <span className="font-medium">{periodo}</span></p></div>
      <div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-400 mr-1">Actualizado {H0} {horaCR(new Date().toISOString())}</p>
        <a href={`/api/informe?fmt=xlsx&${qs}`} className={bt}>⬇ Excel</a><a href={`/api/informe?fmt=pdf&${qs}`} className={bt}>⬇ PDF</a><PrintButton /></div></div>
    <Filtros base="/dashboard" sp={sp} cat={c} estados gestores={admin ? gest : undefined} todo sinAsignar />

    <H>Resumen ejecutivo</H>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi hero t="Valor devuelto" v={fmt(valor)} delta={delta(valor, pValor)} sub={`${fmt(total)} casos`} />
      <Kpi hero t="Efectividad de cierre" v={`${efect}%`} tone={!total ? undefined : efect >= META ? 'ok' : efect >= 60 ? 'warn' : 'bad'} delta={pTotal ? Math.round((efect - pEfect) * 10) / 10 : null} unit=" pp" good="up" sub={`${cerr} de ${total} cerrados · meta ${META}%`} />
      <Kpi hero t="Monto recuperado" v={fmt(recup)} delta={delta(recup, pRecup)} good="up" sub={`de ${fmt(perd)} en pérdidas`} />
      <Kpi hero t="% Recuperación económica" v={`${pct(recup, perd)}%`} sub={`No recuperado ${fmt(perd - recup)}`} /></div>
    {!!insights.length && <Box title="Lectura rápida" cls="mt-4"><ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">{insights.map((x: string, i: number) => <li key={i}>{md(x)}</li>)}</ul></Box>}

    <H>Devoluciones</H>
    <Kpis>
      <Kpi t="Casos recibidos" v={fmt(total)} delta={delta(total, pTotal)} /><Kpi t="Recibidos hoy" v={R.filter((r: any) => r.fecha === H0).length} />
      <Kpi t="Abiertos" v={abiertos} /><Kpi t="Cerrados" v={cerr} /><Kpi t="Pendientes" v={pend} />
      <Kpi t="Gestionadas (resueltas + cerradas)" v={gestionadas} /><Kpi t="Clientes atendidos" v={new Set(R.filter((r: any) => r.cliente_id).map((r: any) => r.cliente_id)).size} />
      <Kpi t="Tiempo promedio de resolución" v={hrs == null ? '—' : hrs < 48 ? `${hrs.toFixed(1)} h` : `${(hrs / 24).toFixed(1)} días`} />
      <Kpi t="Valor promedio por caso" v={total ? fmt(valor / total) : '—'} /></Kpis>

    <H>Canastas retornables</H>
    <Kpis><Kpi t="Entregadas" v={fmt(kEnt)} /><Kpi t="Recuperadas" v={fmt(kRec)} /><Kpi t="% Recuperación" v={`${pct(kRec, kEnt)}%`} tone={!kEnt ? undefined : pct(kRec, kEnt) >= 80 ? 'ok' : pct(kRec, kEnt) >= 60 ? 'warn' : 'bad'} />
      <Kpi t="Pendientes" v={fmt(kPend)} /><Kpi t="Perdidas" v={fmt(kPerd)} /></Kpis>

    <H>Dónde se concentra el valor devuelto</H>
    <Grid>
      <Box title="Por motivo"><Rank items={top(gM, 6)} total={valor} /></Box>
      <Box title="Por cliente"><Rank items={top(gC, 6)} total={valor} /></Box>
      <Box title="Por vendedor"><Rank items={top(gV, 6)} total={valor} /></Box>
      <Box title="Casos por televenta"><Rank items={top(gT, 6)} total={gT.reduce((a: number, x: any) => a + x.value, 0)} /></Box></Grid>

    <H>Atención requerida</H>
    <Box title="Casos abiertos con más antigüedad"><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado', 'Días abiertos']} rows={viejos.map((v: any) => {
      const dias = Math.floor((Date.now() - +new Date(v.created_at)) / 864e5)
      return [<Link key="n" href={`/casos/${v.id}`} className="underline text-belca-navy font-medium">{v.numero}</Link>, cliTxt(v?.clientes), motLabel(v.motivos_devolucion), <Badge key="e">{ESTADOS[v.estado]}</Badge>,
        <span key="d" className={dias >= 2 ? 'text-red-600 font-semibold' : ''}>{dias}</span>]
    })} /></Box>

    <H>Tendencias</H>
    <Grid>
      <Box title="Casos por día"><Chart data={byKey(grp(R, (r: any) => r.fecha))} type="line" /></Box>
      <Box title="Valor devuelto por día"><Chart data={byKey(grp(R, (r: any) => r.fecha, (r: any) => r.monto))} type="line" /></Box>
      <Box title="Casos por semana (inicio lunes)"><Chart data={byKey(grp(R, (r: any) => semana(r.fecha)))} /></Box>
      <Box title="Llamadas por hora del día"><Chart data={byKey(grp(R, (r: any) => horaCR(r.created_at).slice(0, 2) + 'h'))} /></Box>
      <Box title="Tasa de cierre por mes (%)"><Chart data={cierre} type="line" suffix="%" /></Box>
      <Box title="Monto recuperado por mes"><Chart data={byKey(grp(rec, (r: any) => r.created_at.slice(0, 7), (r: any) => r.monto_recuperado))} /></Box>
    </Grid></div>
}
