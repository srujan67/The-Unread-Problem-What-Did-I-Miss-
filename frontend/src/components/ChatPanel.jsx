import React, { useState, useRef, useEffect } from 'react';
import { askChatQuestion } from '../api/client';

const SUGGESTED_QUESTIONS = [
  'What deadlines were mentioned?',
  'What was decided?',
  'What tasks were assigned?'
];

export default function ChatPanel({
  messages = [],
  initialUseGemini = false,
  fallbackReason = ''
}) {
  const [question, setQuestion] = useState('');
  const [useGemini, setUseGemini] = useState(initialUseGemini);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const messagesEndRef = useRef(null);
  const transcriptRef = useRef(null);

  // Update Gemini toggle when initialUseGemini changes
  useEffect(() => {
    setUseGemini(initialUseGemini);
  }, [initialUseGemini]);

  // Scroll to bottom of chat thread when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, loading]);

  // Scroll to selected source message in transcript when clicked
  useEffect(() => {
    if (selectedSourceId && transcriptRef.current) {
      const el = document.getElementById(`transcript-${selectedSourceId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedSourceId]);

  // Find a message object by its ID
  const getMessageById = (id) => {
    return messages.find((m) => String(m.id) === String(id));
  };

  const handleSend = async (queryText) => {
    const q = (queryText || question).trim();
    if (!q || loading) return;

    setError('');
    const userTurn = { role: 'user', text: q, timestamp: new Date().toLocaleTimeString() };
    setChatHistory((prev) => [...prev, userTurn]);
    setQuestion('');
    setLoading(true);

    try {
      // Build last 6 turns history for API
      const historyTurns = chatHistory.slice(-6).map((turn) => ({
        role: turn.role,
        text: turn.text
      }));

      // If user toggled Gemini off, force local keyword search
      const result = await askChatQuestion(messages, q, historyTurns, !useGemini);

      const assistantTurn = {
        role: 'assistant',
        text: result.answer,
        sources: result.sources || [],
        source: result.source || (useGemini ? 'gemini' : 'local'),
        fallbackReason: result.fallbackReason || null,
        timestamp: new Date().toLocaleTimeString()
      };

      setChatHistory((prev) => [...prev, assistantTurn]);
    } catch (err) {
      setError(err.message || 'Failed to get answer.');
      const errorTurn = {
        role: 'assistant',
        text: 'Sorry, an error occurred while processing your question.',
        sources: [],
        source: 'local',
        error: true,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory((prev) => [...prev, errorTurn]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(question);
  };

  const handleClearHistory = () => {
    setChatHistory([]);
    setSelectedSourceId(null);
    setError('');
  };

  const handleSourceClick = (id) => {
    setSelectedSourceId(id);
    setShowTranscript(true);
  };

  const activeSourceMessage = selectedSourceId ? getMessageById(selectedSourceId) : null;

  return (
    <section className="chat-panel-container card" aria-label="Ask Your Chat Q&A">
      {/* Panel Header */}
      <div className="chat-panel-header">
        <div className="chat-panel-title-group">
          <div className="chat-panel-icon" aria-hidden="true">💬</div>
          <div>
            <h3 className="chat-panel-title">Ask Your Chat</h3>
            <p className="chat-panel-subtitle">
              Instant answers grounded in this conversation transcript
            </p>
          </div>
        </div>

        {/* AI Mode Consent Toggle */}
        <div className="chat-panel-controls">
          <label className="chat-consent-toggle" title="Toggle between Google Gemini AI and offline local keyword search">
            <input
              type="checkbox"
              checked={useGemini}
              onChange={(e) => setUseGemini(e.target.checked)}
            />
            <span className="chat-consent-label">
              {useGemini ? '✨ Gemini AI' : '🔒 Local Search'}
            </span>
          </label>

          {chatHistory.length > 0 && (
            <button
              type="button"
              className="btn-outline btn-xs"
              onClick={handleClearHistory}
              title="Clear conversation history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mode Disclosure */}
      <div className={`chat-mode-notice ${useGemini ? 'chat-mode-gemini' : 'chat-mode-local'}`}>
        <span>{useGemini ? '✨' : '🛡️'}</span>
        <small>
          {useGemini
            ? 'Cloud AI enabled: Questions and chat transcript are analyzed via Google Gemini.'
            : 'Local mode active: Questions are searched strictly on-device without cloud transmission.'}
        </small>
      </div>

      {/* Suggested Questions */}
      <div className="chat-suggestions-row">
        <span className="chat-suggestions-label">Suggestions:</span>
        <div className="chat-suggestions-list">
          {SUGGESTED_QUESTIONS.map((sq, i) => (
            <button
              key={i}
              type="button"
              className="chat-suggestion-chip"
              onClick={() => handleSend(sq)}
              disabled={loading}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className="chat-thread" tabIndex={0} aria-label="Conversation messages">
        {chatHistory.length === 0 ? (
          <div className="chat-empty-state">
            <span className="chat-empty-icon">💭</span>
            <p className="chat-empty-text">
              Ask anything about decisions, owners, milestones, or discussions.
            </p>
            <p className="chat-empty-subtext">
              Every answer links directly to verified source messages from the chat.
            </p>
          </div>
        ) : (
          chatHistory.map((turn, index) => (
            <div
              key={index}
              className={`chat-message ${turn.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
            >
              <div className="chat-bubble">
                <div className="chat-bubble-header">
                  <span className="chat-bubble-author">
                    {turn.role === 'user' ? 'You' : 'ProtocolX Assistant'}
                  </span>
                  {turn.role === 'assistant' && (
                    <span className={`source-badge source-badge-sm ${turn.source === 'gemini' ? 'source-badge-gemini' : 'source-badge-local'}`}>
                      {turn.source === 'gemini' ? '✨ Gemini' : '🔒 Local'}
                    </span>
                  )}
                  <span className="chat-bubble-time">{turn.timestamp}</span>
                </div>

                <div className="chat-bubble-body">
                  <p>{turn.text}</p>
                </div>

                {/* Fallback reason notice if any */}
                {turn.fallbackReason && (
                  <div className="chat-bubble-fallback">
                    <small>ℹ️ Fell back to local: {turn.fallbackReason}</small>
                  </div>
                )}

                {/* Sources chips */}
                {turn.sources && turn.sources.length > 0 && (
                  <div className="chat-bubble-sources">
                    <span className="chat-sources-label">Sources:</span>
                    <div className="chat-sources-chips">
                      {turn.sources.map((srcId) => {
                        const msgObj = getMessageById(srcId);
                        const isSelected = selectedSourceId === srcId;
                        return (
                          <button
                            key={srcId}
                            type="button"
                            className={`chat-source-chip ${isSelected ? 'chat-source-chip-active' : ''}`}
                            onClick={() => handleSourceClick(srcId)}
                            title={msgObj ? `${msgObj.sender}: "${msgObj.text}"` : `Message ${srcId}`}
                          >
                            📌 {srcId}
                            {msgObj && <span className="chat-source-chip-sender"> ({msgObj.sender})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-bubble chat-bubble-loading">
              <div className="chat-bubble-header">
                <span className="chat-bubble-author">ProtocolX Assistant</span>
                <span className={`source-badge source-badge-sm ${useGemini ? 'source-badge-gemini' : 'source-badge-local'}`}>
                  {useGemini ? '✨ Gemini' : '🔒 Local'}
                </span>
              </div>
              <div className="chat-typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-text">Analyzing transcript...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected Source Message Preview Drawer */}
      {selectedSourceId && (
        <div className="chat-source-preview card">
          <div className="chat-source-preview-header">
            <strong>
              📌 Source Message: <span className="mono">{selectedSourceId}</span>
            </strong>
            <button
              type="button"
              className="btn-outline btn-xs"
              onClick={() => setSelectedSourceId(null)}
            >
              ✕ Close Preview
            </button>
          </div>
          {activeSourceMessage ? (
            <div className="chat-source-preview-body">
              <div className="chat-source-meta">
                <span className="chat-source-sender">👤 {activeSourceMessage.sender}</span>
                {activeSourceMessage.timestamp && (
                  <span className="chat-source-time">🕒 {activeSourceMessage.timestamp}</span>
                )}
              </div>
              <p className="chat-source-quote">"{activeSourceMessage.text}"</p>
            </div>
          ) : (
            <p className="chat-source-notfound">
              Message ID <span className="mono">{selectedSourceId}</span> not found in transcript.
            </p>
          )}
        </div>
      )}

      {/* Optional full transcript drawer toggle */}
      {messages.length > 0 && (
        <div className="chat-transcript-toggle-row">
          <button
            type="button"
            className="btn-link btn-xs"
            onClick={() => setShowTranscript((prev) => !prev)}
          >
            {showTranscript ? '▼ Hide Conversation Transcript' : `▶ View Conversation Transcript (${messages.length} messages)`}
          </button>
        </div>
      )}

      {/* Conversation Transcript Viewer */}
      {showTranscript && messages.length > 0 && (
        <div className="chat-transcript-viewer" ref={transcriptRef}>
          <div className="chat-transcript-header">
            <strong>Conversation Transcript</strong>
            <small>Click any source chip above to highlight</small>
          </div>
          <div className="chat-transcript-list">
            {messages.map((m, idx) => {
              const isSelected = String(m.id) === String(selectedSourceId);
              return (
                <div
                  key={m.id || idx}
                  id={`transcript-${m.id}`}
                  className={`chat-transcript-item ${isSelected ? 'chat-transcript-item-highlight' : ''}`}
                >
                  <div className="chat-transcript-meta">
                    <span className="mono transcript-id">[{m.id || `msg-${idx + 1}`}]</span>
                    <span className="transcript-sender">{m.sender}</span>
                    {m.timestamp && <span className="transcript-time">{m.timestamp}</span>}
                  </div>
                  <div className="transcript-text">{m.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="alert alert-error chat-error-alert" role="alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question about this chat transcript..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          aria-label="Ask a question about this chat"
        />
        <button
          type="submit"
          className="btn-primary chat-send-btn"
          disabled={loading || !question.trim()}
        >
          {loading ? 'Asking...' : 'Send →'}
        </button>
      </form>
    </section>
  );
}
