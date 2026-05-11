import { useState, useEffect, useRef, useCallback } from "react";

const BRIDGE_URL = "ws://localhost:9002";

export default function useRoss(userId = "default") {
  const [rossState, setRossState]             = useState("STANDBY");
  const [messages, setMessages]               = useState([
    { id: 1, role: "ross", text: "Ross 온라인. 연결 중..." },
  ]);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [devLogs, setDevLogs]                 = useState([]);
  const [isBuilding, setIsBuilding]           = useState(false);

  const wsRef       = useRef(null);
  const msgId       = useRef(2);
  const retryRef    = useRef(null);
  const manualClose = useRef(false);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { id: msgId.current++, role, text }]);
  }, []);

  const send = useCallback((obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;
    clearTimeout(retryRef.current);
    manualClose.current = false;

    const ws = new WebSocket(BRIDGE_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setBridgeConnected(true);
      ws.send(JSON.stringify({ type: 'identify', userId }));
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case 'identified':
          break;
        case 'status':
          setRossState(msg.state);
          setIsProcessing(msg.state === 'PROCESSING' || msg.state === 'SPEAKING' || msg.state === 'LISTENING');
          break;
        case 'transcript':
          setMessages(prev => [...prev, { id: msgId.current++, role: 'user', text: msg.text }]);
          break;
        case 'reply':
          setMessages(prev => [...prev, { id: msgId.current++, role: 'ross', text: msg.text }]);
          setIsProcessing(false);
          setIsBuilding(false);
          setDevLogs(prev => [...prev, { type: 'success', tool: 'complete', message: '✅ 완료!', timestamp: Date.now() }]);
          break;
        case 'error':
          setMessages(prev => [...prev, { id: msgId.current++, role: 'ross', text: `⚠ ${msg.message}` }]);
          setRossState('STANDBY');
          setIsProcessing(false);
          setIsBuilding(false);
          setDevLogs(prev => [...prev, { type: 'error', tool: 'error', message: `❌ ${msg.message}`, timestamp: Date.now() }]);
          break;
        case 'dev_progress':
          setIsBuilding(true);
          setDevLogs(prev => [...prev, { type: 'tool', tool: msg.tool, message: msg.message, timestamp: Date.now() }]);
          break;
      }
    };

    ws.onclose = () => {
      setBridgeConnected(false);
      setRossState('STANDBY');
      setIsProcessing(false);
      wsRef.current = null;
      if (!manualClose.current) retryRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => { ws.close(); };
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      manualClose.current = true;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!bridgeConnected) { addMessage('ross', 'Bridge not connected.'); return; }
    send({ type: 'start_recording' });
  }, [bridgeConnected, send, addMessage]);

  const stopListening  = useCallback(() => { send({ type: 'stop_recording' }); }, [send]);

  const handleOrbToggle = useCallback(() => {
    if (rossState === 'STANDBY' && !isProcessing) startListening();
    else if (rossState === 'LISTENING') stopListening();
  }, [rossState, isProcessing, startListening, stopListening]);

  const sendText = useCallback((text) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: msgId.current++, role: 'user', text }]);
    if (!bridgeConnected) { setTimeout(() => addMessage('ross', 'Bridge offline.'), 500); return; }
    send({ type: 'text_command', text });
  }, [bridgeConnected, send, addMessage]);

  return {
    rossState, messages, isProcessing, bridgeConnected,
    handleOrbToggle, startListening, stopListening, sendText,
    devLogs, isBuilding,
  };
}
