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
  const [c, pc, rec, prec, can, viejos, cfg] = await Promise.all([
    all(filt(rango(sb.from('casos').select('id,numero,fecha,estado,monto,cantidad,producto,factura,chofer,critico,area,cliente_id,vendedor_id,error_cliente,error_ventas,error_televentas,error_chofer,error_almacen,error_pima,created_at,fecha_cierre,televenta_id,clientes(codigo,nombre),vendedores(nombre),televentas(nombre),rutas(nombre),motivos_devolucion(codigo,nombre,area)'), 'fecha', sp))),
    prev ? all(filt(rango(sb.from('casos').select('estado,monto'), 'fecha', prev))) : Promise.resolve({ data: null }),
    all(rangoTs(sb.from('recuperaciones').select('monto_perdida,monto_recuperado,created_at,tipo,clientes(codigo,nombre),casos(numero)'), 'created_at', sp)),
    prev ? all(rangoTs(sb.from('recuperaciones').select('monto_recuperado'), 'created_at', prev)) : Promise.resolve({ data: null }),
    all((conCli ? (q: any) => q.eq('cliente_id', sp.cliente_id) : (q: any) => q)(rango(sb.from('canastas').select('fecha,chofer,entregada,recuperada,pendiente,estado,clientes(codigo,nombre),rutas(nombre)'), 'fecha', sp))),
    sb.from('casos').select('id,numero,created_at,estado,clientes(codigo,nombre),motivos_devolucion(codigo,nombre)').not('estado', 'in', '(resuelto,cerrado)').order('created_at').limit(8),
    sb.from('config').select('valor').eq('clave', 'meta_efectividad').maybeSingle()])
  return { errorCasos: c.error?.message || null, meta: Number(cfg?.data?.valor) || 80, sp, todo, H0, prev, R: c.data || [], P: pc.data || [], rec: rec.data || [], prec: prec.data || [], K: can.data || [], viejos: viejos.data || [] }
}
export function resumen(rows: any[], key: (r: any) => any) {
  const m = new Map<string, { name: string; casos: number; valor: number }>()
  rows.forEach(r => { const k = key(r) || 'Sin asignar'; const x = m.get(k) || { name: k, casos: 0, valor: 0 }; x.casos++; x.valor += Number(r.monto || 0); m.set(k, x) })
  return Array.from(m.values()).sort((a, b) => b.valor - a.valor || b.casos - a.casos)
}
export function calcular(d: any) {
  const META = Number(d.meta) || 80
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
  const INTERNAS = ['ventas', 'logistica', 'almacen', 'calidad']
  const evit = R.filter((r: any) => INTERNAS.includes(A(r))), valEvit = sum(evit, 'monto'), valCliente = porArea.find(x => x.key === 'cliente')?.valor || 0
  const dPer = sp.desde && sp.hasta ? Math.round((+dd(sp.hasta) - +dd(sp.desde)) / 864e5) + 1 : 0
  const proyMensual = dPer ? Math.round(valEvit * 30 / dPer) : null
  const em = new Map<string, { name: string; area: string; casos: number; valor: number }>()
  evit.forEach((r: any) => { const k = motLabel(r.motivos_devolucion) || 'Sin motivo'; const x = em.get(k) || { name: k, area: A(r), casos: 0, valor: 0 }; x.casos++; x.valor += Number(r.monto || 0); em.set(k, x) })
  const topEvit = Array.from(em.values()).sort((a, b) => b.valor - a.valor || b.casos - a.casos).slice(0, 5)
  // ---- Responsables: volumen de casos y errores marcados (exacto, por persona)
  const kch = new Map<string, { ent: number; rec: number }>()
  K.forEach((r: any) => { const k = String(r.chofer || '').trim(); if (!k) return; const x = kch.get(k) || { ent: 0, rec: 0 }; x.ent += Number(r.entregada || 0); x.rec += Number(r.recuperada || 0); kch.set(k, x) })
  const actor = (kf: (r: any) => any, flag: string) => { const mp = new Map<string, { name: string; casos: number; errores: number; valor: number; valorErr: number }>()
    R.forEach((r: any) => { const n = kf(r); if (!n) return; const x = mp.get(n) || { name: n, casos: 0, errores: 0, valor: 0, valorErr: 0 }; x.casos++; x.valor += Number(r.monto || 0); if (r[flag]) { x.errores++; x.valorErr += Number(r.monto || 0) }; mp.set(n, x) })
    return Array.from(mp.values()).map(x => ({ ...x, pctErr: pct(x.errores, x.casos) })) }
  const actores = {
    vend: actor((r: any) => r.vendedores?.nombre, 'error_ventas'), tele: actor((r: any) => r.televentas?.nombre, 'error_televentas'),
    cho: actor((r: any) => String(r.chofer || '').trim(), 'error_chofer').map(x => ({ ...x, ent: kch.get(x.name)?.ent || 0, pctRec: pct(kch.get(x.name)?.rec || 0, kch.get(x.name)?.ent || 0) })),
    cli: actor((r: any) => (r.cliente_id ? cliTxt(r.clientes) : null), 'error_cliente') }
  const FL = ['error_cliente', 'error_ventas', 'error_televentas', 'error_chofer', 'error_almacen', 'error_pima']
  const errTot = { cliente: R.filter((r: any) => r.error_cliente).length, ventas: R.filter((r: any) => r.error_ventas).length, televentas: R.filter((r: any) => r.error_televentas).length, chofer: R.filter((r: any) => r.error_chofer).length, almacen: R.filter((r: any) => r.error_almacen).length, pima: R.filter((r: any) => r.error_pima).length }
  const valErr = { almacen: sum(R.filter((r: any) => r.error_almacen), 'monto'), pima: sum(R.filter((r: any) => r.error_pima), 'monto') }
  const sinAtribuir = { cliente: R.filter((r: any) => r.error_cliente && !r.cliente_id).length, ventas: R.filter((r: any) => r.error_ventas && !r.vendedor_id).length, televentas: R.filter((r: any) => r.error_televentas && !r.televenta_id).length, chofer: R.filter((r: any) => r.error_chofer && !String(r.chofer || '').trim()).length }
  const cls: string[][] = R.map((r: any) => FL.filter(f => r[f]))
  const FLX: [string, string, string][] = [['error_ventas', 'Error de ventas', '#2563eb'], ['error_televentas', 'Error de televentas', '#7c3aed'], ['error_chofer', 'Error del chofer', '#0d9488'], ['error_cliente', 'Error del cliente', '#d97706'], ['error_almacen', 'Error de almacén', '#be185d'], ['error_pima', 'Error de PIMA', '#0891b2']]
  const distrib = [...FLX.map(([f, l, c]) => ({ label: l, value: cls.filter(x => x.length === 1 && x[0] === f).length, color: c })), { label: 'Más de uno', value: cls.filter(x => x.length > 1).length, color: '#dc2626' }, { label: 'Sin error marcado', value: cls.filter(x => x.length === 0).length, color: '#cbd5e1' }]
  // ---- Choferes: qué reportan (causa) y cuántas incidencias son error propio
  type Ch = { name: string; reportes: number; propio: number; porVend: number; porCli: number; porTele: number; sinPersona: number; porAlm: number; porPima: number; valor: number; valorPropio: number; ex: { chofer: number; ventas: number; cliente: number; televentas: number; almacen: number; pima: number; varios: number; ninguno: number } }
  const chMap = new Map<string, Ch>()
  R.forEach((r: any) => { const n = String(r.chofer || '').trim(); if (!n) return
    const x = chMap.get(n) || { name: n, reportes: 0, propio: 0, porVend: 0, porCli: 0, porTele: 0, sinPersona: 0, porAlm: 0, porPima: 0, valor: 0, valorPropio: 0, ex: { chofer: 0, ventas: 0, cliente: 0, televentas: 0, almacen: 0, pima: 0, varios: 0, ninguno: 0 } }
    const mt = Number(r.monto || 0), fl = FL.filter(f => r[f]); x.reportes++; x.valor += mt
    if (r.error_chofer) { x.propio++; x.valorPropio += mt }; if (r.error_ventas) x.porVend++; if (r.error_cliente) x.porCli++; if (r.error_televentas) x.porTele++; if (r.error_almacen) x.porAlm++; if (r.error_pima) x.porPima++
    if (!fl.length) { x.sinPersona++; x.ex.ninguno++ } else if (fl.length > 1) x.ex.varios++; else if (fl[0] === 'error_chofer') x.ex.chofer++; else if (fl[0] === 'error_ventas') x.ex.ventas++; else if (fl[0] === 'error_cliente') x.ex.cliente++; else if (fl[0] === 'error_almacen') x.ex.almacen++; else if (fl[0] === 'error_pima') x.ex.pima++; else x.ex.televentas++
    chMap.set(n, x) })
  const choferesDet = Array.from(chMap.values()).map(x => ({ ...x, pctPropio: pct(x.propio, x.reportes), ent: kch.get(x.name)?.ent || 0, pctRec: pct(kch.get(x.name)?.rec || 0, kch.get(x.name)?.ent || 0) })).sort((a, b) => b.reportes - a.reportes || b.propio - a.propio)
  const dV = delta(valor, pValor), diasViejo = viejos[0] ? Math.floor((Date.now() - +new Date(viejos[0].created_at)) / 864e5) : 0
  const m1 = top(gM, 1)[0], c1 = top(gC, 1)[0]
  const insights: string[] = []
  if (total) {
    insights.push(`Se recibieron **${fmt(total)}** casos por un valor de **${fmt(valor)}**${dV != null ? ` (${dV > 0 ? '+' : ''}${dV}% frente al período anterior)` : ''}.`)
    if (m1 && valor) insights.push(`El motivo de mayor valor es **${m1.name}**: concentra el **${pct(m1.value, valor)}%** de lo devuelto.`)
    if (c1 && valor) insights.push(`${c1.name === 'Sin asignar' ? 'Los casos **sin cliente asignado**' : `El cliente con más valor devuelto es **${c1.name}**`} suman ${fmt(c1.value)} (${pct(c1.value, valor)}% del total).`)
    if (valEvit && valor) insights.push(`El **${pct(valEvit, valor)}%** del valor devuelto (${fmt(valEvit)}) viene de causas internas evitables (ventas, logística, almacén y calidad)${proyMensual ? `; a este ritmo serían unos **${fmt(proyMensual)}** al mes` : ''}.`)
    const partes = porArea.filter(x => x.casos).sort((a, b) => b.casos - a.casos).map(x => `${x.label} ${pct(x.casos, total)}%`)
    if (partes.length) insights.push(`Por área responsable: ${partes.join(', ')}.`)
    const mx = (a: any[], k: string) => [...a].sort((x, y) => y[k] - x[k] || y.casos - x.casos)[0]
    const vol = [['vendedor', mx(actores.vend, 'casos')], ['televenta', mx(actores.tele, 'casos')], ['chofer', mx(actores.cho, 'casos')], ['cliente', mx(actores.cli, 'casos')]].filter(x => x[1]) as [string, any][]
    if (vol.length) insights.push(`Quién envía más casos: ${vol.map(([t, a]) => `${t} **${a.name}** (${a.casos})`).join(', ')}.`)
    const er = [['vendedor', mx(actores.vend, 'errores')], ['televenta', mx(actores.tele, 'errores')], ['chofer', mx(actores.cho, 'errores')], ['cliente', mx(actores.cli, 'errores')]].filter(x => x[1] && x[1].errores > 0) as [string, any][]
    if (er.length) insights.push(`Quién se equivoca más (errores marcados): ${er.map(([t, a]) => `${t} **${a.name}** (${a.errores} de ${a.casos})`).join(', ')}.`)
    const chTop = choferesDet[0]; if (chTop) insights.push(`El chofer que más reporta es **${chTop.name}** (${chTop.reportes} reportes): ${chTop.propio} por error suyo, ${chTop.porVend} por vendedor, ${chTop.porCli} por cliente y ${chTop.porTele} por televentas.`)
    const cp = [...choferesDet].sort((a, b) => b.propio - a.propio || b.pctPropio - a.pctPropio)[0]; if (cp && cp.propio > 0) insights.push(`El chofer con más incidencias propias es **${cp.name}**: ${cp.propio} de sus ${cp.reportes} reportes (${cp.pctPropio}%) fueron error suyo.`)
    const nErr = cls.filter(c => c.length > 0).length
    if (nErr) insights.push(`**${nErr}** casos (${pct(nErr, total)}%) tienen un error atribuido: cliente ${errTot.cliente}, ventas ${errTot.ventas}, televentas ${errTot.televentas}, chofer ${errTot.chofer}, almacén ${errTot.almacen}, PIMA ${errTot.pima}.`)
    if (k80 > 1) insights.push(`**${k80}** motivos concentran el 80% del valor devuelto: son la prioridad para reducir pérdidas.`)
    if (reincidentes.length) insights.push(`**${reincidentes.length}** ${reincidentes.length === 1 ? 'cliente tiene' : 'clientes tienen'} 3 o más casos en el período; el más frecuente es **${reincidentes[0].name}** (${reincidentes[0].casos}).`)
    if (porInvestigar.length) insights.push(`**${porInvestigar.length}** casos abiertos están **por investigar**: aún no se sabe a qué área corresponden.`)
    insights.push(`La efectividad de cierre es **${efect}%**${efect >= META ? ` y supera la meta del ${META}%.` : `, a ${Math.round(META - efect)} puntos de la meta del ${META}%.`}`)
    if (abiertos && viejos[0]) insights.push(`Hay **${abiertos}** casos abiertos; el más antiguo lleva **${diasViejo}** ${diasViejo === 1 ? 'día' : 'días'}.`)
    if (perd) insights.push(`De lo registrado como pérdida se ha recuperado el **${pct(recup, perd)}%** (${fmt(recup)} de ${fmt(perd)}).`)
  }
  if (kEnt) insights.push(`Canastas: se ha recuperado el **${pct(kRec, kEnt)}%** de las entregadas y quedan **${fmt(kPend)}** pendientes.`)
  return { ...d, H0, total, cerr, abiertos, pend, gestionadas, hrs, valor, pValor, recup, perd, pRecup, efect, pTotal, pEfect, kEnt, kRec, kPend, kPerd, cierre, gM, gC, gV, gT, periodo, dV, diasViejo, insights, porArea, vResp, tResp, cFrec, reincidentes, pareto, k80, porInvestigar, imputables, meta: META, choferesDet, actores, errTot, valErr, sinAtribuir, distrib, valEvit, valCliente, proyMensual, topEvit }
}
export type M = ReturnType<typeof calcular>
