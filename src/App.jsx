import { useState, useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { INITIAL_VEHICLES } from './vehicles'
import './index.css'

mapboxgl.accessToken = 'pk.eyJ1IjoiamFzbWVlbmJhbCIsImEiOiJjbW91aG9nZDYwMHdyMnRxM3J3ZDlpb255In0.1SeRwu8CvP6aygqKnOI96Q'

const STATUS_COLORS = { normal:'#22C55E', alert:'#F59E0B', stopped:'#EF4444', rtb:'#A78BFA' }
const STATUS_LABELS = { normal:'Normal', alert:'ETA Alert', stopped:'Stopped', rtb:'RTB en route' }
const SC_SEQS = {
  'Severe weather':'1. Suspend dispatch → 2. Complete trips → 3. Fleet RTB',
  'Wildfire':'1. Regional suspension → 2. Regional RTB → 3. Rest continues',
  'Power outage':'1. Check depot power → 2. Fleet RTB if powered → 3. Safe Hold if depots out',
  'Network issue':'1. Safe Hold → 2. Monitor connectivity → 3. Resume when stable',
  'Flooding':'1. Zone Blockage (M2) → 2. Regional RTB if widespread',
  'Other':'Follow situational judgment — log reason below',
}

function Toast({ msg }) {
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>
}

const GKEY = 'AIzaSyAsTykUFw86Uynv2hWUn5snATQPvKWp6YQ'
const CAM_HEADINGS = { FRONT: 0, REAR: 180, LEFT: 270, RIGHT: 90 }
const CAM_PITCH = { FRONT: 0, REAR: 0, LEFT: -5, RIGHT: -5 }

function CamFeed({ label, lat, lng, vehicleHeading = 0 }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const relHeading = CAM_HEADINGS[label] || 0
  const absHeading = Math.round((vehicleHeading + relHeading) % 360)
  const pitch = CAM_PITCH[label] || 0
  const src = `https://maps.googleapis.com/maps/api/streetview?size=320x180&location=${lat.toFixed(5)},${lng.toFixed(5)}&fov=90&heading=${absHeading}&pitch=${pitch}&key=${GKEY}`

  return (
    <div style={{position:'relative',overflow:'hidden',borderRadius:6,aspectRatio:'16/9',background:'#040810',border:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
      {!imgError && (
        <img
          src={src}
          alt={label + " camera feed"}
          onLoad={()=>setImgLoaded(true)}
          onError={()=>setImgError(true)}
          style={{width:'100%',height:'100%',objectFit:'cover',display:imgLoaded?'block':'none',filter:'brightness(0.82) saturate(0.88)'}}
        />
      )}
      {!imgLoaded && !imgError && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:14,height:14,border:'2px solid rgba(34,197,94,0.25)',borderTopColor:'#22C55E',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
        </div>
      )}
      {imgError && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:3,background:'#040810'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span style={{fontSize:8,color:'rgba(255,255,255,0.15)',fontFamily:'monospace'}}>NO SIGNAL</span>
        </div>
      )}
      <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.02) 3px,rgba(0,0,0,0.02) 4px)'}}/>
        <div style={{position:'absolute',top:0,left:0,right:0,padding:'3px 5px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'linear-gradient(rgba(0,0,0,0.65),transparent)'}}>
          <span style={{fontSize:8,fontFamily:'monospace',color:'rgba(255,255,255,0.8)',fontWeight:500,letterSpacing:'0.05em'}}>{label}</span>
          <div style={{display:'flex',alignItems:'center',gap:3}}>
            <div style={{width:4,height:4,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 4px #22C55E'}}/>
            <span style={{fontSize:7,fontFamily:'monospace',color:'rgba(34,197,94,0.9)'}}>LIVE</span>
          </div>
        </div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'3px 5px',background:'linear-gradient(transparent,rgba(0,0,0,0.75))'}}>
          <span style={{fontSize:7,fontFamily:'monospace',color:'rgba(255,255,255,0.35)'}}>{absHeading}° HDG</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef({})
  const animFrameRef = useRef(null)

  const [role, setRoleState] = useState('op')
  const [vehicles, setVehicles] = useState(INITIAL_VEHICLES)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [activeNav, setActiveNav] = useState('fleet')
  const [tab, setTab] = useState('alerts')
  const [toastMsg, setToastMsg] = useState('')
  const [clock, setClock] = useState('')
  const [scenario, setScenario] = useState(null)
  const [scUnlocked, setScUnlocked] = useState(false)
  const [searchDone, setSearchDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [causeSel, setCauseSel] = useState(null)
  const toastTimer = useRef(null)

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0,8))
    tick(); const t = setInterval(tick,1000); return ()=>clearInterval(t)
  },[])

  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(()=>setToastMsg(''), 2800)
  },[])

  // Init map
  useEffect(()=>{
    if (map.current || !mapContainer.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-122.4194, 37.7749],
      zoom: 12.5,
      pitch: 30,
      bearing: -10,
    })
    map.current.addControl(new mapboxgl.NavigationControl({showCompass:false}), 'bottom-right')
    map.current.on('load', () => {
      // Zone overlay
      map.current.addSource('marathon-zone', {
        type:'geojson',
        data:{type:'Feature',geometry:{type:'Polygon',coordinates:[[
          [-122.4194,37.7749],[-122.4094,37.7849],[-122.3994,37.7799],[-122.4094,37.7699],[-122.4194,37.7749]
        ]]}}
      })
      map.current.addLayer({id:'marathon-fill',type:'fill',source:'marathon-zone',paint:{'fill-color':'#EF4444','fill-opacity':0.08}})
      map.current.addLayer({id:'marathon-line',type:'line',source:'marathon-zone',paint:{'line-color':'#EF4444','line-width':2,'line-dasharray':[3,3],'line-opacity':0.6}})
    })
    return () => { map.current?.remove(); map.current = null }
  },[])

  // Create/update markers
  useEffect(()=>{
    if (!map.current) return
    const onMapLoad = () => {
      vehicles.forEach(v => {
        if (markersRef.current[v.id]) {
          markersRef.current[v.id].setLngLat([v.lng, v.lat])
          return
        }
        const el = document.createElement('div')
        el.className = 'map-marker'
        el.style.cssText = `
          width:22px;height:22px;border-radius:50%;
          background:${STATUS_COLORS[v.status]};
          border:2px solid rgba(255,255,255,0.25);
          cursor:pointer;
          box-shadow:0 0 10px ${STATUS_COLORS[v.status]}88;
          display:flex;align-items:center;justify-content:center;
          transition:transform 0.2s;
        `
        if (v.status === 'stopped') {
          el.style.animation = 'markerPulse 2s infinite'
        }
        el.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
        el.addEventListener('mouseenter', ()=> el.style.transform='scale(1.4)')
        el.addEventListener('mouseleave', ()=> el.style.transform='scale(1)')
        el.addEventListener('click', ()=> setSelectedVehicle(v))
        const marker = new mapboxgl.Marker({element:el}).setLngLat([v.lng,v.lat]).addTo(map.current)
        markersRef.current[v.id] = marker
      })
    }
    if (map.current.loaded()) onMapLoad()
    else map.current.on('load', onMapLoad)
  },[vehicles])


  const isSr = role==='sr'||role==='sv'
  const isSv = role==='sv'
  const roleUsers = {op:'S.Chen / MOC-04', sr:'L.Wang / MOC-11', sv:'P.Krishnan / Supervisor'}
  const roleTagClass = {op:'role-tag-op', sr:'role-tag-sr', sv:'role-tag-sv'}
  const roleTagText = {op:'MOC Operator', sr:'Senior MOC', sv:'Supervisor'}

  const setRole = (r) => {
    setRoleState(r)
    setActivePanel(null)
    setSelectedVehicle(null)
    setActiveNav('fleet')
    toast(`Switched to ${roleTagText[r]} view`)
  }

  const openMod = (mod) => { setActivePanel(mod); setActiveNav(mod); setSelectedVehicle(null) }
  const closePanel = () => { setActivePanel(null); setActiveNav('fleet') }

  const counts = {
    normal: vehicles.filter(v=>v.status==='normal').length,
    alert: vehicles.filter(v=>v.status==='alert').length,
    stopped: vehicles.filter(v=>v.status==='stopped').length,
    rtb: vehicles.filter(v=>v.status==='rtb').length,
  }

  const ALERTS = [
    {id:1,p:'P0',pt:'pt0',cls:'alert-p0',title:'V-05 stopped — SoMa',meta:'Conf 64% · Unknown obstruction · Tap for responder view',age:'4m',mod:'responder'},
    {id:2,p:'P0',pt:'pt0',cls:'alert-p0',title:'V-33 stopped — Chinatown',meta:'Conf 61% · Route blocked · Awaiting assist',age:'2m',mod:'responder'},
    {id:3,p:'P1',pt:'pt1',cls:'alert-p1',title:'ETA +18 min — T-2847',meta:'V-07 · Mission District · AI hesitation events',age:'6m',mod:'trip'},
    {id:4,p:'P1',pt:'pt1',cls:'alert-p1',title:'ETA +11 min — T-2851',meta:'V-03 · Financial District · Traffic congestion',age:'3m',mod:'trip'},
    {id:5,p:'P2',pt:'pt2',cls:'alert-p2',title:'Dropoff deviation +143m',meta:'T-2839 · V-15 · Potrero Hill · Unclassified',age:'12m',mod:'trip'},
  ]

  const Icon = ({path,size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{path}</svg>
  )

  return (
    <div className="shell">
      <style>{`
        @keyframes markerPulse {
          0%,100%{box-shadow:0 0 10px rgba(239,68,68,0.5)}
          50%{box-shadow:0 0 24px rgba(239,68,68,0.9),0 0 40px rgba(239,68,68,0.4)}
        }
        .mapboxgl-ctrl-bottom-right{bottom:60px!important}
        .mapboxgl-ctrl-group{background:var(--bg-surface)!important;border:1px solid var(--border)!important}
        .mapboxgl-ctrl-group button{background:var(--bg-surface)!important;color:var(--text-secondary)!important}
        .mapboxgl-ctrl-group button:hover{background:var(--bg-elevated)!important}
      `}</style>

      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo">
          <div className="logo-dot"/>
          <span>NURO</span>
          <span style={{color:'var(--text-muted)',fontWeight:300}}>MOC</span>
        </div>
        <div className="divider"/>
        <div className="city">San Francisco Operations</div>
        <div className="divider"/>
        <div className="role-switcher">
          {[['op','MOC Operator','active-op'],['sr','Senior MOC','active-sr'],['sv','Supervisor','active-sv']].map(([r,label,cls])=>(
            <button key={r} className={`role-btn ${role===r?cls:''}`} onClick={()=>setRole(r)}>{label}</button>
          ))}
        </div>
        <span className={`role-tag ${roleTagClass[role]}`}>{roleTagText[role]}</span>
        <div className="topbar-right">
          <div className="live-pill"><div className="live-dot"/>LIVE</div>
          <div className="clock">{clock}</div>
          <div className="user-info">{roleUsers[role]}</div>
        </div>
      </div>

      {/* SIDENAV */}
      {role !== 'sv' && (
        <div className="sidenav">
          {[
            {key:'fleet',icon:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,badge:false},
            {key:'zone',icon:<><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/><line x1="4" y1="20" x2="20" y2="4"/></>,badge:true},
            {key:'emergency',icon:<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,badge:false},
            null,
            {key:'responder',icon:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,badge:true},
            {key:'trip',icon:<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,badge:true},
          ].map((item,i)=> item===null ? <div key={i} className="nav-sep"/> : (
            <button key={item.key} className={`nav-btn ${activeNav===item.key?'active':''}`}
              onClick={()=>item.key==='fleet'?closePanel():openMod(item.key)}
              title={item.key} aria-label={item.key}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
              {item.badge && <div className="nav-badge"/>}
            </button>
          ))}
        </div>
      )}

      {/* MAIN */}
      <div className="main" style={role==='sv'?{gridColumn:'1/-1',gridTemplateColumns:'1fr'}:{}}>
        {role === 'sv' ? (
          // SUPERVISOR VIEW
          <div className="sup-grid">
            <div className="sup-quad">
              <div className="quad-header">
                <div className="quad-icon qi-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
                <div><div className="quad-title">Operator workload</div><div className="quad-sub">5 MOCs on shift · 2 need attention</div></div>
              </div>
              {[
                {init:'SC',name:'S. Chen',id:'MOC-04',detail:'3h 12m · Overloaded',cls:'overloaded',avcls:'av-red',load:85,alerts:5,acls:'ac-red'},
                {init:'MO',name:'M. Okafor',id:'MOC-02',detail:'5h 44m · Moderate',cls:'moderate',avcls:'av-amber',load:55,alerts:3,acls:'ac-amber'},
                {init:'JR',name:'J. Rivera',id:'MOC-07',detail:'1h 20m · Available',cls:'available',avcls:'av-green',load:18,alerts:1,acls:'ac-green'},
                {init:'AP',name:'A. Patel',id:'MOC-09',detail:'2h 05m · Available',cls:'available',avcls:'av-green',load:12,alerts:1,acls:'ac-green'},
                {init:'LW',name:'L. Wang',id:'Senior MOC',detail:'4h 30m · Available',cls:'available',avcls:'av-green',load:8,alerts:0,acls:'ac-green'},
              ].map(m=>(
                <div key={m.init} className={`moc-row ${m.cls}`} onClick={()=>toast(`Opening ${m.name}'s queue`)}>
                  <div className={`moc-avatar ${m.avcls}`}>{m.init}</div>
                  <div>
                    <div className="moc-name">{m.name} <span style={{fontSize:10,color:'var(--text-muted)',fontWeight:400}}>{m.id}</span></div>
                    <div className="moc-detail">{m.detail}</div>
                    <div className="load-bar"><div className={`load-fill lf-${m.cls==='overloaded'?'red':m.cls==='moderate'?'amber':'green'}`} style={{width:`${m.load}%`}}/></div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className={`alert-count ${m.acls}`}>{m.alerts}</div>
                    <div className="ac-label">alerts</div>
                  </div>
                </div>
              ))}
              <button className="btn btn-neutral" style={{marginTop:8}} onClick={()=>toast('2 alerts moved from S.Chen → J.Rivera')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                Rebalance — move 2 alerts S.Chen → J.Rivera
              </button>
            </div>

            <div className="sup-quad">
              <div className="quad-header">
                <div className="quad-icon qi-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                <div><div className="quad-title">Shift performance</div><div className="quad-sub">Day shift · 06:00—14:00 · 6h 32m elapsed</div></div>
              </div>
              <div className="metric-grid">
                {[['Alerts resolved','47','mv-good'],['Avg resolution','1m 52s','mv-warn'],['P0 incidents','2','mv-bad'],['Auto-resolved','18%','mv-neutral']].map(([l,v,c])=>(
                  <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className={`metric-value ${c}`}>{v}</div></div>
                ))}
              </div>
              <div className="sec-label">SLA compliance</div>
              {[
                ['P0 response < 30s','28.4s','On track','st-green'],
                ['P1 response < 2 min','1m 52s','On track','st-green'],
                ['Zone propagation < 60s','44s avg','On track','st-green'],
                ['Responder SLA < 30s','34.1s','At risk','st-amber'],
                ['Audit completeness','100%','Compliant','st-green'],
              ].map(([k,v,tag,tc])=>(
                <div key={k} className="sla-row"><span className="sla-key">{k}</span><div className="sla-right"><span className="sla-val">{v}</span><span className={`sla-tag ${tc}`}>{tag}</span></div></div>
              ))}
              <button className="btn btn-neutral" style={{marginTop:12}} onClick={()=>toast('Shift audit report exported')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export shift audit report
              </button>
            </div>

            <div className="sup-quad">
              <div className="quad-header">
                <div className="quad-icon qi-red"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                <div><div className="quad-title">Escalations — your action needed</div><div className="quad-sub">3 items require supervisor decision</div></div>
              </div>
              {[
                {cls:'esc-p0',tag:'HOLD >20 MIN',tclass:'pt0',title:'V-05 — confirm or release',meta:'23 min incident hold · SoMa · SFPD on scene · MOC-04',btns:[{l:'Extend 30 min',c:'approve',m:'Hold extended — supervisor logged'},{l:'Release',c:'',m:'V-05 released — returning to service'},{l:'Generate report',c:'',m:'DMV report initiated'}]},
                {cls:'esc-p1',tag:'APPROVAL',tclass:'pt1',title:'Zone blockage — 26 vehicles',meta:'MOC-02 created Caltrain closure · 26 vehicles affected · Waiting 3m',btns:[{l:'Approve',c:'approve',m:'Zone approved — 26 vehicles rerouting'},{l:'Modify',c:'',m:'Sent back for adjustment'},{l:'Reject',c:'reject',m:'Zone rejected'}]},
                {cls:'esc-p1',tag:'FLEET CMD',tclass:'pt1',title:'RTB request — Severe Weather',meta:'Senior MOC L.Wang · 6 vehicles · 4 passengers · Depot A: 8 spaces',btns:[{l:'Approve RTB',c:'approve',m:'Fleet RTB approved — 6 vehicles en route'},{l:'Modify scope',c:'',m:'Scope modified to regional'},{l:'Hold',c:'reject',m:'RTB held — requesting more info'}]},
              ].map((e,i)=>(
                <div key={i} className={`esc-card ${e.cls}`}>
                  <div className="esc-header"><span className={`priority-tag ${e.tclass}`}>{e.tag}</span><span className="esc-title">{e.title}</span></div>
                  <div className="esc-meta">{e.meta}</div>
                  <div className="esc-btns">{e.btns.map(b=><button key={b.l} className={`esc-btn ${b.c}`} onClick={()=>toast(b.m)}>{b.l}</button>)}</div>
                </div>
              ))}
            </div>

            <div className="sup-quad">
              <div className="quad-header">
                <div className="quad-icon qi-amber"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></div>
                <div><div className="quad-title">Fleet health — {vehicles.length} vehicles</div><div className="quad-sub">San Francisco · Live aggregate view</div></div>
              </div>
              <div className="fleet-chips">
                {[['Normal',counts.normal,'var(--green)'],['Alerting',counts.alert,'var(--amber)'],['Stopped',counts.stopped,'var(--red)'],['RTB',counts.rtb,'var(--purple)']].map(([l,v,c])=>(
                  <div key={l} className="fleet-chip"><div className="chip-val" style={{color:c}}>{v}</div><div className="chip-label">{l}</div></div>
                ))}
              </div>
              <div className="sec-label">Active zones</div>
              {[['SF Marathon','23 rerouted','Exp 17:00','st-amber'],['Caltrain area','26 affected','Pending','st-red']].map(([k,v,tag,tc])=>(
                <div key={k} className="sla-row"><span className="sla-key">{k}</span><div className="sla-right"><span className="sla-val">{v}</span><span className={`sla-tag ${tc}`}>{tag}</span></div></div>
              ))}
              <div className="sec-label" style={{marginTop:10}}>Regulatory audit</div>
              {[['Actions with reason codes','54/54','st-green'],['Incident packages','1 · SFPD',''],['DMV reports pending','1 open','st-amber']].map(([k,v,tc])=>(
                <div key={k} className="sla-row"><span className="sla-key">{k}</span><div className="sla-right"><span className="sla-val">{v}</span>{tc&&<span className={`sla-tag ${tc}`}>{tc==='st-green'?'Compliant':'Action needed'}</span>}</div></div>
              ))}
              <button className="btn btn-neutral" style={{marginTop:10}} onClick={()=>toast('Pattern report exported for AI Engineering')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Export deviation pattern report
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MAP AREA */}
            <div className="map-area">
              <div ref={mapContainer} style={{width:'100%',height:'100%'}}/>

              {/* Zone label */}
              <div style={{position:'absolute',top:12,left:12,zIndex:10,background:'rgba(7,12,24,0.85)',border:'1px solid rgba(239,68,68,0.4)',borderRadius:8,padding:'5px 10px',display:'flex',alignItems:'center',gap:6,backdropFilter:'blur(4px)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'var(--red)',animation:'pulse 2s infinite'}}/>
                <span style={{fontSize:11,color:'var(--red)',fontFamily:'var(--font-mono)'}}>SF Marathon zone active — expires 17:00</span>
              </div>

              {/* Vehicle detail card */}
              {selectedVehicle && (
                <div className="vehicle-card">
                  <div className="vc-header">
                    <div>
                      <div className="vc-id">{selectedVehicle.id}</div>
                      <div style={{fontSize:10,color:STATUS_COLORS[selectedVehicle.status],fontFamily:'var(--font-mono)',marginTop:2}}>{STATUS_LABELS[selectedVehicle.status]}</div>
                    </div>
                    <button className="vc-close" onClick={()=>setSelectedVehicle(null)}>×</button>
                  </div>
                  <div style={{marginBottom:8,fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>
                    {selectedVehicle.lat.toFixed(4)}°N {Math.abs(selectedVehicle.lng).toFixed(4)}°W
                  </div>
                  <div className="cam-grid">
                    {['FRONT','REAR','LEFT','RIGHT'].map(l=><CamFeed key={l} label={l} lat={selectedVehicle.lat} lng={selectedVehicle.lng} vehicleHeading={selectedVehicle.heading}/>)}
                  </div>
                  <div className="stat-row"><span className="stat-key">Speed</span><span className="stat-val">{selectedVehicle.speed} mph</span></div>
                  <div className="stat-row"><span className="stat-key">AI confidence</span><span className="stat-val" style={{color:selectedVehicle.conf<70?'var(--red)':selectedVehicle.conf<80?'var(--amber)':'var(--green)'}}>{selectedVehicle.conf}%</span></div>
                  <div className="stat-row"><span className="stat-key">Zone</span><span className="stat-val">{selectedVehicle.zone}</span></div>
                  <div className="stat-row"><span className="stat-key">Heading</span><span className="stat-val">{selectedVehicle.heading}°</span></div>
                  <div className="vc-actions">
                    <button className="vc-btn" onClick={()=>toast(`Investigating ${selectedVehicle.id}…`)}>Investigate</button>
                    <button className="vc-btn" onClick={()=>toast(`RTB sent to ${selectedVehicle.id}`)}>RTB</button>
                    <button className={`vc-btn danger ${!isSr?'disabled':''}`} onClick={()=>isSr?toast(`Incident hold on ${selectedVehicle.id}`):toast('Incident hold requires Senior MOC')}>Hold</button>
                  </div>
                </div>
              )}

              {/* Panels */}
              <div className={`panel ${activePanel==='zone'?'open':''}`}>
                <div className="panel-header">
                  <button className="panel-back" onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                  <div className="panel-title">Zone & blockage management</div>
                  <div className="panel-badge" style={{background:'var(--red-dim)',color:'var(--red)'}}>1 active</div>
                </div>
                <div className="sec-label">Active zones</div>
                <div className="alert-card alert-p0" style={{marginBottom:14}}>
                  <div className="alert-header"><span className="priority-tag pt0">ACTIVE</span><span className="alert-title">SF Marathon — Hayes Valley to Embarcadero</span></div>
                  <div className="alert-meta">MOC-02 · 23 vehicles rerouted · Expires 17:00 today</div>
                </div>
                <div className="sec-label">Create new zone</div>
                <div className="form-row"><label className="form-label">Zone name</label><input className="form-input" placeholder="e.g. Valencia St flooding" aria-label="Zone name"/></div>
                <div className="form-row"><label className="form-label">Type</label><select className="form-select" aria-label="Zone type"><option>Planned event</option><option>Hazard — flooding</option><option>Hazard — wildfire</option><option>Road closure</option></select></div>
                <div style={{border:'1.5px dashed var(--border-strong)',borderRadius:8,height:90,background:'var(--bg-base)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-muted)',cursor:'crosshair',marginBottom:12,gap:6}} onClick={()=>toast('Draw mode — click map to place zone polygon corners')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Click to draw on live SF map
                </div>
                <div className="form-row"><label className="form-label">Expires</label><select className="form-select" aria-label="Expiry"><option>In 2 hours</option><option>In 4 hours</option><option>In 8 hours</option></select></div>
                <div className="data-row"><span className="data-key">Vehicles affected</span><span className="data-val" style={{color:'var(--red)'}}>14 vehicles</span></div>
                <div className="data-row"><span className="data-key">Senior MOC approval</span><span className="data-val">{isSr?'Not required':'No (under 20)'}</span></div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>{toast('Zone activated — 14 vehicles rerouting');setTimeout(closePanel,1200)}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Activate zone
                </button>
              </div>

              <div className={`panel ${activePanel==='emergency'?'open':''}`}>
                <div className="panel-header">
                  <button className="panel-back" onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                  <div className="panel-title">Emergency command center</div>
                </div>
                {!isSr && <div className="lock-note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Fleet commands require Senior MOC role</div>}
                <div className="sec-label">Step 1 — Select scenario</div>
                <div className="scenario-grid">
                  {[['🌩','Severe weather'],['🔥','Wildfire'],['⚡','Power outage'],['📡','Network issue'],['💧','Flooding'],['⋯','Other']].map(([icon,sc])=>(
                    <div key={sc} className={`scenario-opt ${scenario===sc?'selected':''}`} onClick={()=>{setScenario(sc);setScUnlocked(true);toast(`Scenario: ${sc} — commands unlocked`)}}>
                      <span className="scenario-icon">{icon}</span>{sc}
                    </div>
                  ))}
                </div>
                {scenario && <div className="info-box"><strong>{scenario}:</strong><br/>{SC_SEQS[scenario]}</div>}
                <div className="sec-label">Fleet commands</div>
                <button className={`btn btn-warning ${(!isSr||!scUnlocked)?'btn-disabled':''}`} onClick={()=>toast('Dispatch suspension sent — new trips blocked')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  Suspend dispatch
                </button>
                <button className={`btn btn-danger ${(!isSr||!scUnlocked)?'btn-disabled':''}`} onClick={()=>setShowModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                  Fleet return to base (RTB)
                </button>
                <button className={`btn btn-warning ${(!isSr||!scUnlocked)?'btn-disabled':''}`} onClick={()=>toast('Safe Hold — all vehicles pulling over')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0"/><path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></svg>
                  Safe hold — all vehicles
                </button>
                <div className="sec-label" style={{marginTop:10}}>Single vehicle (all roles)</div>
                <div className="form-row"><input className="form-input" placeholder="Vehicle ID e.g. V-23"/></div>
                <button className="btn btn-neutral" onClick={()=>toast('Single vehicle RTB sent')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                  RTB — single vehicle
                </button>
                <div className="sec-label" style={{marginTop:10}}>Command log</div>
                <div className="data-row"><span className="data-key">13:44</span><span className="data-val" style={{fontFamily:'var(--font-sans)',fontSize:11}}>V-31 RTB · Sensor Degradation · MOC-04</span></div>
                <div className="data-row"><span className="data-key">12:11</span><span className="data-val" style={{fontFamily:'var(--font-sans)',fontSize:11}}>Dispatch suspended · SoMa · MOC-02</span></div>
              </div>

              <div className={`panel ${activePanel==='responder'?'open':''}`}>
                <div className="panel-header">
                  <button className="panel-back" onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                  <div className="panel-title">Incident & responder support</div>
                </div>
                <div className="sec-label">Find vehicle</div>
                <div className="search-row">
                  <input className="form-input" placeholder="Vehicle ID, plate, or trip ID" id="rsi"/>
                  <button className="search-btn" onClick={()=>{const v=document.getElementById('rsi')?.value;if(!v){toast('Enter vehicle ID');return;}setSearchDone(true)}}>Search</button>
                </div>
                {searchDone && (
                  <div className="search-result">
                    <div className="result-id">V-05 — 2024 Lucid Gravity (Silver) · 8NUR-005</div>
                    <div className="data-row"><span className="data-key">GPS</span><span className="data-val">37.7812°N 122.4094°W</span></div>
                    <div className="data-row"><span className="data-key">Location</span><span className="data-key">4th St & Folsom St, SoMa, SF</span></div>
                    <div className="data-row"><span className="data-key">Status</span><span className="data-val" style={{color:'var(--red)'}}>Stopped · 4m 12s</span></div>
                    <div className="data-row"><span className="data-key">Passengers</span><span className="data-val">0 aboard</span></div>
                    <div className="readout-box">"Vehicle 05 is stopped at 4th Street and Folsom, facing north, no passengers aboard, stationary for 4 minutes."</div>
                    <div className="form-row" style={{marginTop:10}}><label className="form-label">Recipient (required)</label><input className="form-input" placeholder="e.g. SFPD badge #1234" id="recip"/></div>
                    <button className="btn btn-primary" onClick={()=>{const r=document.getElementById('recip')?.value;if(!r){toast('Recipient required for audit log');return;}toast('Incident package generated — secure link ready')}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                      Generate incident package
                    </button>
                    {!isSr && <div className="lock-note" style={{marginTop:8}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Incident hold requires Senior MOC</div>}
                    <button className={`btn btn-danger ${!isSr?'btn-disabled':''}`} style={{marginTop:4}} onClick={()=>toast('Incident hold placed · Hazard lights on · Supervisor notified')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                      Place incident hold (Senior MOC)
                    </button>
                    {!isSv && <div className="lock-note" style={{marginTop:8}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>DMV report requires Supervisor</div>}
                    <button className={`btn btn-success ${!isSv?'btn-disabled':''}`} style={{marginTop:4}} onClick={()=>toast('DMV incident report generated — PDF ready')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Generate DMV report (Supervisor)
                    </button>
                  </div>
                )}
                {!searchDone && <div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>Search for a vehicle to pull up responder data</div>}
              </div>

              <div className={`panel ${activePanel==='trip'?'open':''}`}>
                <div className="panel-header">
                  <button className="panel-back" onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                  <div className="panel-title">Trip intelligence</div>
                  <div className="panel-badge" style={{background:'var(--amber-dim)',color:'var(--amber)'}}>3 ETA · 1 location</div>
                </div>
                <div className="sec-label">ETA deviation queue</div>
                {[
                  {id:'T-2847',vid:'V-07',dev:'+18 min',pt:'pt0',route:'Mission District → SFO T2',cause:'AI hesitation events (3)',pct:72,hi:true,age:'6 min'},
                  {id:'T-2851',vid:'V-03',dev:'+11 min',pt:'pt1',route:'Financial District → Caltrain',cause:'Traffic congestion',pct:44,hi:false,age:'3 min'},
                  {id:'T-2863',vid:'V-26',dev:'+14 min',pt:'pt1',route:'Outer Sunset → Union Square',cause:'Zone blockage impact',pct:56,hi:false,age:'8 min'},
                ].map(t=>(
                  <div key={t.id} className="trip-card" onClick={()=>toast(`Opening ${t.id} investigation…`)}>
                    <div className="trip-header"><span className={`priority-tag ${t.pt}`}>{t.dev}</span><span className="trip-id">{t.id} · {t.vid}</span><span className="alert-age">{t.age}</span></div>
                    <div className="dev-bar"><div className={`dev-fill ${t.hi?'df-high':'df-med'}`} style={{width:`${t.pct}%`}}/></div>
                    <div className="trip-route">{t.route}</div>
                    <div className="cause-chip">{t.cause}</div>
                  </div>
                ))}
                <div className="sec-label" style={{marginTop:10}}>Classify root cause</div>
                {['No action needed','Action taken','Escalate to engineering'].map(c=>(
                  <span key={c} className={`cause-btn ${causeSel===c?'selected':''}`} onClick={()=>{setCauseSel(c);toast(`Classified: ${c}`)}}>{c}</span>
                ))}
                <div className="sec-label" style={{marginTop:12}}>Passenger notification</div>
                <div className="form-row"><select className="form-select"><option>— Select template —</option><option>Minor delay — we apologize</option><option>Significant delay — traffic event</option><option>Major delay — cancel at no charge</option></select></div>
                <button className="btn btn-primary" onClick={()=>toast('Passenger notification sent via Uber API')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send via Uber
                </button>
                <div className="sec-label" style={{marginTop:12}}>Location deviations</div>
                <div className="trip-card" onClick={()=>toast('Opening T-2839 location deviation investigation…')}>
                  <div className="trip-header"><span className="priority-tag pt2" style={{background:'var(--purple-dim)',color:'var(--purple)'}}>+143m</span><span className="trip-id">T-2839 · V-15</span><span className="alert-age">Completed</span></div>
                  <div className="trip-route">Dropoff deviation — Potrero Hill</div>
                  <div className="cause-chip">Unclassified — needs review</div>
                </div>
                <button className="btn btn-neutral" style={{marginTop:8}} onClick={()=>toast('Engineering ticket TKT-4821 created')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                  Flag for engineering escalation
                </button>
              </div>

              {/* RTB Modal */}
              {showModal && (
                <div className="modal-overlay">
                  <div className="modal">
                    <div className="modal-title">Confirm fleet RTB — {vehicles.length} vehicles</div>
                    <div className="modal-sub">Review impact before commanding the entire San Francisco fleet.</div>
                    <div className="modal-data">
                      <div className="data-row"><span className="data-key">Vehicles affected</span><span className="data-val">{vehicles.length} vehicles</span></div>
                      <div className="data-row"><span className="data-key">Passengers in transit</span><span className="data-val" style={{color:'var(--amber)'}}>18 passengers</span></div>
                      <div className="data-row"><span className="data-key">Depot A — Mission Bay</span><span className="data-val">22 spaces available</span></div>
                      <div className="data-row"><span className="data-key">Depot B — Potrero</span><span className="data-val">18 spaces available</span></div>
                      <div className="data-row"><span className="data-key">Est. full fleet arrival</span><span className="data-val">~24 minutes</span></div>
                    </div>
                    <div className="form-row"><label className="form-label">Passenger handling</label><select className="form-select"><option>Complete active trips then RTB (default)</option><option>Safe Hold immediately (Supervisor required)</option></select></div>
                    <div className="modal-actions">
                      <button className="modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
                      <button className="modal-confirm" onClick={()=>{setShowModal(false);toast(`Fleet RTB commanded — ${vehicles.length} vehicles en route to depots`)}}>Confirm RTB — send to fleet</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Map controls */}
              <div className="map-controls">
                <button className="map-btn active"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>Zones</button>
                <button className="map-btn" onClick={()=>toast('Filtering to alert vehicles only')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Alerts only</button>
                <button className="map-btn" onClick={()=>openMod('zone')}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Draw zone</button>
              </div>

              {/* Legend */}
              <div className="map-legend">
                {[['#22C55E',`Normal (${counts.normal})`],['#F59E0B',`Alert (${counts.alert})`],['#EF4444',`Stopped (${counts.stopped})`],['#A78BFA',`RTB (${counts.rtb})`]].map(([c,l])=>(
                  <div key={l} className="legend-row"><div className="legend-dot" style={{background:c}}/>{l}</div>
                ))}
                <div style={{borderTop:'1px solid var(--border)',paddingTop:5,marginTop:3,fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>{vehicles.length} vehicles total</div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="right-panel">
              <div className="panel-tabs">
                <div className={`panel-tab ${tab==='alerts'?'active':''}`} onClick={()=>setTab('alerts')}>Alerts ({ALERTS.length})</div>
                <div className={`panel-tab ${tab==='fleet'?'active':''}`} onClick={()=>setTab('fleet')}>Fleet ({vehicles.length})</div>
              </div>
              <div className="panel-content">
                {tab==='alerts' ? (
                  <>
                    <div className="sec-label">Active alerts ({ALERTS.length})</div>
                    {ALERTS.map(a=>(
                      <div key={a.id} className={`alert-card ${a.cls}`} onClick={()=>openMod(a.mod)}>
                        <div className="alert-header"><span className={`priority-tag ${a.pt}`}>{a.p}</span><span className="alert-title">{a.title}</span><span className="alert-age">{a.age}</span></div>
                        <div className="alert-meta">{a.meta}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="fleet-stats">
                      {[['Active',counts.normal,'var(--text-primary)','normal'],['Alerting',counts.alert,'var(--amber)','of 40'],['Stopped',counts.stopped,'var(--red)','need assist'],['RTB',counts.rtb,'var(--purple)','en route']].map(([l,v,c,s])=>(
                        <div key={l} className="stat-card"><div className="stat-label">{l}</div><div className="stat-value" style={{color:c}}>{v}</div><div className="stat-sub">{s}</div></div>
                      ))}
                    </div>
                    <div className="sec-label">All vehicles</div>
                    <div style={{maxHeight:400,overflowY:'auto'}}>
                      {vehicles.map(v=>(
                        <div key={v.id} className="data-row" onClick={()=>{setSelectedVehicle(v);if(map.current)map.current.flyTo({center:[v.lng,v.lat],zoom:15,duration:800})}} style={{cursor:'pointer'}}>
                          <span style={{display:'flex',alignItems:'center',gap:7,color:'var(--text-secondary)'}}>
                            <span style={{width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[v.status],flexShrink:0,display:'inline-block'}}/>
                            <span style={{fontFamily:'var(--font-mono)',fontSize:11}}>{v.id}</span>
                          </span>
                          <span style={{color:v.status==='stopped'?'var(--red)':v.status==='alert'?'var(--amber)':v.status==='rtb'?'var(--purple)':'var(--text-muted)',fontSize:10}}>{v.zone}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Toast msg={toastMsg}/>
    </div>
  )
}
