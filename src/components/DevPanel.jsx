// src/components/DevPanel.jsx
// 실시간 개발 진행상황 패널

import { useState, useEffect, useRef } from "react";

const TOOL_ICONS = {
  create_code_file: "📝",
  run_python:       "🐍",
  run_node:         "🟢",
  run_command:      "⚡",
  install_packages: "📦",
  start_app:        "🚀",
  stop_app:         "🛑",
  open_in_browser:  "🌐",
  read_project_file:"📖",
  web_search:       "🔍",
  default:          "🔧",
};

export default function DevPanel({ devLogs = [], isBuilding = false }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [devLogs]);

  if (devLogs.length === 0 && !isBuilding) {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#000", gap:12 }}>
        <div style={{ fontSize:32, opacity:0.3 }}>🔧</div>
        <div style={{ fontSize:10, color:"#1a4a7a", letterSpacing:3, fontFamily:"monospace" }}>개발 로그 없음</div>
        <div style={{ fontSize:10, color:"#0a2a4a", letterSpacing:2, fontFamily:"monospace", textAlign:"center", maxWidth:300 }}>
          "Hey Ross, 모션 인식 앱 만들어줘" 같이 말해보세요
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#000", overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"12px 20px", borderBottom:"1px solid #0a2a4a", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <span style={{ fontSize:11, color:"#3399ff", letterSpacing:3, fontFamily:"monospace" }}>DEV LOG</span>
        {isBuilding && (
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:5, height:5, borderRadius:"50%", background:"#aa66ff",
                animation:`processDot 0.8s ${i*0.2}s ease-in-out infinite`,
              }}/>
            ))}
            <span style={{ fontSize:9, color:"#aa66ff", letterSpacing:2, marginLeft:4 }}>BUILDING...</span>
          </div>
        )}
      </div>

      {/* Logs */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 0" }}>
        {devLogs.map((log, i) => (
          <LogEntry key={i} log={log} isLatest={i === devLogs.length - 1}/>
        ))}
        <div ref={bottomRef}/>
      </div>
    </div>
  );
}

function LogEntry({ log, isLatest }) {
  const icon = TOOL_ICONS[log.tool] || TOOL_ICONS.default;

  const bgColor = log.type === 'error'    ? '#1a0a0a'
    : log.type === 'success'              ? '#0a1a0a'
    : log.type === 'tool'                 ? '#010d1a'
    : 'transparent';

  const textColor = log.type === 'error'  ? '#ff6666'
    : log.type === 'success'              ? '#66ffcc'
    : log.type === 'tool'                 ? '#aa66ff'
    : '#3a5a7a';

  return (
    <div style={{
      display:"flex", gap:10, padding:"6px 20px", alignItems:"flex-start",
      background: isLatest ? bgColor : 'transparent',
      borderLeft: isLatest ? `2px solid ${textColor}` : '2px solid transparent',
      animation: isLatest ? "fadeSlideIn .2s ease" : "none",
      transition:"background .3s",
    }}>
      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color: textColor, fontFamily:"monospace", lineHeight:1.5 }}>
          {log.message}
        </div>
        {log.timestamp && (
          <div style={{ fontSize:9, color:"#1a4a7a", fontFamily:"monospace", marginTop:2 }}>
            {new Date(log.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
