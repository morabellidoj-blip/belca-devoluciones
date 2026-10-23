import Link from 'next/link'
import { Combo } from './combo'
export const ESTADOS: Record<string, string> = { nuevo: 'Nuevo', en_proceso: 'En proceso', pendiente_cliente: 'Pendiente cliente', pendiente_logistica: 'Pendiente logística', resuelto: 'Resuelto', cerrado: 'Cerrado' }
export const ESTADOS_CANASTA = ['pendiente', 'parcial', 'recuperada', 'perdida', 'facturada']
export const TIPOS_REC: Record<string, string> = { reventa: 'Reventa', cobro_cliente: 'Cobro cliente', transportista: 'Recuperación transportista', proveedor: 'Recuperación proveedor', interna: 'Recuperación interna' }
export const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' })
export const horaCR = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', hour12: false })
export const motLabel = (m: any) => (m ? (m.codigo ? `${m.codigo} · ${m.nombre}` : m.nombre) : '')
export const cliLabel = (x: any) => (x.nombre && x.nombre !== x.codigo ? `${x.codigo} · ${x.nombre}` : String(x.codigo))
export const cliTxt = (x: any) => (x ? cliLabel(x) : 'Sin asignar')
export const fmt = (n: any) => Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })
export const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0)
type P = { name: string; value: number }
export const grp = (rows: any[], key: (r: any) => any, val: (r: any) => number = () => 1): P[] => {
  const m: Record<string, number> = {}; rows.forEach(r => { const k = key(r) || 'Sin asignar'; m[k] = (m[k] || 0) + Number(val(r) || 0) })
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
export const Kpi = ({ t, v, sub, delta, good, hero, unit = '%', tone }: { t: string; v: any; sub?: string; delta?: number | null; good?: 'up' | 'down'; hero?: boolean; unit?: string; tone?: 'ok' | 'warn' | 'bad' }) => {
  const d = delta == null || !isFinite(delta) ? null : delta
  const col = d == null || d === 0 || !good ? (hero ? 'text-white/70' : 'text-slate-500') : ((d > 0) === (good === 'up') ? (hero ? 'text-emerald-300' : 'text-emerald-600') : (hero ? 'text-red-300' : 'text-red-600'))
  return <div className={`rounded-xl p-4 shadow-sm ${hero ? 'bg-belca-navy text-white' : 'bg-white border-t-4 border-belca-orange'}`}>
    <p className={`text-xs flex items-center gap-1.5 ${hero ? 'text-white/70' : 'text-slate-500'}`}>{tone && <span className={`inline-block w-2.5 h-2.5 rounded-full ${tone === 'ok' ? 'bg-emerald-400' : tone === 'warn' ? 'bg-amber-400' : 'bg-red-500'}`} />}{t}</p>
    <p className={`font-bold ${hero ? 'text-3xl' : 'text-2xl text-belca-navy'}`}>{v}</p>
    {(sub || d != null) && <p className="text-xs mt-1">{d != null && <span className={col}>{d > 0 ? '▲' : d < 0 ? '▼' : '■'} {Math.abs(d)}{unit} vs. período anterior{sub ? ' · ' : ''}</span>}
      {sub && <span className={hero ? 'text-white/60' : 'text-slate-400'}>{sub}</span>}</p>}
  </div>
}
export const Rank = ({ items, total }: { items: { name: string; value: number }[]; total: number }) => {
  const max = Math.max(...items.map(x => x.value), 1)
  return <ol className="space-y-2.5">{items.map((x, i) => <li key={x.name}>
    <div className="flex justify-between gap-3 text-sm"><span className="truncate"><b className="text-slate-400 mr-1.5">{i + 1}</b>{x.name}</span>
      <span className="whitespace-nowrap font-medium">{fmt(x.value)} <span className="text-slate-400 font-normal">· {pct(x.value, total)}%</span></span></div>
    <div className="h-1.5 rounded bg-slate-100 mt-1"><div className="h-1.5 rounded bg-belca-navy" style={{ width: `${(100 * x.value) / max}%` }} /></div></li>)}
    {!items.length && <p className="text-sm text-slate-400">Sin datos</p>}</ol>
}
export const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-xs font-semibold tracking-widest uppercase text-slate-500 mt-8 mb-3 flex items-center gap-3">{children}<span className="flex-1 h-px bg-slate-200" /></h2>
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

export function Filtros({ base, sp, cat, estados, gestores, todo, sinAsignar }: { base: string; sp: any; cat: any; estados?: boolean; gestores?: any[]; todo?: boolean; sinAsignar?: boolean }) {
  const h = hoy()
  return <form className="no-print bg-white rounded-xl p-3 mb-5 flex flex-wrap gap-3 items-end">
    <I n="desde" l="Desde" type="date" def={sp.desde} /><I n="hasta" l="Hasta" type="date" def={sp.hasta} />
    {cat && <Combo name="cliente_id" label="Cliente" def={sp.cliente_id} cls="w-64" vacio={sinAsignar ? 'Sin asignar' : undefined} vacioValor="ninguno" options={cat.clientes.map((x: any) => [x.id, cliLabel(x)])} />}
    {estados && <S n="estado" l="Estado" def={sp.estado} o={Object.entries(ESTADOS)} />}
    {gestores && <S n="gestor_id" l="Gestor" def={sp.gestor_id} o={opts(gestores, (g: any) => g.nombre)} />}
    <B>Filtrar</B>
    <span className="flex gap-3 text-xs text-belca-navy underline pb-2">
      <Link href={`${base}?desde=${h}&hasta=${h}`}>Hoy</Link><Link href={`${base}?desde=${semana(h)}&hasta=${h}`}>Semana</Link>
      <Link href={`${base}?desde=${h.slice(0, 8)}01&hasta=${h}`}>Mes</Link>{todo && <Link href={`${base}?todo=1`}>Todo</Link>}<Link href={base}>{todo ? 'Mes actual' : 'Limpiar'}</Link></span></form>
}
