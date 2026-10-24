import { all, rango, rangoTs, filtroCliente } from './data'
import { grp, top, pct, fmt, hoy, motLabel, cliTxt } from './ui'
import { AREAS_CORTO, areaDe } from './areas'
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
  const filt = (q: any) => { if (sp.cliente_id) q = filtroCliente(q, sp.cliente_id); for (const k of ['estado', 'gestor_id', 'area']) if (sp[k]) q = q.eq(k, sp[k]); return q }
  const conCli = sp.cliente_id && sp.cliente_id !== 'ninguno'
  const [c, pc, rec, prec, can, viejos] = await Promise.all([
    all(filt(rango(sb.from('casos').select('id,numero,fecha,estado,monto,cantidad,producto,factura,chofer,critico,area,cliente_id,created_at,fecha_cierre,televenta_id,clientes(codigo,nombre),vendedores(nombre),televentas(nombre),rutas(nombre),motivos_devolucion(codigo,nombre,area)'), 'fecha', sp))),
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
  // ---- Responsabilidad y diagnóstico
  const A = (r: any) => areaDe(r)
  const porArea = Object.keys(AREAS_CORTO).map(k => { const x = R.filter((r: any) => A(r) === k); return { key: k, label: AREAS_CORTO[k], casos: x.length, valor: sum(x, 'monto') } })
  const resp = (base: any[], kf: (r: any) => any) => { const mp = new Map<string, { name: string; casos: number; imp: number; valor: number; valorImp: number }>()
    base.forEach((r: any) => { const k = kf(r) || 'Sin asignar'; const x = mp.get(k) || { name: k, casos: 0, imp: 0, valor: 0, valorImp: 0 }; x.casos++; x.valor += Number(r.monto || 0); if (A(r) === 'ventas') { x.imp++; x.valorImp += Number(r.monto || 0) }; mp.set(k, x) })
    return Array.from(mp.values()).sort((a, b) => b.imp - a.imp || b.valorImp - a.valorImp || b.casos - a.casos) }
  const vResp = resp(R, (r: any) => r.vendedores?.nombre), tResp = resp(R.filter((r: any) => r.televenta_id), (r: any) => r.televentas?.nombre)
  const cm = new Map<string, { name: string; casos: number; valor: number; porCliente: number; ultima: string }>()
  R.filter((r: any) => r.cliente_id).forEach((r: any) => { const k = cliTxt(r.clientes); const x = cm.get(k) || { name: k, casos: 0, valor: 0, porCliente: 0, ultima: '' }; x.casos++; x.valor += Number(r.monto || 0); if (A(r) === 'cliente') x.porCliente++; if (r.fecha > x.ultima) x.ultima = r.fecha; cm.set(k, x) })
  const cFrec = Array.from(cm.values()).sort((a, b) => b.casos - a.casos || b.valor - a.valor), reincidentes = cFrec.filter(x => x.casos >= 3)
  const pm = new Map<string, { name: string; area: string; casos: number; valor: number; acum: number }>()
  R.forEach((r: any) => { const k = motLabel(r.motivos_devolucion) || 'Sin motivo'; const x = pm.get(k) || { name: k, area: A(r), casos: 0, valor: 0, acum: 0 }; x.casos++; x.valor += Number(r.monto || 0); pm.set(k, x) })
  const pareto = Array.from(pm.values()).sort((a, b) => b.valor - a.valor || b.casos - a.casos); let ac = 0; pareto.forEach(x => { ac += x.valor; x.acum = pct(ac, valor) })
  const k80 = valor ? pareto.findIndex(x => x.acum >= 80) + 1 : 0
  const porInvestigar = R.filter((r: any) => A(r) === 'investigar' && !['resuelto', 'cerrado'].includes(r.estado)).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
  const imputables = R.filter((r: any) => A(r) === 'ventas').length
  const dV = delta(valor, pValor), diasViejo = viejos[0] ? Math.floor((Date.now() - +new Date(viejos[0].created_at)) / 864e5) : 0
  const m1 = top(gM, 1)[0], c1 = top(gC, 1)[0]
  const insights: string[] = []
  if (total) {
    insights.push(`Se recibieron **${fmt(total)}** casos por un valor de **${fmt(valor)}**${dV != null ? ` (${dV > 0 ? '+' : ''}${dV}% frente al período anterior)` : ''}.`)
    if (m1 && valor) insights.push(`El motivo de mayor valor es **${m1.name}**: concentra el **${pct(m1.value, valor)}%** de lo devuelto.`)
    if (c1 && valor) insights.push(`${c1.name === 'Sin asignar' ? 'Los casos **sin cliente asignado**' : `El cliente con más valor devuelto es **${c1.name}**`} suman ${fmt(c1.value)} (${pct(c1.value, valor)}% del total).`)
    const partes = porArea.filter(x => x.casos).sort((a, b) => b.casos - a.casos).map(x => `${x.label} ${pct(x.casos, total)}%`)
    if (partes.length) insights.push(`Por área responsable: ${partes.join(', ')}.`)
    const v1 = vResp[0]; if (v1 && v1.imp) insights.push(`El vendedor con más casos **imputables a ventas** es **${v1.name}** (${v1.imp} de sus ${v1.casos}); el resto de sus casos no depende de la venta.`)
    if (k80 > 1) insights.push(`**${k80}** motivos concentran el 80% del valor devuelto: son la prioridad para reducir pérdidas.`)
    if (reincidentes.length) insights.push(`**${reincidentes.length}** ${reincidentes.length === 1 ? 'cliente tiene' : 'clientes tienen'} 3 o más casos en el período; el más frecuente es **${reincidentes[0].name}** (${reincidentes[0].casos}).`)
    if (porInvestigar.length) insights.push(`**${porInvestigar.length}** casos abiertos están **por investigar**: aún no se sabe a qué área corresponden.`)
    insights.push(`La efectividad de cierre es **${efect}%**${efect >= META ? ` y supera la meta del ${META}%.` : `, a ${Math.round(META - efect)} puntos de la meta del ${META}%.`}`)
    if (abiertos && viejos[0]) insights.push(`Hay **${abiertos}** casos abiertos; el más antiguo lleva **${diasViejo}** ${diasViejo === 1 ? 'día' : 'días'}.`)
    if (perd) insights.push(`De lo registrado como pérdida se ha recuperado el **${pct(recup, perd)}%** (${fmt(recup)} de ${fmt(perd)}).`)
  }
  if (kEnt) insights.push(`Canastas: se ha recuperado el **${pct(kRec, kEnt)}%** de las entregadas y quedan **${fmt(kPend)}** pendientes.`)
  return { ...d, H0, total, cerr, abiertos, pend, gestionadas, hrs, valor, pValor, recup, perd, pRecup, efect, pTotal, pEfect, kEnt, kRec, kPend, kPerd, cierre, gM, gC, gV, gT, periodo, dV, diasViejo, insights, porArea, vResp, tResp, cFrec, reincidentes, pareto, k80, porInvestigar, imputables }
}
export type M = ReturnType<typeof calcular>
