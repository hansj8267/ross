import { useState } from "react";
const USERS = [
  { id: "han", name: "Han", emoji: "👤", color: "#3399ff" },
  { id: "hyeonji", name: "Hyeonji", emoji: "💙", color: "#ff69b4" },
];
export default function LoginScreen({ onLogin }) {
  const [hoverId, setHoverId] = useState(null);
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  return (
    <div style={{ width:"100%", height:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Share Tech Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700&display=swap');`}</style>
      <div style={{ marginBottom:48, textAlign:"center" }}>
        <div style={{ fontSize:56, fontWeight:700, color:"#3399ff", fontFamily:"'Orbitron',monospace", letterSpacing:8, marginBottom:8 }}>ROSS</div>
        <div style={{ fontSize:11, color:"#1a4a7a", letterSpacing:4 }}>VOICE-FIRST AI AGENT</div>
      </div>
      <div style={{ fontSize:10, color:"#1a4a7a", letterSpacing:3, marginBottom:24 }}>누구세요?</div>
      <div style={{ display:"flex", gap:16, marginBottom:32 }}>
        {USERS.map(user => (
          <div key={user.id} onClick={() => onLogin(user.id, user.name)}
            onMouseEnter={() => setHoverId(user.id)} onMouseLeave={() => setHoverId(null)}
            style={{ width:120, height:120, borderRadius:12, border:`1px solid ${hoverId===user.id?user.color:"#0a2a4a"}`, background:hoverId===user.id?"#001830":"#010d1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .2s", gap:10 }}>
            <span style={{ fontSize:32 }}>{user.emoji}</span>
            <span style={{ fontSize:11, color:hoverId===user.id?user.color:"#1a4a7a", letterSpacing:2 }}>{user.name}</span>
          </div>
        ))}
      </div>
      {!showCustom ? (
        <div onClick={() => setShowCustom(true)} style={{ fontSize:10, color:"#0a2a4a", letterSpacing:2, cursor:"pointer", textDecoration:"underline" }}>다른 이름으로 접속</div>
      ) : (
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input autoFocus value={customName} onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key==="Enter" && customName.trim() && onLogin(customName.trim().toLowerCase(), customName.trim())}
            placeholder="이름 입력..." style={{ background:"#010d1a", border:"1px solid #0a2a4a", borderRadius:6, padding:"8px 14px", fontFamily:"monospace", fontSize:11, color:"#3399ff", outline:"none" }}/>
          <div onClick={() => customName.trim() && onLogin(customName.trim().toLowerCase(), customName.trim())}
            style={{ padding:"8px 14px", background:"#001830", border:"1px solid #3399ff", borderRadius:6, cursor:"pointer", fontSize:10, color:"#3399ff" }}>입장</div>
        </div>
      )}
    </div>
  );
}
