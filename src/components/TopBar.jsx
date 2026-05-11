// src/components/TopBar.jsx
export default function TopBar({ rossState, sysInfo }) {
  const stateColor = rossState === "LISTENING"  ? "#66ffcc"
    : rossState === "SPEAKING"   ? "#ffaa33"
    : rossState === "PROCESSING" ? "#aa66ff"
    : "#3399ff";

  return (
    <div style={{
      height:48, background:"#000", borderBottom:"1px solid #0a2a4a",
      display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0, zIndex:5,
    }}>
      <div style={{
        width:8, height:8, borderRadius:"50%",
        background: stateColor,
        boxShadow: `0 0 8px ${stateColor}`,
        transition:"all .3s", flexShrink:0,
      }}/>

      <span style={{ fontSize:16, fontWeight:700, color:"#3399ff", fontFamily:"'Orbitron',monospace", letterSpacing:4 }}>
        ROSS
      </span>

      <span style={{ fontSize:10, color:stateColor, letterSpacing:2, transition:"color .3s" }}>
        ● {rossState}
      </span>

      <div style={{ marginLeft:"auto", display:"flex", gap:20, alignItems:"center" }}>
        <MetricChip label="LATENCY" value="142ms"/>
        <MetricChip label="MEMORY"  value="2.4MB"/>
        <MetricChip label="UPTIME"  value="99.9%"/>

        <div style={{ borderLeft:"1px solid #0a2a4a", paddingLeft:20 }}>
          <div style={{ fontSize:14, color:"#3399ff", fontFamily:"monospace", letterSpacing:2 }}>
            {sysInfo.time || "--:--:--"}
          </div>
          <div style={{ fontSize:9, color:"#1a4a7a", letterSpacing:1 }}>
            {sysInfo.day ? `${sysInfo.day.toUpperCase()} · ${sysInfo.hostname?.toUpperCase()}` : "LOCAL TIME"}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricChip({ label, value }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
      <span style={{ fontSize:11, color:"#3399ff", fontFamily:"monospace", letterSpacing:1 }}>{value}</span>
      <span style={{ fontSize:9, color:"#1a4a7a", letterSpacing:1 }}>{label}</span>
    </div>
  );
}


// src/components/ChatStrip.jsx
import { useEffect, useRef } from "react";

export function ChatStrip({ messages }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={ref}
      style={{
        height:120, background:"#010d1a", borderTop:"1px solid #0a2a4a",
        padding:"10px 20px", display:"flex", flexDirection:"column",
        gap:7, overflowY:"auto", flexShrink:0,
      }}
    >
      {messages.map((m, i) => (
        <div key={m.id} style={{
          display:"flex", gap:10, alignItems:"flex-start",
          animation: i === messages.length-1 ? "fadeSlideIn .3s ease" : "none",
        }}>
          <span style={{
            fontSize:9, letterSpacing:2, paddingTop:3, minWidth:36,
            fontFamily:"monospace",
            color: m.role === "ross" ? "#3399ff" : "#1a4a7a",
          }}>
            {m.role === "ross" ? "ROSS" : "YOU"}
          </span>
          <span style={{
            fontSize:12, lineHeight:1.6, fontFamily:"monospace",
            color: m.role === "ross" ? "#5599cc" : "#3a5a7a",
            borderLeft: `2px solid ${m.role === "ross" ? "rgba(51,153,255,0.35)" : "#0a2a4a"}`,
            paddingLeft:8,
          }}>
            {m.text}
          </span>
        </div>
      ))}
    </div>
  );
}


