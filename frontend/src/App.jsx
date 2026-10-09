import React, { useState } from 'react';
import ChatUploader from './components/ChatUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import PrivacyIndicator from './components/PrivacyIndicator';

export default function App() {
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const handleAnalysisComplete = (result) => {
    setAnalysisError('');
    setAnalysis(result);
  };

  const handleReset = () => {
    setAnalysis(null);
    setAnalysisError('');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-badge">Productivity &amp; Context Intelligence</div>
        <h1 className="app-title">What Did I Miss?</h1>
        <p className="app-subtitle">
          Local conversation ingestion, topic summaries, action item tracking &amp; priority feeds
        </p>
        <PrivacyIndicator />
      </header>

      <main className="app-main">
        <ChatUploader
          onAnalysisComplete={handleAnalysisComplete}
          onReset={handleReset}
          hasAnalysis={Boolean(analysis)}
        />
        {analysis && (
          <div className="dashboard-wrapper">
            <AnalysisDashboard analysis={analysis} error={analysisError} onReset={handleReset} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>ProtocolX • Private, Offline-First Chat Intelligence</p>
      </footer>
    </div>
  );
}
