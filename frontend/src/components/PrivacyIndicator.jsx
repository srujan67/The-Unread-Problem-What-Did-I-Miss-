import React from 'react';

/**
 * PrivacyIndicator Component
 * Displays analysis source: local-only or cloud Gemini AI.
 * Updates dynamically based on the actual analysis source.
 */
export default function PrivacyIndicator({ source = 'local', fallbackReason = '', className = '' }) {
  const isGemini = source === 'gemini';

  return (
    <div className={`privacy-indicator-wrapper ${className}`}>
      <div
        className={`privacy-indicator-pill ${isGemini ? 'privacy-indicator-cloud' : ''}`}
        role="status"
        aria-label="Privacy Status"
      >
        <span className={`privacy-indicator-pulse ${isGemini ? 'pulse-cloud' : ''}`} />
        <span className="privacy-indicator-icon" aria-hidden="true">
          {isGemini ? '✨' : '🔒'}
        </span>
        <span className="privacy-indicator-label">
          {isGemini
            ? 'Analysed by Gemini — content was sent to Google AI'
            : 'Processed locally — no data leaves your device'}
        </span>
      </div>
      {fallbackReason && (
        <div className="privacy-indicator-fallback">
          ℹ️ Fell back to local analysis: {fallbackReason}
        </div>
      )}
    </div>
  );
}
