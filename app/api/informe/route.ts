import { supabaseServer } from '@/lib/supabase/server'
import { all } from '@/lib/data'
import { cargar, calcular } from '@/lib/metricas'
import { construirXlsx, construirPdf } from '@/lib/informe'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(req: Request) {
  const u = new URL(req.url); const fmt = u.searchParams.get('fmt') === 'pdf' ? 'pdf' : 'xlsx'
  const sp0: any = {}; u.searchParams.forEach((v, k) => { if (['desde', 'hasta', 'cliente_id', 'estado', 'gestor_id', 'area', 'todo'].includes(k) && v) sp0[k] = v })
  const sb: any = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser(); if (!user) return new Response('No autorizado', { status: 401 })
  const m = calcular(await cargar(sb, sp0))
  const { data: ab } = await all(sb.from('casos').select('numero,fecha,created_at,estado,monto,area,clientes(codigo,nombre),motivos_devolucion(codigo,nombre,area)').not('estado', 'in', '(resuelto,cerrado)').order('created_at'))
  let logo: Buffer | null = null
  try { const r = await fetch(new URL('/logo.png', req.url)); if (r.ok) logo = Buffer.from(await r.arrayBuffer()) } catch {}
  const semanal = u.searchParams.get('semanal') === '1', nota = (u.searchParams.get('nota') || '').replace(/\s+/g, ' ').trim().slice(0, 700)
  const name = semanal ? `informe_semanal_${sp0.desde || m.H0}` : `informe_gerencial_${m.H0}`
  if (fmt === 'pdf') return new Response(construirPdf(m, logo, ab || [], semanal ? { titulo: 'Informe semanal de devoluciones', subtitulo: `Semana del ${sp0.desde} al ${sp0.hasta}`, nota } : {}), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` } })
  return new Response(await construirXlsx(m, logo, ab || []) as any, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}.xlsx"` } })
}
