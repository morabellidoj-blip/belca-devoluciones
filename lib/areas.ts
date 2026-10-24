export const AREAS: Record<string, string> = { ventas: 'Ventas (vendedor / televentas)', logistica: 'Logística y transporte', almacen: 'Almacén y despacho', calidad: 'Calidad / producto', cliente: 'Cliente', investigar: 'Por investigar' }
export const AREAS_CORTO: Record<string, string> = { ventas: 'Ventas', logistica: 'Logística', almacen: 'Almacén', calidad: 'Calidad', cliente: 'Cliente', investigar: 'Por investigar' }
export const AREA_OPC: string[][] = Object.entries(AREAS)
export const areaDe = (r: any): string => r?.area || r?.motivos_devolucion?.area || 'investigar'
