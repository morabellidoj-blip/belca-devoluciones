'use client'
import { useState } from 'react'
import { Combo, type Nuevo } from './combo'
import { AREA_OPC } from './areas'
export function MotivoArea({ motivos, nMot }: { motivos: { id: string; label: string; area: string | null }[]; nMot: Nuevo }) {
  const [area, setArea] = useState('')
  return <>
    <Combo name="motivo_id" label="Motivo de devolución" required nuevo={nMot} options={motivos.map(m => [m.id, m.label])}
      onSelect={(id, extra) => setArea(extra?.area ?? motivos.find(m => m.id === id)?.area ?? 'investigar')} />
    <label className="block text-sm">Área responsable <span className="text-slate-400">(se sugiere según el motivo; puede cambiarla)</span>
      <select name="area" value={area} required onChange={e => setArea(e.target.value)} className="inp mt-1"><option value="">—</option>{AREA_OPC.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>
  </>
}
