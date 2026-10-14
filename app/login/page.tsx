'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
export default function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [err, setErr] = useState('')
  const router = useRouter()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password })
    if (error) setErr('Credenciales inválidas'); else { router.replace('/dashboard'); router.refresh() }
  }
  return (
    <main className="min-h-screen grid place-items-center bg-[#0B1F3F] p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl p-8 space-y-4 shadow-xl">
        <img src="/logo.png" alt="Belca Foodservice" className="rounded-lg mb-2" />
        <h1 className="text-lg font-semibold text-[#0B1F3F]">Gestión de Devoluciones</h1>
        <input className="w-full border rounded-md p-2" type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full border rounded-md p-2" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full bg-[#0B1F3F] text-white rounded-md p-2 hover:opacity-90">Ingresar</button>
      </form>
    </main>)
}
