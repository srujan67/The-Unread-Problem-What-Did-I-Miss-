import { Router } from 'express';
import { parseChatLog } from '../services/chatParser.js';
import { analyzeChat } from '../services/localAnalysis.js';

const router = Router();

// In-memory store for recent analyses
const analysesStore = new Map();
let latestId = null;

/**
 * POST /api/analyze
 * Accepts chatLog content, filename hint, and optional userName.
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
    analysis: result.analysis
  };

  analysesStore.set(id, record);
  latestId = id;

  return res.status(200).json({
    success: true,
    id,
    analysis: result.analysis
  });
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
