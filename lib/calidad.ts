import { areaDe } from './areas'
export type Fila = { id: string; numero: string; fecha: string; cliente: string; detalle: string }
export type Chequeo = { clave: string; titulo: string; ayuda: string; filas: Fila[] }
const dias = (iso: string) => Math.floor((Date.now() - +new Date(iso)) / 864e5)
export function evaluar(casos: any[], conArchivo: Set<string>, conSeg: Set<string>, conRec: Set<string>, cli: (c: any) => string) {
  const f = (c: any, detalle: string): Fila => ({ id: c.id, numero: c.numero, fecha: c.fecha, cliente: cli(c.clientes), detalle })
  const abierto = (c: any) => !['resuelto', 'cerrado'].includes(c.estado)
  const grupos = new Map<string, any[]>()
  casos.forEach(c => { const fa = String(c.factura || '').trim().toLowerCase(), pr = String(c.producto || '').trim().toLowerCase(); if (fa && pr) { const k = fa + '|' + pr; grupos.set(k, [...(grupos.get(k) || []), c]) } })
  const dup = Array.from(grupos.values()).filter(g => g.length > 1).flatMap(g => g.map(c => f(c, `Misma factura y producto que ${g.filter(x => x.id !== c.id).map(x => x.numero).join(', ')}`)))
  const checks: Chequeo[] = [
    { clave: 'monto0', titulo: 'Monto en 0 sin justificación', ayuda: 'El motivo no está marcado como “puede ir sin monto” (p. ej. sobrante). Probablemente falta el valor.',
      filas: casos.filter(c => Number(c.monto || 0) === 0 && !c.motivos_devolucion?.permite_monto_cero).map(c => f(c, 'Monto 0')) },
    { clave: 'duplicados', titulo: 'Posibles casos duplicados', ayuda: 'Misma factura y mismo producto en más de un caso. Puede ser un doble registro.', filas: dup },
    { clave: 'sinfoto', titulo: 'Sin evidencia fotográfica', ayuda: 'El caso no tiene fotos ni archivos adjuntos.', filas: casos.filter(c => !conArchivo.has(c.id)).map(c => f(c, 'Sin archivos')) },
    { clave: 'criticoseg', titulo: 'Críticos abiertos sin seguimiento', ayuda: 'Incidencias críticas sin ningún registro en la bitácora.', filas: casos.filter(c => c.critico && abierto(c) && !conSeg.has(c.id)).map(c => f(c, 'Crítico sin bitácora')) },
    { clave: 'investigar', titulo: 'Por investigar hace más de 7 días', ayuda: 'Casos sin área responsable definida que llevan una semana o más abiertos.', filas: casos.filter(c => areaDe(c) === 'investigar' && abierto(c) && dias(c.created_at) > 7).map(c => f(c, `${dias(c.created_at)} días abierto`)) },
    { clave: 'cerradosincom', titulo: 'Cerrados sin comentario ni bitácora', ayuda: 'No queda registro de qué se hizo para resolverlos.', filas: casos.filter(c => c.estado === 'cerrado' && !String(c.observaciones || '').trim() && !conSeg.has(c.id)).map(c => f(c, 'Cerrado sin explicación')) },
    { clave: 'cerradosinrec', titulo: 'Cerrados con valor y sin recuperación registrada', ayuda: 'Causas internas con monto, cerradas sin registrar si se recuperó algo. Revise si se recuperó o si fue pérdida total.',
      filas: casos.filter(c => c.estado === 'cerrado' && Number(c.monto || 0) > 0 && ['ventas', 'logistica', 'almacen', 'calidad'].includes(areaDe(c)) && !conRec.has(c.id)).map(c => f(c, 'Sin recuperación registrada')) },
    { clave: 'sinchofer', titulo: 'Logística o almacén sin chofer', ayuda: 'Sin chofer no se puede rastrear el problema hasta quien lo origina.', filas: casos.filter(c => ['logistica', 'almacen'].includes(areaDe(c)) && !String(c.chofer || '').trim()).map(c => f(c, 'Sin chofer')) },
  ]
  const conHallazgo = new Set(checks.flatMap(c => c.filas.map(x => x.id)))
  return { checks, conHallazgo: conHallazgo.size, calidad: casos.length ? Math.round(1000 * (1 - conHallazgo.size / casos.length)) / 10 : 100 }
}
