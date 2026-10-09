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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">What Did I Miss?</h1>
        <p className="app-subtitle">
          AI-Powered Local Chat Ingestion, Summaries, Action Items &amp; Urgent Highlights
        </p>
        <PrivacyIndicator />
      </header>

      <main>
        <ChatUploader onAnalysisComplete={handleAnalysisComplete} />
        <div className="margin-top">
          <AnalysisDashboard analysis={analysis} error={analysisError} />
        </div>
      </main>
    </div>
  );
}
