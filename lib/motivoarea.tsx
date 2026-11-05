'use client'
import { useState } from 'react'
import { Combo, type Nuevo } from './combo'
import { AREA_OPC } from './areas'
const CHK: [string, string, string][] = [['error_cliente', 'Error del cliente', '#d97706'], ['error_ventas', 'Error de ventas', '#2563eb'], ['error_televentas', 'Error de televentas', '#7c3aed'], ['error_chofer', 'Error del chofer', '#0d9488']]
export function MotivoArea({ motivos, nMot }: { motivos: { id: string; label: string; area: string | null }[]; nMot: Nuevo }) {
  const [area, setArea] = useState('')
  const [f, setF] = useState<Record<string, boolean>>({ error_cliente: false, error_ventas: false, error_televentas: false, error_chofer: false })
  const aplicar = (a: string) => { setArea(a); setF(x => ({ ...x, error_cliente: a === 'cliente', error_ventas: a === 'ventas' })) }   // marca sugerida según el área
  return <>
    <Combo name="motivo_id" label="Motivo de devolución" required nuevo={nMot} options={motivos.map(m => [m.id, m.label])}
      onSelect={(id, extra) => aplicar(extra?.area ?? motivos.find(m => m.id === id)?.area ?? 'investigar')} />
    <label className="block text-sm">Área responsable <span className="text-slate-400">(se sugiere según el motivo)</span>
      <select name="area" value={area} required onChange={e => aplicar(e.target.value)} className="inp mt-1"><option value="">—</option>{AREA_OPC.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>
    <fieldset className="sm:col-span-2 rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-belca-navy">¿Quién cometió el error? <span className="font-normal text-slate-500">(marque todos los que apliquen; si es de almacén o calidad, déjelo sin marcar)</span></legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">{CHK.map(([n, l, c]) => <label key={n} className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name={n} checked={f[n]} onChange={e => setF({ ...f, [n]: e.target.checked })} style={{ accentColor: c }} className="w-4 h-4" /><span className="font-medium" style={{ color: c }}>{l}</span></label>)}</div>
      <p className="text-xs text-slate-500 mt-2">Para que cuente a una persona, elija también su vendedor, televenta, chofer o cliente arriba. La casilla se marca sola según el área, pero puede cambiarla.</p></fieldset>
  </>
}
