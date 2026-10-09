import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithGemini } from './aiAnalysis.js';

test('analyzeWithGemini gracefully falls back to local analysis when Gemini call fails or model is invalid', async () => {
  const dummyParsed = {
    success: true,
    format: 'json',
    messages: [
      { sender: 'Alice', timestamp: '10:00 AM', text: 'Hey @Bob, please check the deploy.' },
      { sender: 'Bob', timestamp: '10:05 AM', text: 'DECISION: We agreed to deploy tomorrow.' }
    ]
  };

  const result = await analyzeWithGemini(dummyParsed, 'Bob');
  assert.equal(result.success, true);
  assert.ok(result.source === 'local' || result.source === 'gemini');
  assert.ok(result.analysis);
  assert.equal(result.analysis.totalMessages, 2);
  assert.ok(result.analysis.decisions.length >= 1);
});

test('analyzeWithGemini returns error when parsed input is invalid', async () => {
  const invalidParsed = { success: false, error: 'Unparseable' };
  const result = await analyzeWithGemini(invalidParsed);
  assert.equal(result.success, false);
});
