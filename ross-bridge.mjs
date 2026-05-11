import { WebSocketServer } from 'ws';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { transcribe, askClaude, speak, speakLocal, saveMessage, getFact, saveFact } from './ross-core.mjs';
import { shouldDoMorningBriefing, doMorningBriefing } from './daily-briefing.mjs';
import { StreamingListener } from './streaming-listener.mjs';

const execAsync = promisify(exec);
const PORT = 9002;
const AUDIO_FILE = path.join(os.tmpdir(), 'ross_input.wav');

const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });
let recorderProcess = null;
let recordingStartTime = null;

const clients = new Map();

process.on('unhandledRejection', (err) => {
  console.error('오류:', err?.message || err);
});

console.log('\n🤖 Ross Bridge 시작됨 — ws://localhost:' + PORT);
console.log('👂 "Hey Ross" 항상 감지 중...\n');

function send(ws, type, payload = {}) {
  try {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type, ...payload }));
  } catch {}
}

function sendToUser(userId, type, payload = {}) {
  const ws = clients.get(userId);
  if (ws) send(ws, type, payload);
}

function sendToAll(type, payload = {}) {
  clients.forEach(ws => send(ws, type, payload));
}

// 개발 진행상황 포맷
function formatToolProgress(tool, input) {
  const icons = {
    create_code_file: '📝',
    run_python:       '🐍',
    run_node:         '🟢',
    run_command:      '⚡',
    install_packages: '📦',
    start_app:        '🚀',
    stop_app:         '🛑',
    open_in_browser:  '🌐',
    read_project_file:'📖',
    list_projects:    '📁',
    web_search:       '🔍',
  };
  const icon = icons[tool] || '🔧';

  switch (tool) {
    case 'create_code_file': return `${icon} ${input.filename} 작성 중...`;
    case 'run_python':       return `${icon} Python 실행: ${input.filename}`;
    case 'run_node':         return `${icon} Node.js 실행: ${input.filename}`;
    case 'run_command':      return `${icon} 명령 실행: ${input.command}`;
    case 'install_packages': return `${icon} 패키지 설치: ${input.packages}`;
    case 'start_app':        return `${icon} 앱 시작: ${input.name}`;
    case 'open_in_browser':  return `${icon} 브라우저에서 열기: ${input.filename}`;
    case 'web_search':       return `${icon} 검색 중...`;
    default: return `${icon} ${tool} 실행 중...`;
  }
}

async function processCommand(text, userId, ws) {
  try {
    send(ws, 'status', { state: 'PROCESSING' });
    console.log(`🧠 [${userId}]: ${text}`);

    const reply = await askClaude(text, '', userId, (progress) => {
      if (progress.type === 'tool_progress') {
        const msg = formatToolProgress(progress.tool, progress.input);
        send(ws, 'dev_progress', { message: msg, tool: progress.tool });
        console.log(`  ${msg}`);
      } else if (progress.type === 'progress') {
        send(ws, 'dev_progress', { message: progress.message });
      }
    });

    console.log(`🤖 Ross → [${userId}]: ${reply.substring(0, 100)}...`);
    saveMessage('assistant', reply, userId);

    send(ws, 'reply', { text: reply });
    send(ws, 'status', { state: 'SPEAKING' });

    try { await speak(reply); } catch { await speakLocal(reply); }
    send(ws, 'status', { state: 'STANDBY' });
    console.log('─'.repeat(40));

  } catch (err) {
    console.error('오류:', err.message);
    send(ws, 'error', { message: err.message });
    send(ws, 'status', { state: 'STANDBY' });
  }
}

async function processAudio(audioFilePath, userId, ws) {
  try {
    send(ws, 'status', { state: 'PROCESSING' });

    let fileSize = 0;
    try { fileSize = fs.statSync(audioFilePath).size; } catch {}
    if (!fs.existsSync(audioFilePath) || fileSize < 500) {
      send(ws, 'error', { message: '음성이 감지되지 않았어요.' });
      send(ws, 'status', { state: 'STANDBY' });
      return;
    }

    const transcript = await transcribe(audioFilePath);
    if (!transcript?.trim()) {
      send(ws, 'error', { message: '잘 못 들었어요.' });
      send(ws, 'status', { state: 'STANDBY' });
      return;
    }

    send(ws, 'transcript', { text: transcript });
    saveMessage('user', transcript, userId);
    await processCommand(transcript, userId, ws);

  } catch (err) {
    send(ws, 'error', { message: err.message });
    send(ws, 'status', { state: 'STANDBY' });
  }
}

