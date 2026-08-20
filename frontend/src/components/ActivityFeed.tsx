import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import './ActivityFeed.css';

interface ActivityFeedProps {
  workspaceId: string;
}

const relativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
};

const actionIcon = (action: string) => {
  if (action.includes('join')) return '◆';
  if (action.includes('leave')) return '◇';
  if (action.includes('update')) return '✎';
  if (action.includes('invite')) return '✉';
  return '●';
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ workspaceId }) => {
  const events = useSelector(
    (state: RootState) => state.presence.activityByWorkspace[workspaceId] || []
  );

  return (
    <div className="af-shell">
      <div className="af-border-spin" aria-hidden="true" />
      <div className="af-container">
        <div className="af-header">
          <span className="af-title">Activity Stream</span>
          <span className="af-count">{events.length}</span>
        </div>

        <div className="af-list">
          {events.length === 0 ? (
            <div className="af-empty">
              <span className="af-empty-icon">◈</span>
              Waiting for activity...
            </div>
          ) : (
            events.slice(0, 15).map((e, i) => (
              <div
                key={`${e.timestamp}-${i}`}
                className="af-row"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="af-icon">{actionIcon(e.action)}</span>
                <div className="af-meta">
                  <span className="af-text">
                    <strong>{e.email.split('@')[0]}</strong> {e.action}
                  </span>
                  <span className="af-time">{relativeTime(e.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};