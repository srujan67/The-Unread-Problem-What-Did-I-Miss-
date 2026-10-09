import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatLog } from '../services/chatParser.js';
import { analyzeChat } from '../services/localAnalysis.js';
import fs from 'node:fs/promises';
import path from 'node:path';

test('localAnalysis extracts decisions, tasks, deadlines, mentions, and privacy notice', async () => {
  const fixturePath = path.resolve('src/fixtures/demoChat.json');
  const rawContent = await fs.readFile(fixturePath, 'utf8');

  const parsed = parseChatLog(rawContent, 'demoChat.json');
  assert.equal(parsed.success, true);

  const result = analyzeChat(parsed, 'Jordan');
  assert.equal(result.success, true);

  const { analysis } = result;
  assert.ok(analysis.summary.includes('Conversation with 8 messages'));
  assert.equal(analysis.totalMessages, 8);
  assert.ok(analysis.participants.includes('Alex Chen'));
  assert.ok(analysis.participants.includes('Jordan Miller'));

  // Decisions
  assert.ok(analysis.decisions.length >= 1);
  assert.ok(analysis.decisions[0].text.includes('PostgreSQL'));

  // Action Items & Deadlines
  assert.ok(analysis.actionItems.length >= 1);
  const JordanAction = analysis.actionItems.find(a => a.owner === 'Jordan');
  assert.ok(JordanAction);
  assert.ok(JordanAction.task.includes('security audit'));

  // Urgent Highlights
  assert.ok(analysis.urgentHighlights.length >= 1);

  // Mentions
  assert.ok(analysis.mentions.length >= 1);
  const JordanMention = analysis.mentions.find(m => m.mentionedUser === 'Jordan');
  assert.ok(JordanMention);
  assert.equal(JordanMention.isForUser, true);

  // Privacy notice
  assert.ok(analysis.privacyNotice.includes('100% locally'));
});

test('localAnalysis handles invalid or empty inputs gracefully', () => {
  const emptyAnalysis = analyzeChat(null);
  assert.equal(emptyAnalysis.success, false);
  assert.ok(emptyAnalysis.error);

  const unparsedAnalysis = analyzeChat({ success: false, error: 'Unparsed' });
  assert.equal(unparsedAnalysis.success, false);
  assert.equal(unparsedAnalysis.error, 'Unparsed');
});
