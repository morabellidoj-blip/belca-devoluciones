import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ctx } from '@/lib/data'
import { T, Box, B, Tbl, Badge } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const TIPOS: Record<string, string> = { critica: 'Crítica', nuevo_caso: 'Nuevo caso', sin_gestion: 'Sin gestión', por_vencer: 'Por vencer', canasta_antigua: 'Canastas antiguas', canasta_exceso: 'Exceso de canastas', ruta_baja: 'Ruta con baja recuperación', cierre: 'Cierre' }
async function leerTodas() { 'use server'; const { sb } = await ctx(); await sb.from('notificaciones').update({ leida: true }).eq('leida', false); revalidatePath('/alertas') }
export default async function Alertas() {
  const { sb } = await ctx(); await sb.rpc('generar_alertas')
  const { data } = await sb.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(150)
  return <div><div className="flex justify-between items-center mb-5"><T>Alertas</T><form action={leerTodas}><B>Marcar todas como leídas</B></form></div>
    <Box><Tbl cols={['Fecha', 'Tipo', 'Detalle', '']} rows={(data || []).map((n: any) => [n.created_at.slice(0, 16).replace('T', ' '), <Badge key="t">{TIPOS[n.tipo] || n.tipo}</Badge>,
      <span key="m" className={n.leida ? 'text-slate-400' : 'font-medium'}>{n.titulo} — {n.mensaje}</span>, n.caso_id ? <Link key="l" className="underline text-belca-navy" href={`/casos/${n.caso_id}`}>Ver caso</Link> : ''])} /></Box></div>
}
