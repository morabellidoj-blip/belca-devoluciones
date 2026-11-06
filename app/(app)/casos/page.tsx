import Link from 'next/link'
import { cliTxt, Errores } from '@/lib/ui'
import { AREAS_CORTO, areaDe } from '@/lib/areas'
import { motLabel } from '@/lib/ui'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ConfirmButton, SelectAll } from '@/lib/cerrar'
import { ctx, cat, rango, filtroCliente, cerrarCasos, g } from '@/lib/data'
import { T, Tbl, Badge, Filtros, ESTADOS, fmt } from '@/lib/ui'
export const dynamic = 'force-dynamic'
async function cerrarUno(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const { error } = await cerrarCasos(sb, [String(g(fd, 'id') || '')])
  if (error) redirect(`/casos?err=${encodeURIComponent(error.message)}`)
  revalidatePath('/casos')
}
async function cerrarVarios(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const { error } = await cerrarCasos(sb, fd.getAll('ids').map(String))
  if (error) redirect(`/casos?err=${encodeURIComponent(error.message)}`)
  revalidatePath('/casos')
}
export default async function Casos({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams
  const { sb } = await ctx()
  let q = rango(sb.from('casos').select('id,numero,fecha,estado,monto,critico,ultima_gestion,area,error_cliente,error_ventas,error_televentas,error_chofer,error_almacen,error_pima,chofer,observaciones,clientes(codigo,nombre),rutas(nombre),motivos_devolucion(codigo,nombre,area)').order('created_at', { ascending: false }).limit(300), 'fecha', sp)
  if (sp.cliente_id) q = filtroCliente(q, sp.cliente_id)
  if (sp.estado) q = q.eq('estado', sp.estado)
  if (sp.area) q = q.eq('area', sp.area)
  if (sp.abiertos) q = q.not('estado', 'in', '(resuelto,cerrado)')
  const t = String(sp.q || '').replace(/[,()%*]/g, ' ').trim()
  if (t) q = q.or(`numero.ilike.%${t}%,factura.ilike.%${t}%,producto.ilike.%${t}%,chofer.ilike.%${t}%,observaciones.ilike.%${t}%`)
  const [{ data, error }, c] = await Promise.all([q, cat(sb)])
  return <div>
    <div className="flex justify-between items-center mb-5"><T>Casos</T><Link href="/casos/nuevo" className="bg-belca-orange text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Nuevo caso</Link></div>
    {sp.err && <p className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 mb-4 text-sm">No se pudo cerrar: {sp.err}</p>}
    {error && <p className="bg-red-50 text-red-800 border border-red-200 rounded-lg p-3 mb-4 text-sm">No se pudieron cargar los casos: {error.message}. Si menciona una columna que no existe, falta ejecutar un archivo de la carpeta <b>supabase/migrations</b> en Supabase (revise Administración → Estado de la instalación).</p>}
    <Filtros base="/casos" sp={sp} cat={c} estados sinAsignar areas buscar ocultos={sp.abiertos ? { abiertos: '1' } : undefined} />
    <div className="no-print flex flex-wrap items-center gap-3 mb-2">
      <Link href="/casos?abiertos=1" className={`px-3 py-1 rounded-full text-xs font-semibold border ${sp.abiertos ? 'bg-belca-navy text-white border-belca-navy' : 'text-belca-navy border-slate-300 hover:bg-slate-50'}`}>Solo abiertos</Link>
      <form id="bulk" action={cerrarVarios} className="flex items-center gap-3"><SelectAll />
        <ConfirmButton mensaje="¿Cerrar todos los casos marcados? Los que ya están cerrados se ignoran." cls="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">✔ Cerrar los marcados</ConfirmButton></form>
      <span className="text-xs text-slate-500">Marque las casillas de la izquierda, o use el botón “Cerrar” de cada fila.</span></div>
    <div className="bg-white rounded-xl p-2"><Tbl cols={['', 'Caso', 'Fecha', 'Cliente', 'Ruta', 'Chofer', 'Motivo', 'Área', 'Error de', 'Monto', 'Estado', 'Comentario', '', 'Cerrar']} rows={(data || []).map((x: any) => [
      <input key="ck" type="checkbox" name="ids" value={x.id} form="bulk" disabled={x.estado === 'cerrado'} className="w-4 h-4 accent-emerald-600" />, <Link key="n" className="font-medium text-belca-navy underline whitespace-nowrap" href={`/casos/${x.id}`}>{x.numero}</Link>, <span key="f" className="whitespace-nowrap">{x.fecha}</span>, cliTxt(x?.clientes), x.rutas?.nombre, x.chofer || '—', motLabel(x?.motivos_devolucion), <Badge key="a">{AREAS_CORTO[areaDe(x)]}</Badge>, <Errores key="er" r={x} />, fmt(x.monto),
      <Badge key="e">{ESTADOS[x.estado]}</Badge>, x.observaciones ? <div key="o" className="max-w-[260px] text-slate-600" title={x.observaciones}><span className="line-clamp-2">{x.observaciones}</span></div> : <span key="o" className="text-slate-300">—</span>, x.critico ? <span key="c" className="text-red-600 text-xs font-semibold">CRÍTICO</span> : '', x.estado === 'cerrado' ? <span key="ok" className="text-emerald-600 text-xs font-semibold whitespace-nowrap">✔ Cerrado</span>
        : <form key="cf" action={cerrarUno}><input type="hidden" name="id" value={x.id} /><ConfirmButton mensaje={`¿Cerrar el caso ${x.numero}?`} cls="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 whitespace-nowrap">✔ Cerrar</ConfirmButton></form>])} /></div></div>
}
