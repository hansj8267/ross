// src/components/WakeWord.jsx
import { useEffect, useRef, useState } from "react";

export default function WakeWord({ onWake, enabled = true }) {
  const recognitionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("WakeWord: SpeechRecognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setActive(true);

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();

        const wakeWords = [
          "hey ross", "hi ross", "okay ross", "ok ross",
          "a ross", "hay ross", "hey roz", "ross",
        ];

        const matched = wakeWords.some(w => transcript.includes(w));
        if (matched) {
          console.log("Wake word detected:", transcript);
          onWake?.();
        }
      }
    };

    recognition.onend = () => {
      // Always restart — stay listening forever
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 300);
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        console.warn("WakeWord: mic permission denied");
        setActive(false);
        return;
      }
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 1000);
    };

    try { recognition.start(); } catch {}

    return () => {
      try { recognition.abort(); } catch {}
      setActive(false);
    };
  }, [enabled]);

  return (
    <div
      title={active ? "Say 'Hey Ross' to activate" : "Wake word inactive"}
      style={{
        position: "fixed", bottom: 14, right: 14,
        width: 8, height: 8, borderRadius: "50%",
        background: active ? "#66ffcc" : "#0a2a4a",
        boxShadow: active ? "0 0 8px #66ffcc" : "none",
        transition: "all .3s", zIndex: 99,
      }}
    />
  );
}
