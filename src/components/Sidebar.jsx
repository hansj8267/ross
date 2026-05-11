// src/components/Sidebar.jsx
import { useState } from "react";

const NAV = [
  { id:"home",     label:"HOME",     icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> },
  { id:"calendar", label:"CALENDAR", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { id:"email",    label:"EMAIL",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  { id:"files",    label:"FILES",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
  { id:"stripe",   label:"STRIPE",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { id:"school",   label:"SCHOOL",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
];

export default function Sidebar({ active, onChange }) {
  return (
    <div style={{
      width:64, background:"#010d1a", borderRight:"1px solid #0a2a4a",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"16px 0", gap:4, flexShrink:0, zIndex:10,
    }}>
      {/* LOGO */}
      <div style={{
        width:34, height:34, borderRadius:"50%",
        border:"1.5px solid #3399ff",
        display:"flex", alignItems:"center", justifyContent:"center",
        marginBottom:12,
      }}>
        <span style={{ fontSize:12, color:"#3399ff", fontFamily:"'Orbitron',monospace", fontWeight:700 }}>R</span>
      </div>

      <div style={{ width:32, height:"1px", background:"#0a2a4a", marginBottom:4 }}/>

      {NAV.map(item => (
        <NavItem key={item.id} item={item} isActive={active===item.id} onClick={()=>onChange(item.id)}/>
      ))}

      <div style={{ width:32, height:"1px", background:"#0a2a4a", margin:"8px 0" }}/>

      <NavItem
        item={{ id:"settings", label:"SETTINGS", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }}
        isActive={active==="settings"}
        onClick={()=>onChange("settings")}
        style={{ marginTop:"auto" }}
      />
    </div>
  );
}

function NavItem({ item, isActive, onClick, style = {} }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      title={item.label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width:40, height:40, borderRadius:8,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer",
        border:`1px solid ${isActive ? "#3399ff" : hover ? "#0a2a4a" : "transparent"}`,
        background: isActive ? "#001830" : "transparent",
        color: isActive ? "#3399ff" : hover ? "#2266aa" : "#1a4a7a",
        transition:"all .18s",
        marginBottom:2,
        ...style,
      }}
    >
      <div style={{ width:18, height:18 }}>{item.icon}</div>
    </div>
  );
}
