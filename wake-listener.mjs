// wake-listener.mjs
// 항상 마이크를 듣고 있다가 "hey ross" 감지하면 자동 녹음 시작
// ross-bridge.mjs에서 import해서 사용

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import keytar from 'keytar';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const WAKE_WORDS = ['hey ross', 'hi ross', 'okay ross', 'hey roz', 'a ross', 'ross'];
const AUDIO_FILE = path.join(os.tmpdir(), 'ross_input.wav');
const CHUNK_DURATION = 1.5; // seconds per chunk to check for wake word
const MIN_RECORD_MS = 1500;

export class WakeWordListener {
  constructor(onWake, onTranscript) {
    this.onWake = onWake;           // called when wake word detected
    this.onTranscript = onTranscript; // called with transcript after recording
    this.isListening = false;
    this.isRecording = false;
    this.recorderProcess = null;
    this.chunkProcess = null;
    this.active = false;
  }

  async start() {
    if (this.active) return;
    this.active = true;
    console.log('👂 Wake word listener started — say "Hey Ross" anytime');
    this._listenLoop();
  }

  stop() {
    this.active = false;
    if (this.chunkProcess) {
      try { this.chunkProcess.kill('SIGINT'); } catch {}
    }
    if (this.recorderProcess) {
      try { this.recorderProcess.kill('SIGINT'); } catch {}
    }
    console.log('👂 Wake word listener stopped');
  }

  async startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;

    try { if (fs.existsSync(AUDIO_FILE)) fs.unlinkSync(AUDIO_FILE); } catch {}

    this.recorderProcess = exec(`sox -t coreaudio default -r 16000 -c 1 "${AUDIO_FILE}"`);
    console.log('🔴 Recording started (wake word triggered)');
  }

  async stopRecording() {
    if (!this.isRecording) return null;

    if (this.recorderProcess) {
      try { this.recorderProcess.kill('SIGINT'); } catch {}
      this.recorderProcess = null;
    }

    await new Promise(r => setTimeout(r, 800));
    this.isRecording = false;

    let fileSize = 0;
    try { fileSize = fs.statSync(AUDIO_FILE).size; } catch {}

    if (fileSize < 500) return null;
    return AUDIO_FILE;
  }

  async _listenLoop() {
    while (this.active) {
      if (this.isRecording) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      try {
        // Record a short chunk to check for wake word
        const chunkFile = path.join(os.tmpdir(), 'ross_wake_chunk.wav');
        try { if (fs.existsSync(chunkFile)) fs.unlinkSync(chunkFile); } catch {}

        await new Promise((resolve, reject) => {
          this.chunkProcess = exec(
            `sox -t coreaudio default -r 16000 -c 1 "${chunkFile}" trim 0 ${CHUNK_DURATION}`,
            (err) => err && err.signal !== 'SIGINT' ? reject(err) : resolve()
          );
          setTimeout(() => {
            try { this.chunkProcess?.kill('SIGINT'); } catch {}
            resolve();
          }, (CHUNK_DURATION + 0.5) * 1000);
        });

        if (!this.active) break;

        // Check if file has audio
        let fileSize = 0;
        try { fileSize = fs.statSync(chunkFile).size; } catch {}
        if (fileSize < 500) continue;

        // Transcribe the chunk
        const transcript = await this._transcribeChunk(chunkFile);
        try { fs.unlinkSync(chunkFile); } catch {}

        if (!transcript) continue;

        const lower = transcript.toLowerCase().trim();
        console.log(`👂 Heard: "${lower}"`);

        const wakeDetected = WAKE_WORDS.some(w => lower.includes(w));

        if (wakeDetected && !this.isRecording) {
          console.log('✨ Wake word detected!');
          this.onWake?.();

          // Start recording the actual command
          await this.startRecording();

          // Auto-stop after 8 seconds if not stopped manually
          setTimeout(async () => {
            if (this.isRecording) {
              const audioFile = await this.stopRecording();
              if (audioFile) {
                this.onTranscript?.(audioFile);
              }
            }
          }, 15000);
        }

      } catch (err) {
        if (this.active) {
          console.error('Wake listener error:', err.message);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  async _transcribeChunk(audioFile) {
    try {
      const dgKey = await keytar.getPassword('ross', 'DEEPGRAM_API_KEY');
      const audioData = fs.readFileSync(audioFile);

      const response = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${dgKey}`,
            'Content-Type': 'audio/wav',
          },
          body: audioData,
        }
      );

      const data = await response.json();
      if (!response.ok) return null;
      return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || null;
    } catch {
      return null;
    }
  }
}
