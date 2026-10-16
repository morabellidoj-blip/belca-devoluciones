'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
export function Combo({ name, label, options, required, def, cls = '' }: { name: string; label: string; options: string[][]; required?: boolean; def?: string; cls?: string }) {
  const ini = options.find(o => o[0] === def)
  const [q, setQ] = useState(ini ? ini[1] : ''); const [sel, setSel] = useState(ini ? ini[0] : ''); const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.setCustomValidity(required && !sel ? 'Elija un cliente de la lista' : '') }, [sel, required])
  const lista = useMemo(() => { const t = q.trim().toLowerCase(); return (t ? options.filter(o => o[1].toLowerCase().includes(t)) : options).slice(0, 40) }, [q, options])
  return <label className={`block text-sm relative ${cls}`}>{label}
    <input ref={ref} value={q} required={required} autoComplete="off" placeholder="Escriba código o nombre…" className="inp mt-1"
      onChange={e => { setQ(e.target.value); setSel(''); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
    <input type="hidden" name={name} value={sel} />
    {open && <ul className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-auto bg-white border rounded-md shadow-lg">
      {lista.map(o => <li key={o[0]} onMouseDown={() => { setSel(o[0]); setQ(o[1]); setOpen(false) }} className="px-3 py-2 hover:bg-slate-100 cursor-pointer">{o[1]}</li>)}
      {!lista.length && <li className="px-3 py-2 text-slate-400">Sin resultados</li>}</ul>}
  </label>
}
