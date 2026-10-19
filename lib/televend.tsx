'use client'
import { useState } from 'react'
import { Combo, type Nuevo } from './combo'
export function TeleVend({ televentas, vendedores, nTele, nVend }: { televentas: any[]; vendedores: string[][]; nTele: Nuevo; nVend: Nuevo }) {
  const [forz, setForz] = useState<{ id: string; k: number } | undefined>()
  return <>
    <Combo name="televenta_id" label="Televenta (opcional)" options={televentas.map(t => [t.id, t.nombre])} nuevo={nTele}
      onSelect={(id, extra) => { const v = extra?.vendedor_id ?? televentas.find(t => t.id === id)?.vendedor_id; if (v) setForz({ id: v, k: Date.now() }) }} />
    <Combo name="vendedor_id" label="Vendedor" options={vendedores} nuevo={nVend} forzar={forz} />
  </>
}
