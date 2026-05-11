// setup-google.mjs
// Run this to connect Google Calendar + Gmail to Ross
// node setup-google.mjs

import keytar from 'keytar';
import { createServer } from 'http';
import { exec } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));

console.log('\n🔐 Ross — Google Integration Setup\n');
console.log('You need a Google Cloud project with Calendar API + Gmail API enabled.');
console.log('Credentials: console.cloud.google.com → APIs → Credentials → OAuth 2.0\n');

const clientId     = await ask('Paste your Google Client ID:     ');
const clientSecret = await ask('Paste your Google Client Secret: ');

await keytar.setPassword('ross', 'GOOGLE_CLIENT_ID',     clientId.trim());
await keytar.setPassword('ross', 'GOOGLE_CLIENT_SECRET', clientSecret.trim());

// Build OAuth URL
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

const REDIRECT_URI = 'http://localhost:8899/oauth2callback';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId.trim())}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPES)}&` +
  `access_type=offline&prompt=consent`;

console.log('\n🌐 Opening browser for Google authorization...\n');
exec(`open "${authUrl}"`);

// Local server to catch redirect
const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:8899');
    const code = url.searchParams.get('code');
    if (code) {
      res.end('<h1 style="font-family:monospace">✅ Ross authorized! You can close this tab.</h1>');
      server.close();
      resolve(code);
    } else {
      res.end('<h1 style="font-family:monospace">❌ Authorization failed</h1>');
      server.close();
      reject(new Error('No code received'));
    }
  });
  server.listen(8899, () => console.log('Waiting for Google to redirect... (listening on port 8899)'));
  setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120000);
});

// Exchange code for tokens
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }),
});

const tokens = await tokenResponse.json();
if (tokens.error) throw new Error(`Token error: ${tokens.error_description}`);

await keytar.setPassword('ross', 'GOOGLE_ACCESS_TOKEN',  tokens.access_token);
await keytar.setPassword('ross', 'GOOGLE_REFRESH_TOKEN', tokens.refresh_token);

console.log('\n✅ Google Calendar + Gmail connected to Ross!');
console.log('Your tokens are stored securely in the Mac Keychain.');
console.log('\nTry saying: "Ross, what\'s on my calendar today?"\n');

rl.close();
process.exit(0);
