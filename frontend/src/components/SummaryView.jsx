import React from 'react';

export default function SummaryView({ analysis }) {
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
    privacyNotice
  } = analysis;

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

      {/* Overview Cards */}
      <div className="grid grid-3">
        <div className="card metric-card">
          <span className="metric-title">Total Messages</span>
          <span className="metric-value">{totalMessages}</span>
          <span className="metric-sub">Format: {format.toUpperCase()}</span>
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
        <h3>Executive Summary</h3>
        <p className="summary-text">{summary}</p>
      </div>

      {/* Urgent Highlights */}
      {urgentHighlights.length > 0 && (
        <div className="card card-urgent margin-top">
          <h3>🚨 Urgent Highlights & Deadlines</h3>
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
        </div>
      )}

      <div className="grid grid-2 margin-top">
        {/* Key Decisions */}
        <div className="card">
          <h3>💡 Key Decisions Made ({decisions.length})</h3>
          {decisions.length === 0 ? (
            <p className="subtext">No explicit decisions detected in this chat segment.</p>
          ) : (
            <ul className="list">
              {decisions.map((dec) => (
                <li key={dec.id} className="list-item">
                  <strong>{dec.text}</strong>
                  <span className="subtext">By {dec.sender} {dec.timestamp ? `• ${dec.timestamp}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Items & Deadlines */}
        <div className="card">
          <h3>✅ Action Items & Deadlines ({actionItems.length})</h3>
          {actionItems.length === 0 ? (
            <p className="subtext">No explicit action items assigned in this chat segment.</p>
          ) : (
            <ul className="list">
              {actionItems.map((act) => (
                <li key={act.id} className="list-item action-item">
                  <div>
                    <strong>{act.task}</strong>
                    <div className="tags-row">
                      <span className="badge badge-owner">👤 Owner: {act.owner}</span>
                      <span className="badge badge-deadline">📅 Deadline: {act.deadline}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Mentions */}
      {mentions.length > 0 && (
        <div className="card margin-top">
          <h3>@ Mentions ({mentions.length})</h3>
          <div className="mentions-grid">
            {mentions.map((men) => (
              <div key={men.id} className={`mention-chip ${men.isForUser ? 'mention-user' : ''}`}>
                <span className="mention-name">@{men.mentionedUser}</span>
                <span className="mention-context">"{men.text}"</span>
                <span className="subtext">— {men.sender}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
