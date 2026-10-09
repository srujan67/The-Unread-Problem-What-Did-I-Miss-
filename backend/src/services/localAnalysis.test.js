import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseChatLog } from './chatParser.js';
import { analyzeChat } from './localAnalysis.js';

test('analyzeChat produces evidence-backed summary, tasks, decisions, and highlights for demoChat.json', async () => {
  const fixturePath = path.resolve('src/fixtures/demoChat.json');
  const content = await fs.readFile(fixturePath, 'utf8');
  const parsed = parseChatLog(content, 'demoChat.json');
  assert.equal(parsed.success, true);

  const result = analyzeChat(parsed, 'Jordan');
  assert.equal(result.success, true);
  const analysis = result.analysis;

  // 1. Non-empty topic-based summary
  assert.ok(analysis.summary && analysis.summary.length > 20);
  assert.ok(analysis.topics.length > 0);
  assert.ok(analysis.topics.includes('Architecture & Persistence') || analysis.topics.includes('Security & Authentication'));

  // 2. Decisions with evidence and sourceMessage
  assert.ok(analysis.decisions.length >= 1);
  const dec = analysis.decisions[0];
  assert.ok(dec.text.toLowerCase().includes('postgresql'));
  assert.equal(dec.sender, 'Taylor Reed');
  assert.ok(dec.sourceMessage);
  assert.equal(dec.sourceMessage.sender, 'Taylor Reed');
  assert.equal(typeof dec.decisionConfidence, 'string');

  // 3. Action items with owner and deadline
  assert.ok(analysis.actionItems.length >= 1);
  const jordanTask = analysis.actionItems.find(a => a.isAssignedToUser);
  assert.ok(jordanTask, 'Should identify task assigned to Jordan');
  assert.equal(jordanTask.owner, 'Jordan');
  assert.equal(jordanTask.ownerConfidence, 'explicit');
  assert.ok(jordanTask.sourceMessage);

  // 4. Deadlines identified
  const deadlineTask = analysis.actionItems.find(a => a.deadline.includes('October 15'));
  assert.ok(deadlineTask, 'Should identify deadline October 15');
  assert.equal(deadlineTask.deadlineConfidence, 'explicit');

  // 5. Urgent highlights with source and reason
  assert.ok(analysis.urgentHighlights.length >= 1);
  const urg = analysis.urgentHighlights[0];
  assert.equal(urg.urgency, 'high');
  assert.ok(urg.reason);
  assert.ok(urg.sourceMessage);

  // 6. Direct mentions with isForUser targeting Jordan
  const jordanMentions = analysis.mentions.filter(m => m.isForUser);
  assert.ok(jordanMentions.length >= 1);
  assert.equal(jordanMentions[0].mentionedUser, 'Jordan');

  // 7. High user relevance score for Jordan
  assert.ok(analysis.userRelevanceScore >= 70);
});

test('analyzeChat produces sensible empty results and summary for irrelevant/casual chat', () => {
  const casualChat = JSON.stringify([
    { sender: 'Alice', timestamp: '2026-10-09T08:00:00Z', text: 'Good morning everyone! How is the coffee today?' },
    { sender: 'Bob', timestamp: '2026-10-09T08:02:00Z', text: 'Morning Alice! Coffee is good.' },
    { sender: 'Charlie', timestamp: '2026-10-09T08:05:00Z', text: 'Have a great Friday!' }
  ]);

  const parsed = parseChatLog(casualChat, 'chat.json');
  assert.equal(parsed.success, true);

  const result = analyzeChat(parsed, 'Jordan');
  assert.equal(result.success, true);
  const analysis = result.analysis;

  assert.equal(analysis.decisions.length, 0);
  assert.equal(analysis.actionItems.length, 0);
  assert.equal(analysis.urgentHighlights.length, 0);
  assert.equal(analysis.mentions.length, 0);
  assert.equal(analysis.topics.length, 0);
  assert.equal(analysis.userRelevanceScore, 0);
  assert.ok(analysis.summary.includes('Casual conversation'));
  assert.ok(analysis.summary.includes('no project topics'));
});

test('analyzeChat marks uncertain fields when owner or deadline is not specified', () => {
  const uncertainChat = JSON.stringify([
    { sender: 'Sam', timestamp: '2026-10-09T08:00:00Z', text: 'Please review the updated dashboard styles when you get a chance.' }
  ]);

  const parsed = parseChatLog(uncertainChat, 'chat.json');
  assert.equal(parsed.success, true);

  const result = analyzeChat(parsed);
  assert.equal(result.success, true);
  const analysis = result.analysis;

  assert.equal(analysis.actionItems.length, 1);
  const task = analysis.actionItems[0];
  assert.equal(task.owner, 'Unassigned');
  assert.equal(task.ownerConfidence, 'uncertain');
  assert.equal(task.deadline, 'No explicit deadline');
  assert.equal(task.deadlineConfidence, 'uncertain');
  assert.ok(task.sourceMessage);
});
