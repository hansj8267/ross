// talk.mjs  — push to talk test
import { exec } from 'child_process';
import { rossRespond } from './ross-core.mjs';
import readline from 'readline';

const history = [];
const audioFile = '/tmp/ross_input.wav';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function waitForEnter(msg) {
  return new Promise(resolve => rl.question(msg, resolve));
}

console.log('\n🎙️  Ross is ready. Press ENTER to start talking.\n');

while (true) {
  await waitForEnter('👉 Press ENTER to record...');

  const recorder = exec(`sox -d -r 16000 -c 1 ${audioFile}`);
  console.log('🔴 Recording... press ENTER to stop');

  await waitForEnter('');
  recorder.kill('SIGINT');

  // small delay to let sox finish writing
  await new Promise(r => setTimeout(r, 500));

  try {
    const { transcript, reply } = await rossRespond(audioFile, history);
    history.push({ role: 'user', content: transcript });
    history.push({ role: 'assistant', content: reply });
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  console.log('\n─────────────────────────────────\n');
}