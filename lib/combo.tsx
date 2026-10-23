'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { crearItem } from './crear'
export type Campo = { n: string; l: string; req?: boolean; opciones?: string[][] }
export type Nuevo = { tabla: string; titulo: string; campos: Campo[] }
const NONE = '__none__'
export function Combo({ name, label, options, required, def, cls = '', nuevo, forzar, onSelect, vacio, vacioValor = '' }: {
  name: string; label: string; options: string[][]; required?: boolean; def?: string; cls?: string; nuevo?: Nuevo; vacio?: string; vacioValor?: string
  forzar?: { id: string; k: number }; onSelect?: (id: string, extra?: any) => void }) {
  const [extra, setExtra] = useState<string[][]>([])
  const todas = useMemo(() => [...(vacio ? [[NONE, vacio]] : []), ...options, ...extra], [options, extra, vacio])
  const ini = todas.find(o => o[0] === def || (vacio && def !== undefined && def === vacioValor && def !== '' && o[0] === NONE))
  const [q, setQ] = useState(ini ? ini[1] : ''); const [sel, setSel] = useState(ini ? ini[0] : ''); const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState(false); const [f, setF] = useState<Record<string, string>>({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.setCustomValidity(q && !sel ? 'Elija una opción de la lista o cree una nueva con ➕' : required && !sel ? 'Elija una opción de la lista' : '') }, [q, sel, required])
  useEffect(() => { if (forzar) { const o = todas.find(x => x[0] === forzar.id); if (o) { setSel(o[0]); setQ(o[1]) } } }, [forzar]) // eslint-disable-line
  const lista = useMemo(() => { const t = q.trim().toLowerCase(); return (t ? todas.filter(o => o[1].toLowerCase().includes(t)) : todas).slice(0, 40) }, [q, todas])
  const pick = (o: string[]) => { setSel(o[0]); setQ(o[1]); setOpen(false); onSelect?.(o[0]) }
  const abrir = () => {
    const num = /^\d+$/.test(q.trim()), init: Record<string, string> = {}
    nuevo!.campos.forEach(c => { init[c.n] = c.n === 'codigo' ? (num ? q.trim() : '') : c.n === 'nombre' ? (nuevo!.campos.some(x => x.n === 'codigo') && num ? '' : q.trim()) : '' })
    setF(init); setErr(''); setPanel(true); setOpen(false)
  }
  const guardar = async () => {
    for (const c of nuevo!.campos) if (c.req && !(f[c.n] || '').trim()) { setErr(`Falta: ${c.l}`); return }
    setBusy(true); setErr('')
    const r: any = await crearItem(nuevo!.tabla, f); setBusy(false)
    if (r.error) { setErr(r.error); return }
    setExtra(p => [...p, [r.id, r.label]]); setSel(r.id); setQ(r.label); setPanel(false); onSelect?.(r.id, r.extra)
  }
  return <div className={`relative text-sm ${cls}`}>
    <label className="block">{label}
      <input ref={ref} value={q} required={required} autoComplete="off" placeholder="Escriba para buscar…" className="inp mt-1"
        onChange={e => { const v = e.target.value; setQ(v); const ex = todas.find(o => o[1].toLowerCase() === v.trim().toLowerCase()); setSel(ex ? ex[0] : ''); if (ex) onSelect?.(ex[0]); setOpen(true) }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} /></label>
    <input type="hidden" name={name} value={sel === NONE ? vacioValor : sel} />
    {open && <ul className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-auto bg-white border rounded-md shadow-lg">
      {lista.map(o => <li key={o[0]} onMouseDown={() => pick(o)} className="px-3 py-2 hover:bg-slate-100 cursor-pointer">{o[1]}</li>)}
      {!lista.length && <li className="px-3 py-2 text-slate-400">Sin resultados</li>}
      {nuevo && <li onMouseDown={abrir} className="px-3 py-2 cursor-pointer font-semibold text-belca-navy bg-amber-50 hover:bg-amber-100 border-t">➕ Crear {nuevo.titulo}{q.trim() ? ` «${q.trim()}»` : ''}</li>}
    </ul>}
    {panel && nuevo && <div className="mt-2 p-3 border rounded-lg bg-slate-50 grid gap-2">
      <p className="font-semibold text-belca-navy">Nuevo: {nuevo.titulo}</p>
      {nuevo.campos.map(c => <label key={c.n} className="block">{c.l}{c.req ? ' *' : ''}
        {c.opciones ? <select value={f[c.n] || ''} onChange={e => setF({ ...f, [c.n]: e.target.value })} className="inp mt-1"><option value="">—</option>{c.opciones.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
          : <input value={f[c.n] || ''} onChange={e => setF({ ...f, [c.n]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardar() } }} className="inp mt-1" />}</label>)}
      {err && <p className="text-red-600 text-xs">{err}</p>}
      <div className="flex gap-2"><button type="button" onClick={guardar} disabled={busy} className="btn">{busy ? 'Guardando…' : 'Guardar y usar'}</button>
        <button type="button" onClick={() => setPanel(false)} className="px-3 py-2 text-sm underline">Cancelar</button></div></div>}
  </div>
}
