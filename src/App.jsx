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

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Smartphone size={23}/></div><div><b>ST CALEL</b><small>Sistema de gestión</small></div><button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)}><X/></button></div>
      <div className="nav-label">MENÚ PRINCIPAL</div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={`nav-item ${section === label ? 'active' : ''}`} onClick={() => {setSection(label); setMobileMenu(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={17}/><span>Acceso protegido por roles</span></div>
    </aside>
    {mobileMenu && <div className="scrim" onClick={() => setMobileMenu(false)} />}
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={() => setMobileMenu(true)}><Menu/></button><div className="crumb">Sistema <span>/</span> {section}</div><div className="top-actions"><span className={`connection ${online ? 'on' : 'off'}`}>{online ? <Cloud size={15}/> : <CloudOff size={15}/>} {online ? 'En línea' : 'Sin conexión'}</span><div className="avatar">SC</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">SOLUCIONES TECNOLÓGICAS CALEL</div><h1>{section}</h1><p>Controla tus reparaciones, clientes, inventario y ventas desde un solo lugar.</p></div><button className="primary" onClick={() => setShowIntake(true)}><Plus size={17}/> Nueva recepción</button></div>
        {notice && <div className="notice"><Activity size={17}/><span>{notice}</span><button onClick={() => setNotice('')}><X size={16}/></button></div>}
        <div className="stat-grid">
          <Stat icon={Wrench} label="Órdenes pendientes" value={orders.length} hint="Registros locales de prueba"/>
          <Stat icon={Users} label="Clientes registrados" value="—" hint="Conecta Supabase para activar"/>
          <Stat icon={Package} label="Productos en inventario" value="—" hint="Módulo por implementar"/>
          <Stat icon={CreditCard} label="Ventas del día" value="Q 0.00" hint="Quetzales guatemaltecos"/>
        </div>
        <div className="two-col">
          <section className="panel"><div className="panel-head"><div><h2>Actividad reciente</h2><p>Recepciones guardadas en este dispositivo</p></div><button className="text-btn" onClick={refreshLocal}>Actualizar</button></div>
            {orders.length ? <div className="order-list">{orders.slice(0,6).map(o => <div className="order-row" key={o.id}><div className="device-icon"><Smartphone size={19}/></div><div className="order-info"><b>{o.brand} {o.model}</b><small>{o.customerName} · {o.issue}</small></div><span className="status pending">Pendiente nube</span></div>)}</div> : <div className="empty"><div className="empty-icon"><ClipboardList size={25}/></div><b>Aún no hay recepciones</b><span>Registra tu primer teléfono para iniciar el expediente de reparación.</span><button className="secondary" onClick={() => setShowIntake(true)}>Registrar equipo</button></div>}
          </section>
          <section className="panel"><div className="panel-head"><div><h2>Estado de sincronización</h2><p>Datos locales y almacenamiento en la nube</p></div><span className={`dot ${online ? 'green' : 'amber'}`}/></div>
            <div className="sync-card"><div className="sync-icon">{online ? <Cloud/> : <CloudOff/>}</div><div><b>{online ? 'Conexión disponible' : 'Trabajando sin conexión'}</b><small>{isSupabaseConfigured ? 'Supabase configurado' : 'Supabase aún no está configurado'}</small></div></div>
            <div className="sync-line"><span>Elementos pendientes</span><b>{pending}</b></div><div className="sync-line"><span>Modo de trabajo</span><b>Híbrido</b></div>
            <button className="secondary full" onClick={syncPending}>Comprobar sincronización</button>
            <div className="security-note"><ShieldCheck size={16}/> Las fotografías y datos de clientes deben almacenarse en espacios privados con permisos por usuario.</div>
          </section>
        </div>
        <div className="footnote">Versión inicial 0.1 · Los módulos se activarán progresivamente. No uses datos reales de clientes hasta configurar autenticación, permisos y respaldos.</div>
      </div>
    </main>
    {showIntake && <IntakeModal onClose={() => setShowIntake(false)} onSave={saveIntake}/>}
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