import { redirect } from 'next/navigation'
import { ctx, cat, g, num, subir } from '@/lib/data'
import { Combo } from '@/lib/combo'
import { TeleVend } from '@/lib/televend'
import { MotivoArea } from '@/lib/motivoarea'
import { NCLI, NMOT, NCHO, NRUT, NVEN, ntele } from '@/lib/nuevos'
import { cliLabel, T, I, S, A, F, B, hoy, motLabel } from '@/lib/ui'
async function crear(fd: FormData) {
  'use server'
  const { sb } = await ctx()
  const { data, error } = await sb.from('casos').insert({ fecha: g(fd, 'fecha') || hoy(), cliente_id: g(fd, 'cliente_id'), vendedor_id: g(fd, 'vendedor_id'), ruta_id: g(fd, 'ruta_id'),
    ...(g(fd, 'televenta_id') ? { televenta_id: g(fd, 'televenta_id') } : {}),
    chofer: g(fd, 'chofer'), factura: g(fd, 'factura'), producto: g(fd, 'producto'),
    cantidad: num(fd, 'cantidad'), monto: num(fd, 'monto'), motivo_id: g(fd, 'motivo_id'), estado: g(fd, 'estado') || 'nuevo', area: g(fd, 'area') || 'investigar',
    observaciones: g(fd, 'observaciones'), critico: fd.get('critico') === 'on' }).select('id').single()
  if (error) throw new Error(error.message)
  await subir(sb, fd, 'fotos', { caso_id: data.id }, 'foto'); await subir(sb, fd, 'firma', { caso_id: data.id }, 'firma')
  redirect(`/casos/${data.id}`)
}
export default async function Nuevo() {
  const { sb } = await ctx(); const c = await cat(sb)
  const vend = c.vendedores.map((x: any) => [x.id, x.nombre])
  return <form action={crear} className="bg-white rounded-xl p-6 max-w-4xl grid sm:grid-cols-2 gap-4">
    <div className="sm:col-span-2"><T>Nuevo caso</T><p className="text-sm text-slate-500 -mt-3">Si un cliente, motivo, chofer, vendedor, ruta o televenta no existe, escríbalo y use <b>➕ Crear</b> al final de la lista. Vendedor, televenta y cliente son opcionales: complételos solo si el caso se originó en la venta; <b>el área responsable</b> es la que define a quién se le atribuye.</p></div>
    <I n="fecha" l="Fecha" type="date" def={hoy()} />
    <Combo name="cliente_id" label="Cliente (escriba código o nombre)" required vacio="Sin asignar" nuevo={NCLI} options={c.clientes.map((x: any) => [x.id, cliLabel(x)])} />
    <TeleVend televentas={c.televentas} vendedores={vend} nTele={ntele(vend)} nVend={NVEN} />
    <Combo name="ruta_id" label="Ruta" nuevo={NRUT} options={c.rutas.map((x: any) => [x.id, x.nombre])} />
    <Combo name="chofer" label="Chofer" nuevo={NCHO} options={c.choferes.map((x: any) => [x.nombre, x.nombre])} />
    <I n="factura" l="Factura" /><I n="producto" l="Producto" />
    <I n="cantidad" l="Cantidad" type="number" /><I n="monto" l="Monto" type="number" />
    <MotivoArea nMot={NMOT} motivos={c.motivos.map((x: any) => ({ id: x.id, label: motLabel(x), area: x.area }))} />
    <S n="estado" l="Estado" def="nuevo" o={[['nuevo', 'Nuevo'], ['en_proceso', 'En proceso'], ['pendiente_cliente', 'Pendiente cliente'], ['pendiente_logistica', 'Pendiente logística']]} />
    <label className="flex items-center gap-2 text-sm sm:mt-7"><input type="checkbox" name="critico" /> Incidencia crítica</label>
    <A n="observaciones" l="Observaciones" cls="sm:col-span-2" />
    <F n="fotos" l="Fotografías" /><F n="firma" l="Firma (opcional, foto)" multiple={false} />
    <div className="sm:col-span-2"><B>Guardar caso</B></div></form>
}
