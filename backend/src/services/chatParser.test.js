import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatLog } from './chatParser.js';

test('WhatsApp iOS format parsing with multi-line and @mentions', () => {
  const iosContent = `[24/09/24, 10:15:30 AM] Alice: Hey @Bob, are we still on for the sync?
[24/09/24, 10:16:00 AM] Bob: Yes @Alice!
Here is the updated doc link.
[24/09/24, 10:17:00 AM] Alice joined using this group's invite link`;

  const result = parseChatLog(iosContent, 'export.txt');
  assert.equal(result.success, true);
  assert.equal(result.format, 'whatsapp');
  assert.equal(result.messages.length, 3);

  // Message 1
  assert.equal(result.messages[0].sender, 'Alice');
  assert.equal(result.messages[0].timestamp, '24/09/24, 10:15:30 AM');
  assert.equal(result.messages[0].text, 'Hey @Bob, are we still on for the sync?');
  assert.deepEqual(result.messages[0].mentions, ['Bob']);

  // Message 2 (multi-line)
  assert.equal(result.messages[1].sender, 'Bob');
  assert.equal(result.messages[1].text, 'Yes @Alice!\nHere is the updated doc link.');
  assert.deepEqual(result.messages[1].mentions, ['Alice']);

  // Message 3 (system message)
  assert.equal(result.messages[2].sender, 'System');
  assert.equal(result.messages[2].text, "Alice joined using this group's invite link");
});

test('WhatsApp Android format parsing', () => {
  const androidContent = `24/09/2024, 10:15 - Alice: Hey @Charlie, review PR #42
24/09/2024, 10:17 - Charlie: On it! @Alice @919876543210
24/09/2024, 10:20 - Messages and calls are end-to-end encrypted.`;

  const result = parseChatLog(androidContent, 'Android_Chat.txt');
  assert.equal(result.success, true);
  assert.equal(result.format, 'whatsapp');
  assert.equal(result.messages.length, 3);

  assert.equal(result.messages[0].sender, 'Alice');
  assert.equal(result.messages[0].text, 'Hey @Charlie, review PR #42');

  assert.equal(result.messages[1].sender, 'Charlie');
  assert.deepEqual(result.messages[1].mentions.sort(), ['919876543210', 'Alice']);

  assert.equal(result.messages[2].sender, 'System');
});

test('CSV export parsing', () => {
  const csvContent = `"Timestamp","Sender","Message"
"2026-10-09T10:00:00Z","Alice","Hey @Dave, welcome!"
"2026-10-09T10:05:00Z","Dave","Thanks @Alice"`;

  const result = parseChatLog(csvContent, 'export.csv');
  assert.equal(result.success, true);
  assert.equal(result.format, 'csv');
  assert.equal(result.messages.length, 2);

  assert.equal(result.messages[0].sender, 'Alice');
  assert.equal(result.messages[0].text, 'Hey @Dave, welcome!');
  assert.deepEqual(result.messages[0].mentions, ['Dave']);

  assert.equal(result.messages[1].sender, 'Dave');
  assert.equal(result.messages[1].timestamp, '2026-10-09T10:05:00Z');
});

test('JSON export parsing', () => {
  const jsonContent = JSON.stringify([
    { sender: 'Alice', timestamp: '2026-10-09T10:00:00Z', text: 'Meeting at 3 @Team' },
    { author: 'Bob', created_at: '2026-10-09T10:01:00Z', content: 'Got it' }
  ]);

  const result = parseChatLog(jsonContent, 'chat.json');
  assert.equal(result.success, true);
  assert.equal(result.format, 'json');
  assert.equal(result.messages.length, 2);

  assert.equal(result.messages[0].sender, 'Alice');
  assert.deepEqual(result.messages[0].mentions, ['Team']);
  assert.equal(result.messages[1].sender, 'Bob');
});

test('Malformed / empty input handling', () => {
  const emptyResult = parseChatLog('', 'empty.txt');
  assert.equal(emptyResult.success, false);
  assert.equal(typeof emptyResult.error, 'string');

  const invalidResult = parseChatLog('Random gibberish without dates or structure', 'random.txt');
  assert.equal(invalidResult.success, false);
  assert.equal(invalidResult.messages.length, 0);
  assert.equal(typeof invalidResult.error, 'string');
});

test('Synthetic demoChat.json fixture parsing', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const fixturePath = path.resolve('src/fixtures/demoChat.json');
  const content = await fs.readFile(fixturePath, 'utf8');

  const result = parseChatLog(content, 'demoChat.json');
  assert.equal(result.success, true);
  assert.equal(result.format, 'json');
  assert.equal(result.messages.length, 8);
  
  // Verify senders count
  const senders = new Set(result.messages.map(m => m.sender));
  assert.equal(senders.size, 4);

  // Verify mentions, decision, task, deadline present
  const allMentions = result.messages.flatMap(m => m.mentions);
  assert.ok(allMentions.includes('Alex'));
  assert.ok(allMentions.includes('Jordan'));
  assert.ok(allMentions.includes('Taylor'));
});

