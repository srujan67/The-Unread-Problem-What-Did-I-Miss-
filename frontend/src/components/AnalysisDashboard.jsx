import React from 'react';

/**
 * Compute a ranked priority feed from raw analysis data.
 * Each item gets a numeric score and a human-readable "reason" string
 * citing the evidence that caused its ranking.
 */
function buildRankedHighlights(analysis) {
  const items = [];

  const { urgentHighlights = [], actionItems = [], decisions = [], mentions = [] } = analysis;

  // Urgent highlights → highest base score
  urgentHighlights.forEach((urg) => {
    const reasons = [];
    if (urg.urgency === 'high') reasons.push('Marked urgent/critical in the conversation');
    if (urg.type === 'deadline') reasons.push('Contains an explicit deadline');
    if (urg.type === 'urgent_task') reasons.push('Flagged as a blocking or time-sensitive task');
    items.push({
      id: urg.id,
      score: 100,
      type: 'urgent',
      title: urg.description,
      sender: urg.sender,
      timestamp: urg.timestamp,
      reason: reasons.join('; ') || 'Contains urgent keywords',
    });
  });

  // Action items assigned to the user → high score
  actionItems.forEach((act) => {
    const reasons = [];
    reasons.push(`Assigned to ${act.owner}`);
    if (act.deadline && act.deadline !== 'No explicit deadline') {
      reasons.push(`Deadline: ${act.deadline}`);
    }
    items.push({
      id: act.id,
      score: act.deadline && act.deadline !== 'No explicit deadline' ? 85 : 70,
      type: 'action',
      title: act.task,
      sender: act.sender,
      timestamp: act.timestamp,
      reason: reasons.join('; '),
      meta: { owner: act.owner, deadline: act.deadline },
    });
  });

  // Mentions targeting the user → medium-high score
  mentions.filter((m) => m.isForUser).forEach((men) => {
    items.push({
      id: men.id,
      score: 75,
      type: 'mention',
      title: `@${men.mentionedUser} mentioned by ${men.sender}`,
      sender: men.sender,
      timestamp: men.timestamp,
      reason: 'You were directly @mentioned in this message',
      meta: { text: men.text },
    });
  });

  // Decisions → medium score
  decisions.forEach((dec) => {
    items.push({
      id: dec.id,
      score: 60,
      type: 'decision',
      title: dec.text,
      sender: dec.sender,
      timestamp: dec.timestamp,
      reason: 'An explicit decision was recorded',
    });
  });

  // Sort descending by score, stable within same score
  items.sort((a, b) => b.score - a.score);
  return items;
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">📭</span>
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="alert-error margin-top">
      <strong>⚠️ Analysis Error</strong>
      <p>{message}</p>
    </div>
  );
}

function PriorityBadge({ type }) {
  const map = {
    urgent: { label: '🔴 URGENT', cls: 'badge-urgent' },
    action: { label: '🟡 ACTION', cls: 'badge-action' },
    mention: { label: '🔵 MENTION', cls: 'badge-mention' },
    decision: { label: '🟢 DECISION', cls: 'badge-decision' },
  };
  const info = map[type] || { label: type, cls: '' };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}

