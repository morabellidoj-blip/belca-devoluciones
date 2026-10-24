import ExcelJS from 'exceljs'
import { cliTxt } from './ui'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ESTADOS, TIPOS_REC, fmt, pct, horaCR, motLabel, grp, byKey, semana } from './ui'
import { resumen, META, delta, type M } from './metricas'
import { AREAS_CORTO, areaDe } from './areas'

const NAVY = 'FF0B1E38', ORANGE = 'FFF39C1F', ZEBRA = 'FFF8FAFC', BORDE = 'FFE2E8F0', BLANCO = 'FFFFFFFF'
const plano = (s: string) => s.replace(/\*\*/g, '')
const sp = (n: any) => fmt(n).replace(/[\u00a0\u202f]/g, ' ')
export const pngSize = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20) })

/* ============================== EXCEL ============================== */
export async function construirXlsx(m: M, logo: Buffer | null, abiertos: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Belca Foodservice'; wb.created = new Date()
  const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
  const banda = (ws: ExcelJS.Worksheet, titulo: string, cols: number) => {
    ws.mergeCells(1, 1, 1, cols); ws.mergeCells(2, 1, 2, cols)
    const a = ws.getCell(1, 1); a.value = titulo; a.font = { bold: true, size: 15, color: { argb: BLANCO } }; a.fill = fill(NAVY); a.alignment = { vertical: 'middle', indent: 1 }
    const b = ws.getCell(2, 1); b.value = `Belca Foodservice · Período: ${m.periodo} · Generado: ${m.H0}`; b.font = { size: 10, color: { argb: 'FFCBD5E1' } }; b.fill = fill(NAVY); b.alignment = { vertical: 'middle', indent: 1 }
    ws.getRow(1).height = 30; ws.getRow(2).height = 20
    for (let c = 1; c <= cols; c++) { ws.getCell(1, c).fill = fill(NAVY); ws.getCell(2, c).fill = fill(NAVY) }
  }
  const tabla = (ws: ExcelJS.Worksheet, fila: number, heads: string[], rows: any[][], fmts: (string | undefined)[] = []) => {
    const h = ws.getRow(fila); h.height = 22
    heads.forEach((t, i) => { const c = h.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: BLANCO } }; c.fill = fill(NAVY); c.alignment = { vertical: 'middle', horizontal: i ? 'center' : 'left', wrapText: true } })
    rows.forEach((r, ri) => { const row = ws.getRow(fila + 1 + ri); r.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; if (fmts[i]) c.numFmt = fmts[i] as string; c.border = { bottom: { style: 'thin', color: { argb: BORDE } } }; if (ri % 2) c.fill = fill(ZEBRA) }) })
    return fila + 1 + rows.length
  }
  const anchos = (ws: ExcelJS.Worksheet, w: number[]) => w.forEach((x, i) => { ws.getColumn(i + 1).width = x })
  const titSec = (ws: ExcelJS.Worksheet, fila: number, t: string) => { const c = ws.getCell(fila, 1); c.value = t; c.font = { bold: true, size: 12, color: { argb: NAVY } } }

  // ---- Resumen
  const rs = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] }); banda(rs, 'Informe gerencial · Devoluciones, canastas y recuperación', 5)
  anchos(rs, [46, 20, 20, 16, 4])
  if (logo) { const s = pngSize(logo); const id = wb.addImage({ buffer: logo as any, extension: 'png' }); rs.addImage(id, { tl: { col: 3.2, row: 0.15 }, ext: { width: 120, height: Math.round(120 * s.h / s.w) } }) }
  titSec(rs, 4, 'Indicadores clave')
  const n0 = '#,##0', p1 = '0.0"%"', pp = '+0.0" pp";-0.0" pp"', vr = '+0.0%;-0.0%;0.0%'
  const k: any[][] = [
    ['Casos recibidos', m.total, m.pTotal || null, n0, 'var'], ['Valor devuelto', m.valor, m.pValor || null, n0, 'var'], ['Casos cerrados', m.cerr, null, n0],
    ['Efectividad de cierre (%)', m.efect, m.pTotal ? m.pEfect : null, p1, 'pp'], ['Casos abiertos', m.abiertos, null, n0], ['Casos pendientes', m.pend, null, n0],
    ['Casos gestionados (resueltos + cerrados)', m.gestionadas, null, n0], ['Tiempo promedio de resolución (horas)', m.hrs == null ? null : Math.round(m.hrs * 10) / 10, null, '0.0'],
    ['Valor promedio por caso', m.total ? Math.round(m.valor / m.total) : null, null, n0],
    ['Monto perdido registrado', m.perd, null, n0], ['Monto recuperado', m.recup, m.pRecup || null, n0, 'var'], ['% Recuperación económica', pct(m.recup, m.perd), null, p1],
    ['Canastas entregadas', m.kEnt, null, n0], ['Canastas recuperadas', m.kRec, null, n0], ['% Recuperación de canastas', pct(m.kRec, m.kEnt), null, p1], ['Canastas pendientes', m.kPend, null, n0], ['Canastas perdidas', m.kPerd, null, n0]]
  const fin = tabla(rs, 5, ['Indicador', 'Período actual', 'Período anterior', 'Variación'], k.map(r => [r[0], r[1], r[2], null]), [undefined, undefined, undefined, undefined])
  k.forEach((r, i) => { const f = 6 + i; rs.getCell(f, 2).numFmt = r[3]; rs.getCell(f, 3).numFmt = r[3]; rs.getCell(f, 1).font = { bold: true }; rs.getCell(f, 2).font = { bold: true, color: { argb: NAVY } }
    if (r[4] === 'var' && r[2]) { const c = rs.getCell(f, 4); c.value = { formula: `IF(C${f}=0,"",(B${f}-C${f})/C${f})`, result: (r[1] - r[2]) / r[2] }; c.numFmt = vr }
    if (r[4] === 'pp' && r[2] != null) { const c = rs.getCell(f, 4); c.value = { formula: `B${f}-C${f}`, result: r[1] - r[2] }; c.numFmt = pp } })
  titSec(rs, fin + 1, 'Lectura rápida')
  m.insights.forEach((t: string, i: number) => { const f = fin + 2 + i; rs.mergeCells(f, 1, f, 4); const c = rs.getCell(f, 1); c.value = '•  ' + plano(t); c.alignment = { wrapText: true, vertical: 'top' }; rs.getRow(f).height = 30 })
  rs.getCell(fin + 3 + m.insights.length, 1).value = `Meta de efectividad de cierre: ${META}%.`; rs.getCell(fin + 3 + m.insights.length, 1).font = { italic: true, color: { argb: 'FF64748B' } }

  // ---- Responsabilidad y diagnóstico
  const rp = wb.addWorksheet('Responsabilidad', { views: [{ showGridLines: false }] }); banda(rp, 'Responsabilidad y diagnóstico', 6); anchos(rp, [52, 16, 18, 18, 16, 16])
  let fr = 4
  const bloq = (titulo: string, heads: string[], rows: any[][], fm: (string | undefined)[]) => { titSec(rp, fr, titulo); const fin = tabla(rp, fr + 1, heads, rows, fm); const ini = fr + 2; fr = fin + 2; return ini }
  const ar = m.porArea.filter((x: any) => x.casos).sort((a: any, b: any) => b.valor - a.valor); const a0 = fr + 2
  bloq('¿De dónde vienen las devoluciones? (por área responsable)', ['Área responsable', 'Casos', '% de casos', 'Valor devuelto', '% del valor'], ar.map((x: any, i: number) => [x.label, x.casos,
    { formula: `IF(SUM(B$${a0}:B$${a0 + ar.length - 1})=0,0,B${a0 + i}/SUM(B$${a0}:B$${a0 + ar.length - 1}))`, result: pct(x.casos, m.total) / 100 }, x.valor,
    { formula: `IF(SUM(D$${a0}:D$${a0 + ar.length - 1})=0,0,D${a0 + i}/SUM(D$${a0}:D$${a0 + ar.length - 1}))`, result: pct(x.valor, m.valor) / 100 }]), [undefined, n0, '0.0%', n0, '0.0%'])
  const resp = (tit: string, etq: string, items: any[]) => { const it = items.filter(x => x.imp > 0).slice(0, 25); const i0 = fr + 2
    bloq(tit, [etq, 'Casos totales', 'Imputables a ventas', '% imputable', 'Valor imputable'], it.map((x, i) => [x.name, x.casos, x.imp, { formula: `IF(B${i0 + i}=0,0,C${i0 + i}/B${i0 + i})`, result: x.casos ? x.imp / x.casos : 0 }, x.valorImp]), [undefined, n0, n0, '0.0%', n0]) }
  resp('Vendedores con casos imputables a ventas', 'Vendedor', m.vResp); resp('Televentas con casos imputables a ventas', 'Televenta', m.tResp)
  rp.getCell(fr - 1, 1).value = 'Solo cuentan los casos cuya área responsable es Ventas; los de almacén, transporte, calidad o cliente no se atribuyen al vendedor.'; rp.getCell(fr - 1, 1).font = { italic: true, color: { argb: 'FF64748B' } }; fr += 1
  bloq('Clientes con más frecuencia (top 25)', ['Cliente', 'Casos', 'Valor', 'Por causa del cliente', 'Último caso', 'Reincidente'], m.cFrec.slice(0, 25).map((x: any) => [x.name, x.casos, x.valor, x.porCliente, x.ultima, x.casos >= 3 ? 'Sí' : '']), [undefined, n0, n0, n0])
  bloq('Motivos principales (Pareto)', ['Motivo', 'Área', 'Casos', 'Valor', '% acumulado'], m.pareto.slice(0, 15).map((x: any) => [x.name, AREAS_CORTO[x.area], x.casos, x.valor, x.acum / 100]), [undefined, undefined, n0, n0, '0.0%'])
  bloq('Casos abiertos por investigar', ['Caso', 'Fecha', 'Cliente', 'Motivo', 'Días abiertos', 'Valor'], m.porInvestigar.slice(0, 40).map((r: any) => [r.numero, r.fecha, cliTxt(r.clientes), motLabel(r.motivos_devolucion), Math.floor((Date.now() - +new Date(r.created_at)) / 864e5), Number(r.monto || 0)]), [undefined, undefined, undefined, undefined, n0, n0])

  // ---- Rankings (con porcentaje en fórmula y barra visual)
  const rank = (nombre: string, titulo: string, items: { name: string; casos: number; valor: number }[], etq: string) => {
    const ws = wb.addWorksheet(nombre, { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] }); banda(ws, titulo, 5); anchos(ws, [52, 12, 18, 14, 44])
    const tot = items.reduce((a, x) => a + x.valor, 0), ini = 5, fin = ini + items.length
    tabla(ws, 4, [etq, 'Casos', 'Valor devuelto', '% del valor', 'Participación'], items.map((x, i) => {
      const p = tot ? x.valor / tot : 0
      return [x.name, x.casos, x.valor, { formula: `IF(SUM(C$${ini}:C$${fin})=0,0,C${ini + i}/SUM(C$${ini}:C$${fin}))`, result: p }, { formula: `REPT("█",ROUND(D${ini + i}*40,0))`, result: '█'.repeat(Math.round(p * 40)) }]
    }), [undefined, n0, n0, '0.0%'])
    items.forEach((_, i) => { ws.getCell(ini + i, 5).font = { color: { argb: NAVY } } })
    const t = ws.getRow(fin + 1); t.getCell(1).value = 'TOTAL'; t.getCell(2).value = { formula: `SUM(B${ini}:B${fin})`, result: items.reduce((a, x) => a + x.casos, 0) }; t.getCell(3).value = { formula: `SUM(C${ini}:C${fin})`, result: tot }
    ;[1, 2, 3].forEach(c => { const x = t.getCell(c); x.font = { bold: true }; x.fill = fill('FFE2E8F0'); if (c > 1) x.numFmt = n0 })
  }
  rank('Por motivo', 'Devoluciones por motivo', resumen(m.R, (r: any) => motLabel(r.motivos_devolucion)), 'Motivo')
  rank('Por cliente', 'Devoluciones por cliente', resumen(m.R, (r: any) => cliTxt(r?.clientes)), 'Cliente')
  rank('Por vendedor', 'Devoluciones por vendedor', resumen(m.R, (r: any) => r.vendedores?.nombre), 'Vendedor')
  rank('Por televenta', 'Devoluciones por televenta', resumen(m.R.filter((r: any) => r.televenta_id), (r: any) => r.televentas?.nombre), 'Televenta')
  rank('Por ruta', 'Devoluciones por ruta', resumen(m.R, (r: any) => r.rutas?.nombre), 'Ruta')

  // ---- Tendencias
  const td = wb.addWorksheet('Por día', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] }); banda(td, 'Tendencia diaria', 5); anchos(td, [16, 12, 18, 12, 14])
  const dias = Array.from(new Set(m.R.map((r: any) => r.fecha))).sort() as string[]
  tabla(td, 4, ['Fecha', 'Casos', 'Valor devuelto', 'Cerrados', 'Efectividad'], dias.map((d, i) => { const rr = m.R.filter((r: any) => r.fecha === d), ce = rr.filter((r: any) => r.estado === 'cerrado').length
    return [d, rr.length, rr.reduce((a: number, r: any) => a + Number(r.monto || 0), 0), ce, { formula: `IF(B${5 + i}=0,0,D${5 + i}/B${5 + i})`, result: rr.length ? ce / rr.length : 0 }] }), [undefined, n0, n0, n0, '0.0%'])
  const th = wb.addWorksheet('Por hora', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] }); banda(th, 'Llamadas recibidas por hora del día', 3); anchos(th, [14, 14, 44])
  const horas = byKey(grp(m.R, (r: any) => horaCR(r.created_at).slice(0, 2) + ':00')), mx = Math.max(...horas.map(x => x.value), 1)
  tabla(th, 4, ['Hora', 'Llamadas', 'Distribución'], horas.map((x, i) => [x.name, x.value, { formula: `REPT("█",ROUND(B${5 + i}/MAX(B$5:B$${4 + horas.length})*40,0))`, result: '█'.repeat(Math.round(x.value / mx * 40)) }]), [undefined, n0])
  horas.forEach((_, i) => { th.getCell(5 + i, 3).font = { color: { argb: NAVY } } })

  // ---- Recuperación económica
  const rc = wb.addWorksheet('Recuperación', { views: [{ showGridLines: false }] }); banda(rc, 'Recuperación económica', 6); anchos(rc, [24, 16, 36, 28, 16, 16])
  const porTipo = Object.keys(TIPOS_REC).map(t => { const x = m.rec.filter((r: any) => r.tipo === t); return [TIPOS_REC[t], x.reduce((a: number, r: any) => a + Number(r.monto_perdida), 0), x.reduce((a: number, r: any) => a + Number(r.monto_recuperado), 0)] }).filter(r => r[1] || r[2])
  titSec(rc, 4, 'Por tipo de recuperación')
  const f1 = tabla(rc, 5, ['Tipo', 'Pérdida', 'Recuperado', '% Recuperación'], porTipo.map((r, i) => [r[0], r[1], r[2], { formula: `IF(B${6 + i}=0,0,C${6 + i}/B${6 + i})`, result: r[1] ? (r[2] as number) / (r[1] as number) : 0 }]), [undefined, n0, n0, '0.0%'])
  titSec(rc, f1 + 1, 'Detalle')
  tabla(rc, f1 + 2, ['Fecha', 'Caso', 'Cliente', 'Tipo', 'Pérdida', 'Recuperado'], m.rec.map((r: any) => [r.created_at.slice(0, 10), r.casos?.numero, cliTxt(r?.clientes), TIPOS_REC[r.tipo], Number(r.monto_perdida), Number(r.monto_recuperado)]), [undefined, undefined, undefined, undefined, n0, n0])

  // ---- Canastas
  const cn = wb.addWorksheet('Canastas', { views: [{ showGridLines: false }] }); banda(cn, 'Control de canastas retornables', 7); anchos(cn, [14, 34, 24, 22, 12, 12, 12])
  const porRuta = (key: (r: any) => any) => { const e = grp(m.K, key, (r: any) => r.entregada), re = grp(m.K, key, (r: any) => r.recuperada); return e.map(x => [x.name, x.value, re.find(y => y.name === x.name)?.value || 0]) }
  const bloque = (fila: number, tit: string, etq: string, filas: any[][]) => { titSec(cn, fila, tit); return tabla(cn, fila + 1, [etq, 'Entregadas', 'Recuperadas', '% Recuperación'], filas.map((r, i) => [r[0], r[1], r[2], { formula: `IF(B${fila + 2 + i}=0,0,C${fila + 2 + i}/B${fila + 2 + i})`, result: r[1] ? r[2] / r[1] : 0 }]), [undefined, n0, n0, '0.0%']) }
  const g1 = bloque(4, 'Recuperación por ruta', 'Ruta', porRuta((r: any) => r.rutas?.nombre)); const g2 = bloque(g1 + 1, 'Recuperación por chofer', 'Chofer', porRuta((r: any) => r.chofer))
  titSec(cn, g2 + 1, 'Detalle')
  tabla(cn, g2 + 2, ['Fecha', 'Cliente', 'Ruta', 'Chofer', 'Entregadas', 'Recuperadas', 'Pendientes'], m.K.map((r: any) => [r.fecha, cliTxt(r?.clientes), r.rutas?.nombre, r.chofer, r.entregada, r.recuperada, r.pendiente]), [undefined, undefined, undefined, undefined, n0, n0, n0])

  // ---- Casos abiertos
  const ab = wb.addWorksheet('Casos abiertos', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] }); banda(ab, 'Casos abiertos (más antiguos primero)', 8); anchos(ab, [14, 14, 34, 52, 16, 20, 14, 16])
  tabla(ab, 4, ['Caso', 'Fecha', 'Cliente', 'Motivo', 'Área', 'Estado', 'Días abiertos', 'Valor'], abiertos.map((r: any) => [r.numero, r.fecha, cliTxt(r?.clientes), motLabel(r.motivos_devolucion), AREAS_CORTO[areaDe(r)], ESTADOS[r.estado], Math.floor((Date.now() - +new Date(r.created_at)) / 864e5), Number(r.monto || 0)]), [undefined, undefined, undefined, undefined, undefined, undefined, n0, n0])

  // ---- Detalle de casos
  const dt = wb.addWorksheet('Casos (detalle)', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] }); banda(dt, 'Registro completo de casos', 17)
  anchos(dt, [14, 12, 8, 32, 22, 22, 18, 18, 46, 16, 14, 24, 10, 14, 20, 9, 14])
  const heads = ['Caso', 'Fecha', 'Hora', 'Cliente', 'Televenta', 'Vendedor', 'Ruta', 'Chofer', 'Motivo', 'Área', 'Factura', 'Producto', 'Cantidad', 'Monto', 'Estado', 'Crítico', 'Horas a cierre']
  const filas = [...m.R].sort((a: any, b: any) => (b.fecha + b.created_at).localeCompare(a.fecha + a.created_at)).map((r: any) => [r.numero, r.fecha, horaCR(r.created_at), cliTxt(r?.clientes), r.televentas?.nombre, r.vendedores?.nombre, r.rutas?.nombre, r.chofer, motLabel(r.motivos_devolucion), AREAS_CORTO[areaDe(r)], r.factura, r.producto, r.cantidad == null ? null : Number(r.cantidad), Number(r.monto || 0), ESTADOS[r.estado], r.critico ? 'Sí' : '', r.fecha_cierre ? Math.round((+new Date(r.fecha_cierre) - +new Date(r.created_at)) / 36e5 * 10) / 10 : null])
  const fd = tabla(dt, 4, heads, filas, [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, n0, n0, undefined, undefined, '0.0'])
  if (filas.length) { dt.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + filas.length, column: heads.length } }
    const t = dt.getRow(fd); t.getCell(1).value = 'TOTAL'; t.getCell(14).value = { formula: `SUBTOTAL(109,N5:N${fd - 1})`, result: m.valor }; t.getCell(14).numFmt = n0; t.getCell(13).value = ''
    for (let c = 1; c <= heads.length; c++) { t.getCell(c).font = { bold: true }; t.getCell(c).fill = fill('FFE2E8F0') } }
  wb.eachSheet(ws => { ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } })
  return Buffer.from(await wb.xlsx.writeBuffer())
}

