import Link from 'next/link'
export const ESTADOS: Record<string, string> = { nuevo: 'Nuevo', en_proceso: 'En proceso', pendiente_cliente: 'Pendiente cliente', pendiente_logistica: 'Pendiente logística', resuelto: 'Resuelto', cerrado: 'Cerrado' }
export const ESTADOS_CANASTA = ['pendiente', 'parcial', 'recuperada', 'perdida', 'facturada']
export const TIPOS_REC: Record<string, string> = { reventa: 'Reventa', cobro_cliente: 'Cobro cliente', transportista: 'Recuperación transportista', proveedor: 'Recuperación proveedor', interna: 'Recuperación interna' }
export const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })
export const horaCR = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', hour12: false })
export const motLabel = (m: any) => (m ? (m.codigo ? `${m.codigo} · ${m.nombre}` : m.nombre) : '')
export const fmt = (n: any) => Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })
export const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0)
type P = { name: string; value: number }
export const grp = (rows: any[], key: (r: any) => any, val: (r: any) => number = () => 1): P[] => {
  const m: Record<string, number> = {}; rows.forEach(r => { const k = key(r) || '—'; m[k] = (m[k] || 0) + Number(val(r) || 0) })
  return Object.entries(m).map(([name, value]) => ({ name, value }))
}
export const top = (a: P[], n = 10) => [...a].sort((x, y) => y.value - x.value).slice(0, n)
export const byKey = (a: P[]) => [...a].sort((x, y) => x.name.localeCompare(y.name))
export const ratio = (rows: any[], key: (r: any) => any): P[] => {
  const e = grp(rows, key, r => r.entregada), r2 = grp(rows, key, r => r.recuperada)
  return e.map(x => ({ name: x.name, value: pct(r2.find(y => y.name === x.name)?.value || 0, x.value) }))
}
export const semana = (d: string) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10) }
export const opts = (rows: any[] | null, f: (x: any) => string) => (rows || []).map(x => [x.id, f(x)])

export const T = ({ children }: { children: React.ReactNode }) => <h1 className="text-2xl font-semibold text-belca-navy mb-5">{children}</h1>
export const Kpi = ({ t, v }: { t: string; v: any }) => <div className="bg-white rounded-xl p-4 shadow-sm border-t-4 border-belca-orange"><p className="text-xs text-slate-500">{t}</p><p className="text-2xl font-bold text-belca-navy">{v}</p></div>
export const Kpis = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">{children}</div>
export const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid lg:grid-cols-2 gap-4 mb-6">{children}</div>
export const Box = ({ title, children, cls = '' }: { title?: string; children: React.ReactNode; cls?: string }) =>
  <section className={`bg-white rounded-xl p-4 shadow-sm mb-4 ${cls}`}>{title && <h2 className="font-semibold text-belca-navy mb-3">{title}</h2>}{children}</section>
export const I = ({ n, l, type = 'text', req, def, cls = '' }: any) =>
  <label className={`block text-sm ${cls}`}>{l}<input name={n} type={type} step="any" required={req} defaultValue={def} className="inp mt-1" /></label>
export const S = ({ n, l, o, req, def, cls = '' }: any) =>
  <label className={`block text-sm ${cls}`}>{l}<select name={n} required={req} defaultValue={def ?? ''} className="inp mt-1"><option value="">—</option>
    {o.map((x: any) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
export const A = ({ n, l, def, cls = '' }: any) => <label className={`block text-sm ${cls}`}>{l}<textarea name={n} defaultValue={def} rows={3} className="inp mt-1" /></label>
export const F = ({ n, l, multiple = true, cls = '' }: any) => <label className={`block text-sm ${cls}`}>{l}<input name={n} type="file" accept="image/*,application/pdf" multiple={multiple} capture={undefined} className="inp mt-1" /></label>
export const B = ({ children, cls = '' }: { children: React.ReactNode; cls?: string }) => <button className={`btn ${cls}`}>{children}</button>
export const Tbl = ({ cols, rows }: { cols: string[]; rows: any[][] }) =>
  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500">{cols.map(c => <th key={c} className="p-2 font-medium whitespace-nowrap">{c}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="p-2 align-top">{c}</td>)}</tr>)}
      {!rows.length && <tr><td className="p-4 text-slate-400" colSpan={cols.length}>Sin registros</td></tr>}</tbody></table></div>
export const Badge = ({ children }: { children: React.ReactNode }) => <span className="px-2 py-0.5 rounded bg-slate-100 text-xs whitespace-nowrap">{children}</span>

export function Filtros({ base, sp, cat, estados, gestores }: { base: string; sp: any; cat: any; estados?: boolean; gestores?: any[] }) {
  const h = hoy()
  return <form className="bg-white rounded-xl p-3 mb-5 flex flex-wrap gap-3 items-end">
    <I n="desde" l="Desde" type="date" def={sp.desde} /><I n="hasta" l="Hasta" type="date" def={sp.hasta} />
    {cat && <S n="cliente_id" l="Cliente" def={sp.cliente_id} o={opts(cat.clientes, (c: any) => `${c.codigo} · ${c.nombre}`)} />}
    {estados && <S n="estado" l="Estado" def={sp.estado} o={Object.entries(ESTADOS)} />}
    {gestores && <S n="gestor_id" l="Gestor" def={sp.gestor_id} o={opts(gestores, (g: any) => g.nombre)} />}
    <B>Filtrar</B>
    <span className="flex gap-3 text-xs text-belca-navy underline pb-2">
      <Link href={`${base}?desde=${h}&hasta=${h}`}>Hoy</Link><Link href={`${base}?desde=${semana(h)}&hasta=${h}`}>Semana</Link>
      <Link href={`${base}?desde=${h.slice(0, 8)}01&hasta=${h}`}>Mes</Link><Link href={base}>Limpiar</Link></span></form>
}
