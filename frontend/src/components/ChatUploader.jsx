import React, { useState, useRef } from 'react';
import { analyzeChatLog } from '../api/client';

export default function ChatUploader({ onAnalysisComplete }) {
  const [userName, setUserName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

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
        { sender: 'Alex Chen', timestamp: '2026-10-09T09:00:00Z', text: "Good morning team! Let's align on v2 architecture." },
        { sender: 'Jordan Miller', timestamp: '2026-10-09T09:05:00Z', text: 'Hey @Alex, we need a decision on the primary database.' },
        { sender: 'Taylor Reed', timestamp: '2026-10-09T09:12:00Z', text: 'DECISION: We agreed to use PostgreSQL for persistence.' },
        { sender: 'Alex Chen', timestamp: '2026-10-09T09:25:00Z', text: 'ACTION ITEM: @Jordan to complete the security audit.' },
        { sender: 'Alex Chen', timestamp: '2026-10-09T09:35:00Z', text: 'URGENT DEADLINE: @Taylor must finalize API spec by October 15, 2026 at 5:00 PM EST.' }
      ];
      setRawText(JSON.stringify(demoData, null, 2));
      setSelectedFile({ name: 'demoChat.json' });
      setLoading(false);
    } catch (err) {
      setError('Failed to load demo dataset.');
      setLoading(false);
    }
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
      const analysis = await analyzeChatLog(rawText, filename, userName);
      setProgress(100);
      setLoading(false);
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
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
        <h2>Ingest Chat Conversation</h2>
        <button type="button" className="btn-secondary btn-sm" onClick={handleLoadDemo} disabled={loading}>
          Load Sample Dataset
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userNameInput">Your Name (Optional for personalized highlights & @mentions)</label>
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
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
            accept=".txt,.csv,.json"
            style={{ display: 'none' }}
          />

          <div className="drop-zone-content">
            <span className="drop-icon">📁</span>
            {selectedFile ? (
              <div className="selected-file-info">
                <strong>Selected File: {selectedFile.name}</strong>
                <p className="subtext">Click or drag another file to replace (.txt, .csv, .json)</p>
              </div>
            ) : (
              <div>
                <p className="drop-text">Drag & drop your chat export (.txt, .csv, .json) or <span>click to browse</span></p>
                <p className="subtext">Supports WhatsApp (iOS & Android), Slack CSV, and JSON exports</p>
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
          <label htmlFor="chatTextInput">Or Paste Chat Log directly</label>
          <textarea
            id="chatTextInput"
            className="form-textarea"
            rows={5}
            placeholder="[24/09/24, 10:15:30 AM] Alice: Hey @Bob..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (selectedFile) setSelectedFile(null);
            }}
          />
        </div>

        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Analyzing Chat...' : 'Analyze Conversation'}
          </button>
        </div>
      </form>
    </div>
  );
}
