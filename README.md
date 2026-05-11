# Ross — Voice-First Personal AI Agent

> A locally-hosted autonomous AI agent with real-time voice interaction, agentic code generation, and multi-service integration.

![Tech Stack](https://img.shields.io/badge/Claude_API-Anthropic-orange) ![Deepgram](https://img.shields.io/badge/STT-Deepgram-blue) ![ElevenLabs](https://img.shields.io/badge/TTS-ElevenLabs-purple) ![Tauri](https://img.shields.io/badge/Desktop-Tauri-green)

## Architecture

Microphone Input
        ↓
Deepgram WebSocket STT
        ↓
Wake Word Detection
        ↓
Claude Agentic Loop
        ↓
Tool Calling / Memory Retrieval
        ↓
External APIs / Local Automation
        ↓
ElevenLabs TTS Response
        ↓
User Audio Output
## Tech Stack

| Layer | Technology |
|---|---|
| Desktop UI | React + Tauri (Rust) |
| Voice Recognition | Deepgram Nova-2 (WebSocket streaming) |
| AI Brain | Claude claude-sonnet-4-6 (Agentic tool-calling) |
| Voice Synthesis | ElevenLabs (Voice cloning) |
| Local Memory | SQLite (better-sqlite3) |
| Real-time Comm | WebSocket (ws) |
| Security | macOS Keychain (keytar) |
| Automation | AppleScript + PyAutoGUI |

## Key Features

- 🎙️ **Always-on wake word detection** — Deepgram WebSocket streams audio continuously, detects "Hey Ross" with <300ms latency
- 🤖 **Autonomous code generation** — Claude agentic loop writes, executes, tests, and iterates code autonomously
- 📅 **Multi-service integration** — Google Calendar, Gmail, Stripe, Canvas LMS via OAuth 2.0
- 🖥️ **Multimodal interaction** — Voice, text, screenshot analysis, gesture control (MediaPipe)
- 🔐 **Local-first & secure** — All data stays local, credentials in OS Keychain, sandboxed filesystem
- 👥 **Multi-user support** — Independent conversation history per user via SQLite
- 🌅 **Daily briefing** — Automated morning summary of weather, calendar, and assignments

## Voice Pipeline
## Setup

### Prerequisites
- macOS (Apple Silicon or Intel)
- Node.js 18+
- Python 3.10+
- Homebrew + sox

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/ross.git
cd ross
npm install
pip3 install opencv-python mediapipe pyautogui numpy
```

### API Keys (stored in macOS Keychain)

```bash
node save-keys.mjs
# Enter: Anthropic, Deepgram, ElevenLabs, Google OAuth
```

### Run

```bash
# Terminal 1 — Bridge (voice pipeline)
node ross-bridge.mjs

# Terminal 2 — UI
npm run tauri dev
```

## Security Design

- API keys stored exclusively in macOS Keychain via `keytar` — never in plaintext or env files
- Filesystem access sandboxed to `~/Desktop`, `~/Documents`, `~/Downloads`
- All destructive operations logged to local SQLite audit log
- No data transmitted to external servers except respective API endpoints

## Integrations

| Service | Capability |
|---|---|
| Google Calendar | CRUD events, conflict detection, free-slot finder |
| Gmail | Read, draft, send emails |
| Stripe | Revenue dashboard, invoice generation |
| Canvas LMS | Assignments, grades, deadline sync to calendar |
| macOS | App control, file system, screen capture, AppleScript |

## Resume Highlights

- Implemented real-time STT using **Deepgram WebSocket streaming** with VAD (Voice Activity Detection)
- Built **agentic AI loop** with Claude tool-calling, supporting up to 20 autonomous iterations
- Designed **local-first architecture** with SQLite memory, OS Keychain security, sandboxed filesystem
- Integrated **5 external APIs** (Google, Stripe, Canvas, Deepgram, ElevenLabs) with OAuth 2.0
- Developed **multimodal pipeline** combining voice, text, vision (screenshot), and gesture inputs
