import React from 'react';

/**
 * Compute a ranked priority feed from raw analysis data.
 * Each item gets a numeric score and a human-readable "reason" string
 * citing the evidence that caused its ranking.
 */
function buildRankedHighlights(analysis) {
  const items = [];
  const { urgentHighlights = [], actionItems = [], decisions = [], mentions = [] } = analysis;

  // 1. Urgent highlights → highest base score
  urgentHighlights.forEach((urg) => {
    const reasons = [];
    if (urg.urgency === 'high') reasons.push('Marked critical or time-sensitive');
    if (urg.type === 'deadline') reasons.push('Contains an explicit dated deadline');
    if (urg.reason) reasons.push(urg.reason);
    items.push({
      id: urg.id,
      score: 100,
      type: 'urgent',
      title: urg.description,
      sender: urg.sender,
      timestamp: urg.timestamp,
      reason: reasons.join(' • ') || 'Urgent keyword match',
    });
  });

  // 2. Action items assigned to the user → high score
  actionItems.forEach((act) => {
    const reasons = [];
    if (act.isAssignedToUser) {
      reasons.push('Assigned directly to you');
    } else {
      reasons.push(`Assigned to ${act.owner}`);
    }
    if (act.deadline && act.deadline !== 'No explicit deadline') {
      reasons.push(`Deadline: ${act.deadline}`);
    }
    const score = act.isAssignedToUser ? 95 : (act.deadline && act.deadline !== 'No explicit deadline' ? 85 : 70);
    items.push({
      id: act.id,
      score,
      type: 'action',
      title: act.task,
      sender: act.sender,
      timestamp: act.timestamp,
      reason: reasons.join(' • '),
      meta: { owner: act.owner, deadline: act.deadline, isAssignedToUser: act.isAssignedToUser },
    });
  });

  // 3. Mentions targeting the user → medium-high score
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

  // 4. Decisions → medium score
  decisions.forEach((dec) => {
    items.push({
      id: dec.id,
      score: 60,
      type: 'decision',
      title: dec.text,
      sender: dec.sender,
      timestamp: dec.timestamp,
      reason: dec.decisionConfidence === 'explicit' ? 'Explicit team decision approved' : 'Likely agreed direction',
    });
  });

  // Sort descending by score
  items.sort((a, b) => b.score - a.score);
  return items;
}

