import type { Nuevo } from './combo'
import { AREA_OPC } from './areas'
export const NCLI: Nuevo = { tabla: 'clientes', titulo: 'cliente', campos: [{ n: 'codigo', l: 'Código (opcional; si lo deja vacío se asigna uno provisional)' }, { n: 'nombre', l: 'Nombre', req: true }] }
export const NMOT: Nuevo = { tabla: 'motivos_devolucion', titulo: 'motivo', campos: [{ n: 'codigo', l: 'Código', req: true }, { n: 'nombre', l: 'Descripción del motivo', req: true }, { n: 'area', l: 'Área responsable', opciones: AREA_OPC }] }
export const NVEN: Nuevo = { tabla: 'vendedores', titulo: 'vendedor', campos: [{ n: 'nombre', l: 'Nombre', req: true }] }
export const NRUT: Nuevo = { tabla: 'rutas', titulo: 'ruta', campos: [{ n: 'nombre', l: 'Nombre de la ruta', req: true }] }
export const NCHO: Nuevo = { tabla: 'choferes', titulo: 'chofer', campos: [{ n: 'nombre', l: 'Nombre', req: true }] }
export const ntele = (vendedores: string[][]): Nuevo => ({ tabla: 'televentas', titulo: 'televenta', campos: [{ n: 'nombre', l: 'Nombre', req: true }, { n: 'telefono', l: 'Número' }, { n: 'correo', l: 'Correo' }, { n: 'vendedor_id', l: 'Vendedor', opciones: vendedores }] })
