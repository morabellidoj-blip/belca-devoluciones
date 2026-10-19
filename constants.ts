export const AREAS = ['Ventas','Televenta','SAC','Supervisión','Supervisión Transporte','Jefe de Transportes'] as const
// Áreas con datos precargados en el formulario (se pueden editar si otra persona crea la solicitud) y con opción de asignar a un responsable
export const PERFIL_AREA: Record<string, { nombre: string; telefono: string; correo: string }> = { 'Supervisión Transporte': { nombre: 'Johnny Alfaro Murillo', telefono: '6394 0612', correo: 'johnny.alfaro@grupocissa.com' } }
export const AREAS_ASIGNAN: readonly string[] = ['Jefe de Transportes', 'Supervisión Transporte']
export const PRIORIDADES = ['Crítica','Alta','Media','Baja'] as const
export const ESTADOS = ['Nuevo','En revisión','Pendiente información','Resuelto','Vencido'] as const
export const CATALOGO: Record<string,string[]> = {
  'Cambios de ruta': ['Mover cliente de ruta','Agregar cliente a ruta','Quitar cliente de ruta','Cambio de orden de entrega','Entrega urgente','Entrega adicional con otra ruta'],
  'Gestión de clientes': ['Cambio de dirección','Cambio de horario','Cliente prioritario','Reprogramación de cliente','Cliente con cita programada'],
  'Incidencias operativas': ['Retraso de entrega','Cliente cerrado','Problema de acceso','Problema de facturación','Incidencia de entrega','Solicitud operativa'],
  'Quejas y seguimiento': ['Queja de chofer','Queja de servicio','Escalamiento comercial','Retroalimentación operativa'],
  'Consultas': ['Estado de entrega','Evidencia de entrega','Confirmación de visita','Consulta general'],
}
export const TZ = 'America/Costa_Rica'
export const hoyCR = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })
// Corte operativo: 5:00 PM hora Costa Rica (UTC-6, sin horario de verano)
export const corteDe = (fecha: string) => new Date(`${fecha}T17:00:00-06:00`)
