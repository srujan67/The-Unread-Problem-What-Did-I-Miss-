import { GoogleGenAI } from '@google/genai';
import { analyzeChat } from './localAnalysis.js';

/**
 * Truncates chat messages to a safe payload size for LLM ingestion.
 */
function truncateMessages(messages, maxChars = 25000, maxCount = 80) {
  if (!Array.isArray(messages)) return [];
  const subset = messages.slice(0, maxCount);
  let totalChars = 0;
  const result = [];

  for (const m of subset) {
    const textLen = (m.text || '').length;
    if (totalChars + textLen > maxChars) {
      result.push({
        sender: 'System',
        text: '... [Remaining chat log truncated for safe transmission size] ...',
        timestamp: m.timestamp || null
      });
      break;
    }
    result.push(m);
    totalChars += textLen;
  }
  return result;
}

/**
 * Executes Gemini AI analysis with strict 15s timeout and automatic local fallback.
 */
export async function analyzeWithGemini(parsedResult, userName = '') {
  // Always compute local analysis as guaranteed baseline
  const localResult = analyzeChat(parsedResult, userName);
  if (!localResult.success) {
    return localResult;
  }

  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  const modelName = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : 'gemini-2.5-flash';

  if (!apiKey) {
    return {
      success: true,
      source: 'local',
      fallbackReason: 'GEMINI_API_KEY is not configured in backend environment.',
      analysis: {
        ...localResult.analysis,
        source: 'local',
        fallbackReason: 'GEMINI_API_KEY is not configured in backend environment.'
      }
    };
  }

  try {
    const safeMessages = truncateMessages(parsedResult.messages || []);
    const conversationText = safeMessages
      .map((m, i) => `[${i + 1}] [${m.timestamp || 'not mentioned'}] ${m.sender || 'Unknown'}: ${m.text || ''}`)
      .join('\n');

    const prompt = `You are an expert conversation intelligence engine. Analyze this chat transcript and output ONLY valid JSON matching the exact schema below.

Target User for Personalization: "${userName || 'User'}"

CONVERSATION TRANSCRIPT:
${conversationText}

OUTPUT JSON SCHEMA:
{
  "summary": "Concise executive overview of the conversation discussion and main themes",
  "topics": ["List", "of", "topics"],
  "decisions": [
    {
      "id": "dec-1",
      "text": "Exact agreed decision statement",
      "decisionConfidence": "explicit",
      "sender": "Person who stated or confirmed it",
      "timestamp": "Timestamp or 'not mentioned'",
      "sourceMessage": { "text": "Exact message quote", "sender": "name", "timestamp": "time" }
    }
  ],
  "actionItems": [
    {
      "id": "act-1",
      "task": "Specific task or action item description",
      "owner": "Assigned person or 'Unassigned' or 'not mentioned'",
      "deadline": "Target date or 'not mentioned'",
      "isAssignedToUser": true if owner matches "${userName || ''}" else false,
      "sender": "Person who assigned it",
      "timestamp": "Timestamp or 'not mentioned'",
      "sourceMessage": { "text": "Exact message quote", "sender": "name", "timestamp": "time" }
    }
  ],
  "urgentHighlights": [
    {
      "id": "urg-1",
      "type": "deadline" or "urgent_task",
      "description": "Urgent blocker or time-sensitive deadline",
      "urgency": "high",
      "reason": "Why this is critical",
      "sender": "Person who requested it",
      "timestamp": "Timestamp or 'not mentioned'",
      "sourceMessage": { "text": "Exact message quote", "sender": "name", "timestamp": "time" }
    }
  ],
  "mentions": [
    {
      "id": "men-1",
      "mentionedUser": "Name of mentioned person without @",
      "sender": "Sender name",
      "text": "Message snippet containing mention",
      "timestamp": "Timestamp or 'not mentioned'",
      "isForUser": true if mentionedUser matches "${userName || ''}" else false,
      "sourceMessage": { "text": "Exact message quote", "sender": "name", "timestamp": "time" }
    }
  ]
}

STRICT INSTRUCTIONS:
1. Use ONLY facts directly stated in the chat transcript. Never hallucinate or invent names, dates, or tasks.
2. If any owner, deadline, or timestamp is not explicitly stated, write 'not mentioned'.
3. Output ONLY the JSON object. Do not include markdown code block formatting or backticks.`;

    const ai = new GoogleGenAI({ apiKey });

    // 15-second timeout wrapper
    const geminiCall = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API call timed out after 15 seconds.')), 15000);
    });

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const responseText = response.text ? response.text.trim() : '';

    if (!responseText) {
      throw new Error('Gemini returned an empty response.');
    }

    let parsedJson;
    try {
      // Clean up accidental markdown code fence wrapping if present
      const cleanedText = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsedJson = JSON.parse(cleanedText);
    } catch (parseErr) {
      throw new Error(`Gemini response is not valid JSON: ${parseErr.message}`);
    }

    // Merge and normalize AI results with original conversation metadata
    const finalAnalysis = {
      summary: parsedJson.summary || localResult.analysis.summary,
      topics: Array.isArray(parsedJson.topics) ? parsedJson.topics : localResult.analysis.topics,
      format: parsedResult.format,
      totalMessages: parsedResult.messages.length,
      participants: localResult.analysis.participants,
      decisions: Array.isArray(parsedJson.decisions) ? parsedJson.decisions : localResult.analysis.decisions,
      actionItems: Array.isArray(parsedJson.actionItems) ? parsedJson.actionItems : localResult.analysis.actionItems,
      urgentHighlights: Array.isArray(parsedJson.urgentHighlights) ? parsedJson.urgentHighlights : localResult.analysis.urgentHighlights,
      mentions: Array.isArray(parsedJson.mentions) ? parsedJson.mentions : localResult.analysis.mentions,
      messages: localResult.analysis.messages,
      source: 'gemini',
      privacyNotice: 'Analyzed with Google Gemini AI. Content was transmitted externally to Gemini API.'
    };

    return {
      success: true,
      source: 'gemini',
      analysis: finalAnalysis
    };
  } catch (err) {
    // Graceful fallback to deterministic local analysis
    let reason = err.message || 'Gemini AI call failed';
    if (err.status === 429 || reason.includes('429')) {
      reason = 'Gemini API rate limit exceeded (429).';
    } else if (reason.includes('timed out')) {
      reason = 'Gemini API timed out after 15s.';
    } else if (err.status === 503 || reason.includes('503')) {
      reason = 'Gemini API service temporarily unavailable (503).';
    } else if (err.status === 404 || reason.includes('404')) {
      reason = `Configured Gemini model (${modelName}) not found or retired.`;
    }

    return {
      success: true,
      source: 'local',
      fallbackReason: reason,
      analysis: {
        ...localResult.analysis,
        source: 'local',
        fallbackReason: reason
      }
    };
  }
}
