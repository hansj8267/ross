import Anthropic from '@anthropic-ai/sdk';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import keytar from 'keytar';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Database from 'better-sqlite3';
import os from 'os';
import { CALENDAR_TOOLS, executeCalendarTool } from './calendar-tools.mjs';
import { DEV_TOOLS_SCHEMA, executeDevTool } from './dev-tools.mjs';

const execAsync = promisify(exec);

async function getKeys() {
  return {
    deepgram:   await keytar.getPassword('ross', 'DEEPGRAM_API_KEY'),
    elevenlabs: await keytar.getPassword('ross', 'ELEVENLABS_API_KEY'),
    voiceId:    await keytar.getPassword('ross', 'ELEVENLABS_VOICE_ID'),
    anthropic:  await keytar.getPassword('ross', 'ANTHROPIC_API_KEY'),
  };
}

const DB_PATH = path.join(os.homedir(), '.ross', 'memory.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id TEXT DEFAULT 'default',
    timestamp INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    detail TEXT,
    timestamp INTEGER NOT NULL
  );
`);

export const saveMessage = (role, content, userId = 'default') =>
  db.prepare('INSERT INTO messages (role, content, user_id, timestamp) VALUES (?, ?, ?, ?)').run(role, content, userId, Date.now());

export const getRecentMessages = (limit = 20, userId = 'default') =>
  db.prepare('SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit).reverse();

export const saveFact = (key, value) =>
  db.prepare('INSERT OR REPLACE INTO facts (key, value, updated) VALUES (?, ?, ?)').run(key, value, Date.now());

export const getFact = (key) => {
  const row = db.prepare('SELECT value FROM facts WHERE key = ?').get(key);
  return row ? row.value : null;
};

export const auditLog = (action, detail = '') =>
  db.prepare('INSERT INTO audit_log (action, detail, timestamp) VALUES (?, ?, ?)').run(action, detail, Date.now());

export const clearHistory = (userId = 'default') =>
  db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);

export async function transcribe(audioFilePath) {
  const keys = await getKeys();
  const response = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en',
    {
      method: 'POST',
      headers: { 'Authorization': `Token ${keys.deepgram}`, 'Content-Type': 'audio/wav' },
      body: fs.readFileSync(audioFilePath),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.err_msg || 'Deepgram error');
  return data.results.channels[0].alternatives[0].transcript;
}

export async function speak(text) {
  const keys = await getKeys();
  const isKorean = /[\uAC00-\uD7AF]/.test(text);
  if (isKorean) { await speakLocal(text); return; }
  try {
    const clean = text.replace(/[*_`#\[\]]/g, '').replace(/\n+/g, '. ').trim();
    const client = new ElevenLabsClient({ apiKey: keys.elevenlabs });
    const audio = await client.textToSpeech.convert(keys.voiceId, {
      text: clean,
      model_id: 'eleven_turbo_v2_5',
      output_format: 'mp3_44100_128',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });
    const outputPath = path.join(os.tmpdir(), 'ross_response.mp3');
    const chunks = [];
    for await (const chunk of audio) chunks.push(chunk);
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
    await execAsync(`afplay "${outputPath}"`);
  } catch {
    await speakLocal(text);
  }
}

