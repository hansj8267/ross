// src/App.jsx — Ross with Dev Mode
import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import useRoss from "./hooks/useRoss";
import VoiceOrb from "./components/VoiceOrb";
import WaveCanvas from "./components/WaveCanvas";
import Sidebar from "./components/Sidebar";
import { ChatStrip } from "./components/TopBar";
import FilesPanel from "./components/FilesPanel";
import { CalendarPanel, EmailPanel, StripePanel, SchoolPanel, SettingsPanel } from "./components/Panels";
import WakeWord from "./components/WakeWord";
import LoginScreen from "./components/LoginScreen";
import DevPanel from "./components/DevPanel";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activePanel, setActivePanel]  = useState("home");
  const [input, setInput]              = useState("");
  const [sysInfo, setSysInfo]          = useState({ time:"--:--:--", date:"", day:"", hostname:"" });
  const [homeDir, setHomeDir]          = useState("~");


  const { rossState, messages, isProcessing, bridgeConnected,
    handleOrbToggle, startListening, stopListening, sendText,
    devLogs, isBuilding,
  } = useRoss(currentUser?.id || "default");



  useEffect(() => {
    const tick = async () => {
      try {
        const info = await invoke("get_system_info");
        setSysInfo(info);
      } catch {
        const now = new Date();
        setSysInfo({
          time: now.toLocaleTimeString("en-US", { hour12: false }),
          date: now.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }),
          day:  now.toLocaleDateString("en-US", { weekday:"long" }),
          hostname: "mac",
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { invoke("get_home_dir").then(setHomeDir).catch(() => {}); }, []);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    sendText(input.trim());
    setInput("");
  };

  const handleWake = () => {
    if (rossState === "STANDBY" && !isProcessing) startListening();
    else if (rossState === "LISTENING") stopListening();
  };

  if (!currentUser) return <LoginScreen onLogin={(id, name) => setCurrentUser({ id, name })}/>;

  const listening = rossState === "LISTENING";
  const speaking  = rossState === "SPEAKING";
  const stateColor = rossState === "LISTENING" ? "#66ffcc" : rossState === "SPEAKING" ? "#ffaa33" : rossState === "PROCESSING" ? "#aa66ff" : "#3399ff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body, #root { width:100%; height:100vh; background:#000; overflow:hidden; font-family:'Share Tech Mono',monospace; }
        :root { --blue:#3399ff; --blue-dim:#1a6faa; --blue-dark:#0a2a4a; --cyan:#66ffcc; --amber:#ffaa33; --purple:#aa66ff; --bg:#000; --bg2:#010d1a; --border:#0a2a4a; }
        @keyframes scan { 0%{top:0} 100%{top:100%} }
        @keyframes orbRing { 0%,100%{opacity:.15;transform:scale(1)} 50%{opacity:.5;transform:scale(1.04)} }
        @keyframes listenPulse { 0%,100%{box-shadow:0 0 20px #66ffcc44} 50%{box-shadow:0 0 48px #66ffcc99} }
        @keyframes speakPulse { 0%,100%{box-shadow:0 0 20px #ffaa3344} 50%{box-shadow:0 0 40px #ffaa3388} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes processDot { 0%,100%{opacity:.3} 50%{opacity:1} }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:var(--bg2); }
        ::-webkit-scrollbar-thumb { background:var(--blue-dark); border-radius:2px; }
        input { caret-color: var(--blue); }
      `}</style>

      <WakeWord onWake={handleWake} enabled={true}/>

      <div style={{ display:"flex", width:"100%", height:"100vh", background:"#000", overflow:"hidden" }}>

        {/* SIDEBAR with DEV tab */}
        <SidebarWithDev active={activePanel} onChange={setActivePanel} isBuilding={isBuilding}/>

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>

          {/* TOP BAR */}
          <div style={{ height:48, background:"#000", borderBottom:"1px solid #0a2a4a", display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:stateColor, boxShadow:`0 0 8px ${stateColor}`, transition:"all .3s" }}/>
            <span style={{ fontSize:16, fontWeight:700, color:"#3399ff", fontFamily:"'Orbitron',monospace", letterSpacing:4 }}>ROSS</span>
            <span style={{ fontSize:10, color:stateColor, letterSpacing:2 }}>● {rossState}</span>
            {isBuilding && <span style={{ fontSize:9, color:"#aa66ff", letterSpacing:2, animation:"processDot .8s ease-in-out infinite" }}>BUILDING...</span>}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ padding:"4px 12px", border:"1px solid #0a2a4a", borderRadius:20, fontSize:10, color:"#3399ff", letterSpacing:1 }}>
                {currentUser.name}
              </div>
              <div onClick={() => setCurrentUser(null)} style={{ fontSize:9, color:"#1a4a7a", cursor:"pointer", padding:"4px 8px" }}
                onMouseEnter={e=>e.target.style.color="#3399ff"} onMouseLeave={e=>e.target.style.color="#1a4a7a"}>
                전환
              </div>
              <div style={{ borderLeft:"1px solid #0a2a4a", paddingLeft:12 }}>
                <div style={{ fontSize:13, color:"#3399ff", fontFamily:"monospace", letterSpacing:2 }}>{sysInfo.time}</div>
                <div style={{ fontSize:9, color:"#1a4a7a", letterSpacing:1 }}>{sysInfo.day?.toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

            {activePanel === "home" && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
                <HexBg/>
                <div style={{ position:"absolute", left:0, right:0, height:1, pointerEvents:"none", background:"linear-gradient(90deg,transparent,rgba(51,153,255,0.35),transparent)", animation:"scan 6s linear infinite", zIndex:1 }}/>
                <Corner pos="tl"/><Corner pos="tr"/><Corner pos="bl"/><Corner pos="br"/>
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <LeftMetrics listening={listening} homeDir={homeDir}/>
                  <VoiceOrb rossState={rossState} isProcessing={isProcessing} onToggle={handleOrbToggle}/>
                  <RightStatus bridgeConnected={bridgeConnected}/>
                </div>
                <div style={{ height:80, borderTop:"1px solid var(--border)", background:"rgba(0,8,18,0.9)", position:"relative", flexShrink:0 }}>
                  <WaveCanvas listening={listening} speaking={speaking}/>
                  <div style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:9, color:"var(--blue-dim)", letterSpacing:2 }}>SAY "HEY ROSS"</div>
                  <div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:9, color:bridgeConnected?"var(--blue)":"#ffaa33", letterSpacing:2 }}>
                    {bridgeConnected ? "BRIDGE ACTIVE" : "BRIDGE OFFLINE"}
                  </div>
                </div>
              </div>
            )}

            {activePanel === "dev"      && <DevPanel devLogs={devLogs} isBuilding={isBuilding}/>}
            {activePanel === "files"    && <FilesPanel homeDir={homeDir}/>}
            {activePanel === "calendar" && <CalendarPanel/>}
            {activePanel === "email"    && <EmailPanel/>}
            {activePanel === "stripe"   && <StripePanel/>}
            {activePanel === "school"   && <SchoolPanel/>}
            {activePanel === "settings" && <SettingsPanel/>}
          </div>

          <ChatStrip messages={messages}/>

          <div style={{ height:48, background:"var(--bg2)", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 16px", gap:10, flexShrink:0 }}>
            <span style={{ fontSize:11, color:"var(--blue-dim)" }}>//</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="명령하기... (예: 모션 인식 앱 만들어줘)"
              style={{ flex:1, background:"transparent", border:"none", outline:"none", fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:"var(--blue)", letterSpacing:1 }}
            />
            <SendButton onClick={handleSend} disabled={isProcessing}/>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sidebar with DEV tab ──────────────────────────────────────

function SidebarWithDev({ active, onChange, isBuilding }) {
  const NAV = [
    { id:"home",     label:"HOME",     icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> },
    { id:"dev",      label:"DEV",      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>, building: isBuilding },
    { id:"calendar", label:"CALENDAR", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
    { id:"email",    label:"EMAIL",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
    { id:"files",    label:"FILES",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
    { id:"stripe",   label:"STRIPE",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
    { id:"school",   label:"SCHOOL",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
  ];

  return (
    <div style={{ width:64, background:"#010d1a", borderRight:"1px solid #0a2a4a", display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 0", gap:4, flexShrink:0 }}>
      <div style={{ width:34, height:34, borderRadius:"50%", border:"1.5px solid #3399ff", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
        <span style={{ fontSize:12, color:"#3399ff", fontFamily:"'Orbitron',monospace", fontWeight:700 }}>R</span>
      </div>
      <div style={{ width:32, height:"1px", background:"#0a2a4a", marginBottom:4 }}/>
      {NAV.map(item => {
        const [hover, setHover] = useState(false);
        const isActive = active === item.id;
        const color = item.building ? "#aa66ff" : isActive ? "#3399ff" : hover ? "#2266aa" : "#1a4a7a";
        return (
          <div key={item.id} title={item.label} onClick={() => onChange(item.id)}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            style={{ width:40, height:40, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", border:`1px solid ${isActive?"#3399ff":hover?"#0a2a4a":"transparent"}`, background:isActive?"#001830":"transparent", color, transition:"all .18s", marginBottom:2, position:"relative" }}>
            <div style={{ width:18, height:18 }}>{item.icon}</div>
            {item.building && <div style={{ position:"absolute", top:4, right:4, width:5, height:5, borderRadius:"50%", background:"#aa66ff", animation:"processDot .8s ease-in-out infinite" }}/>}
          </div>
        );
      })}
    </div>
  );
}

function HexBg() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.1, pointerEvents:"none" }}>
      <defs><pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
        <polygon points="30,2 54,15 54,41 30,54 6,41 6,15" fill="none" stroke="#3399ff" strokeWidth="0.5"/>
      </pattern></defs>
      <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>
  );
}

function Corner({ pos }) {
  const map = { tl:{top:10,left:10,borderTop:"1px solid #3399ff",borderLeft:"1px solid #3399ff"}, tr:{top:10,right:10,borderTop:"1px solid #3399ff",borderRight:"1px solid #3399ff"}, bl:{bottom:10,left:10,borderBottom:"1px solid #3399ff",borderLeft:"1px solid #3399ff"}, br:{bottom:10,right:10,borderBottom:"1px solid #3399ff",borderRight:"1px solid #3399ff"} };
  return <div style={{ position:"absolute", width:14, height:14, opacity:0.6, zIndex:2, ...map[pos] }}/>;
}

function LeftMetrics({ listening, homeDir }) {
  return (
    <div style={{ position:"absolute", left:24, display:"flex", flexDirection:"column", gap:14 }}>
      {[{label:"NEURAL",val:87,active:true},{label:"VOICE",val:listening?94:0,active:listening},{label:"MEMORY",val:62,active:true}].map(({label,val,active})=>(
        <div key={label} style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <span style={{ fontSize:9, color:"var(--blue-dim)", letterSpacing:2 }}>{label}</span>
          <div style={{ width:88, height:2, background:"var(--border)", borderRadius:1 }}>
            <div style={{ height:"100%", borderRadius:1, width:`${val}%`, background:active&&label==="VOICE"?"var(--cyan)":"var(--blue)", transition:"width .6s ease" }}/>
          </div>
          <span style={{ fontSize:9, color:active&&label==="VOICE"?"var(--cyan)":"var(--blue)", letterSpacing:1 }}>{val}%</span>
        </div>
      ))}
    </div>
  );
}

function RightStatus({ bridgeConnected }) {
  return (
    <div style={{ position:"absolute", right:24, display:"flex", flexDirection:"column", gap:10, alignItems:"flex-end" }}>
      {[
        { label:"BRIDGE",   status:bridgeConnected?"ACTIVE":"OFFLINE", color:bridgeConnected?"#3399ff":"#ffaa33" },
        { label:"CALENDAR", status:"ACTIVE",  color:"#3399ff" },
        { label:"DEV",      status:"READY",   color:"#aa66ff" },
        { label:"FILES",    status:"ACTIVE",  color:"#3399ff" },
      ].map(({label,status,color})=>(
        <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
          <span style={{ fontSize:9, color:"var(--blue-dim)", letterSpacing:2 }}>{label}</span>
          <span style={{ fontSize:9, color, letterSpacing:1 }}>{status}</span>
        </div>
      ))}
    </div>
  );
}

function SendButton({ onClick, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={!disabled?onClick:undefined} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ width:30, height:30, borderRadius:6, cursor:disabled?"wait":"pointer", border:`1px solid ${hover?"#3399ff":"#0a2a4a"}`, background:hover?"#001830":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", opacity:disabled?0.4:1 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3399ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </div>
  );
}
