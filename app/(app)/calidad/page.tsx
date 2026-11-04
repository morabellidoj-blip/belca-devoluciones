import Link from 'next/link'
import { ctx, all, rango } from '@/lib/data'
import { periodoEfectivo } from '@/lib/metricas'
import { evaluar } from '@/lib/calidad'
import { T, Kpi, Kpis, Box, Tbl, Filtros, cliTxt } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export default async function Calidad({ searchParams }: { searchParams: Promise<any> }) {
  const sp0 = await searchParams; const { sp } = periodoEfectivo(sp0); const { sb } = await ctx()
  const [{ data: casos }, { data: ar }, { data: sg }, { data: rc }] = await Promise.all([
    all(rango(sb.from('casos').select('id,numero,fecha,estado,monto,observaciones,critico,area,chofer,factura,producto,created_at,clientes(codigo,nombre),motivos_devolucion(codigo,nombre,area,permite_monto_cero)'), 'fecha', sp)),
    all(sb.from('archivos').select('caso_id').not('caso_id', 'is', null)), all(sb.from('seguimientos').select('caso_id')), all(sb.from('recuperaciones').select('caso_id'))])
  const R: any[] = casos || []
  const r = evaluar(R, new Set((ar || []).map((x: any) => x.caso_id)), new Set((sg || []).map((x: any) => x.caso_id)), new Set((rc || []).map((x: any) => x.caso_id)), cliTxt)
  return <div><T>Calidad de datos</T>
    <p className="text-sm text-slate-500 -mt-3 mb-4">Revisa automáticamente los casos del período y señala los que tienen datos incompletos o sospechosos, para corregirlos antes de que afecten los indicadores. Un monto en 0 no se marca si el motivo está configurado como “puede ir sin monto” (por ejemplo, sobrante).</p>
    <Filtros base="/calidad" sp={sp} cat={null} todo />
    <Kpis><Kpi t="Casos revisados" v={R.length} /><Kpi t="Con algún hallazgo" v={r.conHallazgo} /><Kpi hero t="Calidad de captura" v={`${r.calidad}%`} tone={r.calidad >= 90 ? 'ok' : r.calidad >= 75 ? 'warn' : 'bad'} sub="casos sin ningún hallazgo" /></Kpis>
    {r.checks.map(c => <Box key={c.clave} title={`${c.titulo} · ${c.filas.length}`}>
      <p className="text-xs text-slate-500 mb-2">{c.ayuda}</p>
      {c.filas.length ? <Tbl cols={['Caso', 'Fecha', 'Cliente', 'Detalle']} rows={c.filas.slice(0, 15).map(x => [<Link key="n" href={`/casos/${x.id}`} className="underline text-belca-navy font-medium">{x.numero}</Link>, x.fecha, x.cliente, x.detalle])} />
        : <p className="text-sm text-emerald-700">✔ Sin hallazgos en este período.</p>}
      {c.filas.length > 15 && <p className="text-xs text-slate-400 mt-2">Se muestran 15 de {c.filas.length}.</p>}</Box>)}</div>
}
