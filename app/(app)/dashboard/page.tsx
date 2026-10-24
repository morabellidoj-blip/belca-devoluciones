import Link from 'next/link'
import { ctx, cat } from '@/lib/data'
import { cargar, calcular, delta, META } from '@/lib/metricas'
import { Chart } from '@/lib/chart'
import { PrintButton } from '@/lib/print'
import { AREAS, AREAS_CORTO } from '@/lib/areas'
import { Kpi, Kpis, Grid, Box, H, Tbl, Badge, Rank, Filtros, grp, byKey, semana, pct, fmt, horaCR, motLabel, cliTxt, ESTADOS } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const md = (s: string) => s.split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))
const Nota = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-slate-500 mt-3">{children}</p>
export default async function Dashboard({ searchParams }: { searchParams: Promise<any> }) {
  const sp0 = await searchParams
  const { sb, admin } = await ctx()
  await sb.rpc('generar_alertas')
  const [datos, c, { data: gest }] = await Promise.all([cargar(sb, sp0), cat(sb), sb.from('profiles').select('id,nombre').eq('activo', true)])
  const m = calcular(datos)
  const { sp, todo, R, K, rec, viejos, H0, total, cerr, abiertos, pend, gestionadas, hrs, valor, pValor, recup, perd, pRecup, efect, pTotal, pEfect, kEnt, kRec, kPend, kPerd, cierre, periodo, insights, porArea, vResp, tResp, cFrec, reincidentes, pareto, porInvestigar, imputables } = m
  const qs = new URLSearchParams(); if (todo) qs.set('todo', '1'); else { if (sp.desde) qs.set('desde', sp.desde); if (sp.hasta) qs.set('hasta', sp.hasta) }
  for (const k of ['cliente_id', 'estado', 'gestor_id', 'area']) if (sp[k]) qs.set(k, sp[k])
  const bt = 'no-print text-sm rounded-lg border border-belca-navy text-belca-navy px-3 py-1.5 font-semibold hover:bg-slate-50'
  const dias = (iso: string) => Math.floor((Date.now() - +new Date(iso)) / 864e5)
  const tablaResp = (items: any[]) => <Tbl cols={['Nombre', 'Casos totales', 'Imputables a ventas', 'Valor imputable']} rows={items.filter(x => x.imp > 0).slice(0, 8).map(x => [x.name, x.casos, <b key="i">{x.imp}</b>, fmt(x.valorImp)])} />
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 className="text-2xl font-semibold text-belca-navy">Panel gerencial</h1>
        <p className="text-sm text-slate-500">Devoluciones, canastas y recuperación económica · <span className="font-medium">{periodo}</span></p></div>
      <div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-400 mr-1">Actualizado {H0} {horaCR(new Date().toISOString())}</p>
        <a href={`/api/informe?fmt=xlsx&${qs}`} className={bt}>⬇ Excel</a><a href={`/api/informe?fmt=pdf&${qs}`} className={bt}>⬇ PDF</a><PrintButton /></div></div>
    <Filtros base="/dashboard" sp={sp} cat={c} estados gestores={admin ? gest : undefined} todo sinAsignar areas />

    <H>Resumen ejecutivo</H>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi hero t="Valor devuelto" v={fmt(valor)} delta={delta(valor, pValor)} sub={`${fmt(total)} casos`} />
      <Kpi hero t="Efectividad de cierre" v={`${efect}%`} tone={!total ? undefined : efect >= META ? 'ok' : efect >= 60 ? 'warn' : 'bad'} delta={pTotal ? Math.round((efect - pEfect) * 10) / 10 : null} unit=" pp" good="up" sub={`${cerr} de ${total} cerrados · meta ${META}%`} />
      <Kpi hero t="Monto recuperado" v={fmt(recup)} delta={delta(recup, pRecup)} good="up" sub={`de ${fmt(perd)} en pérdidas`} />
      <Kpi hero t="% Recuperación económica" v={`${pct(recup, perd)}%`} sub={`No recuperado ${fmt(perd - recup)}`} /></div>
    {!!insights.length && <Box title="Lectura rápida" cls="mt-4"><ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">{insights.map((x: string, i: number) => <li key={i}>{md(x)}</li>)}</ul></Box>}

    <H>Diagnóstico: ¿de dónde vienen las devoluciones?</H>
    <Grid>
      <Box title="Por área responsable (valor devuelto)"><Rank items={porArea.filter((x: any) => x.casos).sort((a: any, b: any) => b.valor - a.valor).map((x: any) => ({ name: `${x.label} · ${x.casos} casos`, value: x.valor }))} total={valor} />
        <Nota>El área se define por el motivo (ajustable en Administración) y puede corregirse caso por caso al concluir una investigación.</Nota></Box>
      <Box title="Motivos principales (Pareto)"><Tbl cols={['Motivo', 'Área', 'Casos', 'Valor', '% acum.']} rows={pareto.slice(0, 8).map((x: any) => [x.name, <Badge key="a">{AREAS_CORTO[x.area]}</Badge>, x.casos, fmt(x.valor), `${x.acum}%`])} /></Box></Grid>

    <H>Responsabilidad de ventas</H>
    <Grid>
      <Box title="Vendedores con casos imputables a ventas">{tablaResp(vResp)}</Box>
      <Box title="Televentas con casos imputables a ventas">{tablaResp(tResp)}</Box></Grid>
    <Nota>Solo se cuentan los casos cuya área responsable es <b>Ventas</b> (por ejemplo, pedido mal facturado o mal digitado). Aunque un caso tenga vendedor, si el problema fue de almacén, transporte, calidad o del cliente, <b>no</b> se le atribuye. {imputables} de {total} casos son imputables a ventas.</Nota>

    <H>Clientes con más frecuencia</H>
    <Box><Tbl cols={['Cliente', 'Casos', 'Valor', 'Por causa del cliente', 'Último caso', '']} rows={cFrec.slice(0, 8).map((x: any) => [x.name, <b key="c">{x.casos}</b>, fmt(x.valor), x.porCliente, x.ultima, x.casos >= 3 ? <Badge key="r">Reincidente</Badge> : ''])} />
      <Nota>Reincidente = 3 o más casos en el período. “Por causa del cliente” cuenta los casos cuyo motivo es responsabilidad del cliente (negocio cerrado, sin dinero, rechazo, etc.).</Nota></Box>

    <H>Por investigar</H>
    <Box><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Días abiertos', 'Valor']} rows={porInvestigar.slice(0, 8).map((x: any) => [<Link key="n" href={`/casos/${x.id}`} className="underline text-belca-navy font-medium">{x.numero}</Link>, cliTxt(x.clientes), motLabel(x.motivos_devolucion), dias(x.created_at), fmt(x.monto)])} />
      <Nota>{porInvestigar.length ? `${porInvestigar.length} casos abiertos sin área definida. Al concluir la investigación, abra el caso y cambie el área responsable.` : 'No hay casos pendientes de investigación en este período.'}</Nota></Box>

    <H>Devoluciones</H>
    <Kpis>
      <Kpi t="Casos recibidos" v={fmt(total)} delta={delta(total, pTotal)} /><Kpi t="Recibidos hoy" v={R.filter((r: any) => r.fecha === H0).length} />
      <Kpi t="Abiertos" v={abiertos} /><Kpi t="Cerrados" v={cerr} /><Kpi t="Pendientes" v={pend} />
      <Kpi t="Gestionadas (resueltas + cerradas)" v={gestionadas} /><Kpi t="Clientes atendidos" v={new Set(R.filter((r: any) => r.cliente_id).map((r: any) => r.cliente_id)).size} />
      <Kpi t="Imputables a ventas" v={imputables} sub={total ? `${pct(imputables, total)}% del total` : undefined} /><Kpi t="Por investigar (abiertos)" v={porInvestigar.length} /><Kpi t="Clientes reincidentes" v={reincidentes.length} />
      <Kpi t="Tiempo promedio de resolución" v={hrs == null ? '—' : hrs < 48 ? `${hrs.toFixed(1)} h` : `${(hrs / 24).toFixed(1)} días`} />
      <Kpi t="Valor promedio por caso" v={total ? fmt(valor / total) : '—'} /></Kpis>

    <H>Canastas retornables</H>
    <Kpis><Kpi t="Entregadas" v={fmt(kEnt)} /><Kpi t="Recuperadas" v={fmt(kRec)} /><Kpi t="% Recuperación" v={`${pct(kRec, kEnt)}%`} tone={!kEnt ? undefined : pct(kRec, kEnt) >= 80 ? 'ok' : pct(kRec, kEnt) >= 60 ? 'warn' : 'bad'} />
      <Kpi t="Pendientes" v={fmt(kPend)} /><Kpi t="Perdidas" v={fmt(kPerd)} /></Kpis>

    <H>Atención requerida</H>
    <Box title="Casos abiertos con más antigüedad"><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado', 'Días abiertos']} rows={viejos.map((v: any) => [
      <Link key="n" href={`/casos/${v.id}`} className="underline text-belca-navy font-medium">{v.numero}</Link>, cliTxt(v.clientes), motLabel(v.motivos_devolucion), <Badge key="e">{ESTADOS[v.estado]}</Badge>,
      <span key="d" className={dias(v.created_at) >= 2 ? 'text-red-600 font-semibold' : ''}>{dias(v.created_at)}</span>])} /></Box>

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
