import { Router } from 'express';
import { parseChatLog } from '../services/chatParser.js';
import { analyzeChat } from '../services/localAnalysis.js';
import { analyzeWithGemini } from '../services/aiAnalysis.js';
import { askChat } from '../services/chatService.js';

const router = Router();

// In-memory store for recent analyses
const analysesStore = new Map();
let latestId = null;

/**
 * POST /api/analyze
 * Deterministic local-only chat analysis.
 */
router.post('/analyze', (req, res) => {
  const { chatLog, filename = '', userName = '' } = req.body || {};

  if (!chatLog || (typeof chatLog !== 'string' && typeof chatLog !== 'object')) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid chatLog input in request body.'
    });
  }

  const parsed = parseChatLog(chatLog, filename);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error || 'Failed to parse chat log.'
    });
  }

  const result = analyzeChat(parsed, userName);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Failed to analyze parsed chat log.'
    });
  }

  const id = `analysis-${Date.now()}`;
  const record = {
    id,
    timestamp: new Date().toISOString(),
    source: 'local',
    analysis: {
      ...result.analysis,
      source: 'local'
    }
  };

  analysesStore.set(id, record);
  latestId = id;

  return res.status(200).json({
    success: true,
    source: 'local',
    id,
    analysis: record.analysis
  });
});

/**
 * POST /api/analyze-ai
 * Optional Gemini AI chat analysis with automatic local fallback.
 */
router.post('/analyze-ai', async (req, res) => {
  const { chatLog, filename = '', userName = '' } = req.body || {};

  if (!chatLog || (typeof chatLog !== 'string' && typeof chatLog !== 'object')) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid chatLog input in request body.'
    });
  }

  const parsed = parseChatLog(chatLog, filename);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error || 'Failed to parse chat log.'
    });
  }

  const result = await analyzeWithGemini(parsed, userName);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Failed to analyze chat log.'
    });
  }

  const id = `analysis-ai-${Date.now()}`;
  const responseData = {
    success: true,
    source: result.source,
    ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
    id,
    analysis: result.analysis
  };

  analysesStore.set(id, responseData);
  latestId = id;

  return res.status(200).json(responseData);
});

/**
 * POST /api/chat
 * Ask questions about conversation messages backed by Gemini AI with local keyword search fallback.
 */
router.post('/chat', async (req, res) => {
  const { messages, question, history = [], forceLocal = false } = req.body || {};

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Question is required and must be a non-empty string.'
    });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({
      success: false,
      error: 'Messages must be provided as an array.'
    });
  }

  try {
    const result = await askChat({
      messages,
      question: question.trim(),
      history,
      forceLocal: Boolean(forceLocal)
    });

    return res.status(200).json({
      success: true,
      answer: result.answer,
      sources: result.sources || [],
      source: result.source || 'local',
      ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {})
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Chat request failed: ${err.message}`
    });
  }
});

/**
 * GET /api/analyze/latest
 * Returns the most recent analysis record from in-memory store.
 */
router.get('/analyze/latest', (req, res) => {
  if (!latestId || !analysesStore.has(latestId)) {
    return res.status(404).json({
      success: false,
      error: 'No conversation analysis found in memory.'
    });
  }

  return res.status(200).json({
    success: true,
    ...analysesStore.get(latestId)
  });
});

export default router;
