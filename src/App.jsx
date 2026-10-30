import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, BarChart3, Boxes, BriefcaseBusiness, Camera, CheckCircle2, ClipboardList,
  Cloud, CloudOff, CreditCard, LayoutDashboard, Menu, Package, Plus, Search,
  Settings, ShieldCheck, Smartphone, Users, Wrench, X
} from 'lucide-react'
import { localDb, makeId } from './db'
import { isSupabaseConfigured, supabase } from './supabase'

const nav = [
  ['Panel principal', LayoutDashboard], ['Clientes', Users], ['Recepción de equipos', Smartphone],
  ['Órdenes de servicio', ClipboardList], ['Inventario', Package], ['Punto de venta', CreditCard],
  ['Compras y proveedores', Boxes], ['Caja y finanzas', BriefcaseBusiness],
  ['Reportes', BarChart3], ['Usuarios y permisos', ShieldCheck], ['Configuración', Settings]
]

export default function App() {
  const [section, setSection] = useState('Panel principal')
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [clients, setClients] = useState([])
  const [clientForm, setClientForm] = useState({nombre:'',telefono:'',correo:'',direccion:''})
  const [repairs,setRepairs] = useState([])
  const [products,setProducts] = useState([])
  const [repairBusy,setRepairBusy] = useState(false)
  const [selectedRepair,setSelectedRepair] = useState(null)
  const [printRepair,setPrintRepair] = useState(null)
  const [detailBusy,setDetailBusy] = useState(false)
  const [evidence,setEvidence] = useState([])
  const [evidenceBusy,setEvidenceBusy] = useState(false)
  const [evidenceError,setEvidenceError] = useState('')
  const [detailForm,setDetailForm] = useState({diagnostico:'',costo_reparacion:'0',anticipo:'0'})
  const [productBusy,setProductBusy] = useState(false)
  const [repairForm,setRepairForm] = useState({cliente_id:'',marca:'',modelo:'',imei:'',falla_reportada:'',diagnostico:'',costo_reparacion:'0',anticipo:'0'})
  const [productForm,setProductForm] = useState({nombre:'',categoria:'',marca:'',modelo:'',codigo:'',stock:'0',stock_minimo:'1',costo:'0',precio_venta:'0'})
  const [clientBusy, setClientBusy] = useState(false)
  const [clientEdit, setClientEdit] = useState(null)
  useEffect(() => {
    if (!supabase) { setSession(null); return }
    supabase.auth.getSession().then(({data}) => setSession(data.session)).catch(() => setSession(null))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) {setProfile(null);setClients([]);return}
    supabase.from('perfiles').select('id,nombre,rol,activo').eq('id',session.user.id).single().then(({data,error})=>setProfile(error?null:data))
  },[session?.user?.id])
  async function loadClients(){
    const {data,error}=await supabase.from('clientes').select('id,nombre,telefono,correo,direccion,creado_en').order('creado_en',{ascending:false}).limit(200)
    if(error) setNotice('No se pudieron cargar clientes: '+error.message)
    else setClients(data||[])
  }
  useEffect(()=>{if(profile?.activo && ['Clientes','Recepción de equipos','Órdenes de servicio','Panel principal'].includes(section)) loadClients()},[profile?.id,section])
  async function loadRepairs(){const {data,error}=await supabase.from('reparaciones').select('*,clientes(nombre,telefono)').order('fecha_ingreso',{ascending:false}).limit(200);if(error)setNotice('Error cargando reparaciones: '+error.message);else setRepairs(data||[])}
  async function loadProducts(){const {data,error}=await supabase.from('productos').select('*').order('nombre').limit(300);if(error)setNotice('Error cargando inventario: '+error.message);else setProducts(data||[])}
  useEffect(()=>{if(profile?.activo && ['Órdenes de servicio','Panel principal','Recepción de equipos'].includes(section))loadRepairs();if(profile?.activo && ['Inventario','Panel principal'].includes(section))loadProducts()},[profile?.id,section])
  async function saveRepair(e){e.preventDefault();setRepairBusy(true);const payload={...repairForm,cliente_id:repairForm.cliente_id||null,imei:repairForm.imei||null,diagnostico:repairForm.diagnostico||null,costo_reparacion:Number(repairForm.costo_reparacion)||0,anticipo:Number(repairForm.anticipo)||0,codigo:'CAL-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()};const {error}=await supabase.from('reparaciones').insert(payload);setRepairBusy(false);if(error){setNotice('No se pudo guardar la reparación: '+error.message);return}setNotice('Orden guardada en Supabase.');setRepairForm({cliente_id:'',marca:'',modelo:'',imei:'',falla_reportada:'',diagnostico:'',costo_reparacion:'0',anticipo:'0'});setSection('Órdenes de servicio');loadRepairs()}
  async function loadEvidence(repairId){
    setEvidenceError('')
    const {data,error}=await supabase.from('fotos_reparacion').select('id,ruta,nombre,creado_en').eq('reparacion_id',repairId).order('creado_en',{ascending:false})
    if(error){setEvidenceError('No se pudieron consultar las fotos: '+error.message);return}
    const entries=await Promise.all((data||[]).map(async item=>{
      const {data:link,error:linkError}=await supabase.storage.from('evidencias-reparacion').createSignedUrl(item.ruta,600)
      return {...item,url:linkError?null:link?.signedUrl}
    }))
    setEvidence(entries)
  }
  function printReceipt(r){setPrintRepair(r);setTimeout(()=>window.print(),180)}
  function openRepair(r){setSelectedRepair(r);setEvidence([]);setDetailForm({diagnostico:r.diagnostico||'',costo_reparacion:String(r.costo_reparacion??0),anticipo:String(r.anticipo??0)});loadEvidence(r.id)}
  async function uploadEvidence(event){
    const files=Array.from(event.target.files||[])
    event.target.value=''
    if(!selectedRepair||!files.length)return
    if(files.length>6){setEvidenceError('Sube máximo 6 fotos por vez.');return}
    if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024)){
      setEvidenceError('Solo JPG, PNG o WebP de máximo 5 MB por foto.');return
    }
    setEvidenceBusy(true);setEvidenceError('')
    for(const file of files){
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]
      const path=selectedRepair.id+'/'+crypto.randomUUID()+'.'+ext
      const {error:uploadError}=await supabase.storage.from('evidencias-reparacion').upload(path,file,{contentType:file.type,upsert:false})
      if(uploadError){setEvidenceError('Error al subir '+file.name+': '+uploadError.message);break}
      const {error:dbError}=await supabase.from('fotos_reparacion').insert({reparacion_id:selectedRepair.id,ruta:path,nombre:file.name,subido_por:session.user.id})
      if(dbError){await supabase.storage.from('evidencias-reparacion').remove([path]);setEvidenceError('Error al registrar foto: '+dbError.message);break}
    }
    await loadEvidence(selectedRepair.id)
    setEvidenceBusy(false)
  }
  async function saveRepairDetail(e){e.preventDefault();if(!selectedRepair)return;const costo=Number(detailForm.costo_reparacion),anticipo=Number(detailForm.anticipo);if(!Number.isFinite(costo)||!Number.isFinite(anticipo)||costo<0||anticipo<0){setNotice('Revisa los importes.');return}setDetailBusy(true);const {error}=await supabase.from('reparaciones').update({diagnostico:detailForm.diagnostico,costo_reparacion:costo,anticipo}).eq('id',selectedRepair.id);setDetailBusy(false);if(error){setNotice('No se pudo actualizar: '+error.message);return}setSelectedRepair(null);setNotice('Expediente actualizado en Supabase.');await loadRepairs()}
  async function updateRepair(id,estado){const {error}=await supabase.from('reparaciones').update({estado,fecha_entrega:estado==='entregado'?new Date().toISOString():null}).eq('id',id);if(error)setNotice(error.message);else loadRepairs()}
  async function saveProduct(e){e.preventDefault();setProductBusy(true);const payload={...productForm,codigo:productForm.codigo||null,stock:Number(productForm.stock)||0,stock_minimo:Number(productForm.stock_minimo)||0,costo:Number(productForm.costo)||0,precio_venta:Number(productForm.precio_venta)||0};const {error}=await supabase.from('productos').insert(payload);setProductBusy(false);if(error){setNotice('Error: '+error.message);return}setProductForm({nombre:'',categoria:'',marca:'',modelo:'',codigo:'',stock:'0',stock_minimo:'1',costo:'0',precio_venta:'0'});setNotice('Producto registrado en Supabase.');loadProducts()}
  async function saveClient(e){
    e.preventDefault();setClientBusy(true)
    const payload={nombre:clientForm.nombre.trim(),telefono:clientForm.telefono.trim(),correo:clientForm.correo.trim()||null,direccion:clientForm.direccion.trim()||null}
    const result=clientEdit ? await supabase.from('clientes').update(payload).eq('id',clientEdit) : await supabase.from('clientes').insert(payload)
    setClientBusy(false)
    if(result.error){setNotice('Error al guardar cliente: '+result.error.message);return}
    setClientForm({nombre:'',telefono:'',correo:'',direccion:''});setClientEdit(null);setNotice('Cliente guardado correctamente en Supabase.');loadClients()
  }
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [orders, setOrders] = useState([])
  const [showIntake, setShowIntake] = useState(false)
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)

  async function refreshLocal() {
    const rows = await localDb.pendingOrders.orderBy('createdAt').reverse().toArray()
    setOrders(rows)
    const photos = await localDb.pendingPhotos.count()
    setPending(rows.filter(x => x.syncStatus !== 'synced').length + photos)
  }

  useEffect(() => {
    const onOnline = () => { setOnline(true); setNotice('Conexión recuperada. Revisa los registros pendientes de sincronización.'); refreshLocal() }
    const onOffline = () => { setOnline(false); setNotice('Sin conexión. Los nuevos registros compatibles se guardarán en este dispositivo.') }
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline)
    refreshLocal()
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  async function saveIntake(form) {
    const record = { ...form, id: makeId(), createdAt: new Date().toISOString(), syncStatus: 'pending' }
    await localDb.pendingOrders.add(record)
    if (form.photoFiles?.length) {
      for (const file of form.photoFiles) {
        await localDb.pendingPhotos.add({ id: makeId(), orderId: record.id, file, fileName: file.name, createdAt: new Date().toISOString(), syncStatus: 'pending' })
      }
    }
    setShowIntake(false)
    setNotice('Recepción guardada en este dispositivo. La sincronización con la nube se habilitará al configurar Supabase.')
    await refreshLocal()
  }

  async function syncPending() {
    if (!online) { setNotice('No hay conexión a internet.'); return }
    if (!isSupabaseConfigured) { setNotice('Primero configura las credenciales de Supabase en el archivo .env.'); return }
    setNotice('La conexión está configurada, pero falta completar el alta de organización y la sincronización protegida. No se enviaron registros.')
  }

  if (!isSupabaseConfigured) return <div className="auth-screen"><div className="auth-card"><h2>ST CALEL</h2><p>Faltan las variables públicas de Supabase en Netlify.</p></div></div>
  if (session === undefined) return <div className="auth-screen">Verificando sesión…</div>
  if (!session) return <Login />
  if (!profile) return <div className="auth-screen"><div className="auth-card"><h2>Cuenta sin perfil</h2><p>Tu usuario existe, pero no tiene un perfil habilitado en la tabla perfiles. Contacta al administrador.</p><button className="secondary" onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button></div></div>
  if (!profile.activo) return <div className="auth-screen"><div className="auth-card"><h2>Cuenta desactivada</h2><button className="secondary" onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button></div></div>
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Smartphone size={23}/></div><div><b>ST CALEL</b><small>Sistema de gestión</small></div><button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)}><X/></button></div>
      <div className="nav-label">MENÚ PRINCIPAL</div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={`nav-item ${section === label ? 'active' : ''}`} onClick={() => {setSection(label); setMobileMenu(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={17}/><span>Acceso protegido por roles</span></div>
    </aside>
    {mobileMenu && <div className="scrim" onClick={() => setMobileMenu(false)} />}
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={() => setMobileMenu(true)}><Menu/></button><div className="crumb">Sistema <span>/</span> {section}</div><div className="top-actions"><span className={`connection ${online ? 'on' : 'off'}`}>{online ? <Cloud size={15}/> : <CloudOff size={15}/>} {online ? 'En línea' : 'Sin conexión'}</span><div className="avatar" title={profile.nombre}>{profile.nombre?.slice(0,2).toUpperCase()}</div><button className="text-btn" onClick={()=>supabase.auth.signOut()}>Salir</button></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">SOLUCIONES TECNOLÓGICAS CALEL</div><h1>{section}</h1><p>Controla tus reparaciones, clientes, inventario y ventas desde un solo lugar.</p></div><button className="primary" onClick={() => setSection('Recepción de equipos')}><Plus size={17}/> Nueva recepción</button></div>
        {notice && <div className="notice"><Activity size={17}/><span>{notice}</span><button onClick={() => setNotice('')}><X size={16}/></button></div>}
        {section === 'Clientes' ? <section className="panel clients-panel"><div className="panel-head"><div><h2>Clientes</h2><p>Información almacenada en Supabase · {clients.length} registros</p></div></div>
          <form onSubmit={saveClient} className="client-form">
            <input required placeholder="Nombre completo *" value={clientForm.nombre} onChange={e=>setClientForm({...clientForm,nombre:e.target.value})}/>
            <input placeholder="Teléfono" value={clientForm.telefono} onChange={e=>setClientForm({...clientForm,telefono:e.target.value})}/>
            <input type="email" placeholder="Correo electrónico" value={clientForm.correo} onChange={e=>setClientForm({...clientForm,correo:e.target.value})}/>
            <input placeholder="Dirección" value={clientForm.direccion} onChange={e=>setClientForm({...clientForm,direccion:e.target.value})}/>
            <button className="primary" disabled={clientBusy}>{clientBusy?'Guardando…':clientEdit?'Actualizar cliente':'Registrar cliente'}</button>
            {clientEdit && <button type="button" className="secondary" onClick={()=>{setClientEdit(null);setClientForm({nombre:'',telefono:'',correo:'',direccion:''})}}>Cancelar edición</button>}
          </form>
          <div className="client-list">{clients.map(c=><div className="client-row" key={c.id}><div><b>{c.nombre}</b><small>{c.telefono||'Sin teléfono'} · {c.correo||'Sin correo'}</small></div><button className="secondary" onClick={()=>{setClientEdit(c.id);setClientForm({nombre:c.nombre||'',telefono:c.telefono||'',correo:c.correo||'',direccion:c.direccion||''})}}>Editar</button></div>)}{clients.length===0 && <p className="muted">Todavía no hay clientes registrados.</p>}</div>
        </section> : section === 'Recepción de equipos' ? <section className="panel"><h2>Nueva recepción</h2><p className="muted">Registra primero al cliente en el módulo Clientes. La orden se guardará en Supabase.</p><form className="client-form" onSubmit={saveRepair}><select required value={repairForm.cliente_id} onChange={e=>setRepairForm({...repairForm,cliente_id:e.target.value})}><option value="">Seleccionar cliente *</option>{clients.map(c=><option value={c.id} key={c.id}>{c.nombre} — {c.telefono}</option>)}</select>{['marca','modelo','imei','falla_reportada','diagnostico','costo_reparacion','anticipo'].map(k=><input key={k} required={['marca','modelo','falla_reportada'].includes(k)} type={['costo_reparacion','anticipo'].includes(k)?'number':'text'} min={['costo_reparacion','anticipo'].includes(k)?0:undefined} step={['costo_reparacion','anticipo'].includes(k)?'0.01':undefined} placeholder={({marca:'Marca *',modelo:'Modelo *',imei:'IMEI (opcional)',falla_reportada:'Falla reportada *',diagnostico:'Diagnóstico inicial',costo_reparacion:'Costo estimado Q',anticipo:'Anticipo Q'})[k]} value={repairForm[k]} onChange={e=>setRepairForm({...repairForm,[k]:e.target.value})}/>)}<button className="primary" disabled={repairBusy}>{repairBusy?'Guardando…':'Guardar orden en Supabase'}</button></form><p className="muted">Fotografías: todavía no habilitadas; se agregarán con almacenamiento privado.</p></section> : section === 'Órdenes de servicio' ? <section className="panel"><div className="panel-head"><h2>Órdenes de servicio ({repairs.length})</h2><button className="secondary" onClick={loadRepairs}>Actualizar</button></div><div className="client-list">{repairs.map(r=><div className="client-row" key={r.id}><div><b>{r.codigo} · {r.marca} {r.modelo}</b><small>{r.clientes?.nombre||'Sin cliente'} · {r.falla_reportada} · Q {Number(r.costo_reparacion||0).toFixed(2)}</small><button className="secondary" style={{marginTop:8}} onClick={()=>openRepair(r)}>Ver expediente / editar costos</button><button className="secondary" style={{marginTop:8,marginLeft:8}} onClick={()=>printReceipt(r)}>Imprimir comprobante</button></div><select aria-label="Estado de la orden" value={r.estado} onChange={e=>updateRepair(r.id,e.target.value)}>{['recibido','diagnostico','esperando_repuesto','en_reparacion','reparado','entregado','cancelado'].map(st=><option value={st} key={st}>{st.replaceAll('_',' ')}</option>)}</select></div>)}{!repairs.length&&<p className="muted">No hay órdenes registradas.</p>}</div></section> : section === 'Inventario' ? <section className="panel"><h2>Inventario</h2><form className="client-form" onSubmit={saveProduct}>{['nombre','categoria','marca','modelo','codigo','stock','stock_minimo','costo','precio_venta'].map(k=><input key={k} required={k==='nombre'} type={['stock','stock_minimo','costo','precio_venta'].includes(k)?'number':'text'} min={['stock','stock_minimo','costo','precio_venta'].includes(k)?0:undefined} step={['costo','precio_venta'].includes(k)?'0.01':'1'} placeholder={k.replaceAll('_',' ')+(k==='nombre'?' *':'')} value={productForm[k]} onChange={e=>setProductForm({...productForm,[k]:e.target.value})}/>)}<button className="primary" disabled={productBusy}>{productBusy?'Guardando…':'Registrar producto'}</button></form><div className="client-list">{products.map(p=><div className="client-row" key={p.id}><div><b>{p.nombre}</b><small>{p.codigo||'Sin código'} · Stock: {p.stock} · Venta: Q {Number(p.precio_venta||0).toFixed(2)}</small></div></div>)}{!products.length&&<p className="muted">Todavía no hay productos.</p>}</div></section> : section !== 'Panel principal' ? <section className="panel"><h2>{section}</h2><p className="muted">Este módulo aún está en desarrollo. No se han habilitado operaciones hasta configurar sus permisos y almacenamiento seguro.</p></section> : <>
        <div className="stat-grid">
          <Stat icon={Wrench} label="Órdenes pendientes" value={repairs.filter(r=>!['entregado','cancelado'].includes(r.estado)).length} hint="Órdenes en Supabase"/>
          <Stat icon={Users} label="Clientes registrados" value={clients.length} hint="Clientes en Supabase"/>
          <Stat icon={Package} label="Productos en inventario" value={products.length} hint="Productos en Supabase"/>
          <Stat icon={CreditCard} label="Ventas del día" value="Q 0.00" hint="Quetzales guatemaltecos"/>
        </div>
        <div className="two-col">
          <section className="panel"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Últimas órdenes guardadas en Supabase</p></div><button className="text-btn" onClick={loadRepairs}>Actualizar</button></div>
            {repairs.length ? <div className="order-list">{repairs.slice(0,6).map(o => <div className="order-row" key={o.id}><div className="device-icon"><Smartphone size={19}/></div><div className="order-info"><b>{o.marca} {o.modelo}</b><small>{o.clientes?.nombre||'Sin cliente'} · {o.codigo}</small></div><button className="secondary" onClick={()=>{setSection('Órdenes de servicio');openRepair(o)}}>Ver</button></div>)}</div> : <div className="empty"><div className="empty-icon"><ClipboardList size={25}/></div><b>Aún no hay recepciones</b><span>Registra tu primer teléfono para iniciar el expediente de reparación.</span><button className="secondary" onClick={() => setSection('Recepción de equipos')}>Registrar equipo</button></div>}
          </section>
          <section className="panel"><div className="panel-head"><div><h2>Estado de sincronización</h2><p>Datos locales y almacenamiento en la nube</p></div><span className={`dot ${online ? 'green' : 'amber'}`}/></div>
            <div className="sync-card"><div className="sync-icon">{online ? <Cloud/> : <CloudOff/>}</div><div><b>{online ? 'Conexión disponible' : 'Trabajando sin conexión'}</b><small>{isSupabaseConfigured ? 'Supabase configurado' : 'Supabase aún no está configurado'}</small></div></div>
            <div className="sync-line"><span>Elementos pendientes</span><b>{pending}</b></div><div className="sync-line"><span>Modo de trabajo</span><b>Híbrido</b></div>
            <button className="secondary full" onClick={syncPending}>Comprobar sincronización</button>
            <div className="security-note"><ShieldCheck size={16}/> Las fotografías y datos de clientes deben almacenarse en espacios privados con permisos por usuario.</div>
          </section>
        </div>
        </>}
        <div className="footnote">Versión 0.6 · Comprobantes imprimibles y fotografías privadas de evidencia en Supabase. Caja, ventas y modo sin conexión siguen pendientes.</div>
      </div>
    </main>
    {selectedRepair && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Expediente de reparación"><div className="modal" style={{maxWidth:680}}><div className="modal-head"><div><span className="eyebrow">EXPEDIENTE DE REPARACIÓN</span><h2>{selectedRepair.codigo}</h2><p>{selectedRepair.marca} {selectedRepair.modelo} · {selectedRepair.estado.replaceAll('_',' ')}</p></div><button className="icon-btn" onClick={()=>setSelectedRepair(null)} aria-label="Cerrar"><X/></button></div><div style={{padding:'0 24px 24px'}}><p><b>Cliente:</b> {selectedRepair.clientes?.nombre||'Sin cliente'} · {selectedRepair.clientes?.telefono||'Sin teléfono'}</p><p><b>IMEI / serie:</b> {selectedRepair.imei||'No registrado'}</p><p><b>Falla reportada:</b> {selectedRepair.falla_reportada||'No registrada'}</p><p><b>Fecha de ingreso:</b> {selectedRepair.fecha_ingreso?new Date(selectedRepair.fecha_ingreso).toLocaleString('es-GT'):'No registrada'}</p><form onSubmit={saveRepairDetail} className="client-form" style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}><label style={{gridColumn:'1 / -1'}}>Diagnóstico<textarea style={{width:'100%',minHeight:90}} value={detailForm.diagnostico} onChange={e=>setDetailForm({...detailForm,diagnostico:e.target.value})}/></label><label>Costo total Q<input required type="number" min="0" step="0.01" value={detailForm.costo_reparacion} onChange={e=>setDetailForm({...detailForm,costo_reparacion:e.target.value})}/></label><label>Anticipo Q<input required type="number" min="0" step="0.01" value={detailForm.anticipo} onChange={e=>setDetailForm({...detailForm,anticipo:e.target.value})}/></label><p style={{gridColumn:'1 / -1'}}><b>Saldo pendiente: Q {Math.max(0,Number(detailForm.costo_reparacion||0)-Number(detailForm.anticipo||0)).toFixed(2)}</b></p><button className="primary" disabled={detailBusy}>{detailBusy?'Guardando…':'Guardar cambios'}</button><button type="button" className="secondary" onClick={()=>setSelectedRepair(null)}>Cerrar</button></form><button type="button" className="secondary" style={{marginTop:12}} onClick={()=>printReceipt(selectedRepair)}>Imprimir comprobante</button><div className="evidence-section"><h3>Fotografías de evidencia</h3><p className="muted">Archivos privados en Supabase. Enlaces temporales válidos durante 10 minutos. No fotografíes contraseñas ni información personal visible en la pantalla.</p><label className="secondary evidence-upload">{evidenceBusy?'Subiendo fotografías…':'Agregar fotografías (JPG, PNG, WebP · máximo 5 MB)'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={evidenceBusy} onChange={uploadEvidence} style={{display:'none'}}/></label>{evidenceError&&<p role="alert" className="auth-error">{evidenceError}</p>}<div className="evidence-grid">{evidence.map(item=><div className="evidence-item" key={item.id}>{item.url?<a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={'Evidencia '+item.nombre}/></a>:<span>Vista no disponible</span>}<small title={item.nombre}>{item.nombre}</small></div>)}</div>{!evidence.length&&<p className="muted">Aún no hay fotografías en este expediente.</p>}</div></div></div></div>}
    {printRepair && <div className="receipt-print" aria-hidden="true"><div className="receipt-sheet"><h1>Soluciones Tecnológicas Calel</h1><p>Comprobante de recepción / orden de servicio</p><hr/><p><strong>Orden:</strong> {printRepair.codigo}</p><p><strong>Fecha:</strong> {printRepair.fecha_ingreso?new Date(printRepair.fecha_ingreso).toLocaleString('es-GT'):'—'}</p><p><strong>Cliente:</strong> {printRepair.clientes?.nombre||'—'}</p><p><strong>Teléfono:</strong> {printRepair.clientes?.telefono||'—'}</p><p><strong>Equipo:</strong> {printRepair.marca} {printRepair.modelo}</p><p><strong>IMEI / serie:</strong> {printRepair.imei||'No registrado'}</p><p><strong>Falla reportada:</strong> {printRepair.falla_reportada||'—'}</p><p><strong>Diagnóstico:</strong> {printRepair.diagnostico||'Pendiente'}</p><p><strong>Estado:</strong> {printRepair.estado?.replaceAll('_',' ')}</p><hr/><p><strong>Costo registrado:</strong> Q {Number(printRepair.costo_reparacion||0).toFixed(2)}</p><p><strong>Anticipo registrado:</strong> Q {Number(printRepair.anticipo||0).toFixed(2)}</p><p><strong>Saldo:</strong> Q {Math.max(0,Number(printRepair.costo_reparacion||0)-Number(printRepair.anticipo||0)).toFixed(2)}</p><p className="receipt-note">Comprobante informativo. El costo puede variar previo acuerdo con el cliente. No incluye fotografías ni datos de acceso del equipo.</p><div className="receipt-sign"><span>Firma del cliente</span><span>Recibido por</span></div></div></div>}
    {false && showIntake && <IntakeModal onClose={() => setShowIntake(false)} onSave={saveIntake}/>}
  </div>
}

function Stat({icon: Icon, label, value, hint}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={18}/></div></div><strong>{value}</strong><small>{hint}</small></div>
}

function IntakeModal({onClose, onSave}) {
  const [form, setForm] = useState({customerName:'', phone:'', brand:'', model:'', imei:'', issue:'', physicalCondition:'', accessories:'', notes:''})
  const [photos, setPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const change = e => setForm({...form, [e.target.name]: e.target.value})
  async function submit(e) { e.preventDefault(); setSaving(true); await onSave({...form, photoFiles: photos}); setSaving(false) }
  return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">ORDEN DE SERVICIO</span><h2>Recepción de equipo</h2><p>Registra el estado en que recibes el dispositivo.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>
    <form onSubmit={submit}><div className="form-grid">
      <Field label="Nombre del cliente *"><input name="customerName" required value={form.customerName} onChange={change} placeholder="Nombre completo"/></Field>
      <Field label="Teléfono de contacto *"><input name="phone" required value={form.phone} onChange={change} placeholder="Número de WhatsApp"/></Field>
      <Field label="Marca *"><select name="brand" required value={form.brand} onChange={change}><option value="">Seleccionar</option>{['Samsung','Apple','Xiaomi','Motorola','Huawei','OPPO','Tecno','Otro'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Modelo *"><input name="model" required value={form.model} onChange={change} placeholder="Ej. Galaxy A04s"/></Field>
      <Field label="IMEI / serie (opcional)"><input name="imei" value={form.imei} onChange={change} placeholder="Identificador del equipo"/></Field>
      <Field label="Accesorios recibidos"><input name="accessories" value={form.accessories} onChange={change} placeholder="Ej. SIM, funda, cargador"/></Field>
      <Field label="Falla reportada *" wide><textarea name="issue" required value={form.issue} onChange={change} placeholder="Describe lo que indica el cliente..."/></Field>
      <Field label="Estado físico al recibir *" wide><textarea name="physicalCondition" required value={form.physicalCondition} onChange={change} placeholder="Rayones, golpes, pantalla quebrada, humedad, etc."/></Field>
      <Field label="Observaciones internas" wide><textarea name="notes" value={form.notes} onChange={change} placeholder="Notas para el técnico (no incluir contraseñas)"/></Field>
      <Field label="Fotografías de evidencia" wide><label className="upload"><Camera size={20}/><span>Seleccionar fotografías del equipo</span><small>Se guardarán localmente para subirlas al almacenamiento privado cuando esté configurado.</small><input type="file" accept="image/*" multiple capture="environment" onChange={e=>setPhotos(Array.from(e.target.files || []))}/></label>{photos.length>0 && <small className="photo-count">{photos.length} fotografía(s) seleccionada(s)</small>}</Field>
    </div><div className="modal-foot"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar recepción'}</button></div></form>
  </div></div>
}
function Field({label,wide,children}) { return <label className={`field ${wide?'wide':''}`}><span>{label}</span>{children}</label> }
function Login(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function submit(e){e.preventDefault();setBusy(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError('No se pudo iniciar sesión. Revisa tu correo, contraseña y confirmación de usuario.');setBusy(false)}
 return <div className="auth-screen"><form className="auth-card" onSubmit={submit}><div className="brand-mark"><Smartphone/></div><h2>Soluciones Tecnológicas Calel</h2><p>Acceso al sistema de gestión</p><label>Correo electrónico<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="auth-error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Ingresando…':'Iniciar sesión'}</button></form></div>
}
