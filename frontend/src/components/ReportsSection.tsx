import React from 'react';
import { SummaryReport } from '../store/slices/dashboardSlice';
import './ReportsSection.css';

interface ReportsSectionProps {
  summary: SummaryReport | null;
  isLoading: boolean;
  rangeDays: number;
}

const METRIC_LABELS: Record<string, string> = {
  workspaces: 'Workspaces Created',
  members: 'Members Joined',
  invites: 'Invites Sent',
  jobs_completed: 'Jobs Completed',
  jobs_failed: 'Jobs Failed',
  notifications: 'Notifications Sent',
};

// Failed jobs going up is bad, everything else going up is good —
// flips the trend color logic for that one metric, including its
// "New" state (a brand-new failure spike is a warning, not neutral).
const INVERSE_METRICS = new Set(['jobs_failed']);

export const ReportsSection: React.FC<ReportsSectionProps> = ({ summary, isLoading, rangeDays }) => {
  if (isLoading && !summary) {
    return (
      <div className="rs-shell">
        <div className="rs-border-spin" aria-hidden="true" />
        <div className="rs-card">
          <div className="ad-section-title">Summary Report</div>
          <div className="rs-skeleton-rows">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rs-skeleton-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rs-shell">
      <div className="rs-border-spin" aria-hidden="true" />
      <div className="rs-card">
        <div className="rs-header">
          <div className="ad-section-title">Summary Report</div>
          <span className="rs-subtitle">
            Last {rangeDays} days vs. previous {rangeDays} days
          </span>
        </div>

        <div className="rs-table">
          <div className="rs-table-head">
            <span>Metric</span>
            <span>Current</span>
            <span>Previous</span>
            <span>Change</span>
          </div>
          {summary.metrics.map((m, i) => {
            const inverse = INVERSE_METRICS.has(m.key);

            // 0% is flat, not an improvement — never color it up/down.
            const isFlat = m.changePct === 0;
            const isPositive =
              m.changePct === null || isFlat ? null : inverse ? m.changePct <= 0 : m.changePct >= 0;

            const changeClass = m.isNew
              ? inverse
                ? 'rs-change-warn'
                : 'rs-change-new'
              : isPositive === null
              ? ''
              : isPositive
              ? 'rs-change-up'
              : 'rs-change-down';

            return (
              <div key={m.key} className="rs-table-row" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="rs-metric-name">{METRIC_LABELS[m.key] || m.key}</span>
                <span className="rs-metric-value">{m.current}</span>
                <span className="rs-metric-prev">{m.previous}</span>
                <span className={`rs-metric-change ${changeClass}`}>
                  {m.isNew ? (
                    inverse ? (
                      '⚠ New'
                    ) : (
                      '✦ New'
                    )
                  ) : m.changePct === null ? (
                    '—'
                  ) : (
                    <>
                      {m.changePct > 0 ? '↑' : m.changePct < 0 ? '↓' : '→'} {Math.abs(m.changePct)}%
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};