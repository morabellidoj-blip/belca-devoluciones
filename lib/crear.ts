'use server'
import { ctx } from './data'
const T: Record<string, { cols: string[]; req: string[]; sel: string; id?: string; label: (r: any) => string }> = {
  clientes: { cols: ['codigo', 'nombre'], req: ['nombre'], sel: 'id,codigo,nombre', label: r => (r.nombre && r.nombre !== r.codigo ? `${r.codigo} · ${r.nombre}` : String(r.codigo)) },
  motivos_devolucion: { cols: ['codigo', 'nombre'], req: ['codigo', 'nombre'], sel: 'id,codigo,nombre', label: r => `${r.codigo} · ${r.nombre}` },
  vendedores: { cols: ['nombre'], req: ['nombre'], sel: 'id,nombre', label: r => r.nombre },
  rutas: { cols: ['nombre'], req: ['nombre'], sel: 'id,nombre', label: r => r.nombre },
  choferes: { cols: ['nombre'], req: ['nombre'], sel: 'id,nombre', id: 'nombre', label: r => r.nombre },
  televentas: { cols: ['nombre', 'telefono', 'correo', 'vendedor_id'], req: ['nombre'], sel: 'id,nombre,vendedor_id', label: r => r.nombre },
}
export async function crearItem(tabla: string, d: Record<string, string>): Promise<any> {
  const t = T[tabla]; if (!t) return { error: 'Catálogo no válido' }
  const row: any = {}
  for (const c of t.cols) row[c] = (d[c] || '').trim() || null
  for (const c of t.req) if (!row[c]) return { error: `Falta: ${c}` }
  if (tabla === 'clientes' && !row.codigo) row.codigo = 'N-' + Date.now().toString(36).toUpperCase()   // cliente nuevo sin código: se asigna uno provisional
  const { sb } = await ctx()
  const { data, error } = await sb.from(tabla).insert(row).select(t.sel).single()
  if (error) return { error: error.code === '23505' ? 'Ya existe un registro con ese código o nombre.' : error.message }
  return { id: t.id ? data[t.id] : data.id, label: t.label(data), extra: { vendedor_id: data.vendedor_id ?? null } }
}
