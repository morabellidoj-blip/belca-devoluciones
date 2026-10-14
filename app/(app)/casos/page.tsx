import Link from 'next/link'
import { ctx, cat, rango } from '@/lib/data'
import { T, Tbl, Badge, Filtros, ESTADOS, fmt } from '@/lib/ui'
export const dynamic = 'force-dynamic'
export default async function Casos({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams
  const { sb } = await ctx()
  let q = rango(sb.from('casos').select('id,numero,fecha,estado,monto,critico,ultima_gestion,clientes(nombre),rutas(nombre),motivos_devolucion(nombre)').order('created_at', { ascending: false }).limit(300), 'fecha', sp)
  for (const k of ['cliente_id', 'estado']) if (sp[k]) q = q.eq(k, sp[k])
  const [{ data }, c] = await Promise.all([q, cat(sb)])
  return <div>
    <div className="flex justify-between items-center mb-5"><T>Casos</T><Link href="/casos/nuevo" className="bg-belca-orange text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Nuevo caso</Link></div>
    <Filtros base="/casos" sp={sp} cat={c} estados />
    <div className="bg-white rounded-xl p-2"><Tbl cols={['Caso', 'Fecha', 'Cliente', 'Ruta', 'Motivo', 'Monto', 'Estado', '']} rows={(data || []).map((x: any) => [
      <Link key="n" className="font-medium text-belca-navy underline" href={`/casos/${x.id}`}>{x.numero}</Link>, x.fecha, x.clientes?.nombre, x.rutas?.nombre, x.motivos_devolucion?.nombre, fmt(x.monto),
      <Badge key="e">{ESTADOS[x.estado]}</Badge>, x.critico ? <span key="c" className="text-red-600 text-xs font-semibold">CRÍTICO</span> : ''])} /></div></div>
}
