// src/components/WaveCanvas.jsx
import { useEffect, useRef } from "react";

export default function WaveCanvas({ listening, speaking }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const phaseRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const active = listening || speaking;

    const drawLine = (color, amp, freqMult, phaseOff, alpha, width) => {
      const phase = phaseRef.current;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      for (let x = 0; x <= W; x++) {
        const t = x / W;
        const y = H / 2
          + Math.sin(t * Math.PI * 2 * 2.8 * freqMult + phase + phaseOff) * amp
          + Math.sin(t * Math.PI * 2 * 4.5 * freqMult + phase * 1.4 + phaseOff) * amp * 0.3
          + Math.sin(t * Math.PI * 2 * 1.2 * freqMult + phase * 0.6 + phaseOff) * amp * 0.2;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      phaseRef.current += active ? 0.05 : 0.012;

      if (speaking) {
        drawLine("#66ffcc", 20, 1,   0,   0.9, 2);
        drawLine("#3399ff", 13, 1.5, 1.2, 0.45, 1.5);
        drawLine("#66ffcc",  7, 0.7, 2.4, 0.25, 1);
      } else if (listening) {
        drawLine("#3399ff", 15, 1,   0,   0.9, 2);
        drawLine("#1a6faa",  9, 1.7, 1,   0.45, 1.5);
        drawLine("#3399ff",  5, 0.8, 2,   0.25, 1);
      } else {
        drawLine("#0a2a4a",  3, 1,   0,   0.8, 1);
        drawLine("#0a2a4a",  2, 1.5, 1.5, 0.35, 0.7);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [listening, speaking]);

  return (
    <canvas ref={canvasRef} width={640} height={80}
      style={{ width:"100%", height:"100%", display:"block" }}/>
  );
}
