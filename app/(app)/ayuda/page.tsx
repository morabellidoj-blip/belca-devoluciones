import { T, Box } from '@/lib/ui'
import { AREAS } from '@/lib/areas'
const Fila = ({ t, d }: { t: string; d: string }) => <div className="py-2 border-b border-slate-100 last:border-0"><p className="font-semibold text-belca-navy text-sm">{t}</p><p className="text-sm text-slate-600">{d}</p></div>
export default function Ayuda() {
  return <div className="max-w-4xl"><T>Ayuda: qué mide esta aplicación</T>
    <Box title="¿Para qué sirve?"><p className="text-sm text-slate-700 leading-relaxed">Registra cada devolución como un caso, con su cliente, motivo, monto y evidencia, y la convierte en indicadores para responder tres preguntas: <b>cuánto nos cuestan las devoluciones</b>, <b>de dónde vienen</b> y <b>qué podemos corregir</b>. Reemplaza el control manual y deja un historial completo y descargable.</p></Box>
    <Box title="Cómo registrar un caso">
      <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1.5"><li>Entre a <b>Casos → Nuevo caso</b>.</li><li>Busque el cliente escribiendo su código o nombre. Si el caso no tiene cliente (por ejemplo, un sobrante en el camión), elija <b>Sin asignar</b>. Si no existe, use <b>➕ Crear</b>.</li>
        <li>Elija el motivo: el <b>área responsable</b> se completa sola y puede cambiarla.</li><li>Escriba el <b>monto</b>. Si el caso no tiene valor (sobrante sin factura), escriba <b>0</b>.</li><li>Adjunte fotos y guarde. Luego, en el caso, registre el seguimiento y la recuperación hasta cerrarlo.</li></ol></Box>
    <Box title="Áreas responsables">
      <p className="text-sm text-slate-600 mb-2">Cada devolución se atribuye a un área según su motivo. Así, un sobrante o un producto vencido no se le cuenta al vendedor.</p>
      {Object.entries(AREAS).map(([k, v]) => <Fila key={k} t={v} d={{ ventas: 'Errores de facturación, digitación, precio o pedido. Es la única área que cuenta contra vendedores y televentas.', logistica: 'Problemas de transporte y entrega.', almacen: 'Faltantes, sobrantes y errores de despacho o picking.', calidad: 'Producto vencido, mal etiquetado o con diferencias de peso.', cliente: 'Negocio cerrado, sin dinero, rechazo u otros motivos del cliente.', investigar: 'Aún no se sabe. Al concluir la investigación, cambie el área en el caso.' }[k] as string} />)}</Box>
    <Box title="Checks de error: ¿quién se equivocó?">
      <p className="text-sm text-slate-600 mb-2">Al registrar un caso se marcan las casillas de <b>error del cliente, de ventas, de televentas o del chofer</b>. Hay también casillas para <b>almacén</b> y <b>PIMA</b>. Se sugieren según el área y se pueden cambiar; si fue de calidad u otra causa, se dejan sin marcar.</p>
      <Fila t="Casos de una persona" d="Todas las devoluciones asociadas a ese vendedor, televenta, chofer o cliente: mide quién envía más casos." />
      <Fila t="Errores de una persona" d="Las que se marcaron como error suyo: mide quién se equivoca más. El % de error es sobre sus propios casos." />
      <Fila t="Choferes: reportes e incidencias" d="El chofer suele ser quien llama para reportar. Sus “reportes” son todos los casos registrados con él, sea cual sea la causa; sus “incidencias propias” son solo los marcados como error del chofer. La tabla de choferes muestra cuántos reportes fueron por vendedor, cliente, televentas o error suyo." />
      <Fila t="Importante" d="Para que un error cuente a alguien, el caso debe tener asignada esa persona. La pantalla Calidad de datos lista los errores marcados sin persona." /></Box>
    <Box title="Cómo se calculan los indicadores">
      <Fila t="Valor devuelto" d="Suma del monto de los casos del período. Los sobrantes sin factura suman 0." />
      <Fila t="Efectividad de cierre" d="(Casos cerrados ÷ casos recibidos) × 100. Se compara con la meta, que el administrador define en Administración." />
      <Fila t="Monto recuperado y % de recuperación" d="Lo recuperado (reventa, cobro, transportista, proveedor, interna) ÷ lo registrado como pérdida." />
      <Fila t="Valor evitable" d="Valor de los casos cuya causa es interna: ventas, logística, almacén y calidad. La proyección mensual lo extiende a 30 días al ritmo del período." />
      <Fila t="Imputables a ventas" d="Casos del área Ventas. Es lo que se atribuye a cada vendedor o televenta." />
      <Fila t="Cliente reincidente" d="Cliente con 3 o más casos en el período." />
      <Fila t="Pareto de motivos" d="Motivos ordenados por valor con su porcentaje acumulado: muestra los pocos motivos que concentran el 80% de la pérdida." />
      <Fila t="Comparación contra el período anterior" d="Se compara con un período de la misma duración justo antes del seleccionado." />
      <Fila t="Canastas: % de recuperación" d="Canastas recuperadas ÷ canastas entregadas." /></Box>
    <Box title="Otras herramientas"><ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
      <li><b>Calidad de datos:</b> lista los casos con montos dudosos, duplicados, sin fotos o cerrados sin explicación.</li>
      <li><b>Informe semanal:</b> una hoja con el resumen de la semana, con navegación entre semanas, una nota para gerencia y descarga en PDF listo para enviar.</li>
      <li><b>Descargas:</b> en el Dashboard, los botones Excel y PDF entregan el informe del período que esté viendo.</li>
      <li><b>Alertas y Teams:</b> avisos de casos críticos, sin gestión o canastas atrasadas, y un resumen semanal cada lunes.</li>
      <li><b>Buscador:</b> en Casos puede buscar por número, factura, producto o chofer.</li></ul></Box>
    <Box title="Buenas prácticas"><ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5"><li>Registre el caso el mismo día y con foto.</li><li>No deje casos en “Por investigar”: al concluir, corrija el área.</li><li>Registre siempre la recuperación al cerrar, aunque sea 0.</li><li>Revise <b>Calidad de datos</b> una vez por semana.</li></ul></Box></div>
}
