import { all, rango, rangoTs, filtroCliente } from './data'
import { cliTxt } from './ui'
import { grp, top, pct, fmt, hoy, motLabel } from './ui'
export const META = 80
const dd = (s: string) => new Date(s + 'T00:00:00Z')
const addD = (s: string, n: number) => { const d = dd(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const delta = (a: number, b: number) => (b ? Math.round((1000 * (a - b)) / b) / 10 : null)
const sum = (a: any[] | null, k: string) => (a || []).reduce((t: number, r: any) => t + Number(r[k] || 0), 0)
export const periodoEfectivo = (sp0: any) => {
  const H0 = hoy(), todo = !!sp0.todo
  return { H0, todo, sp: !sp0.desde && !sp0.hasta && !todo ? { ...sp0, desde: H0.slice(0, 8) + '01', hasta: H0 } : sp0 }
}
export async function cargar(sb: any, sp0: any) {
  const { sp, todo, H0 } = periodoEfectivo(sp0)
  let prev: any = null
  if (sp.desde && sp.hasta) { const len = Math.round((+dd(sp.hasta) - +dd(sp.desde)) / 864e5) + 1; prev = { desde: addD(sp.desde, -len), hasta: addD(sp.desde, -1) } }
  const filt = (q: any) => { if (sp.cliente_id) q = filtroCliente(q, sp.cliente_id); for (const k of ['estado', 'gestor_id']) if (sp[k]) q = q.eq(k, sp[k]); return q }
  const conCli = sp.cliente_id && sp.cliente_id !== 'ninguno'
  const [c, pc, rec, prec, can, viejos] = await Promise.all([
    all(filt(rango(sb.from('casos').select('id,numero,fecha,estado,monto,cantidad,producto,factura,chofer,critico,cliente_id,created_at,fecha_cierre,televenta_id,clientes(codigo,nombre),vendedores(nombre),televentas(nombre),rutas(nombre),motivos_devolucion(codigo,nombre)'), 'fecha', sp))),
    prev ? all(filt(rango(sb.from('casos').select('estado,monto'), 'fecha', prev))) : Promise.resolve({ data: null }),
    all(rangoTs(sb.from('recuperaciones').select('monto_perdida,monto_recuperado,created_at,tipo,clientes(codigo,nombre),casos(numero)'), 'created_at', sp)),
    prev ? all(rangoTs(sb.from('recuperaciones').select('monto_recuperado'), 'created_at', prev)) : Promise.resolve({ data: null }),
    all((conCli ? (q: any) => q.eq('cliente_id', sp.cliente_id) : (q: any) => q)(rango(sb.from('canastas').select('fecha,chofer,entregada,recuperada,pendiente,estado,clientes(codigo,nombre),rutas(nombre)'), 'fecha', sp))),
    sb.from('casos').select('id,numero,created_at,estado,clientes(codigo,nombre),motivos_devolucion(codigo,nombre)').not('estado', 'in', '(resuelto,cerrado)').order('created_at').limit(8)])
  return { sp, todo, H0, prev, R: c.data || [], P: pc.data || [], rec: rec.data || [], prec: prec.data || [], K: can.data || [], viejos: viejos.data || [] }
}
export function resumen(rows: any[], key: (r: any) => any) {
  const m = new Map<string, { name: string; casos: number; valor: number }>()
  rows.forEach(r => { const k = key(r) || 'Sin asignar'; const x = m.get(k) || { name: k, casos: 0, valor: 0 }; x.casos++; x.valor += Number(r.monto || 0); m.set(k, x) })
  return Array.from(m.values()).sort((a, b) => b.valor - a.valor || b.casos - a.casos)
}
export function calcular(d: any) {
  const { R, P, K, rec, prec, viejos, todo, sp, H0 } = d
  const total = R.length, cerr = R.filter((r: any) => r.estado === 'cerrado').length
  const abiertos = R.filter((r: any) => !['resuelto', 'cerrado'].includes(r.estado)).length
  const pend = R.filter((r: any) => r.estado.startsWith('pendiente')).length
  const gestionadas = R.filter((r: any) => ['resuelto', 'cerrado'].includes(r.estado)).length
  const conCierre = R.filter((r: any) => r.fecha_cierre)
  const hrs: number | null = conCierre.length ? conCierre.reduce((a: number, r: any) => a + (+new Date(r.fecha_cierre) - +new Date(r.created_at)) / 36e5, 0) / conCierre.length : null
  const valor = sum(R, 'monto'), pValor = sum(P, 'monto'), recup = sum(rec, 'monto_recuperado'), perd = sum(rec, 'monto_perdida'), pRecup = sum(prec, 'monto_recuperado')
  const efect = pct(cerr, total), pTotal = P.length, pEfect = pct(P.filter((r: any) => r.estado === 'cerrado').length, pTotal)
  const kEnt = sum(K, 'entregada'), kRec = sum(K, 'recuperada')
  const kPend = K.filter((r: any) => ['pendiente', 'parcial'].includes(r.estado)).reduce((a: number, r: any) => a + r.pendiente, 0)
  const kPerd = K.filter((r: any) => r.estado === 'perdida').reduce((a: number, r: any) => a + r.pendiente, 0)
  const meses = Array.from(new Set(R.map((r: any) => r.fecha.slice(0, 7)))).sort() as string[]
  const cierre = meses.map(m => ({ name: m, value: pct(R.filter((r: any) => r.fecha.startsWith(m) && r.estado === 'cerrado').length, R.filter((r: any) => r.fecha.startsWith(m)).length) }))
  const gM = grp(R, (r: any) => motLabel(r.motivos_devolucion), (r: any) => r.monto), gC = grp(R, (r: any) => cliTxt(r?.clientes), (r: any) => r.monto), gV = grp(R, (r: any) => r.vendedores?.nombre, (r: any) => r.monto)
  const gT = grp(R.filter((r: any) => r.televenta_id), (r: any) => r.televentas?.nombre)
  const periodo = todo ? 'todo el historial' : `${sp.desde || 'inicio'} al ${sp.hasta || 'hoy'}`
  const dV = delta(valor, pValor), diasViejo = viejos[0] ? Math.floor((Date.now() - +new Date(viejos[0].created_at)) / 864e5) : 0
  const m1 = top(gM, 1)[0], c1 = top(gC, 1)[0]
  const insights: string[] = []
  if (total) {
    insights.push(`Se recibieron **${fmt(total)}** casos por un valor de **${fmt(valor)}**${dV != null ? ` (${dV > 0 ? '+' : ''}${dV}% frente al período anterior)` : ''}.`)
    if (m1 && valor) insights.push(`El motivo de mayor valor es **${m1.name}**: concentra el **${pct(m1.value, valor)}%** de lo devuelto.`)
    if (c1 && valor) insights.push(`${c1.name === 'Sin asignar' ? 'Los casos **sin cliente asignado**' : `El cliente con más valor devuelto es **${c1.name}**`} suman ${fmt(c1.value)} (${pct(c1.value, valor)}% del total).`)
    insights.push(`La efectividad de cierre es **${efect}%**${efect >= META ? ` y supera la meta del ${META}%.` : `, a ${Math.round(META - efect)} puntos de la meta del ${META}%.`}`)
    if (abiertos && viejos[0]) insights.push(`Hay **${abiertos}** casos abiertos; el más antiguo lleva **${diasViejo}** ${diasViejo === 1 ? 'día' : 'días'}.`)
    if (perd) insights.push(`De lo registrado como pérdida se ha recuperado el **${pct(recup, perd)}%** (${fmt(recup)} de ${fmt(perd)}).`)
  }
  if (kEnt) insights.push(`Canastas: se ha recuperado el **${pct(kRec, kEnt)}%** de las entregadas y quedan **${fmt(kPend)}** pendientes.`)
  return { ...d, H0, total, cerr, abiertos, pend, gestionadas, hrs, valor, pValor, recup, perd, pRecup, efect, pTotal, pEfect, kEnt, kRec, kPend, kPerd, cierre, gM, gC, gV, gT, periodo, dV, diasViejo, insights }
}
export type M = ReturnType<typeof calcular>
