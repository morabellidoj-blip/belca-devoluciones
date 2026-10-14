import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ctx } from '@/lib/data'
import { supabaseServer } from '@/lib/supabase/server'
const nav = [['dashboard', 'Dashboard'], ['casos', 'Casos'], ['llamadas', 'Llamadas'], ['canastas', 'Canastas'], ['recuperacion', 'Recuperación'], ['desempeno', 'Desempeño'], ['reportes', 'Reportes']]
async function salir() { 'use server'; const sb = await supabaseServer(); await sb.auth.signOut(); redirect('/login') }
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { sb, p, admin } = await ctx()
  const { count } = await sb.from('notificaciones').select('*', { count: 'exact', head: true }).eq('leida', false)
  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-56 bg-belca-navy text-white p-4 md:min-h-screen shrink-0">
        <img src="/logo.png" alt="Belca" className="rounded mb-4 hidden md:block" />
        <nav className="flex md:flex-col gap-1 overflow-x-auto text-sm">
          {nav.map(([h, l]) => <Link key={h} href={`/${h}`} className="px-3 py-2 rounded hover:bg-white/10 whitespace-nowrap">{l}</Link>)}
          <Link href="/alertas" className="px-3 py-2 rounded hover:bg-white/10 whitespace-nowrap">Alertas {!!count && <span className="ml-1 bg-belca-orange text-xs rounded-full px-2">{count}</span>}</Link>
          {admin && <Link href="/admin" className="px-3 py-2 rounded hover:bg-white/10 whitespace-nowrap">Administración</Link>}
        </nav>
        <form action={salir} className="mt-4 hidden md:block"><p className="text-xs opacity-60 mb-2">{p?.nombre} · {p?.rol}</p><button className="text-xs underline opacity-80">Cerrar sesión</button></form>
      </aside>
      <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
    </div>)
}
