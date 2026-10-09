/**
 * Local Analysis Service
 * Performs deterministic offline analysis of parsed chat messages.
 * Extracts summaries, decisions, action items with owners & deadlines,
 * urgent highlights, mentions, user relevance, and privacy statements.
 */

const DECISION_PATTERNS = [
  /decision:\s*(.+)/i,
  /we (?:decided|agreed|resolved|approved) to (.+)/i,
  /agreed on (.+)/i
];

const ACTION_PATTERNS = [
  /action item:\s*(.+)/i,
  /todo:\s*(.+)/i,
  /@(\w+)\s+(?:to|must|should|will)\s+(.+)/i,
  /(?:please|can someone)\s+(.+)/i
];

const DEADLINE_PATTERNS = [
  /(?:by|before|deadline:?)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}(?:\s*at\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|EST|PST|UTC)?)?)/i,
  /(?:by|before|deadline:?)\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
  /(?:by|before)\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday)/i
];

export function analyzeChat(parsedResult, userName = '') {
  if (!parsedResult || !parsedResult.success || !Array.isArray(parsedResult.messages)) {
    return {
      success: false,
      error: parsedResult?.error || 'Invalid or unparsed chat log provided.'
    };
  }

  const messages = parsedResult.messages;
  const participants = Array.from(new Set(
    messages.map(m => m.sender).filter(s => s && s !== 'System')
  ));

  const decisions = [];
  const actionItems = [];
  const urgentHighlights = [];
  const mentionsList = [];

  const targetUser = userName ? userName.trim().toLowerCase() : '';

  messages.forEach((msg, idx) => {
    const text = msg.text || '';
    const sender = msg.sender || 'Unknown';
    const timestamp = msg.timestamp || null;

    // 1. Check for Decisions
    let isDecision = false;
    for (const pattern of DECISION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        decisions.push({
          id: `dec-${idx}`,
          text: match[1] || text,
          fullMessage: text,
          sender,
          timestamp
        });
        isDecision = true;
        break;
      }
    }

    // 2. Check for Action Items & Deadlines
    let deadline = null;
    for (const dlPattern of DEADLINE_PATTERNS) {
      const dlMatch = text.match(dlPattern);
      if (dlMatch) {
        deadline = dlMatch[1] || dlMatch[0];
        break;
      }
    }

    let isAction = false;
    if (text.match(/action item:/i) || text.match(/todo:/i) || text.match(/must|should|assigned|deadline/i)) {
      isAction = true;
      let owner = 'Unassigned';
      if (msg.mentions && msg.mentions.length > 0) {
        owner = msg.mentions[0];
      } else {
        const ownerMatch = text.match(/@(\w+)/);
        if (ownerMatch) owner = ownerMatch[1];
      }

      actionItems.push({
        id: `act-${idx}`,
        task: text.replace(/^(action item|todo|urgent deadline):\s*/i, ''),
        owner,
        deadline: deadline || 'No explicit deadline',
        sender,
        timestamp
      });
    }

    // 3. Urgent Highlights
    if (text.match(/urgent|asap|critical|blocker|deadline:/i) || (deadline && text.match(/must|required/i))) {
      urgentHighlights.push({
        id: `urg-${idx}`,
        type: deadline ? 'deadline' : 'urgent_task',
        description: text,
        sender,
        timestamp,
        urgency: 'high'
      });
    }

    // 4. Mentions tracking
    if (msg.mentions && msg.mentions.length > 0) {
      msg.mentions.forEach(mentioned => {
        const isForUser = targetUser ? mentioned.toLowerCase().includes(targetUser) || targetUser.includes(mentioned.toLowerCase()) : false;
        mentionsList.push({
          id: `men-${idx}-${mentioned}`,
          mentionedUser: mentioned,
          sender,
          text,
          timestamp,
          isForUser
        });
      });
    }
  });

  // Calculate User Relevance Score
  let userRelevanceScore = 100;
  if (targetUser) {
    let relevantCount = 0;
    mentionsList.forEach(m => { if (m.isForUser) relevantCount += 3; });
    actionItems.forEach(a => { if (a.owner.toLowerCase().includes(targetUser)) relevantCount += 4; });
    messages.forEach(m => { if (m.sender.toLowerCase().includes(targetUser)) relevantCount += 1; });
    userRelevanceScore = Math.min(100, Math.max(10, Math.round((relevantCount / (messages.length || 1)) * 100) + 40));
  }

  // Executive Summary Generation
  const summaryParts = [];
  summaryParts.push(`Conversation with ${messages.length} messages across ${participants.length} participants (${participants.slice(0, 3).join(', ')}${participants.length > 3 ? '...' : ''}).`);
  if (decisions.length > 0) {
    summaryParts.push(`Key decisions made: ${decisions.length}.`);
  }
  if (actionItems.length > 0) {
    summaryParts.push(`Assigned action items: ${actionItems.length}.`);
  }
  if (urgentHighlights.length > 0) {
    summaryParts.push(`Urgent highlights identified: ${urgentHighlights.length}.`);
  }

  return {
    success: true,
    analysis: {
      summary: summaryParts.join(' '),
      format: parsedResult.format,
      totalMessages: messages.length,
      participants,
      decisions,
      actionItems,
      urgentHighlights,
      mentions: mentionsList,
      userRelevanceScore,
      privacyNotice: 'Processed 100% locally. Zero conversation data or metadata leaves your server or device.'
    }
  };
}
