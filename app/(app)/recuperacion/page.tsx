import { revalidatePath } from 'next/cache'
import { motLabel } from '@/lib/ui'
import { all, ctx, g, num, rangoTs } from '@/lib/data'
import { Chart } from '@/lib/chart'
import { T, Kpi, Kpis, Grid, Box, I, S, B, Tbl, Filtros, grp, top, pct, fmt, TIPOS_REC } from '@/lib/ui'
export const dynamic = 'force-dynamic'
async function crear(fd: FormData) {
  'use server'
  const { sb } = await ctx(); const { data: c } = await sb.from('casos').select('cliente_id,monto').eq('id', g(fd, 'caso_id')).single()
  await sb.from('recuperaciones').insert({ caso_id: g(fd, 'caso_id'), cliente_id: c?.cliente_id, monto_perdida: g(fd, 'monto_perdida') ? num(fd, 'monto_perdida') : Number(c?.monto || 0), monto_recuperado: num(fd, 'monto_recuperado'), tipo: g(fd, 'tipo') })
  revalidatePath('/recuperacion')
}
async function borrar(fd: FormData) { 'use server'; const { sb, admin } = await ctx(); if (admin) await sb.from('recuperaciones').delete().eq('id', g(fd, 'id')); revalidatePath('/recuperacion') }
export default async function Recuperacion({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams; const { sb, admin } = await ctx()
  const [{ data }, { data: casos }] = await Promise.all([
    all(rangoTs(sb.from('recuperaciones').select('*,clientes(nombre),casos(numero,rutas(nombre),motivos_devolucion(codigo,nombre))').order('created_at', { ascending: false }), 'created_at', sp)),
    sb.from('casos').select('id,numero,clientes(nombre)').order('created_at', { ascending: false }).limit(500)])
  const R: any[] = data || []
  const rec = R.reduce((a, r) => a + Number(r.monto_recuperado), 0), perd = R.reduce((a, r) => a + Number(r.monto_perdida), 0)
  const gr = (k: (r: any) => any) => top(grp(R, k, r => r.monto_recuperado))
  return <div><T>Recuperación económica</T>
    <Filtros base="/recuperacion" sp={sp} cat={null} />
    <Kpis><Kpi t="Recuperación total" v={fmt(rec)} /><Kpi t="Pérdida total" v={fmt(perd)} /><Kpi t="% Recuperación" v={`${pct(rec, perd)}%`} /><Kpi t="Neto no recuperado" v={fmt(perd - rec)} /></Kpis>
    <Grid><Box title="Recuperación por cliente"><Chart horizontal data={gr(r => r.clientes?.nombre)} /></Box>
      <Box title="Recuperación por ruta"><Chart horizontal data={gr(r => r.casos?.rutas?.nombre)} /></Box>
      <Box title="Recuperación por motivo"><Chart horizontal data={gr(r => motLabel(r.casos?.motivos_devolucion))} /></Box>
      <Box title="Recuperación por tipo"><Chart data={gr(r => TIPOS_REC[r.tipo])} /></Box></Grid>
    <Box title="Registrar recuperación"><form action={crear} className="grid sm:grid-cols-5 gap-3 items-end">
      <S n="caso_id" l="Caso relacionado" req o={(casos || []).map((c: any) => [c.id, `${c.numero} · ${c.clientes?.nombre}`])} /><I n="monto_perdida" l="Monto pérdida (vacío = monto del caso)" type="number" />
      <I n="monto_recuperado" l="Monto recuperado" type="number" req /><S n="tipo" l="Tipo" req o={Object.entries(TIPOS_REC)} /><B>Guardar</B></form></Box>
    <Box title="Historial"><Tbl cols={['Fecha', 'Caso', 'Cliente', 'Tipo', 'Pérdida', 'Recuperado', '']} rows={R.slice(0, 300).map(r => [r.created_at.slice(0, 10), r.casos?.numero, r.clientes?.nombre, TIPOS_REC[r.tipo], fmt(r.monto_perdida), fmt(r.monto_recuperado),
      admin ? <form key="d" action={borrar}><input type="hidden" name="id" value={r.id} /><button className="text-red-600 text-xs underline">Eliminar</button></form> : ''])} /></Box></div>
}