function EmptyState({ title = 'No items found', message }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">📭</span>
      <h4 className="empty-title">{title}</h4>
      <p className="empty-message">{message}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="alert alert-error margin-top" role="alert">
      <span className="alert-icon">⚠️</span>
      <div>
        <strong>Analysis Error</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

function PriorityBadge({ type }) {
  const map = {
    urgent: { label: 'CRITICAL', icon: '🚨', cls: 'badge-urgent' },
    action: { label: 'ACTION', icon: '⚡', cls: 'badge-action' },
    mention: { label: 'MENTION', icon: '💬', cls: 'badge-mention' },
    decision: { label: 'DECISION', icon: '✅', cls: 'badge-decision' },
  };
  const info = map[type] || { label: type.toUpperCase(), icon: '📌', cls: '' };
  return (
    <span className={`badge ${info.cls}`}>
      <span className="badge-icon">{info.icon}</span> {info.label}
    </span>
  );
}

export default function AnalysisDashboard({ analysis, error, onReset }) {
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
    topics = [],
  } = analysis;

  const ranked = buildRankedHighlights(analysis);
  const hasContent = ranked.length > 0;

  return (
    <div className="dashboard-container">
      {/* Privacy Guarantee Banner */}
      <div className="privacy-banner">
        <span className="shield-icon" aria-hidden="true">🛡️</span>
        <div className="privacy-banner-text">
          <strong>Local-First Confidentiality Guaranteed</strong>
          <p>{privacyNotice}</p>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-3 metrics-grid">
        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-icon">💬</span>
            <span className="metric-title">Messages Ingested</span>
          </div>
          <span className="metric-value">{totalMessages}</span>
          <span className="metric-sub">Format: {(format || 'TXT').toUpperCase()}</span>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-icon">👥</span>
            <span className="metric-title">Participants</span>
          </div>
          <span className="metric-value">{participants.length}</span>
          <span className="metric-sub" title={participants.join(', ')}>
            {participants.slice(0, 3).join(', ')}{participants.length > 3 ? ` +${participants.length - 3} more` : ''}
          </span>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-icon">🎯</span>
            <span className="metric-title">Relevance Score</span>
          </div>
          <span className="metric-value">{userRelevanceScore}%</span>
          <span className="metric-sub">Personalized priority match</span>
        </div>
      </div>

      {/* Executive Summary Card */}
      <section className="card margin-top summary-card">
        <div className="card-header-clean">
          <h3 className="section-title">
            <span className="section-icon">📋</span> Executive Summary
          </h3>
        </div>
        <p className="summary-text">{summary}</p>
        {topics && topics.length > 0 && (
          <div className="topics-row">
            <span className="topics-label">Topics:</span>
            {topics.map((t) => (
              <span key={t} className="badge badge-topic">🏷️ {t}</span>
            ))}
          </div>
        )}
      </section>

      {/* Ranked Priority Feed */}
      <section className="card margin-top priority-card">
        <div className="card-header-clean">
          <div>
            <h3 className="section-title">
              <span className="section-icon">⚡</span> Priority Feed — What You Missed
            </h3>
            <p className="section-subtitle">
              Ranked by verifiable evidence: direct mentions, approaching deadlines, and assigned deliverables.
            </p>
          </div>
        </div>

        {!hasContent ? (
          <EmptyState
            title="All caught up"
            message="No prioritized highlights, decisions, or tasks were found in this conversation."
          />
        ) : (
          <div className="priority-list">
            {ranked.map((item, idx) => (
              <article key={item.id} className={`priority-item priority-${item.type}`}>
                <div className="priority-header">
                  <span className="priority-rank">#{idx + 1}</span>
                  <PriorityBadge type={item.type} />
                  <span className="priority-score">Score: {item.score}</span>
                </div>
                <h4 className="priority-title">{item.title}</h4>
                {item.meta?.owner && (
                  <div className="tags-row">
                    <span className={`badge ${item.meta.isAssignedToUser ? 'badge-owner-user' : 'badge-owner'}`}>
                      👤 {item.meta.owner} {item.meta.isAssignedToUser ? '(You)' : ''}
                    </span>
                    {item.meta.deadline && item.meta.deadline !== 'No explicit deadline' && (
                      <span className="badge badge-deadline">📅 {item.meta.deadline}</span>
                    )}
                  </div>
                )}
                {item.meta?.text && (
                  <blockquote className="mention-quote">"{item.meta.text}"</blockquote>
                )}
                <div className="priority-reason">
                  <span className="reason-label">Evidence:</span> {item.reason}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Urgent Highlights Section */}
      <section className={`card margin-top ${urgentHighlights.length > 0 ? 'card-urgent-border' : ''}`}>
        <div className="card-header-clean">
          <h3 className="section-title">
            <span className="section-icon">🚨</span> Urgent &amp; Time-Critical Highlights ({urgentHighlights.length})
          </h3>
        </div>
        {urgentHighlights.length === 0 ? (
          <EmptyState
            title="No urgent blockers"
            message="No critical blockers, ASAP requests, or imminent deadlines detected."
          />
        ) : (
          <div className="urgent-grid">
            {urgentHighlights.map((urg) => (
              <div key={urg.id} className="urgent-card">
                <div className="urgent-badge-row">
                  <span className="badge badge-urgent">
                    <span className="pulse-dot"></span> HIGH URGENCY
                  </span>
                  <span className="urgent-sender">From {urg.sender}</span>
                </div>
                <p className="urgent-text">{urg.description}</p>
                {urg.reason && (
                  <span className="urgent-reason">⚠️ {urg.reason}</span>
                )}
                <span className="urgent-time">{urg.timestamp || 'Timestamp unavailable'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Action Items: Structured Readable Task Table */}
      <section className="card margin-top">
        <div className="card-header-clean">
          <h3 className="section-title">
            <span className="section-icon">✅</span> Action Items &amp; Tasks ({actionItems.length})
          </h3>
          <p className="section-subtitle">
            Extracted action items with designated owners and parsed deadlines.
          </p>
        </div>

        {actionItems.length === 0 ? (
          <EmptyState
            title="No tasks assigned"
            message="No explicit action items, todos, or task commitments found in this chat."
          />
        ) : (
          <div className="table-responsive">
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Task Description</th>
                  <th style={{ width: '22%' }}>Assignee</th>
                  <th style={{ width: '23%' }}>Deadline</th>
                  <th style={{ width: '10%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((act) => (
                  <tr key={act.id} className={act.isAssignedToUser ? 'row-highlighted' : ''}>
                    <td>
                      <div className="task-desc">
                        <strong className="task-name">{act.task}</strong>
                        <span className="task-sender">Requested by {act.sender}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${act.isAssignedToUser ? 'badge-owner-user' : 'badge-owner'}`}>
                        👤 {act.owner} {act.isAssignedToUser ? '(You)' : ''}
                      </span>
                    </td>
                    <td>
                      <span className={act.deadline !== 'No explicit deadline' ? 'badge badge-deadline' : 'text-muted'}>
                        {act.deadline !== 'No explicit deadline' ? `📅 ${act.deadline}` : 'None specified'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-pending">PENDING</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Grid: Decisions and Mentions */}
      <div className="grid grid-2 margin-top">
        {/* Key Decisions */}
        <section className="card">
          <div className="card-header-clean">
            <h3 className="section-title">
              <span className="section-icon">💡</span> Key Decisions ({decisions.length})
            </h3>
          </div>
          {decisions.length === 0 ? (
            <EmptyState
              title="No decisions logged"
              message="No agreed technical or organizational decisions identified."
            />
          ) : (
            <div className="decisions-list">
              {decisions.map((dec) => (
                <div key={dec.id} className="decision-item">
                  <div className="decision-marker">✓</div>
                  <div className="decision-content">
                    <p className="decision-text">{dec.text}</p>
                    <span className="decision-meta">
                      By <strong>{dec.sender}</strong> {dec.timestamp ? `• ${dec.timestamp}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mentions */}
        <section className="card">
          <div className="card-header-clean">
            <h3 className="section-title">
              <span className="section-icon">💬</span> @Mentions ({mentions.length})
            </h3>
          </div>
          {mentions.length === 0 ? (
            <EmptyState
              title="No direct mentions"
              message="No @handles or direct recipient mentions identified."
            />
          ) : (
            <div className="mentions-grid">
              {mentions.map((men) => (
                <div key={men.id} className={`mention-chip ${men.isForUser ? 'mention-user' : ''}`}>
                  <div className="mention-chip-header">
                    <span className="mention-name">@{men.mentionedUser}</span>
                    {men.isForUser && <span className="badge badge-user-tag">FOR YOU</span>}
                  </div>
                  <p className="mention-quote">"{men.text}"</p>
                  <span className="mention-sender">— {men.sender}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
