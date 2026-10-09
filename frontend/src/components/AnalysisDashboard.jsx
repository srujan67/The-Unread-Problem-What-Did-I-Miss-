import React, { useState } from 'react';
import ChatPanel from './ChatPanel';

/**
 * Filter and prioritize items that involve the user's name:
 * mentions, assigned tasks, and urgent / deadline items.
 */
function extractUserMissedItems(analysis, userName) {
  const targetUser = (userName || '').trim().toLowerCase();
  const { actionItems = [], mentions = [], urgentHighlights = [] } = analysis;
  const items = [];

  // 1. Tasks assigned to the user
  actionItems.forEach((act) => {
    const isTarget = targetUser
      ? act.isAssignedToUser || act.owner.toLowerCase().includes(targetUser)
      : true;

    if (isTarget) {
      const isUrgent =
        act.task.toLowerCase().includes('urgent') ||
        act.task.toLowerCase().includes('asap') ||
        (act.deadline && act.deadline !== 'No explicit deadline');

      items.push({
        id: act.id,
        type: 'task',
        title: act.task,
        owner: act.owner,
        deadline: act.deadline,
        sender: act.sender,
        timestamp: act.timestamp,
        isUrgent: Boolean(isUrgent),
        isForUser: true,
        priority: isUrgent ? 95 : 85,
        evidence: `Task assigned to ${act.owner}${act.deadline && act.deadline !== 'No explicit deadline' ? ` with deadline: ${act.deadline}` : ''}`,
        sourceMessage: act.sourceMessage,
      });
    }
  });

  // 2. Direct @mentions targeting the user
  mentions.forEach((men) => {
    const isTarget = targetUser
      ? men.isForUser || men.mentionedUser.toLowerCase().includes(targetUser)
      : true;

    if (isTarget) {
      items.push({
        id: men.id,
        type: 'mention',
        title: `@${men.mentionedUser} mentioned by ${men.sender}`,
        text: men.text,
        sender: men.sender,
        timestamp: men.timestamp,
        isUrgent: false,
        isForUser: true,
        priority: 75,
        evidence: `Direct mention by ${men.sender} targeting @${men.mentionedUser}`,
        sourceMessage: men.sourceMessage,
      });
    }
  });

  // 3. Urgent / deadline items involving user or critical blockers
  urgentHighlights.forEach((urg) => {
    const fullText = (urg.description || '') + ' ' + (urg.sourceMessage?.text || '');
    const isTarget = targetUser ? fullText.toLowerCase().includes(targetUser) : true;

    const alreadyAdded = items.some((i) => i.id === urg.id);
    if (!alreadyAdded && isTarget) {
      items.push({
        id: urg.id,
        type: 'urgent',
        title: urg.description,
        sender: urg.sender,
        timestamp: urg.timestamp,
        isUrgent: true,
        isForUser: Boolean(isTarget),
        priority: 100,
        evidence: urg.reason || 'Flagged as urgent time-sensitive priority',
        sourceMessage: urg.sourceMessage,
      });
    }
  });

  // If strict filtering returned nothing but urgent highlights exist, show them so user isn't blank
  if (items.length === 0 && urgentHighlights.length > 0) {
    urgentHighlights.forEach((urg) => {
      items.push({
        id: urg.id,
        type: 'urgent',
        title: urg.description,
        sender: urg.sender,
        timestamp: urg.timestamp,
        isUrgent: true,
        isForUser: false,
        priority: 100,
        evidence: urg.reason || 'Flagged as critical highlight',
        sourceMessage: urg.sourceMessage,
      });
    });
  }

  // Sort descending by priority
  items.sort((a, b) => b.priority - a.priority);
  return items;
}