// 상시 스트리밍
const streamListener = new StreamingListener(
  (state) => {
    const map = { idle:'STANDBY', listening:'LISTENING', processing:'PROCESSING' };
    clients.forEach(ws => send(ws, 'status', { state: map[state] || 'STANDBY' }));
  },
  (transcript) => {
    clients.forEach(ws => send(ws, 'transcript', { text: transcript }));
  },
  async (reply) => {
    clients.forEach(ws => {
      send(ws, 'reply', { text: reply });
      send(ws, 'status', { state: 'SPEAKING' });
    });
    setTimeout(() => clients.forEach(ws => send(ws, 'status', { state: 'STANDBY' })), 500);
  }
);

streamListener.start();

wss.on('connection', async (ws) => {
  let userId = 'default';
  console.log('✅ 새 연결');

  const authTimeout = setTimeout(() => {
    clients.set('default', ws);
    ws.userId = 'default';
    send(ws, 'status', { state: 'STANDBY' });
    send(ws, 'reply', { text: '"Hey Ross" 라고 말하거나 오브를 눌러주세요.' });
  }, 5000);

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'identify') {
      clearTimeout(authTimeout);
      userId = msg.userId || 'default';
      ws.userId = userId;
      clients.set(userId, ws);
      console.log(`✅ [${userId}] 연결됨`);

      send(ws, 'status', { state: 'STANDBY' });
      send(ws, 'identified', { userId });

      const briefingKey = `last_briefing_${userId}`;
      const today = new Date().toDateString();
      if (getFact(briefingKey) !== today) {
        saveFact(briefingKey, today);
        try { await doMorningBriefing((t, p) => send(ws, t, p)); }
        catch { send(ws, 'reply', { text: '안녕하세요! Ross예요. 무엇을 도와드릴까요?' }); }
      } else {
        send(ws, 'reply', { text: `다시 왔네요! 무엇을 만들어드릴까요?` });
      }
      return;
    }

    if (!ws.userId) { send(ws, 'error', { message: '먼저 로그인해주세요.' }); return; }
    userId = ws.userId;

    switch (msg.type) {
      case 'start_recording': {
        try {
          streamListener._pauseMic();
          if (recorderProcess) { try { recorderProcess.kill('SIGINT'); } catch {} recorderProcess = null; }
          try { if (fs.existsSync(AUDIO_FILE)) fs.unlinkSync(AUDIO_FILE); } catch {}
          recorderProcess = exec('sox -t coreaudio default -r 48000 -c 1 -e signed -b 16 "' + AUDIO_FILE + '"');
          recordingStartTime = Date.now();
          send(ws, 'status', { state: 'LISTENING' });
        } catch (err) {
          send(ws, 'error', { message: '녹음 실패: ' + err.message });
          send(ws, 'status', { state: 'STANDBY' });
          streamListener._resumeMic();
        }
        break;
      }

      case 'stop_recording': {
        try {
          const elapsed = Date.now() - (recordingStartTime || 0);
          if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));
          if (recorderProcess) { try { recorderProcess.kill('SIGINT'); } catch {} recorderProcess = null; }
          await new Promise(r => setTimeout(r, 800));
          streamListener._resumeMic();
          await processAudio(AUDIO_FILE, userId, ws);
        } catch (err) {
          send(ws, 'error', { message: err.message });
          send(ws, 'status', { state: 'STANDBY' });
          streamListener._resumeMic();
        }
        break;
      }

      case 'text_command': {
        const { text } = msg;
        if (!text?.trim()) break;
        saveMessage('user', text, userId);
        await processCommand(text, userId, ws);
        break;
      }

      case 'ping':
        send(ws, 'pong');
        break;
    }
  });

  ws.on('close', () => {
    if (ws.userId) { clients.delete(ws.userId); console.log(`[${ws.userId}] 연결 끊김`); }
    if (recorderProcess) { try { recorderProcess.kill('SIGINT'); } catch {} recorderProcess = null; }
    streamListener._resumeMic();
  });

  ws.on('error', () => {});
});

process.on('SIGINT', () => {
  console.log('\nRoss 종료 중...');
  streamListener.stop();
  if (recorderProcess) { try { recorderProcess.kill('SIGINT'); } catch {} }
  wss.close();
  process.exit(0);
});
