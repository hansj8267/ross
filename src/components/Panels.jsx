// src/components/CalendarPanel.jsx
export function CalendarPanel() {
  return <ComingSoonPanel title="CALENDAR" steps={[
    "Go to console.cloud.google.com",
    "Create a project → Enable Google Calendar API",
    "Create OAuth 2.0 credentials",
    "Run: node setup-google.mjs in your ross folder",
    "Ross will then read and create events by voice",
  ]} color="#3399ff"/>;
}

// src/components/EmailPanel.jsx
export function EmailPanel() {
  return <ComingSoonPanel title="EMAIL" steps={[
    "Enable Gmail API in Google Cloud Console",
    "Add mail.send + mail.readonly scopes to OAuth",
    "Run: node setup-google.mjs --service=gmail",
    "Say: 'Ross, read my latest emails'",
    "Say: 'Ross, draft a reply to [name]'",
  ]} color="#66ffcc"/>;
}

// src/components/StripePanel.jsx
export function StripePanel() {
  return <ComingSoonPanel title="STRIPE" steps={[
    "Go to dashboard.stripe.com → API Keys",
    "Create a Restricted Key (read + invoices)",
    "Run: node --input-type=module -e \"import keytar from 'keytar'; await keytar.setPassword('ross', 'STRIPE_API_KEY', 'rk_...');\"",
    "Say: 'Ross, how much did I make this month?'",
    "Say: 'Ross, send an invoice to [name] for $[amount]'",
  ]} color="#aa66ff"/>;
}

// src/components/SchoolPanel.jsx
export function SchoolPanel() {
  return <ComingSoonPanel title="SCHOOL" steps={[
    "Find your LMS — Canvas, Blackboard, or Moodle",
    "For Canvas: go to Account → Settings → New Access Token",
    "Run: node --input-type=module -e \"import keytar from 'keytar'; await keytar.setPassword('ross', 'CANVAS_TOKEN', 'your_token');\"",
    "Say: 'Ross, what assignments are due this week?'",
    "Say: 'Ross, push my deadlines to my calendar'",
  ]} color="#ffaa33"/>;
}

// src/components/SettingsPanel.jsx
export function SettingsPanel() {
  return (
    <div style={{ flex:1, padding:32, background:"#000", overflowY:"auto" }}>
      <div style={{ fontSize:11, color:"#3399ff", letterSpacing:4, fontFamily:"monospace", marginBottom:24 }}>SETTINGS</div>

      {[
        { section:"VOICE", items:[
          { label:"STT Engine", value:"Deepgram Nova-2", status:"ACTIVE" },
          { label:"TTS Engine", value:"ElevenLabs Turbo v2.5", status:"ACTIVE" },
          { label:"Wake Word", value:"Disabled (push-to-talk)", status:"STANDBY" },
          { label:"Voice ID", value:"Stored in Mac Keychain", status:"SECURE" },
        ]},
        { section:"INTEGRATIONS", items:[
          { label:"Google Calendar", value:"Not connected", status:"PENDING" },
          { label:"Gmail", value:"Not connected", status:"PENDING" },
          { label:"Stripe", value:"Not connected", status:"PENDING" },
          { label:"Canvas LMS", value:"Not connected", status:"PENDING" },
          { label:"File System", value:"Desktop, Documents, Downloads", status:"ACTIVE" },
        ]},
        { section:"MEMORY", items:[
          { label:"Database", value:"~/.ross/memory.db", status:"ACTIVE" },
          { label:"Audit Log", value:"Enabled", status:"ACTIVE" },
          { label:"Context Window", value:"Last 16 messages", status:"ACTIVE" },
        ]},
        { section:"SECURITY", items:[
          { label:"API Keys", value:"Mac OS Keychain", status:"SECURE" },
          { label:"File Access", value:"Sandboxed to trusted roots", status:"SECURE" },
          { label:"Data Sync", value:"Local only — no cloud", status:"SECURE" },
        ]},
      ].map(({ section, items }) => (
        <div key={section} style={{ marginBottom:28 }}>
          <div style={{ fontSize:9, color:"#1a4a7a", letterSpacing:3, fontFamily:"monospace", marginBottom:12, borderBottom:"1px solid #0a2a4a", paddingBottom:6 }}>
            {section}
          </div>
          {items.map(item => (
            <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #050f1a" }}>
              <div>
                <div style={{ fontSize:11, color:"#5599cc", fontFamily:"monospace" }}>{item.label}</div>
                <div style={{ fontSize:10, color:"#1a4a7a", fontFamily:"monospace" }}>{item.value}</div>
              </div>
              <StatusBadge status={item.status}/>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────

function StatusBadge({ status }) {
  const color = status === "ACTIVE" || status === "SECURE" ? "#3399ff"
    : status === "PENDING" ? "#ffaa33"
    : "#1a4a7a";
  return (
    <span style={{
      fontSize:9, color, letterSpacing:1, fontFamily:"monospace",
      border:`1px solid ${color}33`, borderRadius:3, padding:"2px 6px",
    }}>
      {status}
    </span>
  );
}

function ComingSoonPanel({ title, steps, color }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", padding:32, background:"#000", overflowY:"auto" }}>
      <div style={{ fontSize:11, color, letterSpacing:4, fontFamily:"monospace", marginBottom:8 }}>{title}</div>
      <div style={{ fontSize:10, color:"#1a4a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:32 }}>INTEGRATION SETUP</div>

      <div style={{ maxWidth:480 }}>
        <div style={{ fontSize:10, color:"#3399ff", letterSpacing:2, fontFamily:"monospace", marginBottom:16 }}>
          HOW TO CONNECT:
        </div>
        {steps.map((step, i) => (
          <div key={i} style={{ display:"flex", gap:16, marginBottom:14, alignItems:"flex-start" }}>
            <span style={{ fontSize:11, color, fontFamily:"monospace", minWidth:20 }}>{i+1}.</span>
            <span style={{ fontSize:11, color:"#5599cc", fontFamily:"monospace", lineHeight:1.6 }}>{step}</span>
          </div>
        ))}

        <div style={{
          marginTop:32, padding:16, border:"1px solid #0a2a4a",
          borderRadius:6, background:"#010d1a",
        }}>
          <div style={{ fontSize:9, color:"#1a4a7a", letterSpacing:2, fontFamily:"monospace", marginBottom:8 }}>VOICE COMMANDS ONCE CONNECTED:</div>
          <div style={{ fontSize:10, color:"#3399ff", fontFamily:"monospace", lineHeight:2 }}>
            {title === "CALENDAR" && <>
              "Hey Ross, what's on my calendar today?"<br/>
              "Block 2pm to 4pm tomorrow for deep work"<br/>
              "Cancel my Friday meeting"<br/>
              "Find me a free hour this week"
            </>}
            {title === "EMAIL" && <>
              "Read my latest emails"<br/>
              "Summarize my unread threads"<br/>
              "Draft a reply to [name] saying..."<br/>
              "Archive everything from that newsletter"
            </>}
            {title === "STRIPE" && <>
              "How much did I make this month?"<br/>
              "Show my last 5 invoices"<br/>
              "Send [name] an invoice for $[amount]"<br/>
              "What's my MRR?"
            </>}
            {title === "SCHOOL" && <>
              "What assignments are due this week?"<br/>
              "What's my grade in [class]?"<br/>
              "Push all deadlines to my calendar"<br/>
              "Download the syllabus for [class]"
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}


