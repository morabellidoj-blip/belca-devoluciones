import Link from 'next/link'
import { ctx, cat } from '@/lib/data'
import { cargar, calcular } from '@/lib/metricas'
import { Combo } from '@/lib/combo'
import { RESULTADOS_MERCADERIA, RESULTADOS_ECONOMICOS, RESPONSABILIDADES } from '@/lib/gestion'
import { AREA_OPC } from '@/lib/areas'
import { T, Box, I, S, B, Tbl, Badge, Kpi, Kpis, ESTADOS, fmt, cliTxt, cliLabel, motLabel, Errores } from '@/lib/ui'
export const dynamic='force-dynamic'
export default async function Informe({searchParams}:{searchParams:Promise<any>}) {
 const sp0=await searchParams, {sb,puedeEditar}=await ctx()
 const [datos,c,{data:gestores}]=await Promise.all([cargar(sb,sp0),cat(sb),sb.from('profiles').select('id,nombre').order('nombre')])
 const m=calcular(datos), sp=m.sp
 const claves=['desde','hasta','todo','estado','cliente_id','gestor_id','area','vendedor_id','televenta_id','chofer','motivo_id','responsabilidad_estado','resultado_mercaderia','resultado_economico','error']
 const qs=new URLSearchParams();for(const k of claves)if(sp[k])qs.set(k,String(sp[k]))
 const filas=[...m.R].sort((a:any,b:any)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))
 const paginas=Math.max(1,Math.ceil(filas.length/40)), pagina=Math.max(1,Math.min(paginas,Number.parseInt(sp0.pagina)||1))
 const actual=new URLSearchParams(qs);actual.set('pagina',String(pagina));const volver='/informe?'+actual
 const enlace=(extra:Record<string,string>)=>{const q=new URLSearchParams(qs);q.delete('pagina');for(const [k,v]of Object.entries(extra))if(v)q.set(k,v);else q.delete(k);return '/informe?'+q}
 const detalle=(r:any)=>`/casos/${r.id}?${new URLSearchParams({volver})}`
 const nombres=(rows:any[])=>rows.map(x=>[x.id,x.nombre])
 const rank=(titulo:string,items:any[],campo:string,flag:string)=><Box title={titulo}><Tbl cols={['Responsable','Casos asociados','Con error atribuido']} rows={[...items].sort((a,b)=>b.errores-a.errores||b.casos-a.casos).slice(0,6).map(x=>[<Link key="n" className="text-belca-navy underline" href={enlace({[campo]:campo==='chofer'?x.name:x.id,error:''})}>{x.name}</Link>,<Link key="c" href={enlace({[campo]:campo==='chofer'?x.name:x.id,error:''})} className="underline">{x.casos}</Link>,<Link key="e" href={enlace({[campo]:campo==='chofer'?x.name:x.id,error:flag})} className="underline text-red-700 font-semibold">{x.errores}</Link>])}/></Box>
 return <div className="max-w-screen-2xl mx-auto">
  <div className="flex flex-wrap justify-between items-start gap-3 mb-5"><div><T>Informe de devoluciones</T><p className="text-sm text-slate-500 -mt-3">Período: {m.periodo}. Del indicador al caso: revise el motivo, la responsabilidad, la gestión y la solución.</p></div><div className="flex flex-wrap gap-2"><a className="btn" href={'/api/informe?fmt=xlsx&'+qs}>Descargar Excel</a><a className="btn" href={'/api/informe?fmt=pdf&'+qs}>Descargar PDF</a>{puedeEditar&&<Link href="/casos/nuevo" className="btn bg-belca-orange">+ Registrar devolución</Link>}</div></div>
  {!puedeEditar&&<p className="text-sm bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">Acceso de consulta: puede revisar informes, casos, gestiones y evidencias.</p>}
  {datos.errorCasos&&<p role="alert" className="text-red-700 bg-red-50 p-4 rounded mb-4">No se pudo cargar el informe: {datos.errorCasos}. Revise la instalación de las actualizaciones de base de datos.</p>}
  <form className="bg-white rounded-xl shadow-sm p-4 mb-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
   {sp.todo&&<input name="todo" type="hidden" value="1"/>}<I n="desde" l="Desde" type="date" def={sp.desde}/><I n="hasta" l="Hasta" type="date" def={sp.hasta}/>
   <S n="estado" l="Estado del caso" def={sp.estado} o={Object.entries(ESTADOS)}/><S n="responsabilidad_estado" l="Responsabilidad" def={sp.responsabilidad_estado} o={Object.entries(RESPONSABILIDADES)}/>
   <Combo name="cliente_id" label="Cliente" def={sp.cliente_id} vacio="Sin asignar" vacioValor="ninguno" options={c.clientes.map((x:any)=>[x.id,cliLabel(x)])}/>
   <Combo name="televenta_id" label="Televenta" def={sp.televenta_id} options={nombres(c.televentas)}/><Combo name="vendedor_id" label="Vendedor" def={sp.vendedor_id} options={nombres(c.vendedores)}/>
   <Combo name="chofer" label="Chofer" def={sp.chofer} options={c.choferes.map((x:any)=>[x.nombre,x.nombre])}/>
   <Combo name="motivo_id" label="Motivo de devolución" def={sp.motivo_id} options={c.motivos.map((x:any)=>[x.id,motLabel(x)])}/>
   <S n="area" l="Área responsable" def={sp.area} o={AREA_OPC}/><S n="gestor_id" l="Registrado por" def={sp.gestor_id} o={nombres(gestores || [])}/>
   <S n="error" l="Tipo de error atribuido" def={sp.error} o={['cliente','ventas','televentas','chofer','almacen','pima'].map(k=>['error_'+k,'Error de '+k])}/>
   <S n="resultado_mercaderia" l="Resultado de la mercadería" def={sp.resultado_mercaderia} o={Object.entries(RESULTADOS_MERCADERIA)}/><S n="resultado_economico" l="Resultado económico" def={sp.resultado_economico} o={Object.entries(RESULTADOS_ECONOMICOS)}/>
   <div className="flex flex-wrap gap-3 items-end"><B>Aplicar filtros</B><Link href="/informe" className="text-sm underline py-2">Mes actual</Link><Link href="/informe?todo=1" className="text-sm underline py-2">Todo el historial</Link></div>
  </form>
  <Kpis><Kpi t="Devoluciones" v={m.total}/><Kpi t="Valor devuelto (₡)" v={fmt(m.valor)}/><Kpi t="Casos abiertos" v={m.abiertos}/><Kpi t="Casos cerrados" v={m.cerr}/><Kpi t="Responsabilidad por confirmar" v={m.R.filter((r:any)=>['investigar','preliminar'].includes(r.responsabilidad_estado)).length}/></Kpis>
  <details className="mb-4"><summary className="cursor-pointer text-sm font-semibold text-belca-navy py-2">Ver responsables y abrir sus casos</summary><p className="text-xs text-slate-500 mb-3">Los errores son atribuciones registradas; use el filtro de responsabilidad para consultar únicamente las confirmadas.</p><div className="grid lg:grid-cols-2 gap-4">{rank('Televentas',m.actores.tele,'televenta_id','error_televentas')}{rank('Vendedores',m.actores.vend,'vendedor_id','error_ventas')}{rank('Choferes',m.actores.cho,'chofer','error_chofer')}{rank('Clientes',m.actores.cli,'cliente_id','error_cliente')}</div></details>
  <Box title={`Detalle · ${filas.length} casos · página ${pagina} de ${paginas}`}><p className="text-xs text-slate-500 mb-3">Abra el número de caso para leer el historial completo. El botón de regreso conserva estos filtros y esta página.</p>
   <Tbl cols={['Caso / fecha','Cliente / factura','Motivo','Responsables','Validación','Mi gestión','Mercadería','Resultado económico','Estado']} rows={filas.slice((pagina-1)*40,pagina*40).map((r:any)=>[
    <div key="n"><Link href={detalle(r)} className="underline font-semibold text-belca-navy whitespace-nowrap">{r.numero}</Link><p className="text-xs text-slate-500">{r.fecha}</p></div>,<div key="c">{cliTxt(r.clientes)}<p className="text-xs text-slate-500">{r.factura || 'Sin factura'}</p></div>,motLabel(r.motivos_devolucion),
    <div key="r" className="min-w-40 text-xs space-y-1">{r.televentas&&<p>Televenta: {r.televentas.nombre}</p>}{r.vendedores&&<p>Vendedor: {r.vendedores.nombre}</p>}{r.chofer&&<p>Chofer: {r.chofer}</p>}<Errores r={r}/></div>,RESPONSABILIDADES[r.responsabilidad_estado],
    <div key="g" className="min-w-52 max-w-80"><p className="line-clamp-3 whitespace-pre-wrap">{r.gestion_resumen || 'Pendiente de documentar'}</p><Link href={detalle(r)} className="text-xs text-belca-navy underline">Leer gestiones e historial →</Link></div>,RESULTADOS_MERCADERIA[r.resultado_mercaderia],RESULTADOS_ECONOMICOS[r.resultado_economico],<Badge key="e">{ESTADOS[r.estado]}</Badge>
   ])}/>
   <nav aria-label="Páginas del informe" className="flex flex-wrap items-center gap-4 mt-4 text-sm">{pagina>1&&<Link className="underline" href={enlace({pagina:String(pagina-1)})}>← Anterior</Link>}<span>{filas.length?`${(pagina-1)*40+1}–${Math.min(pagina*40,filas.length)} de ${filas.length}`:'Sin registros'}</span>{pagina<paginas&&<Link className="underline" href={enlace({pagina:String(pagina+1)})}>Siguiente →</Link>}</nav>
  </Box>
 </div>
}
