import { T, Box, I, S } from '@/lib/ui'
const REPORTES: [string, string][] = [['abiertos', 'Casos abiertos'], ['cerrados', 'Casos cerrados'], ['por_cliente', 'Casos por cliente'], ['por_vendedor', 'Casos por vendedor'],
  ['por_ruta', 'Casos por ruta'], ['por_motivo', 'Casos por motivo'], ['recuperacion', 'Recuperación económica'], ['canastas', 'Canastas'], ['llamadas', 'Llamadas']]
export default function Reportes() {
  return <div><T>Reportes</T>
    <form action="/api/reporte" method="get" className="bg-white rounded-xl p-4 grid sm:grid-cols-5 gap-3 items-end max-w-4xl">
      <S n="tipo" l="Reporte" req def="abiertos" o={REPORTES} /><I n="desde" l="Desde" type="date" /><I n="hasta" l="Hasta" type="date" />
      <S n="fmt" l="Formato" req def="xlsx" o={[['xlsx', 'Excel'], ['pdf', 'PDF'], ['csv', 'CSV']]} /><button className="btn">Descargar</button></form></div>
}
