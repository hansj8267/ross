// src/components/ClapDetector.jsx
import { useEffect, useRef, useState } from "react";

export default function ClapDetector({ onClap, enabled = true }) {
  const [listening, setListening] = useState(false);
  const audioCtxRef = useRef(null);
  const frameRef    = useRef(null);
  const streamRef   = useRef(null);
  const lastClapRef = useRef(0);
  const clapTimes   = useRef([]);

  useEffect(() => {
    if (!enabled) return;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        setListening(true);

        const detect = () => {
          analyser.getByteFrequencyData(data);
          const peak = Math.max(...data);
          const now  = Date.now();

          if (peak > 220 && now - lastClapRef.current > 300) {            lastClapRef.current = now;
            clapTimes.current.push(now);

            if (clapTimes.current.length > 2) clapTimes.current.shift();

            // Two claps within 800ms = trigger
            if (
              clapTimes.current.length === 2 &&
              clapTimes.current[1] - clapTimes.current[0] < 1200
            ) {
              clapTimes.current = [];
              onClap?.();
            }
          }

          frameRef.current = requestAnimationFrame(detect);
        };

        frameRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.warn("ClapDetector: mic access denied", err);
      }
    };

    start();

    return () => {
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      setListening(false);
    };
  }, [enabled]);

  return (
    <div
      title={listening ? "Double-clap to activate Ross" : "Clap detection off"}
      style={{
        position: "fixed", bottom: 14, right: 14,
        width: 8, height: 8, borderRadius: "50%",
        background: listening ? "#66ffcc" : "#0a2a4a",
        boxShadow: listening ? "0 0 6px #66ffcc" : "none",
        transition: "all .3s", zIndex: 99,
      }}
    />
  );
}