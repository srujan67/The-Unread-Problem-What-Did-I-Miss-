import React, { useState } from 'react';
import ChatUploader from './components/ChatUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import PrivacyIndicator from './components/PrivacyIndicator';

export default function App() {
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [uploaderCollapsed, setUploaderCollapsed] = useState(false);
  const [analysisSource, setAnalysisSource] = useState('local');
  const [fallbackReason, setFallbackReason] = useState('');

  const handleAnalysisComplete = (result, user = '', source = 'local', fbReason = null) => {
    setAnalysisError('');
    setAnalysis(result);
    if (user) setCurrentUserName(user);
    setAnalysisSource(source);
    setFallbackReason(fbReason || '');
    setUploaderCollapsed(true);
  };

  const handleReset = () => {
    setAnalysis(null);
    setAnalysisError('');
    setUploaderCollapsed(false);
    setAnalysisSource('local');
    setFallbackReason('');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-badge">Productivity &amp; Context Intelligence</div>
        <h1 className="app-title">What Did I Miss?</h1>
        <p className="app-subtitle">
          Local conversation ingestion, topic summaries, action item tracking &amp; priority feeds
        </p>
        <PrivacyIndicator source={analysisSource} fallbackReason={fallbackReason} />
      </header>

      <main className="app-main">
        {/* If analysis exists and uploader is collapsed, show compact bar */}
        {analysis && uploaderCollapsed ? (
          <div className="compact-bar card">
            <div className="compact-bar-info">
              <span className="compact-bar-dot"></span>
              <div>
                <strong>Active Analysis: {analysis.totalMessages} Messages</strong>
                <span className="compact-bar-meta">
                  Format: {(analysis.format || 'JSON').toUpperCase()}
                  {currentUserName ? ` • Viewing as ${currentUserName}` : ''}
                </span>
              </div>
            </div>
            <div className="compact-bar-actions">
              {/* Source badge in compact bar */}
              <span className={`source-badge ${analysisSource === 'gemini' ? 'source-badge-gemini' : 'source-badge-local'}`}>
                {analysisSource === 'gemini' ? '✨ Gemini AI' : '🔒 Local'}
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setUploaderCollapsed(false)}
              >
                💬 Analyze another chat
              </button>
            </div>
          </div>
        ) : (
          <div className="uploader-wrapper">
            <ChatUploader
              onAnalysisComplete={handleAnalysisComplete}
              onReset={handleReset}
              hasAnalysis={Boolean(analysis)}
            />
            {analysis && !uploaderCollapsed && (
              <div className="uploader-return-row">
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  onClick={() => setUploaderCollapsed(true)}
                >
                  ← Return to Current Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {analysis && (
          <div className="dashboard-wrapper margin-top">
            <AnalysisDashboard
              analysis={analysis}
              error={analysisError}
              userName={currentUserName}
              source={analysisSource}
              fallbackReason={fallbackReason}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>ProtocolX • Private, Offline-First Chat Intelligence</p>
      </footer>
    </div>
  );
}