export async function speakLocal(text) {
  const clean = text.replace(/[*_`#"[\]]/g, '').replace(/\n+/g, '. ').trim();
  await execAsync(`say -v "Rocko (영어(미국))" "${clean}"`);
}

const TRUSTED_ROOTS = [
  os.homedir() + '/Desktop',
  os.homedir() + '/Documents',
  os.homedir() + '/Downloads',
];

function assertTrusted(p) {
  const resolved = path.resolve(p);
  if (!TRUSTED_ROOTS.some(r => resolved.startsWith(path.resolve(r)))) throw new Error(`Access denied: ${resolved}`);
  return resolved;
}

export const fileTools = {
  listDirectory: (p) => fs.readdirSync(assertTrusted(p), { withFileTypes: true }).map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file', path: path.join(assertTrusted(p), e.name) })),
  readFile: (p) => fs.readFileSync(assertTrusted(p), 'utf-8'),
  writeFile: (p, c) => { fs.writeFileSync(assertTrusted(p), c, 'utf-8'); return `Written: ${p}`; },
  createDirectory: (p) => { fs.mkdirSync(assertTrusted(p), { recursive: true }); return `Created: ${p}`; },
  getSystemInfo: () => ({
    platform: os.platform(), hostname: os.hostname(), homeDir: os.homedir(),
    freeMemMB: Math.round(os.freemem() / 1024 / 1024),
    totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  }),
};

const FILE_TOOLS = [
  { name: 'list_directory',   description: 'List files in a directory.', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'read_file',        description: 'Read a file.',               input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'write_file',       description: 'Write a file.',              input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'create_directory', description: 'Create a directory.',        input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'get_system_info',  description: 'Get time, date, system info.', input_schema: { type: 'object', properties: {} } },
  { name: 'open_application', description: 'Open a macOS app.',          input_schema: { type: 'object', properties: { app: { type: 'string' } }, required: ['app'] } },
];

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };
const ALL_TOOLS = [...FILE_TOOLS, ...CALENDAR_TOOLS, ...DEV_TOOLS_SCHEMA, WEB_SEARCH_TOOL];

async function executeTool(name, input, onProgress) {
  try {
    if (DEV_TOOLS_SCHEMA.find(t => t.name === name)) return await executeDevTool(name, input, onProgress);
    if (CALENDAR_TOOLS.find(t => t.name === name)) return await executeCalendarTool(name, input);
    switch (name) {
      case 'list_directory':   return JSON.stringify(fileTools.listDirectory(input.path));
      case 'read_file':        return fileTools.readFile(input.path);
      case 'write_file':       return fileTools.writeFile(input.path, input.content);
      case 'create_directory': return fileTools.createDirectory(input.path);
      case 'get_system_info':  return JSON.stringify(fileTools.getSystemInfo());
      case 'open_application': await execAsync(`open -a "${input.app}"`); return `Opened ${input.app}`;
      default: return `Unknown tool: ${name}`;
    }
  } catch (err) { return `Error: ${err.message}`; }
}

export async function askClaude(userMessage, extraContext = '', userId = 'default', onProgress = null) {
  const keys = await getKeys();
  const client = new Anthropic({ apiKey: keys.anthropic });
  const history = getRecentMessages(16, userId);
  const sysInfo = fileTools.getSystemInfo();
  const devDir = path.join(os.homedir(), 'Desktop', 'ross-projects');

  const systemPrompt = `You are Ross, a personal AI agent and autonomous developer on the user's Mac.

CRITICAL RULE — YOU MUST FOLLOW THIS WITHOUT EXCEPTION:
When the user asks you to build, create, update, fix, or modify ANY code or software:
1. IMMEDIATELY call create_code_file tool — write the complete code
2. IMMEDIATELY call run_command or run_python to execute it
3. Check output — if error, fix it automatically by calling create_code_file again
4. Only AFTER the code is written and tested, give a brief spoken summary

YOU ARE FORBIDDEN from:
- Describing what you "will" do without doing it
- Saying "I'll update..." or "Let me write..." without immediately calling tools
- Responding with text only when a coding task is requested

Current context:
- Time: ${sysInfo.time}
- Date: ${sysInfo.date}
- Platform: macOS (${sysInfo.hostname})
- Home: ${sysInfo.homeDir}
- Projects folder: ${devDir}

For non-coding questions: answer concisely in the user's language.
Keep spoken responses under 2 sentences.
${extraContext ? `\nExtra context:\n${extraContext}` : ''}`;

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    system: systemPrompt,
    tools: ALL_TOOLS,
    messages,
  });

  const toolMessages = [];
  let iterations = 0;

  while (response.stop_reason === 'tool_use' && iterations < 20) {
    iterations++;
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];

    for (const tool of toolUseBlocks) {
      auditLog(`tool:${tool.name}`, JSON.stringify(tool.input).substring(0, 200));
      onProgress?.({ type: 'tool_progress', tool: tool.name, input: tool.input });
      const result = await executeTool(tool.name, tool.input, (msg) => {
        onProgress?.({ type: 'progress', message: msg });
      });
      toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: String(result) });
    }

    toolMessages.push({ role: 'assistant', content: response.content });
    toolMessages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system: systemPrompt,
      tools: ALL_TOOLS,
      messages: [...messages, ...toolMessages],
    });
  }

  return response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

export async function rossRespond(audioFilePath, useTTS = true, userId = 'default', onProgress = null) {
  const transcript = await transcribe(audioFilePath);
  if (!transcript.trim()) return { transcript: '', reply: "Didn't catch that." };
  saveMessage('user', transcript, userId);
  const reply = await askClaude(transcript, '', userId, onProgress);
  saveMessage('assistant', reply, userId);
  if (useTTS) { try { await speak(reply); } catch { await speakLocal(reply); } }
  return { transcript, reply };
}
