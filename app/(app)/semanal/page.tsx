import Link from 'next/link'
import { ctx } from '@/lib/data'
import { cargar, calcular, delta } from '@/lib/metricas'
import { PrintButton } from '@/lib/print'
import { AREAS_CORTO } from '@/lib/areas'
import { Kpi, Kpis, Grid, Box, H, Tbl, Badge, Rank, StackBar, MiniBar, A, B, hoy, fmt, pct, motLabel, cliTxt, ESTADOS, COLORES, AREA_COLOR, GRAD } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const addD = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const lunesDe = (s: string) => { const d = new Date(s + 'T00:00:00Z'); return addD(s, -((d.getUTCDay() + 6) % 7)) }
const md = (s: string) => s.split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))
export default async function Semanal({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams, H0 = hoy()
  const lunes = /^\d{4}-\d{2}-\d{2}$/.test(sp.semana || '') ? lunesDe(sp.semana) : addD(lunesDe(H0), -7)   // por defecto: la última semana completa
  const domingo = addD(lunes, 6), nota = String(sp.nota || '').slice(0, 700)
  const { sb } = await ctx()
  const datos = await cargar(sb, { desde: lunes, hasta: domingo })
  const m = calcular(datos)
  const { total, valor, pValor, cerr, efect, pTotal, pEfect, recup, perd, pRecup, abiertos, porInvestigar, errTot, distrib, porArea, pareto, actores, choferesDet, insights, kEnt, kRec, kPend, R, viejos } = m
  const qs = (extra: Record<string, string> = {}) => new URLSearchParams({ desde: lunes, hasta: domingo, ...extra }).toString()
  const pdf = `/api/informe?fmt=pdf&semanal=1&${qs(nota ? { nota } : {})}`, xls = `/api/informe?fmt=xlsx&${qs()}`
  const nav = (s: string) => `/semanal?semana=${s}${nota ? `&nota=${encodeURIComponent(nota)}` : ''}`
  const bt = 'no-print text-sm rounded-lg border border-belca-navy text-belca-navy px-3 py-1.5 font-semibold hover:bg-slate-50'
  const top5 = (a: any[]) => [...a].sort((x, y) => y.errores - x.errores || y.pctErr - x.pctErr || y.casos - x.casos).slice(0, 5)
  const fila = (x: any, c: string) => [x.name, <b key="c">{x.casos}</b>, <b key="e" style={{ color: c }}>{x.errores}</b>, `${x.pctErr}%`]
  const crit = R.filter((r: any) => r.critico), semanaActual = lunes === lunesDe(H0)
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div><h1 className="text-2xl font-semibold text-belca-navy">Informe semanal de devoluciones</h1>
        <p className="text-sm text-slate-500">Semana del <b>{lunes}</b> al <b>{domingo}</b>{semanaActual && <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold">semana en curso (incompleta)</span>}</p></div>
      <div className="flex flex-wrap items-center gap-2"><a href={pdf} className="no-print text-sm rounded-lg bg-belca-navy text-white px-3.5 py-1.5 font-semibold hover:opacity-90">⬇ Descargar PDF para gerencia</a><a href={xls} className={bt}>⬇ Excel</a><PrintButton /></div></div>
    <div className="no-print bg-white rounded-xl p-3 mb-4 flex flex-wrap items-end gap-3 text-sm">
      <Link href={nav(addD(lunes, -7))} className={bt}>← Semana anterior</Link><Link href={nav(addD(lunes, 7))} className={bt}>Semana siguiente →</Link><Link href={nav(addD(lunesDe(H0), -7))} className="underline text-belca-navy text-xs">Última semana completa</Link>
      <form className="flex items-end gap-2 ml-auto"><label className="text-xs text-slate-500">Ir a la semana de<input type="date" name="semana" defaultValue={lunes} className="inp mt-1" /></label>{nota && <input type="hidden" name="nota" value={nota} />}<B>Ir</B></form></div>
    <form className="no-print bg-white rounded-xl p-3 mb-2"><input type="hidden" name="semana" value={lunes} /><A n="nota" l="Comentarios para gerencia (opcional: aparecen en el PDF)" def={nota} /><div className="mt-2"><B>Guardar comentario en el informe</B></div></form>
    {nota && <Box title="Comentarios para gerencia" color={COLORES.naranja} cls="mt-3"><p className="text-sm text-slate-700 whitespace-pre-wrap">{nota}</p></Box>}

    <H>Resumen de la semana</H>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi hero bg={GRAD.navy} t="Casos recibidos" v={fmt(total)} delta={delta(total, pTotal)} sub="vs. semana anterior" />
      <Kpi hero bg={GRAD.violet} t="Valor devuelto" v={fmt(valor)} delta={delta(valor, pValor)} sub={`${fmt(total)} casos`} />
      <Kpi hero bg={!total ? GRAD.navy : efect >= m.meta ? GRAD.ok : efect >= 60 ? GRAD.warn : GRAD.bad} t="Efectividad de cierre" v={`${efect}%`} delta={pTotal ? Math.round((efect - pEfect) * 10) / 10 : null} unit=" pp" good="up" sub={`${cerr} de ${total} cerrados`} />
      <Kpi hero bg={GRAD.teal} t="Monto recuperado" v={fmt(recup)} delta={delta(recup, pRecup)} good="up" sub={`de ${fmt(perd)} en pérdidas`} /></div>
    {!!insights.length && <Box title="Lectura rápida" color={COLORES.naranja} cls="mt-4"><ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">{insights.map((x: string, i: number) => <li key={i}>{md(x)}</li>)}</ul></Box>}

    <H color={COLORES.mal}>¿Quién se equivocó esta semana?</H>
    <Box color={COLORES.mal}><StackBar items={distrib} />
      <p className="text-xs text-slate-500 mt-3">Cliente {errTot.cliente} · Ventas {errTot.ventas} · Televentas {errTot.televentas} · Chofer {errTot.chofer} · Almacén {errTot.almacen} · PIMA {errTot.pima} (un caso puede tener más de un responsable).</p></Box>

    <Grid>
      <Box title="De dónde vienen (valor por área)" color={COLORES.naranja}><Rank items={porArea.filter((x: any) => x.casos).sort((a: any, b: any) => b.valor - a.valor).map((x: any) => ({ name: `${x.label} · ${x.casos} casos`, value: x.valor, color: AREA_COLOR[x.key] }))} total={valor} /></Box>
      <Box title="Motivos principales" color={COLORES.naranja}><Tbl cols={['Motivo', 'Área', 'Casos', 'Valor']} rows={pareto.slice(0, 5).map((x: any) => [x.name, <Badge key="a">{AREAS_CORTO[x.area]}</Badge>, x.casos, fmt(x.valor)])} /></Box></Grid>

    <H color={COLORES.ventas}>Responsables de la semana</H>
    <Grid>
      <Box title="Vendedores" color={COLORES.ventas}><Tbl color={COLORES.ventas} cols={['Vendedor', 'Casos', 'Errores', '% error']} rows={top5(actores.vend).map(x => fila(x, COLORES.ventas))} /></Box>
      <Box title="Televentas" color={COLORES.televentas}><Tbl color={COLORES.televentas} cols={['Televenta', 'Casos', 'Errores', '% error']} rows={top5(actores.tele).map(x => fila(x, COLORES.televentas))} /></Box>
      <Box title="Clientes" color={COLORES.cliente}><Tbl color={COLORES.cliente} cols={['Cliente', 'Casos', 'Errores', '% error']} rows={top5(actores.cli).map(x => fila(x, COLORES.cliente))} /></Box>
      <Box title="Choferes que más reportan" color={COLORES.chofer}><Tbl color={COLORES.chofer} cols={['Chofer', 'Reportes', 'Error suyo', 'Por otros']} rows={choferesDet.slice(0, 5).map((x: any) => [x.name, <b key="r">{x.reportes}</b>, <b key="p" style={{ color: '#dc2626' }}>{x.propio}</b>, x.reportes - x.propio])} /></Box></Grid>

    <H color={COLORES.mal}>Casos críticos y pendientes</H>
    <Box title={`Casos críticos de la semana · ${crit.length}`} color={COLORES.mal}>{crit.length ? <Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado', 'Valor']} rows={crit.slice(0, 10).map((r: any) => [<Link key="n" href={`/casos/${r.id}`} className="underline text-belca-navy font-medium">{r.numero}</Link>, cliTxt(r.clientes), motLabel(r.motivos_devolucion), <Badge key="e">{ESTADOS[r.estado]}</Badge>, fmt(r.monto)])} /> : <p className="text-sm text-emerald-700">✔ Sin casos críticos esta semana.</p>}</Box>
    <Kpis><Kpi color="#d97706" t="Abiertos hoy" v={abiertos} /><Kpi color="#64748b" t="Por investigar" v={porInvestigar.length} /><Kpi color="#2563eb" t="Canastas entregadas" v={fmt(kEnt)} /><Kpi color="#16a34a" t="Canastas recuperadas" v={`${pct(kRec, kEnt)}%`} /><Kpi color="#dc2626" t="Canastas pendientes" v={fmt(kPend)} /></Kpis>
    <Box title="Casos abiertos con más antigüedad (al día de hoy)" color="#64748b"><Tbl cols={['Caso', 'Cliente', 'Motivo', 'Estado']} rows={viejos.slice(0, 5).map((v: any) => [<Link key="n" href={`/casos/${v.id}`} className="underline text-belca-navy font-medium">{v.numero}</Link>, cliTxt(v.clientes), motLabel(v.motivos_devolucion), <Badge key="e">{ESTADOS[v.estado]}</Badge>])} /></Box>
  </div>
}