export default function AnalysisDashboard({ analysis, error, userName = '', source = 'local', fallbackReason = '', onReset }) {
  // Navigation: null = Hub view (4 cards), or 'summary' | 'missed' | 'tasks' | 'decisions'
  const [activeView, setActiveView] = useState(null);

  // "What I Missed" state: filter chips & expandable cards
  const [missedFilter, setMissedFilter] = useState('all'); // 'all' | 'urgent' | 'for_me'
  const [expandedMissedIds, setExpandedMissedIds] = useState({});

  // "Tasks" state: sorting by deadline & client-side "mark done"
  const [sortTasksByDeadline, setSortTasksByDeadline] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState({});

  const isGemini = source === 'gemini';

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        <span className="alert-icon">⚠️</span>
        <div>
          <strong>Analysis Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const {
    summary,
    format,
    totalMessages = 0,
    participants = [],
    decisions = [],
    actionItems = [],
    urgentHighlights = [],
    topics = [],
    privacyNotice,
  } = analysis;

  const missedItems = extractUserMissedItems(analysis, userName);

  // Extract or fallback conversation messages array
  const conversationMessages = Array.isArray(analysis.messages) && analysis.messages.length > 0
    ? analysis.messages
    : [
        ...(analysis.decisions || []).map((d, i) => ({
          id: `msg-${i + 1}`,
          sender: d.sender || 'Unknown',
          timestamp: d.timestamp || '',
          text: d.sourceMessage?.text || d.text
        })),
        ...(analysis.actionItems || []).map((a, i) => ({
          id: `msg-act-${i + 1}`,
          sender: a.sender || 'Unknown',
          timestamp: a.timestamp || '',
          text: a.sourceMessage?.text || a.task
        }))
      ];

  // Toggle accordion expand in What I Missed
  const toggleMissedExpand = (id) => {
    setExpandedMissedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle mark done for tasks
  const toggleTaskDone = (id) => {
    setCompletedTaskIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // ---------------------------------------------------------------------------
  // 1. HUB VIEW: 4 Large Selectable Cards
  // ---------------------------------------------------------------------------
  if (!activeView) {
    return (
      <div className="hub-container">
        {/* Analysis Source Banner */}
        <div className={`privacy-banner ${isGemini ? 'privacy-banner-cloud' : ''}`}>
          <span className="shield-icon" aria-hidden="true">{isGemini ? '✨' : '🛡️'}</span>
          <div className="privacy-banner-text">
            <strong>{isGemini ? 'Analysed by Gemini AI' : 'Analysed Locally'}</strong>
            <p>
              {isGemini
                ? 'Enhanced analysis powered by Google Gemini. Content was transmitted to Google AI.'
                : privacyNotice || 'All processing completed on-device. No data was transmitted externally.'}
            </p>
          </div>
          <span className={`source-badge ${isGemini ? 'source-badge-gemini' : 'source-badge-local'}`}>
            {isGemini ? '✨ Gemini' : '🔒 Local'}
          </span>
        </div>
        {fallbackReason && (
          <div className="fallback-notice">
            <span>ℹ️</span> Gemini was requested but fell back to local analysis: {fallbackReason}
          </div>
        )}

        {/* 4 Large Selectable Cards with Live Counts */}
        <div className="cards-hub">
          {/* Card 1: Summary */}
          <div
            className="hub-card hub-card-summary"
            onClick={() => setActiveView('summary')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveView('summary')}
          >
            <div className="hub-card-header">
              <span className="hub-card-icon">📋</span>
              <span className="hub-card-count">{totalMessages} Messages</span>
            </div>
            <h3 className="hub-card-title">Summary</h3>
            <p className="hub-card-desc">
              High-level conversation overview, key discussion themes &amp; participants.
            </p>
            <span className="hub-card-link">Explore Summary →</span>
          </div>

          {/* Card 2: What I Missed */}
          <div
            className="hub-card hub-card-missed"
            onClick={() => setActiveView('missed')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveView('missed')}
          >
            <div className="hub-card-header">
              <span className="hub-card-icon">⚡</span>
              <span className="hub-card-count">{missedItems.length} Highlights</span>
            </div>
            <h3 className="hub-card-title">What I Missed</h3>
            <p className="hub-card-desc">
              Direct mentions, assigned tasks, and urgent deadlines targeting {userName || 'you'}.
            </p>
            <span className="hub-card-link">Review Highlights →</span>
          </div>

          {/* Card 3: Tasks & Deadlines */}
          <div
            className="hub-card hub-card-tasks"
            onClick={() => setActiveView('tasks')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveView('tasks')}
          >
            <div className="hub-card-header">
              <span className="hub-card-icon">✅</span>
              <span className="hub-card-count">{actionItems.length} Tasks</span>
            </div>
            <h3 className="hub-card-title">Tasks &amp; Deadlines</h3>
            <p className="hub-card-desc">
              Assigned deliverables, target dates, and completion status.
            </p>
            <span className="hub-card-link">Manage Tasks →</span>
          </div>

          {/* Card 4: Decisions */}
          <div
            className="hub-card hub-card-decisions"
            onClick={() => setActiveView('decisions')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveView('decisions')}
          >
            <div className="hub-card-header">
              <span className="hub-card-icon">💡</span>
              <span className="hub-card-count">{decisions.length} Decisions</span>
            </div>
            <h3 className="hub-card-title">Decisions</h3>
            <p className="hub-card-desc">
              Explicit agreements, resolved questions, and approved architecture paths.
            </p>
            <span className="hub-card-link">View Decisions →</span>
          </div>
        </div>

        {/* Ask Your Chat AI Chatbot Section */}
        <div className="hub-chat-section margin-top">
          <ChatPanel
            messages={conversationMessages}
            initialUseGemini={isGemini}
            fallbackReason={fallbackReason}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. DETAIL VIEWS (Only one renders at a time with a Back button)
  // ---------------------------------------------------------------------------
  return (
    <div className="detail-view-container">
      {/* Top Navigation Bar with Back Button */}
      <div className="detail-top-bar">
        <button
          type="button"
          className="btn-back"
          onClick={() => setActiveView(null)}
        >
          ← Back to Overview
        </button>
        <span className="view-mode-badge">
          Viewing: <strong>{activeView.toUpperCase()}</strong>
        </span>
      </div>

      {/* VIEW: SUMMARY */}
      {activeView === 'summary' && (
        <section className="card view-panel">
          <div className="panel-header">
            <div>
              <h2>📋 Executive Summary</h2>
              <p className="subtext">
                Overview of {totalMessages} messages across {participants.length} participants
              </p>
            </div>
            <span className="badge badge-topic">FORMAT: {(format || 'TXT').toUpperCase()}</span>
          </div>

          <div className="summary-body margin-top">
            <p className="summary-paragraph">{summary}</p>

            {topics && topics.length > 0 && (
              <div className="topics-section margin-top">
                <span className="topics-heading">Discussion Topics:</span>
                <div className="tags-row">
                  {topics.map((t) => (
                    <span key={t} className="badge badge-topic">🏷️ {t}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="participants-section margin-top">
              <span className="topics-heading">Participants ({participants.length}):</span>
              <div className="tags-row">
                {participants.map((p) => (
                  <span key={p} className="badge badge-owner">👤 {p}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIEW: WHAT I MISSED */}
      {activeView === 'missed' && (() => {
        // Apply filter chips
        let filtered = missedItems;
        if (missedFilter === 'urgent') {
          filtered = missedItems.filter((i) => i.isUrgent);
        } else if (missedFilter === 'for_me') {
          filtered = missedItems.filter((i) => i.isForUser || i.type === 'task' || i.type === 'mention');
        }

        return (
          <section className="card view-panel">
            <div className="panel-header">
              <div>
                <h2>⚡ What I Missed</h2>
                <p className="subtext">
                  Items involving {userName ? `"${userName}"` : 'your name'}, sorted by priority. Click any card to expand source evidence.
                </p>
              </div>
              <span className="badge badge-urgent">{filtered.length} Items</span>
            </div>

            {/* Filter Chips: All / Urgent / For me */}
            <div className="filter-chips-row margin-top">
              <button
                type="button"
                className={`filter-chip ${missedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMissedFilter('all')}
              >
                All ({missedItems.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${missedFilter === 'urgent' ? 'active' : ''}`}
                onClick={() => setMissedFilter('urgent')}
              >
                🚨 Urgent ({missedItems.filter((i) => i.isUrgent).length})
              </button>
              <button
                type="button"
                className={`filter-chip ${missedFilter === 'for_me' ? 'active' : ''}`}
                onClick={() => setMissedFilter('for_me')}
              >
                👤 For Me ({missedItems.filter((i) => i.isForUser || i.type === 'task' || i.type === 'mention').length})
              </button>
            </div>

            {/* List of Missed Items */}
            {filtered.length === 0 ? (
              <div className="empty-state margin-top">
                <span className="empty-icon">🎉</span>
                <h4>No matching highlights</h4>
                <p>You have no pending items matching the selected filter.</p>
              </div>
            ) : (
              <div className="missed-items-list margin-top">
                {filtered.map((item, idx) => {
                  const isExpanded = Boolean(expandedMissedIds[item.id]);
                  return (
                    <div
                      key={item.id}
                      className={`missed-card priority-${item.type} ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleMissedExpand(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggleMissedExpand(item.id)}
                    >
                      <div className="missed-card-main">
                        <div className="missed-card-header">
                          <span className="missed-rank">#{idx + 1}</span>
                          <span className={`badge badge-${item.type === 'urgent' ? 'urgent' : item.type === 'task' ? 'action' : 'mention'}`}>
                            {item.type.toUpperCase()}
                          </span>
                          {item.deadline && item.deadline !== 'No explicit deadline' && (
                            <span className="badge badge-deadline">📅 {item.deadline}</span>
                          )}
                          <span className="expand-indicator">
                            {isExpanded ? '▲ Hide Details' : '▼ View Evidence'}
                          </span>
                        </div>

                        <h4 className="missed-title">{item.title}</h4>

                        <div className="missed-meta-row">
                          <span className="missed-sender">From: {item.sender}</span>
                          {item.timestamp && <span className="missed-time">• {item.timestamp}</span>}
                        </div>
                      </div>

                      {/* Click-to-Expand: Evidence & Source Message */}
                      {isExpanded && (
                        <div className="missed-expanded-content" onClick={(e) => e.stopPropagation()}>
                          <div className="evidence-callout">
                            <strong>🎯 Why highlighted (Evidence):</strong>
                            <p>{item.evidence}</p>
                          </div>
                          {item.sourceMessage && (
                            <div className="source-callout">
                              <strong>💬 Source Message:</strong>
                              <blockquote className="source-blockquote">
                                "{item.sourceMessage.text}"
                              </blockquote>
                              <span className="source-meta-text">
                                — {item.sourceMessage.sender} {item.sourceMessage.timestamp ? `(${item.sourceMessage.timestamp})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })()}

      {/* VIEW: TASKS & DEADLINES */}
      {activeView === 'tasks' && (() => {
        // Sort tasks by deadline if toggled
        const tasksCopy = [...actionItems];
        if (sortTasksByDeadline) {
          tasksCopy.sort((a, b) => {
            const aHas = a.deadline && a.deadline !== 'No explicit deadline';
            const bHas = b.deadline && b.deadline !== 'No explicit deadline';
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            return (a.deadline || '').localeCompare(b.deadline || '');
          });
        }

        return (
          <section className="card view-panel">
            <div className="panel-header">
              <div>
                <h2>✅ Tasks &amp; Deadlines</h2>
                <p className="subtext">
                  Track assigned deliverables, due dates, and mark progress locally.
                </p>
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  className={`btn-secondary btn-sm ${sortTasksByDeadline ? 'btn-active' : ''}`}
                  onClick={() => setSortTasksByDeadline(!sortTasksByDeadline)}
                >
                  📅 {sortTasksByDeadline ? 'Sorted by Deadline' : 'Sort by Deadline'}
                </button>
              </div>
            </div>

            {tasksCopy.length === 0 ? (
              <div className="empty-state margin-top">
                <span className="empty-icon">📭</span>
                <h4>No tasks found</h4>
                <p>No actionable items were identified in this conversation.</p>
              </div>
            ) : (
              <div className="table-responsive margin-top">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>Done</th>
                      <th style={{ width: '45%' }}>Action Item</th>
                      <th style={{ width: '22%' }}>Assignee</th>
                      <th style={{ width: '25%' }}>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksCopy.map((act) => {
                      const isDone = Boolean(completedTaskIds[act.id]);
                      return (
                        <tr
                          key={act.id}
                          className={`${isDone ? 'row-done' : ''} ${act.isAssignedToUser ? 'row-highlighted' : ''}`}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="task-checkbox"
                              checked={isDone}
                              onChange={() => toggleTaskDone(act.id)}
                              aria-label={`Mark "${act.task}" as completed`}
                            />
                          </td>
                          <td>
                            <div className="task-desc">
                              <span className={`task-name ${isDone ? 'task-done-text' : ''}`}>
                                {act.task}
                              </span>
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })()}

      {/* VIEW: DECISIONS */}
      {activeView === 'decisions' && (
        <section className="card view-panel">
          <div className="panel-header">
            <div>
              <h2>💡 Key Decisions</h2>
              <p className="subtext">
                Approved agreements, architectural choices, and resolutions recorded in the log.
              </p>
            </div>
            <span className="badge badge-decision">{decisions.length} Approved</span>
          </div>

          {decisions.length === 0 ? (
            <div className="empty-state margin-top">
              <span className="empty-icon">📭</span>
              <h4>No explicit decisions</h4>
              <p>No decision statements were detected in this conversation.</p>
            </div>
          ) : (
            <div className="decisions-list margin-top">
              {decisions.map((dec) => (
                <div key={dec.id} className="decision-item">
                  <div className="decision-marker">✓</div>
                  <div className="decision-content">
                    <p className="decision-text">{dec.text}</p>
                    <span className="decision-meta">
                      Agreed by <strong>{dec.sender}</strong> {dec.timestamp ? `• ${dec.timestamp}` : ''}
                    </span>
                    {dec.sourceMessage && (
                      <blockquote className="decision-quote">
                        "{dec.sourceMessage.text}"
                      </blockquote>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
