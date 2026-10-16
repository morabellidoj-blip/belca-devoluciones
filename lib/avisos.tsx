'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from './supabase/client'
const LS = 'belca_avisos'
export function Avisos({ userId }: { userId: string }) {
  const router = useRouter()
  const [on, setOn] = useState(false); const [perm, setPerm] = useState('default')
  const ac = useRef<AudioContext | null>(null); const last = useRef(''); const base = useRef('')
  const ctxAudio = () => { const A = (window as any).AudioContext || (window as any).webkitAudioContext; if (!ac.current) ac.current = new A(); return ac.current as AudioContext }
  const beep = () => {
    try {
      const c = ctxAudio(); c.resume?.()
      ;[880, 1175, 880].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.connect(g); g.connect(c.destination)
        const t = c.currentTime + i * 0.22; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.start(t); o.stop(t + 0.22) })
    } catch {}
  }
  useEffect(() => { setOn(localStorage.getItem(LS) === '1'); if ('Notification' in window) setPerm(Notification.permission); base.current = document.title }, [])
  useEffect(() => {
    if (!on) { if (base.current) document.title = base.current; return }
    const sb = supabaseBrowser(); let vivo = true
    const unlock = () => { try { ctxAudio().resume() } catch {} }
    window.addEventListener('click', unlock, { once: true })
    const poll = async () => {
      const { data } = await sb.from('notificaciones').select('id,tipo,titulo,mensaje,caso_id,origen,created_at').gt('created_at', last.current).order('created_at').limit(20)
      if (!vivo) return
      if (data?.length) {
        last.current = data[data.length - 1].created_at
        const nuevas = data.filter((n: any) => n.origen !== userId)
        if (nuevas.length) {
          beep(); router.refresh()
          if ('Notification' in window && Notification.permission === 'granted') nuevas.slice(0, 3).forEach((n: any) => {
            const x = new Notification(n.titulo, { body: n.mensaje || '', tag: n.id })
            x.onclick = () => { window.focus(); location.href = n.caso_id ? `/casos/${n.caso_id}` : '/alertas'; x.close() } })
        }
      }
      const { count } = await sb.from('notificaciones').select('*', { count: 'exact', head: true }).eq('leida', false).neq('tipo', 'nuevo_caso')
      if (vivo) document.title = count ? `(${count}) ${base.current}` : base.current
    }
    let t1: any, t2: any
    ;(async () => {
      const { data } = await sb.from('notificaciones').select('created_at').order('created_at', { ascending: false }).limit(1)
      last.current = data?.[0]?.created_at ?? new Date(0).toISOString()
      if (!vivo) return
      poll(); t1 = setInterval(poll, 15000); t2 = setInterval(() => { sb.rpc('generar_alertas') }, 600000)
    })()
    return () => { vivo = false; clearInterval(t1); clearInterval(t2); window.removeEventListener('click', unlock) }
  }, [on, userId, router])
  const activar = async () => { if ('Notification' in window && Notification.permission === 'default') setPerm(await Notification.requestPermission()); localStorage.setItem(LS, '1'); setOn(true); beep() }
  const desactivar = () => { localStorage.removeItem(LS); setOn(false) }
  return <div className="text-xs mt-4">
    {on ? <div className="space-y-1"><p className="text-emerald-300 font-medium">🔔 Avisos activos en este equipo</p>
      <p><button onClick={beep} className="underline opacity-80">Probar sonido</button> · <button onClick={desactivar} className="underline opacity-80">Desactivar</button></p>
      {perm === 'denied' && <p className="text-amber-300">Windows tiene bloqueadas las ventanas emergentes de este navegador; solo sonará.</p>}</div>
      : <button onClick={activar} className="bg-belca-orange text-white rounded px-3 py-1.5 font-semibold">🔔 Activar sonido y avisos</button>}
  </div>
}
