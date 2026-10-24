import Link from 'next/link'
import { cliTxt } from '@/lib/ui'
import { AREAS_CORTO, areaDe } from '@/lib/areas'
import { motLabel } from '@/lib/ui'
import { ctx, cat, rango, filtroCliente } from '@/lib/data'
import { T, Tbl, Badge, Filtros, ESTADOS, fmt } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export default async function Casos({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams
  const { sb } = await ctx()
  let q = rango(sb.from('casos').select('id,numero,fecha,estado,monto,critico,ultima_gestion,area,clientes(codigo,nombre),rutas(nombre),motivos_devolucion(codigo,nombre,area)').order('created_at', { ascending: false }).limit(300), 'fecha', sp)
  if (sp.cliente_id) q = filtroCliente(q, sp.cliente_id)
  if (sp.estado) q = q.eq('estado', sp.estado)
  if (sp.area) q = q.eq('area', sp.area)
  const [{ data }, c] = await Promise.all([q, cat(sb)])
  return <div>
    <div className="flex justify-between items-center mb-5"><T>Casos</T><Link href="/casos/nuevo" className="bg-belca-orange text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Nuevo caso</Link></div>
    <Filtros base="/casos" sp={sp} cat={c} estados sinAsignar areas />
    <div className="bg-white rounded-xl p-2"><Tbl cols={['Caso', 'Fecha', 'Cliente', 'Ruta', 'Motivo', 'Área', 'Monto', 'Estado', '']} rows={(data || []).map((x: any) => [
      <Link key="n" className="font-medium text-belca-navy underline" href={`/casos/${x.id}`}>{x.numero}</Link>, x.fecha, cliTxt(x?.clientes), x.rutas?.nombre, motLabel(x?.motivos_devolucion), <Badge key="a">{AREAS_CORTO[areaDe(x)]}</Badge>, fmt(x.monto),
      <Badge key="e">{ESTADOS[x.estado]}</Badge>, x.critico ? <span key="c" className="text-red-600 text-xs font-semibold">CRÍTICO</span> : ''])} /></div></div>
}
