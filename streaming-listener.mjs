import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import keytar from 'keytar';
import { askClaude, speak, speakLocal, saveMessage } from './ross-core.mjs';

const WAKE_WORDS = ['hey ross', 'hi ross', 'okay ross', 'hey roz', 'ross'];
const COOLDOWN = 2000;

export class StreamingListener {
  constructor(onStateChange, onTranscript, onReply) {
    this.onStateChange = onStateChange;
    this.onTranscript  = onTranscript;
    this.onReply       = onReply;
    this.state         = 'idle';
    this.active        = false;
    this.ws            = null;
    this.soxProcess    = null;
    this.lastWakeTime  = 0;
    this.commandBuffer = '';
    this.wakeBuffer    = '';
    this.dgKey         = null;
  }

  async start() {
    if (this.active) return;
    this.active = true;
    this.dgKey = await keytar.getPassword('ross', 'DEEPGRAM_API_KEY');
    console.log('👂 상시 스트리밍 시작 — "Hey Ross" 말해보세요');
    this._startMic();
    await this._connect();
  }

  async _connect() {
    if (!this.active) return;
    try {
      const url = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&utterance_end_ms=3000&vad_events=true&endpointing=800&sample_rate=48000&encoding=linear16';
      this.ws = new WebSocket(url, { headers: { Authorization: 'Token ' + this.dgKey } });
      this.ws.on('open', () => { console.log('✅ Deepgram 연결됨'); });
      this.ws.on('message', async (data) => {
        let msg; try { msg = JSON.parse(data); } catch { return; }
        if (msg.type === 'UtteranceEnd') {
          if (this.state === 'listening' && this.commandBuffer.trim()) await this._processCommand(this.commandBuffer.trim());
          return;
        }
        if (msg.type !== 'Results') return;
        const transcript = msg?.channel?.alternatives?.[0]?.transcript || '';
        const isFinal = msg?.is_final;
        if (!transcript.trim()) return;
        if (this.state === 'idle') {
          this.wakeBuffer = (this.wakeBuffer + ' ' + transcript).toLowerCase().trim();
          if (WAKE_WORDS.some(w => this.wakeBuffer.includes(w)) && Date.now() - this.lastWakeTime > COOLDOWN) {
            this.lastWakeTime = Date.now(); this.wakeBuffer = ''; this.commandBuffer = '';
            this._setState('listening'); console.log('✨ Hey Ross 감지!');
          }
          if (this.wakeBuffer.length > 200) this.wakeBuffer = this.wakeBuffer.slice(-50);
        } else if (this.state === 'listening' && isFinal) {
          this.commandBuffer = (this.commandBuffer + ' ' + transcript).trim();
          console.log('🎤 수집 중: ' + this.commandBuffer);
        }
      });
      this.ws.on('error', () => { if (this.active) setTimeout(() => this._connect(), 3000); });
      this.ws.on('close', () => { if (this.active) setTimeout(() => this._connect(), 3000); });
    } catch (err) {
      console.error('연결 실패:', err.message);
      if (this.active) setTimeout(() => this._connect(), 3000);
    }
  }

  _startMic() {
    if (this.soxProcess) { try { this.soxProcess.kill(); } catch {} }
    this.soxProcess = spawn('sox', ['-t','coreaudio','default','-r','48000','-c','1','-e','signed','-b','16','-t','raw','-']);
    this.soxProcess.stdout.on('data', (chunk) => {
      if (this.ws?.readyState === 1 && this.state !== 'processing') { try { this.ws.send(chunk); } catch {} }
    });
    this.soxProcess.stderr.on('data', () => {});
    this.soxProcess.on('error', () => {});
    this.soxProcess.on('close', () => {
      if (this.active && this.state !== 'processing') setTimeout(() => this._startMic(), 2000);
    });
    console.log('🎙️ 마이크 스트리밍 시작');
  }

  async _processCommand(command) {
    this._setState('processing'); console.log('🗣  명령: ' + command); this.commandBuffer = '';
    try {
      saveMessage('user', command); this.onTranscript?.(command);
      const reply = await askClaude(command, '');
      console.log('🤖 Ross: ' + reply);
      saveMessage('assistant', reply); this.onReply?.(reply);
      this._pauseMic();
      try { await speak(reply); } catch { await speakLocal(reply); }
      this._resumeMic();
      this._setState('idle');
      console.log('👂 다시 대기 중...');
      console.log('─'.repeat(40));
    } catch (err) {
      console.error('처리 오류:', err.message);
      this.onReply?.('오류: ' + err.message);
      this._resumeMic(); this._setState('idle');
    }
  }

  _pauseMic() { try { this.soxProcess?.kill('SIGSTOP'); } catch {} }
  _resumeMic() { try { this.soxProcess?.kill('SIGCONT'); } catch {} }
  _setState(s) {
    this.state = s;
    this.onStateChange?.({idle:'STANDBY',listening:'LISTENING',processing:'PROCESSING'}[s]||'STANDBY');
  }
  stop() {
    this.active = false;
    try { this.soxProcess?.kill(); } catch {}
    try { this.ws?.close(); } catch {}
  }
}