import React from 'react';

/**
 * PrivacyIndicator Component
 * Highlights the offline, local-only processing guarantee.
 * Never transmits chat content externally.
 */
export default function PrivacyIndicator({ className = '' }) {
  return (
    <div className={`privacy-indicator-wrapper ${className}`}>
      <div className="privacy-indicator-pill" role="status" aria-label="Privacy Status">
        <span className="privacy-indicator-pulse" />
        <span className="privacy-indicator-icon" aria-hidden="true">🔒</span>
        <span className="privacy-indicator-label">
          Processed locally — no data leaves your device
        </span>
      </div>
    </div>
  );
}
