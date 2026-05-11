import keytar from 'keytar';

// Run this once to save your API keys securely to Mac Keychain
// Replace the placeholder values with your actual keys

await keytar.setPassword('ross', 'DEEPGRAM_API_KEY', 'your_deepgram_key_here');
await keytar.setPassword('ross', 'ELEVENLABS_API_KEY', 'your_elevenlabs_key_here');
await keytar.setPassword('ross', 'ELEVENLABS_VOICE_ID', 'your_voice_id_here');
await keytar.setPassword('ross', 'ANTHROPIC_API_KEY', 'your_anthropic_key_here');

console.log('✅ All keys saved securely to Mac Keychain!');
