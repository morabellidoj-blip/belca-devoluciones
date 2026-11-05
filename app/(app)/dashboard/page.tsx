import Link from 'next/link'
import { ctx, cat } from '@/lib/data'
import { cargar, calcular, delta } from '@/lib/metricas'
import { Chart } from '@/lib/chart'
import { PrintButton } from '@/lib/print'
import { AREAS_CORTO } from '@/lib/areas'
import { Kpi, Kpis, Grid, Box, H, Tbl, Badge, Rank, StackBar, MiniBar, Filtros, grp, byKey, semana, pct, fmt, horaCR, motLabel, cliTxt, ESTADOS, COLORES, AREA_COLOR, GRAD } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const md = (s: string) => s.split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))
const Nota = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-slate-500 mt-3">{children}</p>
export default async function Dashboard({ searchParams }: { searchParams: Promise<any> }) {
  const sp0 = await searchParams
  const { sb, admin } = await ctx()
  await sb.rpc('generar_alertas')
  const [datos, c, { data: gest }] = await Promise.all([cargar(sb, sp0), cat(sb), sb.from('profiles').select('id,nombre').eq('activo', true)])
  const m = calcular(datos)
  const { sp, todo, R, K, rec, viejos, H0, total, cerr, abiertos, pend, gestionadas, hrs, valor, pValor, recup, perd, pRecup, efect, pTotal, pEfect, kEnt, kRec, kPend, kPerd, cierre, periodo, insights, porArea, pareto, porInvestigar,
    meta, valEvit, valCliente, proyMensual, topEvit, actores, errTot, sinAtribuir, distrib, choferesDet } = m
  const orden = sp0.orden === 'casos' ? 'casos' : 'errores'
  const qs = new URLSearchParams(); if (todo) qs.set('todo', '1'); else { if (sp.desde) qs.set('desde', sp.desde); if (sp.hasta) qs.set('hasta', sp.hasta) }
  for (const k of ['cliente_id', 'estado', 'gestor_id', 'area']) if (sp[k]) qs.set(k, sp[k])
  const linkArea = (k: string) => { const u = new URLSearchParams(qs); u.delete('gestor_id'); u.delete('todo'); u.set('area', k); return `/casos?${u}` }
  const linkOrden = (o: string) => { const u = new URLSearchParams(qs); u.set('orden', o); return `/dashboard?${u}` }
  const bt = 'no-print text-sm rounded-lg border border-belca-navy text-belca-navy px-3 py-1.5 font-semibold hover:bg-slate-50'
  const dias = (iso: string) => Math.floor((Date.now() - +new Date(iso)) / 864e5)
  const ordenar = (a: any[]) => [...a].sort(orden === 'casos' ? (x, y) => y.casos - x.casos || y.errores - x.errores : (x, y) => y.errores - x.errores || y.pctErr - x.pctErr || y.casos - x.casos).slice(0, 8)
  const pc = (x: any) => <span key="p" className={x.casos < 3 ? 'text-slate-500' : x.pctErr >= 50 ? 'text-red-600 font-semibold' : x.pctErr >= 25 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>{x.pctErr}%</span>
  const fila = (x: any, col: string) => [x.name, <b key="c">{x.casos}</b>, <b key="e" style={{ color: col }}>{x.errores}</b>, pc(x), fmt(x.valorErr)]
  const pill = (o: string, t: string) => <Link key={o} href={linkOrden(o)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${orden === o ? 'bg-belca-navy text-white border-belca-navy' : 'text-belca-navy border-slate-300 hover:bg-slate-50'}`}>{t}</Link>
  const tone = !total ? undefined : efect >= meta ? 'ok' : efect >= 60 ? 'warn' : 'bad'
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 className="text-2xl font-semibold text-belca-navy">Panel gerencial</h1>
        <p className="text-sm text-slate-500">Devoluciones, canastas y recuperación económica · <span className="font-medium">{periodo}</span></p></div>
      <div className="flex flex-wrap items-center gap-2"><p className="text-xs text-slate-400 mr-1">Actualizado {H0} {horaCR(new Date().toISOString())}</p>
        <a href={`/api/informe?fmt=xlsx&${qs}`} className={bt}>⬇ Excel</a><a href={`/api/informe?fmt=pdf&${qs}`} className={bt}>⬇ PDF</a><PrintButton /></div></div>
    <Filtros base="/dashboard" sp={sp} cat={c} estados gestores={admin ? gest : undefined} todo sinAsignar areas />

    <H>Resumen ejecutivo</H>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi hero bg={GRAD.navy} t="Valor devuelto" v={fmt(valor)} delta={delta(valor, pValor)} sub={`${fmt(total)} casos`} />
      <Kpi hero bg={tone === 'ok' ? GRAD.ok : tone === 'warn' ? GRAD.warn : tone === 'bad' ? GRAD.bad : GRAD.navy} t="Efectividad de cierre" v={`${efect}%`} tone={tone} delta={pTotal ? Math.round((efect - pEfect) * 10) / 10 : null} unit=" pp" good="up" sub={`${cerr} de ${total} cerrados · meta ${meta}%`} />
      <Kpi hero bg={GRAD.teal} t="Monto recuperado" v={fmt(recup)} delta={delta(recup, pRecup)} good="up" sub={`de ${fmt(perd)} en pérdidas`} />
      <Kpi hero bg={GRAD.violet} t="% Recuperación económica" v={`${pct(recup, perd)}%`} sub={`No recuperado ${fmt(perd - recup)}`} /></div>
    {!!insights.length && <Box title="Lectura rápida" color={COLORES.naranja} cls="mt-4"><ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">{insights.map((x: string, i: number) => <li key={i}>{md(x)}</li>)}</ul></Box>}

    <H color={COLORES.mal}>¿Quién se equivoca? Errores marcados por tipo</H>
    <Kpis>
      <Kpi color={COLORES.cliente} t="Error del cliente" v={errTot.cliente} sub={`${pct(errTot.cliente, total)}% de los casos`} />
      <Kpi color={COLORES.ventas} t="Error de ventas" v={errTot.ventas} sub={`${pct(errTot.ventas, total)}% de los casos`} />
      <Kpi color={COLORES.televentas} t="Error de televentas" v={errTot.televentas} sub={`${pct(errTot.televentas, total)}% de los casos`} />
      <Kpi color={COLORES.chofer} t="Error del chofer" v={errTot.chofer} sub={`${pct(errTot.chofer, total)}% de los casos`} />
      <Kpi color={COLORES.otros} t="Sin error de personas" v={distrib[5].value} sub="almacén, calidad u otros" /></Kpis>
    <Box title="Distribución de los casos según el error atribuido" color={COLORES.mal}><StackBar items={distrib} />
      <Nota>Cada caso cuenta una sola vez: si tiene dos o más responsables aparece en “Más de uno”. Las tarjetas de arriba sí cuentan cada marca por separado.</Nota></Box>

    <H color={COLORES.ventas}>Responsables: quién envía más casos y quién se equivoca más</H>
    <div className="flex flex-wrap items-center gap-2 mb-3 no-print"><span className="text-xs text-slate-500">Ordenar por:</span>{pill('errores', 'Más errores')}{pill('casos', 'Más casos enviados')}</div>
    <Grid>
      <Box title={`Vendedores · ${actores.vend.length}`} color={COLORES.ventas}><Tbl color={COLORES.ventas} cols={['Vendedor', 'Casos', 'Errores', '% error', 'Valor del error']} rows={ordenar(actores.vend).map(x => fila(x, COLORES.ventas))} />
        {sinAtribuir.ventas > 0 && <Nota>{sinAtribuir.ventas} casos con “Error de ventas” no tienen vendedor y no se cuentan a nadie. Corríjalos en Calidad de datos.</Nota>}</Box>
      <Box title={`Televentas · ${actores.tele.length}`} color={COLORES.televentas}><Tbl color={COLORES.televentas} cols={['Televenta', 'Casos', 'Errores', '% error', 'Valor del error']} rows={ordenar(actores.tele).map(x => fila(x, COLORES.televentas))} />
        {sinAtribuir.televentas > 0 && <Nota>{sinAtribuir.televentas} casos con “Error de televentas” no tienen televenta asignada.</Nota>}</Box>
      <Box title={`Choferes · ${actores.cho.length}`} color={COLORES.chofer}><Tbl color={COLORES.chofer} cols={['Chofer', 'Casos', 'Errores', '% error', 'Canastas', '% recup.']} rows={ordenar(actores.cho).map(x => [x.name, <b key="c">{x.casos}</b>, <b key="e" style={{ color: COLORES.chofer }}>{x.errores}</b>, pc(x), x.ent ? fmt(x.ent) : '—', x.ent ? `${x.pctRec}%` : '—'])} />
        {sinAtribuir.chofer > 0 && <Nota>{sinAtribuir.chofer} casos con “Error del chofer” no tienen chofer asignado.</Nota>}</Box>
      <Box title={`Clientes · ${actores.cli.length}`} color={COLORES.cliente}><Tbl color={COLORES.cliente} cols={['Cliente', 'Casos', 'Errores', '% error', 'Valor del error', '']} rows={ordenar(actores.cli).map(x => [...fila(x, COLORES.cliente), x.casos >= 3 ? <Badge key="r">Reincidente</Badge> : ''])} />
        {sinAtribuir.cliente > 0 && <Nota>{sinAtribuir.cliente} casos con “Error del cliente” no tienen cliente asignado.</Nota>}</Box></Grid>
    <Nota>“Casos” = devoluciones asociadas a esa persona; “Errores” = las marcadas como error suyo. El % de error es sobre sus propios casos (en rojo desde 50% y en ámbar desde 25%, solo con 3 o más casos). Todavía no se compara contra sus ventas: eso requiere cargar el volumen de ventas.</Nota>

    <H color={COLORES.chofer}>Choferes: quién reporta más y quién se equivoca</H>
    <Grid>
      <Box title="Choferes que más reportan" color={COLORES.chofer}><Rank items={choferesDet.slice(0, 8).map((x: any) => ({ name: `${x.name}${x.propio ? ` · ${x.propio} por error suyo` : ''}`, value: x.reportes, color: COLORES.chofer }))} total={choferesDet.reduce((a: number, x: any) => a + x.reportes, 0)} />
        <Nota>Reportes = casos registrados con ese chofer. El chofer suele ser quien llama para reportar, aunque la causa sea de un vendedor, un cliente o televentas.</Nota></Box>
      <Box title="Choferes con más incidencias propias (error del chofer)" color="#dc2626"><Rank items={[...choferesDet].filter((x: any) => x.propio > 0).sort((a: any, b: any) => b.propio - a.propio || b.pctPropio - a.pctPropio).slice(0, 8).map((x: any) => ({ name: `${x.name} · ${x.pctPropio}% de sus reportes`, value: x.propio, color: '#dc2626' }))} total={errTot.chofer} />
        <Nota>Solo cuentan los casos marcados con “Error del chofer”. {sinAtribuir.chofer > 0 ? `${sinAtribuir.chofer} casos marcados no tienen chofer asignado.` : ''}</Nota></Box></Grid>
    <Box title="¿Por qué reporta cada chofer? Causa de sus reportes" color={COLORES.chofer}>
      <Tbl color={COLORES.chofer} cols={['Chofer', 'Reportes', 'Error suyo', '% suyo', 'Por vendedor', 'Por cliente', 'Por televentas', 'Sin error de personas', 'Distribución', 'Canastas recup.']} rows={choferesDet.slice(0, 12).map((x: any) => [x.name, <b key="r">{x.reportes}</b>,
        <b key="p" style={{ color: '#dc2626' }}>{x.propio}</b>, <span key="pp" className={x.reportes < 3 ? 'text-slate-500' : x.pctPropio >= 50 ? 'text-red-600 font-semibold' : x.pctPropio >= 25 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>{x.pctPropio}%</span>,
        x.porVend, x.porCli, x.porTele, x.sinPersona,
        <MiniBar key="m" parts={[{ v: x.ex.chofer, c: COLORES.chofer, t: 'Solo error del chofer' }, { v: x.ex.ventas, c: COLORES.ventas, t: 'Solo error de ventas' }, { v: x.ex.cliente, c: COLORES.cliente, t: 'Solo error del cliente' }, { v: x.ex.televentas, c: COLORES.televentas, t: 'Solo error de televentas' }, { v: x.ex.varios, c: COLORES.mal, t: 'Más de un responsable' }, { v: x.ex.ninguno, c: '#cbd5e1', t: 'Sin error de personas' }]} />,
        x.ent ? `${x.pctRec}%` : '—'])} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-600">{[['Error del chofer', COLORES.chofer], ['Ventas', COLORES.ventas], ['Cliente', COLORES.cliente], ['Televentas', COLORES.televentas], ['Más de uno', COLORES.mal], ['Sin error de personas', '#cbd5e1']].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</span>)}</div>
      <Nota>Las columnas cuentan cada marca por separado (un reporte con dos responsables suma en ambas); la barra cuenta cada reporte una sola vez. “Sin error de personas” = causa de almacén, calidad u otra.</Nota></Box>

    <H color={COLORES.naranja}>Diagnóstico: ¿de dónde vienen las devoluciones?</H>
    <Grid>
      <Box title="Por área responsable (valor devuelto)" color={COLORES.naranja}><Rank items={porArea.filter((x: any) => x.casos).sort((a: any, b: any) => b.valor - a.valor).map((x: any) => ({ name: `${x.label} · ${x.casos} casos`, value: x.valor, href: linkArea(x.key), color: AREA_COLOR[x.key] }))} total={valor} />
        <Nota>El área se define por el motivo (ajustable en Administración) y puede corregirse caso por caso al concluir una investigación.</Nota></Box>
      <Box title="Motivos principales (Pareto)" color={COLORES.naranja}><Tbl cols={['Motivo', 'Área', 'Casos', 'Valor', '% acum.']} rows={pareto.slice(0, 8).map((x: any) => [x.name, <Badge key="a">{AREAS_CORTO[x.area]}</Badge>, x.casos, fmt(x.valor), `${x.acum}%`])} /></Box></Grid>

    <H color={COLORES.ok}>Oportunidad de mejora</H>
    <Kpis>
      <Kpi color="#dc2626" t="Valor evitable (causas internas)" v={fmt(valEvit)} sub={valor ? `${pct(valEvit, valor)}% del valor devuelto` : undefined} />
      <Kpi color="#d97706" t="Proyección mensual evitable" v={proyMensual != null ? fmt(proyMensual) : '—'} sub="si se mantiene el ritmo del período" />
      <Kpi color="#16a34a" t="Si se redujera a la mitad" v={proyMensual != null ? fmt(proyMensual / 2) : '—'} sub="ahorro mensual estimado" />
      <Kpi color={COLORES.cliente} t="Causadas por el cliente" v={fmt(valCliente)} sub={valor ? `${pct(valCliente, valor)}% del valor devuelto` : undefined} /></Kpis>
    <Box title="Motivos internos que más pesan (donde se puede mejorar)" color={COLORES.ok}><Tbl cols={['Motivo', 'Área', 'Casos', 'Valor', '% del evitable']} rows={topEvit.map((x: any) => [x.name, <Badge key="a">{AREAS_CORTO[x.area]}</Badge>, x.casos, fmt(x.valor), `${pct(x.valor, valEvit)}%`])} />
      <Nota>Causas internas = ventas, logística, almacén y calidad. Atacar estos motivos es lo que más reduce las pérdidas; las causas del cliente no se pueden corregir desde adentro.</Nota></Box>

    <H color="#64748b">Por investigar</H>
    <Box color="#64748b"><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Días abiertos', 'Valor']} rows={porInvestigar.slice(0, 8).map((x: any) => [<Link key="n" href={`/casos/${x.id}`} className="underline text-belca-navy font-medium">{x.numero}</Link>, cliTxt(x.clientes), motLabel(x.motivos_devolucion), dias(x.created_at), fmt(x.monto)])} />
      <Nota>{porInvestigar.length ? `${porInvestigar.length} casos abiertos sin área definida. Al concluir la investigación, abra el caso y cambie el área responsable.` : 'No hay casos pendientes de investigación en este período.'}</Nota></Box>

    <H color={COLORES.ventas}>Devoluciones</H>
    <Kpis>
      <Kpi color="#2563eb" t="Casos recibidos" v={fmt(total)} delta={delta(total, pTotal)} /><Kpi color="#0d9488" t="Recibidos hoy" v={R.filter((r: any) => r.fecha === H0).length} />
      <Kpi color="#d97706" t="Abiertos" v={abiertos} /><Kpi color="#16a34a" t="Cerrados" v={cerr} /><Kpi color="#d97706" t="Pendientes" v={pend} />
      <Kpi color="#2563eb" t="Gestionadas (resueltas + cerradas)" v={gestionadas} /><Kpi color="#7c3aed" t="Clientes atendidos" v={new Set(R.filter((r: any) => r.cliente_id).map((r: any) => r.cliente_id)).size} />
      <Kpi color="#64748b" t="Por investigar (abiertos)" v={porInvestigar.length} /><Kpi color="#dc2626" t="Clientes reincidentes" v={actores.cli.filter((x: any) => x.casos >= 3).length} />
      <Kpi color="#0d9488" t="Tiempo promedio de resolución" v={hrs == null ? '—' : hrs < 48 ? `${hrs.toFixed(1)} h` : `${(hrs / 24).toFixed(1)} días`} />
      <Kpi color="#0b1e38" t="Valor promedio por caso" v={total ? fmt(valor / total) : '—'} /></Kpis>

    <H color={COLORES.chofer}>Canastas retornables</H>
    <Kpis><Kpi color="#2563eb" t="Entregadas" v={fmt(kEnt)} /><Kpi color="#16a34a" t="Recuperadas" v={fmt(kRec)} /><Kpi color="#0d9488" t="% Recuperación" v={`${pct(kRec, kEnt)}%`} tone={!kEnt ? undefined : pct(kRec, kEnt) >= 80 ? 'ok' : pct(kRec, kEnt) >= 60 ? 'warn' : 'bad'} />
      <Kpi color="#d97706" t="Pendientes" v={fmt(kPend)} /><Kpi color="#dc2626" t="Perdidas" v={fmt(kPerd)} /></Kpis>

    <H color={COLORES.mal}>Atención requerida</H>
    <Box title="Casos abiertos con más antigüedad" color={COLORES.mal}><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado', 'Días abiertos']} rows={viejos.map((v: any) => [
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
