// Una misma pérdida base puede aparecer en varios abonos del caso.
// Se cuenta una sola vez por caso; el máximo conserva la base declarada más alta.
export function perdidaUnica(rows: any[]) {
 const bases = new Map<string, number>()
 rows.forEach((r, i) => { const key = r.caso_id || r.id || `fila-${i}`; bases.set(key, Math.max(bases.get(key) || 0, Number(r.monto_perdida || 0))) })
 return [...bases.values()].reduce((a,b)=>a+b,0)
}

export function distribuirPerdida(rows:any[]) {
 const max=new Map<string,number>(), usados=new Set<string>()
 const key=(r:any)=>String(r.caso_id || r.id)
 rows.forEach(r=>max.set(key(r),Math.max(max.get(key(r)) || 0,Number(r.monto_perdida || 0))))
 return [...rows].sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id))).map(r=>{
  const k=key(r), valor=usados.has(k)?0:max.get(k) || 0;usados.add(k)
  return {...r,monto_perdida_registrada:r.monto_perdida,monto_perdida:valor}
 })
}
