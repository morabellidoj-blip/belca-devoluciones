import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { escritura, ctx, cat, g, num, subir, urls } from '@/lib/data'
import { Combo } from '@/lib/combo'
import { AREAS, AREA_OPC, areaDe } from '@/lib/areas'
import { RESULTADOS_MERCADERIA, RESULTADOS_ECONOMICOS, RESPONSABILIDADES, ACCIONES, retornoSeguro } from '@/lib/gestion'
import { ConfirmButton } from '@/lib/cerrar'
import { Errores, T, Box, Grid, I, S, A, F, B, Tbl, Badge, ESTADOS, TIPOS_REC, fmt, cliLabel, horaCR, motLabel } from '@/lib/ui'
export const dynamic = 'force-dynamic'
const fechaCR = (v: string | null) => v ? new Date(v).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' }) : '—'
function destino(fd: FormData, error?: string) { return `/casos/${g(fd,'id')}?${new URLSearchParams({ volver: retornoSeguro(g(fd,'volver')), ...(error ? {err:error} : {ok:'1'}) })}` }
async function actualizar(fd: FormData) {
 'use server'
 const { sb } = await escritura(); const id = g(fd,'id')!
 const upd = { fecha:g(fd,'fecha'), cliente_id:g(fd,'cliente_id'), vendedor_id:g(fd,'vendedor_id'), televenta_id:g(fd,'televenta_id'), ruta_id:g(fd,'ruta_id'), chofer:g(fd,'chofer'), factura:g(fd,'factura'), producto:g(fd,'producto'), cantidad:num(fd,'cantidad'), monto:num(fd,'monto'), motivo_id:g(fd,'motivo_id'), estado:g(fd,'estado') || 'nuevo', area:g(fd,'area') || 'investigar', responsabilidad_estado:g(fd,'responsabilidad_estado'), gestion_resumen:g(fd,'gestion_resumen'), resultado_mercaderia:g(fd,'resultado_mercaderia'), resultado_economico:g(fd,'resultado_economico'), observaciones:g(fd,'observaciones'), critico:fd.has('critico'), ...Object.fromEntries(['error_cliente','error_ventas','error_televentas','error_chofer','error_almacen','error_pima'].map(k=>[k,fd.has(k)])) }
 if (upd.monto < 0 || upd.cantidad < 0) redirect(destino(fd,'El monto y la cantidad deben ser mayores o iguales a cero.'))
 const {error} = await sb.from('casos').update(upd).eq('id',id)
 revalidatePath('/','layout'); redirect(destino(fd,error?.message))
}
async function seguimiento(fd: FormData) {
 'use server'
 const {sb} = await escritura()
 if (!g(fd,'comentario')?.trim()) redirect(destino(fd,'Describa la gestión realizada.'))
 const accion = ACCIONES[g(fd,'accion') || '']; if (!accion) redirect(destino(fd,'Elija una acción válida.'))
 const {error} = await sb.from('seguimientos').insert({caso_id:g(fd,'id'), comentario:g(fd,'comentario'), accion, contacto:g(fd,'contacto'), respuesta:g(fd,'respuesta'), proximo_paso:g(fd,'proximo_paso'), fecha_compromiso:g(fd,'fecha_compromiso')})
 revalidatePath('/','layout'); redirect(destino(fd,error?.message))
}
async function recuperacion(fd: FormData) {
 'use server'
 const {sb} = await escritura(); const id=g(fd,'id')!
 const {data:c,error:ce} = await sb.from('casos').select('cliente_id,monto').eq('id',id).single()
 if (ce || !c) redirect(destino(fd,'No se pudo consultar el caso.'))
 const perdida = g(fd,'monto_perdida') ? num(fd,'monto_perdida') : Number(c.monto || 0), monto=num(fd,'monto_recuperado')
 if (perdida<0 || monto<0) redirect(destino(fd,'Los montos no pueden ser negativos.'))
 const {error} = await sb.from('recuperaciones').insert({caso_id:id,cliente_id:c.cliente_id,monto_perdida:perdida,monto_recuperado:monto,tipo:g(fd,'tipo')})
 revalidatePath('/','layout'); redirect(destino(fd,error?.message))
}
async function archivo(fd: FormData) {
 'use server'
 const {sb}=await escritura(); let error:string|undefined
 try { await subir(sb,fd,'archivo',{caso_id:g(fd,'id')!},g(fd,'tipo') || 'foto') } catch(e) { error=e instanceof Error?e.message:'No se pudo subir el archivo.' }
 revalidatePath(`/casos/${g(fd,'id')}`); redirect(destino(fd,error))
}
async function borrar(fd: FormData) {
 'use server'
 const {sb,admin}=await escritura(); if (!admin) throw new Error('Solo administradores')
 const {error}=await sb.from('casos').delete().eq('id',g(fd,'id')); if(error) redirect(destino(fd,error.message)); redirect('/informe')
}
export default async function Caso({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<any>}) {
 const {id}=await params, sp=await searchParams, volver=retornoSeguro(sp.volver)
 const {sb,admin,puedeEditar}=await ctx()
 const {data:c,error}=await sb.from('casos').select('*,clientes(codigo,nombre),vendedores(nombre),televentas(nombre),rutas(nombre),motivos_devolucion(codigo,nombre,area),gestor:profiles!casos_gestor_id_fkey(nombre),cierre:profiles!casos_responsable_cierre_fkey(nombre)').eq('id',id).single()
 if(error || !c) return <Box title="No se pudo abrir el caso"><p>{error?.message || 'Caso no encontrado.'}</p><Link href={volver} className="underline">Volver al informe</Link></Box>
 const [{data:seg},{data:rec},{data:arch},catalogos]=await Promise.all([sb.from('seguimientos').select('*,profiles(nombre)').eq('caso_id',id).order('created_at',{ascending:false}),sb.from('recuperaciones').select('*').eq('caso_id',id).order('created_at'),sb.from('archivos').select('*').eq('caso_id',id).order('created_at'),puedeEditar?cat(sb):Promise.resolve(null)])
 // Incluye las asignaciones actuales aunque el catálogo se haya desactivado.
 const opciones=(rows:any[],key:string,label:string)=>{const a=rows.map(x=>[x.id,label==='cliente'?cliLabel(x):label==='motivo'?motLabel(x):x.nombre]);if(c[key]&&!a.some(x=>x[0]===c[key]))a.push([c[key],label==='cliente'?cliLabel(c.clientes):label==='motivo'?motLabel(c.motivos_devolucion):c[label]?.nombre || 'Asignación actual']);return a}
 const files=await urls(sb,arch || [])
 const ocultos=<><input type="hidden" name="id" value={id}/><input type="hidden" name="volver" value={volver}/></>
 const dato=(l:string,v:any)=><div><p className="text-xs text-slate-500">{l}</p><p className="text-sm font-medium whitespace-pre-wrap">{v ?? '—'}</p></div>
 return <div className="max-w-7xl mx-auto">
  <Link href={volver} className="inline-block mb-4 text-sm font-semibold text-belca-navy underline">← Volver al informe / listado</Link>
  {sp.ok&&<p role="status" className="bg-emerald-50 text-emerald-800 rounded-lg p-3 mb-4">Cambios guardados.</p>}
  {sp.err&&<p role="alert" className="bg-red-50 text-red-800 rounded-lg p-3 mb-4">{sp.err}</p>}
  <div className="flex flex-wrap gap-3 items-baseline"><T>{c.numero}</T><Badge>{ESTADOS[c.estado]}</Badge>{c.critico&&<b className="text-red-600 text-sm">CRÍTICO</b>}{!puedeEditar&&<Badge>Solo consulta</Badge>}</div>
  <Box title="Resumen de la devolución"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">
   {dato('Cliente',c.clientes?cliLabel(c.clientes):'Sin asignar')}{dato('Factura',c.factura)}{dato('Producto',c.producto)}{dato('Valor devuelto',fmt(c.monto))}
   {dato('Motivo',motLabel(c.motivos_devolucion))}{dato('Televenta',c.televentas?.nombre)}{dato('Vendedor',c.vendedores?.nombre)}{dato('Chofer',c.chofer)}
   {dato('Área',AREAS[areaDe(c)])}{dato('Responsabilidad',RESPONSABILIDADES[c.responsabilidad_estado])}<div><p className="text-xs text-slate-500">Error atribuido</p><Errores r={c}/></div>{dato('Registrado por',c.gestor?.nombre)}
   {dato('Registro',fechaCR(c.created_at))}{dato('Última gestión',fechaCR(c.ultima_gestion))}{dato('Cierre',fechaCR(c.fecha_cierre))}{dato('Cerrado por',c.cierre?.nombre)}
  </div></Box>
  <Box title="Gestión y solución"><div className="grid md:grid-cols-3 gap-4">{dato('Qué se hizo y cómo se resolvió',c.gestion_resumen || 'Gestión pendiente de documentar')}{dato('Qué pasó con la mercadería',RESULTADOS_MERCADERIA[c.resultado_mercaderia])}{dato('Resultado económico',RESULTADOS_ECONOMICOS[c.resultado_economico])}</div>{c.observaciones&&<p className="mt-4 text-sm whitespace-pre-wrap">{c.observaciones}</p>}</Box>
  {puedeEditar&&catalogos&&<Grid>
   <Box title="Actualizar datos y documentar solución"><form action={actualizar} className="grid sm:grid-cols-2 gap-3">{ocultos}
    <I n="fecha" l="Fecha del caso" type="date" def={c.fecha} req/>
    <Combo name="cliente_id" label="Cliente" def={c.cliente_id} vacio="Sin asignar" options={opciones(catalogos.clientes,'cliente_id','cliente')}/>
    <Combo name="televenta_id" label="Televenta" def={c.televenta_id} options={opciones(catalogos.televentas,'televenta_id','televentas')}/>
    <Combo name="vendedor_id" label="Vendedor" def={c.vendedor_id} options={opciones(catalogos.vendedores,'vendedor_id','vendedores')}/>
    <Combo name="ruta_id" label="Ruta" def={c.ruta_id} options={opciones(catalogos.rutas,'ruta_id','rutas')}/>
    <I n="chofer" l="Chofer" def={c.chofer}/><I n="factura" l="Factura" def={c.factura}/><I n="producto" l="Producto" def={c.producto}/><I n="cantidad" l="Cantidad" type="number" def={c.cantidad}/><I n="monto" l="Valor devuelto (₡)" type="number" def={c.monto} req/>
    <Combo name="motivo_id" label="Motivo" def={c.motivo_id} required options={opciones(catalogos.motivos,'motivo_id','motivo')}/>
    <S n="area" l="Área responsable" def={areaDe(c)} o={AREA_OPC} req/>
    <S n="responsabilidad_estado" l="Validación de la responsabilidad" def={c.responsabilidad_estado} o={Object.entries(RESPONSABILIDADES)} req/>
    <S n="estado" l="Estado del caso" def={c.estado} o={Object.entries(ESTADOS)} req/>
    <fieldset className="sm:col-span-2 rounded-lg border p-3"><legend className="text-sm font-semibold">Error atribuido (puede seleccionar varios)</legend><div className="flex flex-wrap gap-3">{[['error_cliente','Cliente'],['error_ventas','Ventas'],['error_televentas','Televentas'],['error_chofer','Chofer'],['error_almacen','Almacén'],['error_pima','PIMA']].map(([n,l])=><label key={n} className="flex gap-2 text-sm"><input name={n} type="checkbox" defaultChecked={c[n]}/>{l}</label>)}</div></fieldset>
    <A n="gestion_resumen" l="Mi gestión y solución final (opcional)" def={c.gestion_resumen} cls="sm:col-span-2"/>
    <S n="resultado_mercaderia" l="Qué ocurrió con la mercadería (opcional)" def={c.resultado_mercaderia} o={Object.entries(RESULTADOS_MERCADERIA)} req/>
    <S n="resultado_economico" l="Resultado económico (opcional)" def={c.resultado_economico} o={Object.entries(RESULTADOS_ECONOMICOS)} req/>
    <A n="observaciones" l="Observaciones adicionales" def={c.observaciones} cls="sm:col-span-2"/>
    <label className="flex gap-2 text-sm"><input name="critico" type="checkbox" defaultChecked={c.critico}/>Incidencia crítica</label>
    <p className="sm:col-span-2 text-xs text-slate-500">La gestión y los resultados son opcionales: puede completarlos o editarlos después, incluso con el caso cerrado. Las correcciones quedan en el historial con su usuario.</p><div className="sm:col-span-2"><B>Guardar cambios</B></div>
   </form></Box>
   <Box title="Registrar mi gestión"><form action={seguimiento} className="grid gap-3">{ocultos}
    <S n="accion" l="Qué hice" o={Object.entries(ACCIONES)} req/><I n="contacto" l="Con quién hablé / área contactada"/>
    <A n="comentario" l="Gestión realizada (describa lo que hizo)"/><A n="respuesta" l="Qué respondió el cliente o el área"/>
    <I n="proximo_paso" l="Qué queda pendiente / siguiente paso"/><I n="fecha_compromiso" l="Fecha de compromiso" type="date"/><B>Registrar gestión</B>
   </form></Box>
  </Grid>}
  <Box title={`Historial de gestiones y cambios · ${(seg || []).length}`}>
   <div className="space-y-4">{(seg || []).map((s:any)=><article key={s.id} className="border-l-4 border-belca-orange pl-4 py-2"><div className="flex flex-wrap gap-2 text-xs text-slate-500"><b>{s.profiles?.nombre || 'Sistema'}</b><span>{fechaCR(s.created_at)}</span></div><h3 className="font-semibold text-belca-navy mt-1">{s.accion || 'Seguimiento'}</h3>{s.contacto&&<p className="text-sm mt-1"><b>Contacto:</b> {s.contacto}</p>}{s.comentario&&<p className="text-sm whitespace-pre-wrap mt-1">{s.comentario}</p>}{s.respuesta&&<p className="text-sm mt-1"><b>Respuesta:</b> {s.respuesta}</p>}{s.proximo_paso&&<p className="text-sm mt-1"><b>Pendiente:</b> {s.proximo_paso}</p>}{s.fecha_compromiso&&<p className="text-xs mt-1">Compromiso: {s.fecha_compromiso}</p>}{s.cambios&&<details className="text-xs mt-2"><summary className="cursor-pointer underline">Ver campos corregidos</summary><Tbl cols={['Campo','Antes','Después']} rows={Object.entries(s.cambios).map(([k,v]:[string,any])=>[k,String(v.antes ?? '—'),String(v.despues ?? '—')])}/></details>}</article>)}{!seg?.length&&<p className="text-sm text-slate-500">Todavía no se han registrado gestiones.</p>}</div>
  </Box>
  <Grid><Box title="Recuperación económica"><Tbl cols={['Tipo','Pérdida base declarada','Monto recuperado']} rows={(rec || []).map((r:any)=>[TIPOS_REC[r.tipo],fmt(r.monto_perdida),fmt(r.monto_recuperado)])}/>
   {puedeEditar&&<form action={recuperacion} className="grid sm:grid-cols-2 gap-3 mt-4">{ocultos}<I n="monto_perdida" l="Pérdida base del caso (vacío = valor devuelto)" type="number"/><I n="monto_recuperado" l="Monto recuperado en esta gestión" type="number" req/><S n="tipo" l="Tipo" o={Object.entries(TIPOS_REC)} req/><B>Registrar recuperación</B></form>}
  </Box><Box title="Evidencias"><div className="flex flex-wrap gap-3">{files.map((f:any)=><a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="text-sm underline">{f.tipo!=='documento'&& !f.nombre?.toLowerCase().endsWith('.pdf')&&<img src={f.url} alt={f.nombre} className="h-24 rounded border"/>}{f.nombre}</a>)}</div>
   {puedeEditar&&<form action={archivo} className="grid gap-3 mt-4">{ocultos}<F n="archivo" l="Adjuntar evidencia"/><S n="tipo" l="Tipo" def="foto" o={[['foto','Foto'],['firma','Firma'],['documento','Documento']]}/><B>Subir evidencia</B></form>}
  </Box></Grid>
  <div className="flex flex-wrap justify-between gap-4"><Link href={volver} className="text-belca-navy underline text-sm">← Regresar al informe / listado</Link>{admin&&<form action={borrar}>{ocultos}<ConfirmButton mensaje="¿Eliminar definitivamente este caso y sus registros relacionados?" cls="text-red-600 underline text-sm">Eliminar caso</ConfirmButton></form>}</div>
 </div>
}
