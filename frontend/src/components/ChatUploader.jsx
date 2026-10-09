import React, { useState, useRef } from 'react';
import { analyzeChatLog, analyzeChatLogAI } from '../api/client';

export default function ChatUploader({ onAnalysisComplete, onReset, hasAnalysis = false }) {
  const [userName, setUserName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [useGemini, setUseGemini] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    setError('');
    if (!file) return;

    const validExts = ['.txt', '.csv', '.json'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Invalid file type. Please upload a .txt, .csv, or .json chat log.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // Read file text
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = (e) => {
      setRawText(e.target.result || '');
      setProgress(100);
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleLoadDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const demoData = [
        { sender: 'Alex Chen', timestamp: '2026-10-09T09:00:00Z', text: "Good morning team! Let's align on the v2 architecture and release schedule for ProtocolX." },
        { sender: 'Jordan Miller', timestamp: '2026-10-09T09:05:00Z', text: 'Hey @Alex, I reviewed the backend performance metrics from yesterday. We need a decision on the primary database.' },
        { sender: 'Taylor Reed', timestamp: '2026-10-09T09:12:00Z', text: 'DECISION: We agreed to use PostgreSQL for structured persistence and Cloud Storage for export logs.' },
        { sender: 'Sam Rivera', timestamp: '2026-10-09T09:20:00Z', text: 'Sounds solid! What are our main deliverables before the upcoming release?' },
        { sender: 'Alex Chen', timestamp: '2026-10-09T09:25:00Z', text: 'ACTION ITEM: @Jordan to complete the security audit and implementation of JWT authentication.' },
        { sender: 'Jordan Miller', timestamp: '2026-10-09T09:28:00Z', text: 'Got it! I will start working on the JWT authentication middleware right away.' },
        { sender: 'Alex Chen', timestamp: '2026-10-09T09:35:00Z', text: 'URGENT DEADLINE: @Taylor must finalize the updated API specification by October 15, 2026 at 5:00 PM EST.' },
        { sender: 'Taylor Reed', timestamp: '2026-10-09T09:40:00Z', text: 'Understood @Alex! I will submit the docs PR by October 15th noon.' }
      ];
      setRawText(JSON.stringify(demoData, null, 2));
      setSelectedFile({ name: 'demoChat.json' });
      if (!userName) setUserName('Jordan');
      setLoading(false);
    } catch (err) {
      setError('Failed to load demo dataset.');
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setRawText('');
    setError('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onReset) onReset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Please select a chat file or paste chat logs before analyzing.');
      return;
    }

    setError('');
    setLoading(true);
    setProgress(30);

    try {
      const filename = selectedFile ? selectedFile.name : 'pasted_chat.txt';
      setProgress(60);

      // Call AI or local endpoint based on toggle
      const result = useGemini
        ? await analyzeChatLogAI(rawText, filename, userName)
        : await analyzeChatLog(rawText, filename, userName);

      setProgress(100);
      setLoading(false);
      if (onAnalysisComplete) {
        onAnalysisComplete(result.analysis, userName, result.source, result.fallbackReason || null);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during chat analysis.');
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="card uploader-card">
      <div className="card-header">
        <div>
          <h2>Ingest Conversation</h2>
          <p className="card-subtitle">Upload WhatsApp, Slack CSV, or JSON chat exports for offline analysis</p>
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleLoadDemo}
            disabled={loading}
          >
            Load Sample Dataset
          </button>
          {(selectedFile || rawText) && (
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userNameInput">
            Your Name / Handle <span className="label-subtext">(Optional — personalizes @mentions &amp; priority tasks)</span>
          </label>
          <input
            id="userNameInput"
            type="text"
            className="form-input"
            placeholder="e.g. Jordan or Alex"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
            accept=".txt,.csv,.json"
            style={{ display: 'none' }}
          />

          <div className="drop-zone-content">
            <span className="drop-icon">{selectedFile ? '📄' : '📤'}</span>
            {selectedFile ? (
              <div className="selected-file-info">
                <strong>Selected File: <span className="file-name">{selectedFile.name}</span></strong>
                <p className="subtext">Click or drag a new file to replace (.txt, .csv, .json)</p>
              </div>
            ) : (
              <div>
                <p className="drop-text">
                  Drag &amp; drop chat export (.txt, .csv, .json) or <span className="browse-link">browse files</span>
                </p>
                <p className="subtext">
                  Supports WhatsApp (iOS &amp; Android), Slack CSV, and custom JSON formats
                </p>
              </div>
            )}
          </div>
        </div>

        {progress > 0 && progress < 100 && (
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            <span className="progress-text">{progress}% loaded</span>
          </div>
        )}

        <div className="form-group margin-top">
          <label htmlFor="chatTextInput">
            Or Paste Chat Log directly
          </label>
          <textarea
            id="chatTextInput"
            className="form-textarea"
            rows={4}
            placeholder="[24/09/24, 10:15:30 AM] Alice: Hey @Bob, review the API specification before Friday..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (selectedFile) setSelectedFile(null);
            }}
          />
        </div>

        {/* Gemini AI Toggle */}
        <div className="gemini-toggle-row">
          <div className="gemini-toggle-group">
            <button
              type="button"
              className={`toggle-switch ${useGemini ? 'active' : ''}`}
              onClick={() => setUseGemini(!useGemini)}
              role="switch"
              aria-checked={useGemini}
              aria-label="Enable Gemini AI analysis"
            >
              <span className="toggle-knob" />
            </button>
            <div className="gemini-toggle-text">
              <span className="gemini-toggle-label">
                {useGemini ? '✨ Gemini AI Analysis' : '🔒 Local Analysis'}
              </span>
              <span className="gemini-toggle-desc">
                {useGemini
                  ? 'Content will be sent to Google Gemini for enhanced analysis'
                  : 'All processing stays on-device — no data transmitted'}
              </span>
            </div>
          </div>
          {useGemini && (
            <div className="gemini-disclosure">
              ⚠️ Cloud AI enabled — conversation content may be sent to Gemini.
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span> {useGemini ? 'Analyzing with Gemini AI...' : 'Analyzing Conversation...'}
              </span>
            ) : (
              useGemini ? '✨ Analyze with Gemini AI' : '⚡ Analyze Conversation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
