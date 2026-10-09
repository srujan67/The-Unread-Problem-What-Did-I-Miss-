import React from 'react';

/**
 * PrivacyIndicator Component
 * Displays local-only processing status.
 * All chat log parsing, summaries, and extraction run 100% locally on-device.
 */
export default function PrivacyIndicator({ className = '' }) {
  return (
    <div className={`privacy-indicator ${className}`}>
      <span className="privacy-indicator-badge" title="Local-first offline processing">
        <span className="privacy-indicator-dot" />
        <span className="privacy-indicator-icon">🔒</span>
        <span className="privacy-indicator-text">
          Processed locally — no data leaves your device
        </span>
      </span>
    </div>
  );
}
