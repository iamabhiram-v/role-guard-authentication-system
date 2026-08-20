import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import { OnlineUserList } from '../components/OnlineUserList';
import { TypingIndicator } from '../components/TypingIndicator';
import { ActivityFeed } from '../components/ActivityFeed';
import { useSocket } from '../hooks/useSocket';
import {
  fetchWorkspace,
  fetchMembers,
  fetchInvites,
  inviteMember,
  revokeInvite,
  updateMemberRole,
  removeMember,
  clearWorkspaceError,
  clearWorkspaceSuccess,
} from '../store/slices/workspaceSlice';
import '../styles/workspace-dashboard.css';

const SettingsGearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const MailPlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M2.5 19c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M15 8a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M17 14.3c2.2.4 3.8 1.8 3.8 3.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const initials = (name?: string) => (name || '?').charAt(0).toUpperCase();

export const TeamManagementPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace, members, invites, isLoading, isMutating, error, successMessage } = useSelector(
    (state: RootState) => state.workspace
  );

  const { joinRoom, leaveRoom, startTyping, stopTyping, broadcastActivity } = useSocket();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteError, setInviteError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    dispatch(fetchWorkspace(workspaceId));
    dispatch(fetchMembers(workspaceId));
    dispatch(fetchInvites(workspaceId));
    return () => {
      dispatch(clearWorkspaceError());
      dispatch(clearWorkspaceSuccess());
    };
  }, [dispatch, workspaceId]);

  // Join this workspace's real-time room for presence + typing + activity,
  // and leave it automatically when navigating away.
  useEffect(() => {
    if (!workspaceId) return;
    joinRoom(workspaceId);
    return () => {
      leaveRoom(workspaceId);
    };
  }, [workspaceId]);

  const myRole = currentWorkspace?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if (!inviteEmail.includes('@')) {
      setInviteError('Enter a valid email address');
      return;
    }
    setInviteError('');
    dispatch(inviteMember({ workspaceId, email: inviteEmail.trim(), role: inviteRole })).then((res: any) => {
      if (!res.error) {
        setInviteEmail('');
        broadcastActivity(workspaceId, `invited ${inviteEmail.trim()} to the workspace`);
      }
    });
  };

  const handleInviteEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteEmail(e.target.value);
    if (!workspaceId) return;
    startTyping(workspaceId, 'invite-form');
  };

  const handleInviteEmailBlur = () => {
    if (!workspaceId) return;
    stopTyping(workspaceId);
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'member') => {
    if (!workspaceId) return;
    dispatch(updateMemberRole({ workspaceId, userId, role }));
    broadcastActivity(workspaceId, `updated a member's role to ${role}`);
  };

  const handleRemove = (userId: string) => {
    if (!workspaceId) return;
    dispatch(removeMember({ workspaceId, userId }));
    broadcastActivity(workspaceId, 'removed a member from the workspace');
    setConfirmRemove(null);
  };

  const handleRevokeInvite = (inviteId: string) => {
    if (!workspaceId) return;
    dispatch(revokeInvite({ workspaceId, inviteId }));
  };

  if (!workspaceId) return null;

  return (
    <Layout title={currentWorkspace ? `${currentWorkspace.name} — Team` : 'Team'}>
      <div className="ws-toolbar">
        <Link to={`/workspaces/${workspaceId}/settings`} className="ws-toolbar-link">
          <SettingsGearIcon /> Workspace Settings
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 480px', minWidth: 0 }}>
          {canManage && (
            <div className="ws-profile-card narrow" style={{ marginBottom: '1.5rem' }}>
              <div className="ws-section-head">
                <div className="ws-section-icon"><MailPlusIcon /></div>
                <div>
                  <h2>Invite a member</h2>
                  <p>They'll receive an email invite to join this workspace.</p>
                </div>
              </div>
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="ws-form-group" style={{ flex: '2 1 220px', margin: 0 }}>
                  <input
                    type="email"
                    className="ws-form-input"
                    placeholder="teammate@email.com"
                    value={inviteEmail}
                    onChange={handleInviteEmailChange}
                    onBlur={handleInviteEmailBlur}
                  />
                  {inviteError && <span className="ws-error-text">{inviteError}</span>}
                  <div style={{ marginTop: '0.5rem' }}>
                    <TypingIndicator workspaceId={workspaceId} context="invite-form" />
                  </div>
                </div>
                <select
                  className="ws-form-input"
                  style={{ flex: '1 1 120px', color: '#fff', background: '#1e1b3a' }}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                >
                  <option value="member" style={{ color: '#fff', background: '#1e1b3a' }}>Member</option>
                  <option value="admin" style={{ color: '#fff', background: '#1e1b3a' }}>Admin</option>
                </select>
                <button type="submit" className="ws-btn-save" disabled={isMutating} style={{ flex: '0 0 auto' }}>
                  {isMutating ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>
          )}

          {canManage && invites.length > 0 && (
            <div className="ws-profile-card narrow" style={{ marginBottom: '1.5rem' }}>
              <div className="ws-section-head">
                <div className="ws-section-icon"><MailPlusIcon /></div>
                <div>
                  <h2>Pending Invites</h2>
                  <p>{invites.length} invite{invites.length === 1 ? '' : 's'} awaiting response.</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {invites.map((inv) => (
                  <div key={inv.id} className="ws-invite-row">
                    <div>
                      <div className="ws-invite-email">{inv.email}</div>
                      <div className="ws-invite-meta">
                        Invited as {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={() => handleRevokeInvite(inv.id)} className="ws-btn-danger-outline">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ws-profile-card narrow">
            <div className="ws-section-head">
              <div className="ws-section-icon"><PeopleIcon /></div>
              <div>
                <h2>Members</h2>
                <p>{members.length} member{members.length === 1 ? '' : 's'} in this workspace.</p>
              </div>
            </div>

            {isLoading ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading members...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {members.map((m) => {
                  const isMe = m.user_id === user?.id;
                  return (
                    <div key={m.id} className="ws-member-row">
                      <div className="ws-member-left">
                        <div className="ws-member-avatar">{initials(m.username)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="ws-member-name">
                            {m.username} {isMe && <span className="ws-member-you">(you)</span>}
                          </div>
                          <div className="ws-member-email">{m.email}</div>
                        </div>
                      </div>

                      <div className="ws-member-actions">
                        {myRole === 'owner' && m.role !== 'owner' ? (
                          <select
                            className="ws-role-select"
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user_id, e.target.value as 'admin' | 'member')}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`ws-role-static ${m.role === 'owner' ? 'owner' : ''}`}>{m.role}</span>
                        )}

                        {canManage && m.role !== 'owner' && !isMe && (
                          confirmRemove === m.user_id ? (
                            <>
                              <button onClick={() => handleRemove(m.user_id)} className="ws-btn-danger">
                                Confirm
                              </button>
                              <button onClick={() => setConfirmRemove(null)} className="ws-btn-ghost">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmRemove(m.user_id)} className="ws-btn-danger-outline">
                              Remove
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real-time sidebar */}
        <div style={{ flex: '1 1 320px', minWidth: '300px', position: 'sticky', top: '1.5rem' }}>
          <OnlineUserList workspaceId={workspaceId} />
          <ActivityFeed workspaceId={workspaceId} />
        </div>
      </div>

      <Toast
        message={error || successMessage || ''}
        variant={error ? 'error' : 'success'}
        isVisible={!!(error || successMessage)}
        onClose={() => {
          dispatch(clearWorkspaceError());
          dispatch(clearWorkspaceSuccess());
        }}
      />
    </Layout>
  );
};