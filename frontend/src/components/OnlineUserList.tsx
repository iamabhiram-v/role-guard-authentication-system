import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import './OnlineUserList.css';

interface OnlineUserListProps {
  workspaceId: string;
}

const roleColor: Record<string, string> = {
  owner: '#f59e0b',
  admin: '#a78bfa',
  member: '#60a5fa',
};

export const OnlineUserList: React.FC<OnlineUserListProps> = ({ workspaceId }) => {
  const members = useSelector((state: RootState) => state.workspace.members);
  const onlineUserIds = useSelector(
    (state: RootState) => state.presence.onlineByWorkspace[workspaceId] || []
  );
  const isConnected = useSelector((state: RootState) => state.presence.isConnected);

  const onlineMembers = members.filter((m) => onlineUserIds.includes(m.user_id));
  const offlineMembers = members.filter((m) => !onlineUserIds.includes(m.user_id));

  const initials = (username: string) => username.slice(0, 2).toUpperCase();

  return (
    <div className="oul-shell">
      <div className="oul-border-spin" aria-hidden="true" />
      <div className="oul-container">
        <div className="oul-header">
          <div className="oul-header-left">
            <span className="oul-title">Live Presence</span>
            <span className="oul-count">{onlineMembers.length} online</span>
          </div>
          <div className={`oul-conn-pill ${isConnected ? 'oul-conn-on' : 'oul-conn-off'}`}>
            <span className="oul-conn-dot" />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        <div className="oul-list">
          {onlineMembers.map((m, i) => (
            <div
              key={m.user_id}
              className="oul-row oul-row-fade-in"
              style={{ animationDelay: `${i * 60}ms`, ['--role-color' as any]: roleColor[m.role] || roleColor.member }}
            >
              <div className="oul-avatar oul-avatar-online">
                <span>{initials(m.username)}</span>
                <span className="oul-status-badge" />
              </div>
              <div className="oul-meta">
                <span className="oul-name">{m.username}</span>
                <span className="oul-role">{m.role}</span>
              </div>
              <span className="oul-pulse-bar" />
            </div>
          ))}

          {offlineMembers.length > 0 && (
            <>
              <div className="oul-divider">
                <span>OFFLINE</span>
                <span className="oul-divider-line" />
              </div>
              {offlineMembers.map((m) => (
                <div
                  key={m.user_id}
                  className="oul-row oul-row-offline"
                  style={{ ['--role-color' as any]: roleColor[m.role] || roleColor.member }}
                >
                  <div className="oul-avatar">
                    <span>{initials(m.username)}</span>
                  </div>
                  <div className="oul-meta">
                    <span className="oul-name">{m.username}</span>
                    <span className="oul-role">{m.role}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {members.length === 0 && (
            <div className="oul-empty">
              <span className="oul-empty-icon">◈</span>
              No members yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};