/* ================================ PDF ================================ */
export function construirPdf(m: M, logo: Buffer | null, abiertos: any[]): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }), W = 210, MG = 14, AN = W - 2 * MG
  const NV: [number, number, number] = [11, 30, 56], OR: [number, number, number] = [243, 156, 31], GR: [number, number, number] = [100, 116, 139]
  const corta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
  // encabezado
  doc.setFillColor(...NV); doc.rect(0, 0, W, 30, 'F'); doc.setFillColor(...OR); doc.rect(0, 30, W, 1.2, 'F')
  if (logo) { const s = pngSize(logo), w = 46; doc.addImage('data:image/png;base64,' + logo.toString('base64'), 'PNG', MG, 5.5, w, w * s.h / s.w) }
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('Informe gerencial', W - MG, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Devoluciones, canastas y recuperación económica', W - MG, 20, { align: 'right' }); doc.text(`Período: ${m.periodo}  ·  Generado: ${m.H0}`, W - MG, 25, { align: 'right' })
  // tarjetas KPI
  const dlt = (d: number | null, u = '%') => (d == null ? '' : `${d > 0 ? '+' : ''}${d}${u} vs. período anterior`)
  const cards: [string, string, string, number | null][] = [
    ['Valor devuelto', sp(m.valor), `${sp(m.total)} casos`, delta(m.valor, m.pValor)], ['Efectividad de cierre', `${m.efect}%`, `${m.cerr} de ${m.total} cerrados · meta ${META}%`, m.pTotal ? Math.round((m.efect - m.pEfect) * 10) / 10 : null],
    ['Monto recuperado', sp(m.recup), `de ${sp(m.perd)} en pérdidas`, delta(m.recup, m.pRecup)], ['% Recuperación económica', `${pct(m.recup, m.perd)}%`, `No recuperado ${sp(m.perd - m.recup)}`, null],
    ['Casos abiertos', String(m.abiertos), `${m.pend} pendientes`, null], ['Tiempo prom. resolución', m.hrs == null ? '—' : m.hrs < 48 ? `${m.hrs.toFixed(1)} h` : `${(m.hrs / 24).toFixed(1)} días`, `${m.gestionadas} gestionados`, null],
    ['Canastas recuperadas', `${pct(m.kRec, m.kEnt)}%`, `${sp(m.kRec)} de ${sp(m.kEnt)}`, null], ['Canastas pendientes', sp(m.kPend), `${sp(m.kPerd)} perdidas`, null]]
  const cw = (AN - 9) / 4, ch = 25; let y = 38
  cards.forEach((c, i) => { const x = MG + (i % 4) * (cw + 3), yy = y + Math.floor(i / 4) * (ch + 3), hero = i < 4
    doc.setFillColor(...(hero ? NV : [241, 245, 249] as [number, number, number])); doc.roundedRect(x, yy, cw, ch, 1.5, 1.5, 'F'); doc.setFillColor(...OR); doc.rect(x, yy, cw, 1.1, 'F')
    doc.setTextColor(...(hero ? [203, 213, 225] : GR) as [number, number, number]); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.text(c[0], x + 3, yy + 6)
    doc.setTextColor(...(hero ? [255, 255, 255] : NV) as [number, number, number]); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(c[1], x + 3, yy + 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...(hero ? [203, 213, 225] : GR) as [number, number, number]); doc.text(corta(c[2], 44), x + 3, yy + 19)
    if (c[3] != null) { doc.setTextColor(...(i === 0 ? [203, 213, 225] : c[3] >= 0 ? [74, 222, 128] : [248, 113, 113]) as [number, number, number]); if (hero) doc.text(dlt(c[3], i === 1 ? ' pp' : '%'), x + 3, yy + 22.5) } })
  y += 2 * (ch + 3) + 3
  // lectura rápida
  doc.setTextColor(...NV); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Lectura rápida', MG, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(51, 65, 85)
  m.insights.forEach((t: string) => { const ls = doc.splitTextToSize(plano(t), AN - 5); doc.setFillColor(...OR); doc.circle(MG + 1, y - 1, 0.7, 'F'); doc.text(ls, MG + 4, y); y += ls.length * 4 + 1.2 })
  y += 3
  // rankings con barras
  const rk = (titulo: string, items: { name: string; valor: number; casos?: number }[], x: number, yy: number, w: number, usaCasos = false) => {
    doc.setTextColor(...NV); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(titulo, x, yy)
    const top6 = (usaCasos ? [...items].sort((a, b) => (b.casos || 0) - (a.casos || 0)) : items).slice(0, 6), tot = items.reduce((a, r) => a + (usaCasos ? (r.casos || 0) : r.valor), 0) || 1, mx = Math.max(...top6.map(r => usaCasos ? (r.casos || 0) : r.valor), 1)
    top6.forEach((r, i) => { const v = usaCasos ? (r.casos || 0) : r.valor, ry = yy + 6 + i * 8.5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(51, 65, 85); doc.text(`${i + 1}. ${corta(r.name, 31)}`, x, ry)
      doc.setFont('helvetica', 'bold'); doc.text(`${sp(v)}  ·  ${pct(v, tot)}%`, x + w, ry, { align: 'right' })
      doc.setFillColor(226, 232, 240); doc.roundedRect(x, ry + 1.3, w, 1.8, 0.9, 0.9, 'F'); doc.setFillColor(...NV); doc.roundedRect(x, ry + 1.3, Math.max(1.8, w * v / mx), 1.8, 0.9, 0.9, 'F') })
    if (!top6.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GR); doc.text('Sin datos', x, yy + 7) }
  }
  const nuevaPagina = (alto: number) => { if (y + alto > 280) { doc.addPage(); y = 16 } }
  nuevaPagina(70); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NV); doc.text('Diagnóstico: ¿de dónde vienen las devoluciones?', MG, y); y += 7
  const colw = (AN - 10) / 2
  rk('Por área responsable (valor)', m.porArea.filter((x: any) => x.casos).sort((a: any, b: any) => b.valor - a.valor).map((x: any) => ({ name: `${x.label} (${x.casos} casos)`, valor: x.valor })), MG, y, colw)
  rk('Motivos principales (valor)', m.pareto.map((x: any) => ({ name: x.name, valor: x.valor })), MG + colw + 10, y, colw); y += 62
  // gráfico: casos por día
  nuevaPagina(60); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NV); doc.text('Casos por día', MG, y); y += 4
  const dias = byKey(grp(m.R, (r: any) => r.fecha)), mxd = Math.max(...dias.map(d => d.value), 1), gh = 34, gy = y + 4
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); for (let i = 0; i <= 4; i++) doc.line(MG + 6, gy + gh - i * gh / 4, MG + AN, gy + gh - i * gh / 4)
  doc.setFontSize(6.5); doc.setTextColor(...GR); doc.setFont('helvetica', 'normal'); doc.text(String(mxd), MG + 4, gy + 1.5, { align: 'right' }); doc.text('0', MG + 4, gy + gh + 1, { align: 'right' })
  const bw = dias.length ? (AN - 8) / dias.length : 0, paso = Math.max(1, Math.ceil(dias.length / 14))
  dias.forEach((d, i) => { const h = gh * d.value / mxd, x = MG + 8 + i * bw; doc.setFillColor(...NV); doc.rect(x + bw * 0.15, gy + gh - h, bw * 0.7, h, 'F')
    if (i % paso === 0) doc.text(d.name.slice(5), x + bw / 2, gy + gh + 4, { align: 'center' }) })
  if (!dias.length) doc.text('Sin datos', MG + 8, gy + 10)
  y = gy + gh + 14
  // tablas
  const tb = (titulo: string, head: string[], body: any[][], fin?: Record<number, any>) => { nuevaPagina(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NV); doc.text(titulo, MG, y)
    autoTable(doc, { startY: y + 2, head: [head], body, margin: { left: MG, right: MG }, styles: { fontSize: 7.5, cellPadding: 1.8 }, headStyles: { fillColor: NV, textColor: 255 }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: fin, didParseCell: (d: any) => { if (d.section === 'head' && fin?.[d.column.index]?.halign) d.cell.styles.halign = fin[d.column.index].halign } })
    y = (doc as any).lastAutoTable.finalY + 8 }
  const imp = (items: any[]) => items.filter(x => x.imp > 0).slice(0, 8).map(x => [corta(x.name, 42), x.casos, x.imp, sp(x.valorImp)])
  const R3 = { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
  tb('Responsabilidad de ventas: vendedores (solo casos imputables a ventas)', ['Vendedor', 'Casos totales', 'Imputables', 'Valor imputable'], imp(m.vResp), R3)
  if (m.tResp.some((x: any) => x.imp > 0)) tb('Responsabilidad de ventas: televentas', ['Televenta', 'Casos totales', 'Imputables', 'Valor imputable'], imp(m.tResp), R3)
  tb('Clientes con más frecuencia', ['Cliente', 'Casos', 'Valor', 'Por causa del cliente', 'Último caso'], m.cFrec.slice(0, 8).map((x: any) => [corta(x.name, 42) + (x.casos >= 3 ? '  (reincidente)' : ''), x.casos, sp(x.valor), x.porCliente, x.ultima]), { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } })
  if (m.porInvestigar.length) tb('Casos abiertos por investigar', ['Caso', 'Cliente', 'Motivo', 'Días'], m.porInvestigar.slice(0, 8).map((r: any) => [r.numero, corta(cliTxt(r.clientes), 30), corta(motLabel(r.motivos_devolucion), 40), Math.floor((Date.now() - +new Date(r.created_at)) / 864e5)]), { 3: { halign: 'right' } })
  tb('Casos abiertos con más antigüedad', ['Caso', 'Cliente', 'Motivo', 'Estado', 'Días'], abiertos.slice(0, 10).map((r: any) => [r.numero, corta(cliTxt(r?.clientes), 28), corta(motLabel(r.motivos_devolucion), 34), ESTADOS[r.estado], Math.floor((Date.now() - +new Date(r.created_at)) / 864e5)]), { 4: { halign: 'right' } })
  const rutas = (() => { const e = grp(m.K, (r: any) => r.rutas?.nombre, (r: any) => r.entregada), re = grp(m.K, (r: any) => r.rutas?.nombre, (r: any) => r.recuperada); return e.map(x => { const rc = re.find(z => z.name === x.name)?.value || 0; return [x.name, sp(x.value), sp(rc), `${pct(rc, x.value)}%`, sp(x.value - rc)] }) })()
  if (rutas.length) tb('Canastas por ruta', ['Ruta', 'Entregadas', 'Recuperadas', '% Recuperación', 'Pendientes'], rutas, { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } })
  const tipos = Object.keys(TIPOS_REC).map(t => { const x = m.rec.filter((r: any) => r.tipo === t), p = x.reduce((a: number, r: any) => a + Number(r.monto_perdida), 0), c = x.reduce((a: number, r: any) => a + Number(r.monto_recuperado), 0); return [TIPOS_REC[t], sp(p), sp(c), `${pct(c, p)}%`] }).filter(r => r[1] !== '0' || r[2] !== '0')
  if (tipos.length) tb('Recuperación económica por tipo', ['Tipo', 'Pérdida', 'Recuperado', '% Recuperación'], tipos, { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } })
  // pie de página
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setDrawColor(226, 232, 240); doc.line(MG, 287, W - MG, 287); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GR)
    doc.text(`Belca Foodservice · Informe gerencial · ${m.periodo}`, MG, 291); doc.text(`Página ${i} de ${n}`, W - MG, 291, { align: 'right' }) }
  return doc.output('arraybuffer')
}
