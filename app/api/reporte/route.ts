import * as XLSX from 'xlsx'
import { motLabel } from '@/lib/ui'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabaseServer } from '@/lib/supabase/server'
import { grp, ESTADOS, TIPOS_REC, horaCR } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const rg = (q: any, col: string, d: string | null, h: string | null) => { if (d) q = q.gte(col, d); if (h) q = q.lte(col, h); return q }
export async function GET(req: Request) {
  const u = new URL(req.url); const tipo = u.searchParams.get('tipo') || 'abiertos', fmt = u.searchParams.get('fmt') || 'xlsx'
  const d = u.searchParams.get('desde') || null, h = u.searchParams.get('hasta') || null
  const sb: any = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser(); if (!user) return new Response('No autorizado', { status: 401 })
  const flat = (c: any) => ({ Caso: c.numero, Fecha: c.fecha, Cliente: c.clientes?.nombre, Vendedor: c.vendedores?.nombre, Ruta: c.rutas?.nombre, Motivo: motLabel(c?.motivos_devolucion),
    Producto: c.producto, Cantidad: c.cantidad, Monto: Number(c.monto), Estado: ESTADOS[c.estado], Factura: c.factura, Chofer: c.chofer })
  const casos = async () => (await rg(sb.from('casos').select('numero,fecha,estado,monto,producto,cantidad,factura,chofer,clientes(nombre),vendedores(nombre),rutas(nombre),motivos_devolucion(codigo,nombre)').order('fecha', { ascending: false }).limit(10000), 'fecha', d, h)).data || []
  const resumen = (rows: any[], k: (r: any) => any) => { const n = grp(rows, k), m = grp(rows, k, r => r.monto); return n.map(x => ({ Grupo: x.name, Casos: x.value, Monto: m.find(y => y.name === x.name)?.value || 0 })).sort((a, b) => b.Casos - a.Casos) }
  let rows: any[] = []
  if (tipo === 'abiertos') rows = (await casos()).filter((c: any) => !['resuelto', 'cerrado'].includes(c.estado)).map(flat)
  else if (tipo === 'cerrados') rows = (await casos()).filter((c: any) => c.estado === 'cerrado').map(flat)
  else if (tipo === 'por_cliente') rows = resumen(await casos(), c => c.clientes?.nombre)
  else if (tipo === 'por_vendedor') rows = resumen(await casos(), c => c.vendedores?.nombre)
  else if (tipo === 'por_ruta') rows = resumen(await casos(), c => c.rutas?.nombre)
  else if (tipo === 'por_motivo') rows = resumen(await casos(), c => motLabel(c?.motivos_devolucion))
  else if (tipo === 'recuperacion') rows = ((await rg(sb.from('recuperaciones').select('created_at,tipo,monto_perdida,monto_recuperado,clientes(nombre),casos(numero,rutas(nombre),motivos_devolucion(codigo,nombre))').limit(10000), 'created_at', d, h)).data || [])
    .map((r: any) => ({ Fecha: r.created_at.slice(0, 10), Caso: r.casos?.numero, Cliente: r.clientes?.nombre, Ruta: r.casos?.rutas?.nombre, Motivo: motLabel(r.casos?.motivos_devolucion), Tipo: TIPOS_REC[r.tipo], Pérdida: Number(r.monto_perdida), Recuperado: Number(r.monto_recuperado) }))
  else if (tipo === 'canastas') rows = ((await rg(sb.from('canastas').select('*,clientes(nombre),rutas(nombre),vendedores(nombre)').limit(10000), 'fecha', d, h)).data || [])
    .map((r: any) => ({ Fecha: r.fecha, Cliente: r.clientes?.nombre, Ruta: r.rutas?.nombre, Vendedor: r.vendedores?.nombre, Chofer: r.chofer, Tipo: r.tipo_canasta, Entregada: r.entregada, Recuperada: r.recuperada, Pendiente: r.pendiente, Estado: r.estado }))
  else if (tipo === 'llamadas') rows = ((await rg(sb.from('casos').select('numero,fecha,created_at,estado,chofer,duracion_min,clientes(nombre),vendedores(nombre),motivos_devolucion(codigo,nombre)').order('fecha', { ascending: false }).limit(10000), 'fecha', d, h)).data || [])
    .map((r: any) => ({ Caso: r.numero, Fecha: r.fecha, Hora: horaCR(r.created_at), Cliente: r.clientes?.nombre, Motivo: motLabel(r?.motivos_devolucion), Chofer: r.chofer, Vendedor: r.vendedores?.nombre, Estado: ESTADOS[r.estado] }))
  const name = `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}`
  const cols = rows.length ? Object.keys(rows[0]) : ['Sin datos']
  if (fmt === 'csv') {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    return new Response('\uFEFF' + [cols.map(esc).join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } })
  }
  if (fmt === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' }); doc.setFontSize(14); doc.text(`Belca Foodservice · ${tipo.replace(/_/g, ' ')}`, 14, 14)
    autoTable(doc, { startY: 20, head: [cols], body: rows.map(r => cols.map(c => String(r[c] ?? ''))), styles: { fontSize: 7 }, headStyles: { fillColor: [11, 30, 56] } })
    return new Response(doc.output('arraybuffer'), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` } })
  }
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Reporte')
  return new Response(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}.xlsx"` } })
}
