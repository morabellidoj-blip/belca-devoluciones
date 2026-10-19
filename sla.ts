// Operación 24/7: el SLA corre desde el momento exacto de creación, sin horarios ni corte.
export const HORAS_SLA: Record<string, number> = { Crítica: 1, Alta: 2, Media: 8, Baja: 24 }
export const OBJETIVO: Record<string, string> = { Crítica: '1 hora', Alta: '2 horas', Media: '8 horas', Baja: '24 horas' }
export const ORDEN = ['Baja', 'Media', 'Alta', 'Crítica']
export const PRIO_TIPO: Record<string, string> = {
  'Entrega urgente': 'Crítica',
  'Retraso de entrega': 'Alta', 'Cliente cerrado': 'Alta', 'Problema de acceso': 'Alta', 'Problema de facturación': 'Alta', 'Incidencia de entrega': 'Alta',
  'Mover cliente de ruta': 'Media', 'Agregar cliente a ruta': 'Media', 'Quitar cliente de ruta': 'Media', 'Cambio de orden de entrega': 'Media', 'Entrega adicional con otra ruta': 'Media', 'Cliente prioritario': 'Media',
  'Reprogramación de cliente': 'Media', 'Cliente con cita programada': 'Media', 'Solicitud operativa': 'Media',
  'Cambio de dirección': 'Media', 'Cambio de horario': 'Media', 'Queja de chofer': 'Media', 'Queja de servicio': 'Media', 'Escalamiento comercial': 'Media',
  'Retroalimentación operativa': 'Baja', 'Estado de entrega': 'Baja', 'Evidencia de entrega': 'Baja', 'Confirmación de visita': 'Baja', 'Consulta general': 'Baja',
}
// La prioridad nunca queda por debajo de la que corresponde al tipo (ej. Entrega urgente siempre es Crítica)
export const prioFinal = (elegida: string, tipo: string) => { const min = PRIO_TIPO[tipo] ?? 'Media'; return ORDEN.indexOf(elegida) >= ORDEN.indexOf(min) ? elegida : min }
export const medicion = (now: Date) => ({ inicio: now, fuera: false })
export const slaDue = (prio: string, inicio: Date) => new Date(inicio.getTime() + (HORAS_SLA[prio] ?? 8) * 36e5)
