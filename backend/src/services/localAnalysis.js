/**
 * Local Analysis Service
 * Performs deterministic offline analysis of parsed chat messages.
 * Extracts topic-based summaries, decisions, assigned tasks, dates/deadlines,
 * direct mentions, urgency highlights, user relevance, and privacy disclosures.
 * Every extracted item preserves a source message reference and marks uncertain fields.
 */

const DECISION_PATTERNS = [
  { pattern: /^(?:decision|resolved|agreed):\s*(.+)/i, explicit: true },
  { pattern: /\bwe\s+(?:decided|agreed|resolved|approved)\s+to\s+(.+)/i, explicit: true },
  { pattern: /\bagreed\s+on\s+(.+)/i, explicit: true },
  { pattern: /\b(?:let's\s+go\s+with|going\s+with)\s+(.+)/i, explicit: false }
];

const DEADLINE_PATTERNS = [
  /(?:by|before|deadline:?|due:?)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}(?:\s*at\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|EST|PST|UTC|EDT|PDT)?)?)/i,
  /(?:by|before|deadline:?|due:?)\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?:\s*at\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)?)/i,
  /(?:by|before)\s+((?:next\s+)?(?:friday|monday|tuesday|wednesday|thursday|saturday|sunday|tomorrow|eod|cob))/i,
  /by\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:noon|midnight|morning|evening))/i
];

const TOPIC_CLUSTERS = [
  {
    topic: 'Architecture & Persistence',
    pattern: /\b(architecture|database|postgres|postgresql|sql|persistence|storage|cloud storage|schema)\b/i
  },
  {
    topic: 'Security & Authentication',
    pattern: /\b(security|audit|jwt|auth|authentication|authorization|tokens?|credentials?|password)\b/i
  },
  {
    topic: 'API & Documentation',
    pattern: /\b(api|spec|specification|docs?|documentation|endpoint|swagger|pr|pull request)\b/i
  },
  {
    topic: 'Release & Schedule',
    pattern: /\b(release|v2|schedule|timeline|deliverables?|deadline|milestone|launch|deployment)\b/i
  },
  {
    topic: 'Performance & Optimization',
    pattern: /\b(performance|metrics|latency|throughput|load|scaling|benchmark|optimize)\b/i
  },
  {
    topic: 'Quality Assurance & Bugs',
    pattern: /\b(bugs?|defects?|issues?|qa|testing|tests?|debug|fix(?:ed|es)?)\b/i
  }
];

/**
 * Normalizes and compares user names to match aliases, handles, and first names.
 */
function isUserMatch(targetUser, candidate) {
  if (!targetUser || !candidate) return false;
  const target = targetUser.trim().toLowerCase();
  const cand = candidate.trim().replace(/^@/, '').toLowerCase();
  if (target === cand) return true;

  const targetParts = target.split(/\s+/).filter(Boolean);
  const candParts = cand.split(/\s+/).filter(Boolean);

  if (targetParts.length > 0 && candParts.length > 0) {
    if (targetParts[0] === candParts[0]) return true;
    if (targetParts.some(tp => candParts.includes(tp))) return true;
  }

  return target.includes(cand) || cand.includes(target);
}

/**
 * Extracts date/deadline from text.
 */
function extractDeadline(text) {
  for (const dlPattern of DEADLINE_PATTERNS) {
    const dlMatch = text.match(dlPattern);
    if (dlMatch) {
      return dlMatch[1] ? dlMatch[1].trim() : dlMatch[0].trim();
    }
  }
  return null;
}

/**
 * Main deterministic analysis function.
 */
