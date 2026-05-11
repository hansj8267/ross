// src/components/VoiceOrb.jsx
import { useState } from "react";

function OrbRing({ size, delay }) {
  return (
    <div style={{
      position:"absolute", width:size, height:size, borderRadius:"50%",
      border:"1px solid rgba(51,153,255,0.18)",
      animation:`orbRing 3.2s ease-in-out ${delay}s infinite`,
      pointerEvents:"none",
    }}/>
  );
}

export default function VoiceOrb({ rossState, isProcessing, onToggle }) {
  const [hover, setHover] = useState(false);

  const listening = rossState === "LISTENING";
  const speaking  = rossState === "SPEAKING";
  const processing = rossState === "PROCESSING";

  const borderColor = listening ? "#66ffcc"
    : speaking    ? "#ffaa33"
    : processing  ? "#aa66ff"
    : hover       ? "#66aaff"
    : "#3399ff";

  const glowColor = listening ? "0 0 40px #66ffcc77"
    : speaking    ? "0 0 36px #ffaa3366"
    : processing  ? "0 0 30px #aa66ff55"
    : hover       ? "0 0 20px #3399ff44"
    : "0 0 14px #3399ff22";

  const stateLabel = listening   ? "PRESS TO SEND"
    : speaking    ? "SPEAKING..."
    : processing  ? "PROCESSING"
    : "PRESS TO SPEAK";

  const stateColor = listening ? "#66ffcc"
    : speaking    ? "#ffaa33"
    : processing  ? "#aa66ff"
    : "#3399ff";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, position:"relative", zIndex:2 }}>

      {/* RINGS + ORB */}
      <div style={{ position:"relative", width:240, height:240, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <OrbRing size={240} delay={0}/>
        <OrbRing size={192} delay={0.7}/>
        <OrbRing size={144} delay={1.4}/>

        {/* ORBIT DOTS */}
        {[0,60,120,180,240,300].map((deg, i) => (
          <div key={deg} style={{
            position:"absolute", width: i%2===0?5:3, height: i%2===0?5:3,
            borderRadius:"50%",
            background: listening ? "#66ffcc" : speaking ? "#ffaa33" : "#3399ff",
            opacity: listening||speaking ? 0.85 : 0.25,
            transform:`rotate(${deg}deg) translateY(-108px)`,
            transition:"opacity .3s, background .3s",
            pointerEvents:"none",
          }}/>
        ))}

        {/* MAIN ORB BUTTON */}
        <div
          onClick={onToggle}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width:96, height:96, borderRadius:"50%",
            background:"#000",
            border:`2px solid ${borderColor}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor: isProcessing && !listening ? "wait" : "pointer",
            position:"relative", zIndex:2,
            transition:"border-color .3s, box-shadow .3s",
            boxShadow: glowColor,
            animation: listening ? "listenPulse 1.4s ease-in-out infinite"
              : speaking ? "speakPulse 1.2s ease-in-out infinite"
              : "none",
          }}
        >
          {processing ? (
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:6, height:6, borderRadius:"50%", background:"#aa66ff",
                  animation:`processDot 0.9s ${i*0.2}s ease-in-out infinite`,
                }}/>
              ))}
            </div>
          ) : (
            <MicIcon color={borderColor}/>
          )}
        </div>
      </div>

      {/* LABELS */}
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:10, color:"#1a4a7a", letterSpacing:4, marginBottom:6 }}>VOICE INTERFACE</div>
        <div style={{
          fontSize:12, letterSpacing:3,
          color: stateColor,
          transition:"color .3s",
          animation: processing ? "processDot 0.8s ease-in-out infinite" : "none",
        }}>
          {stateLabel}
        </div>
      </div>
    </div>
  );
}

function MicIcon({ color }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition:"stroke .3s" }}>
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
    </svg>
  );
}
