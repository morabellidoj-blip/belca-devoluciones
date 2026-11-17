export const RESULTADOS_MERCADERIA: Record<string,string> = {
 pendiente: 'Pendiente de definir', cliente_conserva: 'El cliente conservó la mercadería', devolucion_total: 'Devolución total', devolucion_parcial: 'Devolución parcial', reprogramada: 'Entrega reprogramada', almacen: 'Recibida en almacén', otra_solucion: 'Otra solución documentada'
}
export const RESULTADOS_ECONOMICOS: Record<string,string> = { pendiente: 'Pendiente de definir', sin_perdida: 'Sin pérdida económica', recuperado: 'Recuperación total', parcial: 'Recuperación parcial', perdida: 'Pérdida total' }
export const RESPONSABILIDADES: Record<string,string> = { investigar: 'Por investigar', preliminar: 'Responsabilidad preliminar', confirmada: 'Responsabilidad confirmada', no_aplica: 'No aplica / sin error atribuible' }
export const ACCIONES: Record<string,string> = { contacto_cliente: 'Contacté al cliente', contacto_televenta: 'Contacté a televentas', contacto_vendedor: 'Contacté al vendedor', reporte_area: 'Reporté al área responsable', coordinacion_transporte: 'Coordiné con transporte', coordinacion_almacen: 'Coordiné con almacén', validacion: 'Validé factura o pedido', nota_credito: 'Solicité nota de crédito', confirmacion: 'Confirmé la solución', otra: 'Otra gestión' }
export function retornoSeguro(value: unknown, fallback = '/informe') {
 if (typeof value !== 'string' || !/^\/(informe|dashboard|semanal|casos)(?:[?#]|$)/.test(value) || /[\\\r\n]/.test(value)) return fallback
 return value
}
export function errorCierre(c: { estado: string; gestion_resumen?: string | null; resultado_mercaderia?: string | null; resultado_economico?: string | null }) {
 if (c.estado !== 'cerrado') return null
 if (!c.gestion_resumen?.trim()) return 'Para cerrar, describa la gestión realizada y la solución.'
 if (!c.resultado_mercaderia || c.resultado_mercaderia === 'pendiente') return 'Para cerrar, indique qué ocurrió con la mercadería.'
 if (!c.resultado_economico || c.resultado_economico === 'pendiente') return 'Para cerrar, indique el resultado económico.'
 return null
}
