import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { useSocketActions } from '../hooks/useSocketActions';
import { fetchMessages } from '../store/slices/messagesSlice';
import { TypingIndicator } from './TypingIndicator';

interface ChatBoxProps {
  workspaceId: string;
}

let typingTimeout: ReturnType<typeof setTimeout> | null = null;

export const ChatBox: React.FC<ChatBoxProps> = ({ workspaceId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sendMessage, startTyping, stopTyping } = useSocketActions();
  const { user } = useSelector((state: RootState) => state.auth);
  const members = useSelector((state: RootState) => state.workspace.members);
  const messages = useSelector(
    (state: RootState) => state.messages.byWorkspace[workspaceId] ?? []
  );
  const isLoading = useSelector((state: RootState) => state.messages.isLoading);

  // Maps sender_id -> workspace role, so each message can show who sent it
  // AND their standing in the workspace — important once there are 3+
  // members and "who is this" stops being obvious from the name alone.
  const roleByUserId = useMemo(
    () => Object.fromEntries(members.map((m) => [m.user_id, m.role])),
    [members]
  );

  const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' };

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // join-room / leave-room is already handled by the page that renders this
  // (e.g. TeamManagementPage), so ChatBox only loads history — it doesn't
  // manage the socket room lifecycle itself.
  useEffect(() => {
    dispatch(fetchMessages(workspaceId));
  }, [workspaceId, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);

    startTyping(workspaceId, 'chat');
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => stopTyping(workspaceId), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    setIsSending(true);
    if (typingTimeout) clearTimeout(typingTimeout);
    stopTyping(workspaceId);

    const res = await sendMessage(workspaceId, text);
    setIsSending(false);

    if (res.success) {
      setDraft('');
    } else {
      console.error('Failed to send message:', res.message);
    }
  };

  return (
    <div className="chatbox-container" style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
      <div
        className="chatbox-messages"
        style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        {isLoading && messages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading messages...</p>
        )}

        {!isLoading && messages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            No messages yet — say hello to your team.
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const role = roleByUserId[msg.sender_id];
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: isOwn ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isOwn ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                padding: '0.5rem 0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  {isOwn ? 'You' : msg.sender_username}
                </span>
                {role && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      color: role === 'owner' ? '#f59e0b' : role === 'admin' ? '#a78bfa' : '#60a5fa',
                      background:
                        role === 'owner' ? 'rgba(245,158,11,0.12)' : role === 'admin' ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)',
                      border: `1px solid ${role === 'owner' ? 'rgba(245,158,11,0.35)' : role === 'admin' ? 'rgba(167,139,250,0.35)' : 'rgba(96,165,250,0.35)'}`,
                      borderRadius: '999px',
                      padding: '0.05rem 0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {roleLabel[role] || role}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#fff', wordBreak: 'break-word' }}>{msg.message}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '0 0.75rem' }}>
        <TypingIndicator workspaceId={workspaceId} context="chat" />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          type="text"
          value={draft}
          onChange={handleChange}
          placeholder="Type a message..."
          maxLength={2000}
          style={{
            flex: 1,
            padding: '0.55rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: '0.88rem',
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: draft.trim() ? '#38bdf8' : 'rgba(255,255,255,0.1)',
            color: draft.trim() ? '#001018' : 'rgba(255,255,255,0.4)',
            fontWeight: 700,
            cursor: draft.trim() ? 'pointer' : 'default',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};