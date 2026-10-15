import { redirect } from 'next/navigation'
import { ctx, cat, g, num, subir } from '@/lib/data'
import { T, I, S, A, F, B, opts, hoy, motLabel } from '@/lib/ui'
async function crear(fd: FormData) {
  'use server'
  const { sb } = await ctx()
  const { data, error } = await sb.from('casos').insert({ fecha: g(fd, 'fecha') || hoy(), cliente_id: g(fd, 'cliente_id'), vendedor_id: g(fd, 'vendedor_id'), ruta_id: g(fd, 'ruta_id'),
    chofer: g(fd, 'chofer'), factura: g(fd, 'factura'), producto: g(fd, 'producto'),
    cantidad: num(fd, 'cantidad'), monto: num(fd, 'monto'), motivo_id: g(fd, 'motivo_id'), estado: g(fd, 'estado') || 'nuevo',
    observaciones: g(fd, 'observaciones'), critico: fd.get('critico') === 'on' }).select('id').single()
  if (error) throw new Error(error.message)
  await subir(sb, fd, 'fotos', { caso_id: data.id }, 'foto'); await subir(sb, fd, 'firma', { caso_id: data.id }, 'firma')
  redirect(`/casos/${data.id}`)
}
export default async function Nuevo() {
  const { sb } = await ctx(); const c = await cat(sb)
  return <form action={crear} className="bg-white rounded-xl p-6 max-w-4xl grid sm:grid-cols-2 gap-4">
    <div className="sm:col-span-2"><T>Nuevo caso</T></div>
    <I n="fecha" l="Fecha" type="date" def={hoy()} />
    <S n="cliente_id" l="Cliente (código · nombre)" req o={opts(c.clientes, x => `${x.codigo} · ${x.nombre}`)} />
    <S n="vendedor_id" l="Vendedor" o={opts(c.vendedores, x => x.nombre)} /><S n="ruta_id" l="Ruta" o={opts(c.rutas, x => x.nombre)} />
    <I n="chofer" l="Chofer" /><I n="factura" l="Factura" />
    <I n="producto" l="Producto" /><I n="cantidad" l="Cantidad" type="number" />
    <I n="monto" l="Monto" type="number" /><S n="motivo_id" l="Motivo de devolución" req o={opts(c.motivos, x => motLabel(x))} />
    <S n="estado" l="Estado" def="nuevo" o={[['nuevo', 'Nuevo'], ['en_proceso', 'En proceso'], ['pendiente_cliente', 'Pendiente cliente'], ['pendiente_logistica', 'Pendiente logística']]} />
    <div />
    <A n="observaciones" l="Observaciones" cls="sm:col-span-2" />
    <F n="fotos" l="Fotografías" /><F n="firma" l="Firma (opcional, foto)" multiple={false} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="critico" /> Incidencia crítica</label>
    <div className="sm:col-span-2"><B>Guardar caso</B></div></form>
}
