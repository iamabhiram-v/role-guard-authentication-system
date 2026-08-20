import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import './TypingIndicator.css';

interface TypingIndicatorProps {
  workspaceId: string;
  context?: string; // optional: only show typing users for a specific context (e.g. a specific doc/thread)
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ workspaceId, context }) => {
  const typingUsers = useSelector(
    (state: RootState) => state.presence.typingByWorkspace[workspaceId] || []
  );

  const filtered = context ? typingUsers.filter((u) => u.context === context) : typingUsers;

  if (filtered.length === 0) return null;

  const label =
    filtered.length === 1
      ? `${filtered[0].email.split('@')[0]} is typing`
      : filtered.length === 2
      ? `${filtered[0].email.split('@')[0]} and ${filtered[1].email.split('@')[0]} are typing`
      : `${filtered.length} people are typing`;

  return (
    <div className="ti-container">
      <span className="ti-dots">
        <span />
        <span />
        <span />
      </span>
      <span className="ti-label">{label}</span>
    </div>
  );
};