import React, { useState } from 'react';
import ChatUploader from './components/ChatUploader';
import SummaryView from './components/SummaryView';

export default function App() {
  const [analysis, setAnalysis] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">What Did I Miss?</h1>
        <p className="app-subtitle">
          AI-Powered Local Chat Ingestion, Summaries, Action Items & Urgent Highlights
        </p>
      </header>

      <main>
        <ChatUploader onAnalysisComplete={setAnalysis} />
        {analysis && (
          <div className="margin-top">
            <SummaryView analysis={analysis} />
          </div>
        )}
      </main>
    </div>
  );
}