export default function AnalysisDashboard({ analysis, error }) {
  if (error) return <ErrorState message={error} />;
  if (!analysis) return null;

  const {
    summary,
    format,
    totalMessages,
    participants = [],
    decisions = [],
    actionItems = [],
    urgentHighlights = [],
    mentions = [],
    userRelevanceScore,
    privacyNotice,
  } = analysis;

  const ranked = buildRankedHighlights(analysis);
  const hasContent = ranked.length > 0;

  return (
    <div className="dashboard-container">
      {/* Privacy Disclosure Banner */}
      <div className="privacy-banner">
        <span className="shield-icon">🛡️</span>
        <div>
          <strong>Local-First Privacy Guaranteed</strong>
          <p>{privacyNotice}</p>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-3">
        <div className="card metric-card">
          <span className="metric-title">Total Messages</span>
          <span className="metric-value">{totalMessages}</span>
          <span className="metric-sub">Format: {(format || '').toUpperCase()}</span>
        </div>
        <div className="card metric-card">
          <span className="metric-title">Participants</span>
          <span className="metric-value">{participants.length}</span>
          <span className="metric-sub">{participants.join(', ')}</span>
        </div>
        <div className="card metric-card">
          <span className="metric-title">Relevance Score</span>
          <span className="metric-value">{userRelevanceScore}%</span>
          <span className="metric-sub">Personalized for you</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card margin-top">
        <h3>📋 Executive Summary</h3>
        <p className="summary-text">{summary}</p>
        {analysis.topics && analysis.topics.length > 0 && (
          <div className="tags-row" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {analysis.topics.map((t) => (
              <span key={t} className="badge badge-topic">🏷️ {t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Ranked Priority Feed */}
      <div className="card margin-top">
        <h3>⚡ Priority Feed — What You Missed</h3>
        <p className="subtext" style={{ marginBottom: '0.75rem' }}>
          Items ranked by evidence: direct @mentions, deadlines, assigned tasks, and decisions.
        </p>
        {!hasContent ? (
          <EmptyState message="No prioritized highlights found in this conversation." />
        ) : (
          <ul className="list">
            {ranked.map((item, idx) => (
              <li key={item.id} className={`list-item priority-item priority-${item.type}`}>
                <div className="priority-header">
                  <span className="priority-rank">#{idx + 1}</span>
                  <PriorityBadge type={item.type} />
                  <span className="priority-score">Score: {item.score}</span>
                </div>
                <strong className="priority-title">{item.title}</strong>
                {item.meta?.owner && (
                  <div className="tags-row">
                    <span className="badge badge-owner">👤 {item.meta.owner}</span>
                    {item.meta.deadline && item.meta.deadline !== 'No explicit deadline' && (
                      <span className="badge badge-deadline">📅 {item.meta.deadline}</span>
                    )}
                  </div>
                )}
                {item.meta?.text && (
                  <p className="mention-context">"{item.meta.text}"</p>
                )}
                <div className="priority-reason">
                  <span className="reason-label">Why highlighted:</span> {item.reason}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detailed Sections in Grid */}
      <div className="grid grid-2 margin-top">
        {/* Key Decisions */}
        <div className="card">
          <h3>💡 Key Decisions ({decisions.length})</h3>
          {decisions.length === 0 ? (
            <EmptyState message="No explicit decisions detected." />
          ) : (
            <ul className="list">
              {decisions.map((dec) => (
                <li key={dec.id} className="list-item">
                  <strong>{dec.text}</strong>
                  <span className="subtext">By {dec.sender}{dec.timestamp ? ` • ${dec.timestamp}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Items */}
        <div className="card">
          <h3>✅ Action Items ({actionItems.length})</h3>
          {actionItems.length === 0 ? (
            <EmptyState message="No explicit action items assigned." />
          ) : (
            <ul className="list">
              {actionItems.map((act) => (
                <li key={act.id} className="list-item action-item">
                  <strong>{act.task}</strong>
                  <div className="tags-row">
                    <span className="badge badge-owner">👤 {act.owner}</span>
                    <span className="badge badge-deadline">📅 {act.deadline}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Urgent Highlights */}
      <div className={`card margin-top ${urgentHighlights.length > 0 ? 'card-urgent' : ''}`}>
        <h3>🚨 Urgent Highlights ({urgentHighlights.length})</h3>
        {urgentHighlights.length === 0 ? (
          <EmptyState message="No urgent or time-critical messages found." />
        ) : (
          <ul className="urgent-list">
            {urgentHighlights.map((urg) => (
              <li key={urg.id} className="urgent-item">
                <span className="badge badge-urgent">{urg.urgency.toUpperCase()}</span>
                <div>
                  <strong>{urg.description}</strong>
                  <span className="subtext">From {urg.sender} ({urg.timestamp || 'N/A'})</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mentions */}
      <div className="card margin-top">
        <h3>@ Mentions ({mentions.length})</h3>
        {mentions.length === 0 ? (
          <EmptyState message="No @mentions found in this conversation." />
        ) : (
          <div className="mentions-grid">
            {mentions.map((men) => (
              <div key={men.id} className={`mention-chip ${men.isForUser ? 'mention-user' : ''}`}>
                <span className="mention-name">@{men.mentionedUser}</span>
                <span className="mention-context">"{men.text}"</span>
                <span className="subtext">— {men.sender}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
