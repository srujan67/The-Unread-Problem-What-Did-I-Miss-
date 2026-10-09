/**
 * Chat Log Parser Service
 * Supports WhatsApp (.txt, iOS & Android formats with multi-line messages),
 * CSV, and JSON exports.
 */

// Helper to sanitize control characters like left-to-right marks \u200e
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
}

// Extract @mentions from text
export function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([A-Za-z0-9_.-]+)/g);
  if (!matches) return [];
  const unique = new Set(matches.map(m => m.slice(1)));
  return Array.from(unique);
}

// Regex for WhatsApp iOS format: [dd/mm/yy, h:mm:ss AM] Name: message
const WHATSAPP_IOS_REGEX = /^\s*\[(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s*(.+)$/;

// Regex for WhatsApp Android format: dd/mm/yyyy, HH:mm - Name: message
const WHATSAPP_ANDROID_REGEX = /^\s*(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap]\.?m\.?)?)\s*-\s*(.+)$/;

/**
 * Parse WhatsApp text export (both iOS and Android, including multi-line messages)
 */
function parseWhatsApp(content) {
  const sanitized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = sanitized.split('\n');
  const messages = [];
  let currentMsg = null;

  for (const rawLine of lines) {
    const line = sanitizeText(rawLine);
    if (!line && !currentMsg) continue;

    const iosMatch = line.match(WHATSAPP_IOS_REGEX);
    const androidMatch = line.match(WHATSAPP_ANDROID_REGEX);
    const match = iosMatch || androidMatch;

    if (match) {
      if (currentMsg) {
        currentMsg.text = currentMsg.text.trim();
        currentMsg.mentions = extractMentions(currentMsg.text);
        messages.push(currentMsg);
      }

      const timestamp = match[1].trim();
      const body = match[2].trim();

      let sender = 'System';
      let text = body;

      const colonIdx = body.indexOf(': ');
      if (colonIdx !== -1) {
        sender = body.substring(0, colonIdx).trim();
        text = body.substring(colonIdx + 2).trim();
      }

      currentMsg = {
        sender,
        timestamp,
        text,
        mentions: []
      };
    } else if (currentMsg) {
      currentMsg.text += '\n' + rawLine;
    }
  }

  if (currentMsg) {
    currentMsg.text = currentMsg.text.trim();
    currentMsg.mentions = extractMentions(currentMsg.text);
    messages.push(currentMsg);
  }

  return messages;
}

/**
 * Robust CSV parser for chat exports
 */
function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse CSV line respecting quotes
  function parseCSVLine(line) {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    values.push(cur.trim());
    return values;
  }

  const rows = lines.map(parseCSVLine);
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  
  let senderIdx = headers.findIndex(h => ['sender', 'author', 'user', 'from', 'name'].includes(h));
  let timestampIdx = headers.findIndex(h => ['timestamp', 'time', 'date', 'datetime', 'createdat'].includes(h));
  let textIdx = headers.findIndex(h => ['text', 'message', 'content', 'body', 'msg'].includes(h));

  let startRow = 1;

  if (senderIdx === -1 || textIdx === -1) {
    // Fallback if no explicit headers: check column counts
    startRow = 0;
    if (rows[0].length >= 3) {
      // Assume timestamp, sender, text or sender, timestamp, text
      senderIdx = 1;
      timestampIdx = 0;
      textIdx = 2;
    } else if (rows[0].length === 2) {
      senderIdx = 0;
      textIdx = 1;
      timestampIdx = -1;
    } else {
      return [];
    }
  }

  const messages = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const sender = (senderIdx >= 0 && row[senderIdx]) ? row[senderIdx] : 'Unknown';
    const timestamp = (timestampIdx >= 0 && row[timestampIdx]) ? row[timestampIdx] : null;
    const text = (textIdx >= 0 && row[textIdx]) ? row[textIdx] : '';

    if (text) {
      messages.push({
        sender: sanitizeText(sender),
        timestamp: timestamp ? sanitizeText(timestamp) : null,
        text: sanitizeText(text),
        mentions: extractMentions(text)
      });
    }
  }

  return messages;
}

/**
 * Parse JSON chat export
 */
function parseJSON(content) {
  const data = typeof content === 'string' ? JSON.parse(content) : content;
  let items = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    items = data.messages || data.chats || data.data || data.items || [];
  }

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map(msg => {
    const sender = msg.sender || msg.author || msg.user || msg.from || msg.name || 'Unknown';
    const timestamp = msg.timestamp || msg.time || msg.date || msg.datetime || msg.created_at || null;
    const text = msg.text || msg.message || msg.content || msg.body || '';

    return {
      sender: sanitizeText(String(sender)),
      timestamp: timestamp ? sanitizeText(String(timestamp)) : null,
      text: sanitizeText(String(text)),
      mentions: extractMentions(String(text))
    };
  }).filter(m => m.text.length > 0);
}

/**
 * Main Chat Log Parser entry point
 * Detects format automatically or uses hint.
 */
export function parseChatLog(content, filenameHint = '') {
  if (!content || typeof content !== 'string' && typeof content !== 'object') {
    return {
      success: false,
      format: 'unknown',
      messages: [],
      error: 'Invalid or empty chat input provided.'
    };
  }

  const strContent = typeof content === 'string' ? content : JSON.stringify(content);
  if (!strContent.trim()) {
    return {
      success: false,
      format: 'unknown',
      messages: [],
      error: 'Chat content is empty.'
    };
  }

  try {
    // 1. Try JSON
    if (strContent.trim().startsWith('{') || strContent.trim().startsWith('[')) {
      try {
        const jsonMessages = parseJSON(strContent);
        if (jsonMessages.length > 0) {
          return {
            success: true,
            format: 'json',
            messages: jsonMessages
          };
        }
      } catch (e) {
        // Not valid JSON, continue to other parsers
      }
    }

    // 2. Try WhatsApp (.txt format check)
    const isWhatsAppLine = WHATSAPP_IOS_REGEX.test(strContent) || WHATSAPP_ANDROID_REGEX.test(strContent);
    if (isWhatsAppLine || filenameHint.toLowerCase().endsWith('.txt')) {
      const waMessages = parseWhatsApp(strContent);
      if (waMessages.length > 0) {
        return {
          success: true,
          format: 'whatsapp',
          messages: waMessages
        };
      }
    }

    // 3. Try CSV
    if (filenameHint.toLowerCase().endsWith('.csv') || strContent.includes(',')) {
      const csvMessages = parseCSV(strContent);
      if (csvMessages.length > 0) {
        return {
          success: true,
          format: 'csv',
          messages: csvMessages
        };
      }
    }

    // 4. Fallback WhatsApp parsing attempt if not caught by regex check above
    const fallbackWaMessages = parseWhatsApp(strContent);
    if (fallbackWaMessages.length > 0) {
      return {
        success: true,
        format: 'whatsapp',
        messages: fallbackWaMessages
      };
    }

    return {
      success: false,
      format: 'unknown',
      messages: [],
      error: 'Unable to detect or parse valid messages from the input file.'
    };
  } catch (err) {
    return {
      success: false,
      format: 'unknown',
      messages: [],
      error: `Failed to parse chat log: ${err.message}`
    };
  }
}