export function analyzeChat(parsedResult, userName = '') {
  if (!parsedResult || !parsedResult.success || !Array.isArray(parsedResult.messages)) {
    return {
      success: false,
      error: parsedResult?.error || 'Invalid or unparsed chat log provided.'
    };
  }

  const messages = parsedResult.messages;
  const targetUser = userName ? userName.trim() : '';

  const participants = Array.from(new Set(
    messages.map(m => m.sender).filter(s => s && s !== 'System')
  ));

  const decisions = [];
  const actionItems = [];
  const urgentHighlights = [];
  const mentionsList = [];
  const detectedTopicsMap = new Map();

  messages.forEach((msg, idx) => {
    const text = msg.text || '';
    const sender = msg.sender || 'Unknown';
    const timestamp = msg.timestamp || null;

    const sourceMessage = {
      messageIndex: idx,
      sender,
      timestamp,
      text
    };

    // 1. Topic Identification
    TOPIC_CLUSTERS.forEach(cluster => {
      if (cluster.pattern.test(text)) {
        detectedTopicsMap.set(
          cluster.topic,
          (detectedTopicsMap.get(cluster.topic) || 0) + 1
        );
      }
    });

    // 2. Likely Decisions
    for (const dec of DECISION_PATTERNS) {
      const match = text.match(dec.pattern);
      if (match) {
        decisions.push({
          id: `dec-${idx}`,
          text: (match[1] || text).trim(),
          decisionConfidence: dec.explicit ? 'explicit' : 'likely',
          sender,
          timestamp,
          sourceMessage
        });
        break;
      }
    }

    // 3. Deadline extraction for this message
    const extractedDeadline = extractDeadline(text);

    // 4. Action Items & Tasks
    let isTask = false;
    let detectedOwner = null;
    let ownerConfidence = 'uncertain';
    let taskText = '';

    // Case A: Explicit action item marker
    const actionMarker = text.match(/^(?:action\s*item|todo|task):\s*(.+)/i);
    if (actionMarker) {
      isTask = true;
      taskText = actionMarker[1].trim();

      // Check if @mention is in the task text or message mentions
      if (msg.mentions && msg.mentions.length > 0) {
        detectedOwner = msg.mentions[0];
        ownerConfidence = 'explicit';
      } else {
        const ownerMatch = taskText.match(/@(\w+)/);
        if (ownerMatch) {
          detectedOwner = ownerMatch[1];
          ownerConfidence = 'explicit';
        }
      }
    }

    // Case B: Urgent task / deadline with task assignment
    const urgentMarker = text.match(/^(?:urgent\s+deadline|urgent\s+task):\s*(.+)/i);
    if (urgentMarker) {
      isTask = true;
      taskText = urgentMarker[1].trim();
      const ownerMatch = taskText.match(/@(\w+)/);
      if (ownerMatch) {
        detectedOwner = ownerMatch[1];
        ownerConfidence = 'explicit';
      }
    }

    // Case C: Explicit delegation "@Person to/must/should/will ..."
    const delegationMatch = text.match(/@(\w+)\s+(?:to|must|should|will|please)\s+(.+)/i);
    if (!isTask && delegationMatch) {
      isTask = true;
      detectedOwner = delegationMatch[1];
      ownerConfidence = 'explicit';
      taskText = delegationMatch[2].trim();
    }

    // Case D: First-person commitment "I will ... / I'll ..."
    const commitmentMatch = text.match(/^(?:I will|I'll|I am going to)\s+(.+)/i);
    if (!isTask && commitmentMatch && sender !== 'System' && sender !== 'Unknown') {
      isTask = true;
      detectedOwner = sender;
      ownerConfidence = 'explicit';
      taskText = commitmentMatch[1].trim();
    }

    // Case E: General requests with clear action verbs
    const requestMatch = text.match(/(?:please|can someone|could you)\s+(@\w+\s+)?(?:review|submit|complete|finish|send|deploy|update|write|implement|check)\s+(.+)/i);
    if (!isTask && requestMatch) {
      isTask = true;
      if (requestMatch[1]) {
        detectedOwner = requestMatch[1].replace('@', '').trim();
        ownerConfidence = 'explicit';
      }
      taskText = text.replace(/^(?:please|can someone|could you)\s+/i, '').trim();
    }

    if (isTask) {
      const owner = detectedOwner || 'Unassigned';
      const isAssignedToUser = targetUser ? isUserMatch(targetUser, owner) : false;

      actionItems.push({
        id: `act-${idx}`,
        task: taskText || text,
        owner,
        ownerConfidence: detectedOwner ? 'explicit' : 'uncertain',
        isAssignedToUser,
        deadline: extractedDeadline || 'No explicit deadline',
        deadlineConfidence: extractedDeadline ? 'explicit' : 'uncertain',
        sender,
        timestamp,
        sourceMessage
      });
    }

    // 5. Urgent Highlights
    const isUrgentKeyword = /\b(urgent|asap|critical|blocker|emergency|immediately|p0|sev-?1)\b/i.test(text);
    const isUrgentPrefix = /^(?:urgent deadline|urgent task):/i.test(text);
    const hasImminentDeadline = extractedDeadline && /\b(must|required|mandatory|final|blocker)\b/i.test(text);

    if (isUrgentKeyword || isUrgentPrefix || hasImminentDeadline) {
      const reasons = [];
      if (isUrgentKeyword || isUrgentPrefix) reasons.push('Contains urgent priority keyword');
      if (hasImminentDeadline) reasons.push('Mandatory action linked to explicit deadline');

      urgentHighlights.push({
        id: `urg-${idx}`,
        type: extractedDeadline ? 'deadline' : 'urgent_task',
        description: text,
        urgency: 'high',
        reason: reasons.join('; ') || 'Time-critical highlight',
        sender,
        timestamp,
        sourceMessage
      });
    }

    // 6. Direct Mentions
    const explicitMentions = Array.from(new Set([
      ...(msg.mentions || []),
      ...(text.match(/@(\w+)/g) || []).map(m => m.replace('@', ''))
    ]));

    explicitMentions.forEach(mentioned => {
      const isForUser = targetUser ? isUserMatch(targetUser, mentioned) : false;
      mentionsList.push({
        id: `men-${idx}-${mentioned}`,
        mentionedUser: mentioned,
        sender,
        text,
        timestamp,
        isForUser,
        sourceMessage
      });
    });
  });

  // Calculate User Relevance Score
  let userRelevanceScore = 100;
  if (targetUser) {
    let directMentionsForUser = 0;
    let assignedTasksForUser = 0;
    let messagesSentByUser = 0;

    mentionsList.forEach(m => { if (m.isForUser) directMentionsForUser++; });
    actionItems.forEach(a => { if (a.isAssignedToUser) assignedTasksForUser++; });
    messages.forEach(m => { if (isUserMatch(targetUser, m.sender)) messagesSentByUser++; });

    const totalSignals = (directMentionsForUser * 35) + (assignedTasksForUser * 40) + (messagesSentByUser * 10);
    if (totalSignals === 0) {
      userRelevanceScore = 0;
    } else {
      userRelevanceScore = Math.min(100, Math.max(15, totalSignals));
    }
  }

  // Topic-Based Executive Summary Generation
  const topics = Array.from(detectedTopicsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  let summary = '';
  const isIrrelevantOrEmpty = (
    topics.length === 0 &&
    decisions.length === 0 &&
    actionItems.length === 0 &&
    urgentHighlights.length === 0 &&
    mentionsList.length === 0
  );

  if (messages.length === 0) {
    summary = 'No messages to analyze.';
  } else if (isIrrelevantOrEmpty) {
    summary = `Casual conversation (${messages.length} messages) with no project topics, explicit decisions, or assigned tasks detected.`;
  } else {
    const summarySections = [];
    if (topics.length > 0) {
      summarySections.push(`Discussion primarily focused on ${topics.join(', ')}.`);
    } else {
      summarySections.push(`Conversation with ${messages.length} messages across ${participants.length} participants.`);
    }

    const outcomeParts = [];
    if (decisions.length > 0) outcomeParts.push(`${decisions.length} key decision(s)`);
    if (actionItems.length > 0) outcomeParts.push(`${actionItems.length} action item(s)`);
    if (urgentHighlights.length > 0) outcomeParts.push(`${urgentHighlights.length} urgent highlight(s)`);

    if (outcomeParts.length > 0) {
      summarySections.push(`Key outcomes identified: ${outcomeParts.join(', ')}.`);
    }

    if (targetUser) {
      const userTasks = actionItems.filter(a => a.isAssignedToUser).length;
      const userMentions = mentionsList.filter(m => m.isForUser).length;
      if (userTasks > 0 || userMentions > 0) {
        summarySections.push(`Attention for ${targetUser}: ${userTasks} assigned task(s) and ${userMentions} direct mention(s).`);
      }
    }

    summary = summarySections.join(' ');
  }

  return {
    success: true,
    analysis: {
      summary,
      topics,
      format: parsedResult.format,
      totalMessages: messages.length,
      participants,
      decisions,
      actionItems,
      urgentHighlights,
      mentions: mentionsList,
      messages: messages.map((m, idx) => ({
        id: m.id || `msg-${idx + 1}`,
        sender: m.sender || 'Unknown',
        timestamp: m.timestamp || null,
        text: m.text || ''
      })),
      userRelevanceScore,
      privacyNotice: 'Processed 100% locally. Zero conversation data or metadata leaves your server or device.'
    }
  };
}
