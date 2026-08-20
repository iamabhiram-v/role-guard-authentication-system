import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { deleteAccount, fetchProfile, toggle2FA, clearSuccessMessage } from '../store/slices/profileSlice';
import { sendBroadcast, clearAnnouncementMessages } from '../store/slices/announcementSlice';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import '../styles/SettingsPage.css';

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <rect x="5" y="10.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M12 3.5 21 19.5H3L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="m8.5 12.5 2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <rect x="4" y="5.5" width="16" height="15" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MegaphoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V4l-3 5H5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14 8.5a4 4 0 0 1 0 7M17.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <circle cx="8" cy="14" r="4.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="m12 10 8-4M18.5 4.5l1 2M15.5 6l1 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Section = 'account' | 'security' | 'broadcast' | 'danger';

const formatMemberSince = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '—';

const formatLastLogin = (iso?: string) => {
  if (!iso) return '—';
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return date.toDateString() === new Date().toDateString()
    ? `Today, ${time}`
    : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
};

export const SettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { profile, isUpdating, error } = useSelector((state: RootState) => state.profile);
  const { isSending, error: broadcastError, successMessage: broadcastSuccess } = useSelector(
    (state: RootState) => state.announcements
  );

  const [activeSection, setActiveSection] = useState<Section>('account');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const isAdmin = profile?.role === 'admin';
  const memberSince = formatMemberSince(profile?.created_at);
  const lastLogin = formatLastLogin(profile?.last_login);
  const name: string = (profile as any)?.name ?? '';
  const email: string = (profile as any)?.email ?? '';
  const initials = name
    ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : (email[0] ?? 'U').toUpperCase();

  useEffect(() => { if (!profile) dispatch(fetchProfile()); }, [profile, dispatch]);
  useEffect(() => {
    if (broadcastSuccess) { setBroadcastTitle(''); setBroadcastMessage(''); }
  }, [broadcastSuccess]);

  const handleDelete = async () => {
    const result = await dispatch(deleteAccount({ password, confirmation }));
    if (deleteAccount.fulfilled.match(result)) navigate('/login');
  };
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    dispatch(sendBroadcast({ title: broadcastTitle.trim(), message: broadcastMessage.trim() }));
  };

  const navItems: { id: Section; icon: React.ReactNode; label: string; show: boolean }[] = [
    { id: 'account',   icon: <UserIcon />,      label: 'Account',     show: true },
    { id: 'security',  icon: <ShieldIcon />,    label: 'Security',    show: true },
    { id: 'broadcast', icon: <MegaphoneIcon />, label: 'Broadcast',   show: isAdmin },
    { id: 'danger',    icon: <WarningIcon />,   label: 'Danger Zone', show: true },
  ];

  return (
    <Layout title="Settings">
      <div className="sp-root">
        {/* ── Sidebar ── */}
        <aside className="sp-sidebar">
          <div className="sp-profile-card">
            <div className="sp-avatar-wrap">
              <div className="sp-avatar">{initials}</div>
              <span className="sp-avatar-status" />
            </div>
            <div className="sp-user-meta">
              <span className="sp-user-name">{name || email || 'User'}</span>
              <span className="sp-user-email">{email}</span>
            </div>
            {profile?.role && (
              <span className={`sp-role-badge ${isAdmin ? 'sp-role-admin' : 'sp-role-member'}`}>
                {profile.role}
              </span>
            )}
          </div>

          <nav className="sp-nav" aria-label="Settings sections">
            {navItems.filter(n => n.show).map(n => (
              <button
                key={n.id}
                className={`sp-nav-item${activeSection === n.id ? ' active' : ''}${n.id === 'danger' ? ' sp-nav-danger' : ''}`}
                onClick={() => setActiveSection(n.id)}
              >
                <span className="sp-nav-icon">{n.icon}</span>
                <span className="sp-nav-label">{n.label}</span>
                {n.id === 'danger' && <span className="sp-nav-badge-dot" />}
              </button>
            ))}
          </nav>

          <div className="sp-sidebar-footer">
            <div className="sp-stat-row"><CalendarIcon /><span><em>Member since</em><strong>{memberSince}</strong></span></div>
            <div className="sp-stat-row"><ClockIcon /><span><em>Last login</em><strong>{lastLogin}</strong></span></div>
            <div className="sp-stat-row"><CheckCircleIcon /><span><em>Account status</em><strong className="sp-stat-good">Active</strong></span></div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="sp-main" key={activeSection}>
          {activeSection === 'account' && (
            <div className="sp-section">
              <div className="sp-section-header">
                <h2 className="sp-section-title">Account</h2>
                <p className="sp-section-desc">Manage your personal information and login credentials.</p>
              </div>
              <div className="sp-card">
                <button className="sp-action-row" onClick={() => navigate('/profile')}>
                  <span className="sp-action-icon sp-action-icon-purple"><EditIcon /></span>
                  <span className="sp-action-text"><strong>Edit profile details</strong><em>Update your name, avatar, and personal information</em></span>
                  <ChevronRightIcon />
                </button>
                <button className="sp-action-row" onClick={() => navigate('/change-password')}>
                  <span className="sp-action-icon sp-action-icon-cyan"><LockIcon /></span>
                  <span className="sp-action-text"><strong>Change password</strong><em>Update your password to keep your account secure</em></span>
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="sp-section">
              <div className="sp-section-header">
                <h2 className="sp-section-title">Security</h2>
                <p className="sp-section-desc">Protect your account with additional security measures.</p>
              </div>
              <div className="sp-card">
                <div className="sp-security-item">
                  <div className="sp-action-icon sp-action-icon-purple"><ShieldIcon /></div>
                  <div className="sp-security-body">
                    <div className="sp-security-top">
                      <strong>Two-Factor Authentication</strong>
                      {profile?.two_fa_enabled
                        ? <span className="sp-badge sp-badge-green">Enabled</span>
                        : <span className="sp-badge sp-badge-off">Disabled</span>
                      }
                    </div>
                    <em>
                      {profile?.two_fa_enabled
                        ? 'A 6-digit code is emailed to you at every sign-in.'
                        : 'Enable to require an email code on every sign-in.'}
                    </em>
                    <div className="sp-2fa-toggle-row">
                      <label className="sp-toggle" aria-label="Toggle two-factor authentication">
                        <input
                          type="checkbox"
                          checked={!!profile?.two_fa_enabled}
                          disabled={isUpdating}
                          onChange={e => dispatch(toggle2FA(e.target.checked))}
                        />
                        <span className="sp-toggle-track">
                          <span className="sp-toggle-thumb" />
                        </span>
                      </label>
                      <span className="sp-toggle-label">
                        {isUpdating ? 'Saving...' : profile?.two_fa_enabled ? 'Turn off 2FA' : 'Turn on 2FA'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sp-card sp-card-muted">
                <div className="sp-security-item">
                  <div className="sp-action-icon sp-action-icon-muted"><KeyIcon /></div>
                  <div className="sp-security-body">
                    <div className="sp-security-top">
                      <strong>Session management</strong>
                      <span className="sp-badge sp-badge-soon">Coming soon</span>
                    </div>
                    <em>View and revoke active sessions across all your devices.</em>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'broadcast' && isAdmin && (
            <div className="sp-section">
              <div className="sp-section-header">
                <h2 className="sp-section-title">Broadcast Announcement</h2>
                <p className="sp-section-desc">Send a notification and email to every active user in the system.</p>
              </div>
              <div className="sp-card">
                <form onSubmit={handleSendBroadcast} className="sp-form">
                  <div className="sp-field">
                    <label className="sp-label">Title</label>
                    <input type="text" className="sp-input" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="e.g. Scheduled maintenance tonight" maxLength={100} />
                    <span className="sp-field-hint">{broadcastTitle.length}/100</span>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Message</label>
                    <textarea className="sp-input sp-textarea" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Details for all users..." maxLength={500} />
                    <span className="sp-field-hint">{broadcastMessage.length}/500</span>
                  </div>
                  <div className="sp-form-actions">
                    <button type="submit" className="sp-btn sp-btn-primary" disabled={isSending || !broadcastTitle.trim() || !broadcastMessage.trim()}>
                      <MegaphoneIcon />{isSending ? 'Sending...' : 'Send to All Users'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'danger' && (
            <div className="sp-section">
              <div className="sp-section-header">
                <h2 className="sp-section-title sp-title-danger">Danger Zone</h2>
                <p className="sp-section-desc">Irreversible actions. Proceed with extreme caution.</p>
              </div>
              <div className="sp-card sp-card-danger">
                <div className="sp-danger-row">
                  <span className="sp-action-icon sp-action-icon-red"><TrashIcon /></span>
                  <div className="sp-danger-text">
                    <strong>Delete account</strong>
                    <p>Permanently delete your account and all associated data.</p>
                    <span className="sp-danger-warning">This action cannot be undone.</span>
                  </div>
                  <button className="sp-btn sp-btn-danger-outline" onClick={() => setShowDeleteModal(true)}>
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showDeleteModal && (
        <div className="sp-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="sp-modal sp-modal-danger" role="dialog" aria-modal="true" aria-labelledby="sp-del-title">
            <div className="sp-modal-icon"><WarningIcon /></div>
            <h2 id="sp-del-title">Delete your account?</h2>
            <p>This will permanently delete your account and all associated data. Type <strong>DELETE</strong> to confirm.</p>
            {error && <div className="sp-alert sp-alert-error">{error}</div>}
            <div className="sp-field">
              <label className="sp-label">Your password</label>
              <input type="password" className="sp-input" value={password} onChange={e => setPassword(e.target.value)} autoFocus placeholder="Enter your password" />
            </div>
            <div className="sp-field">
              <label className="sp-label">Type DELETE to confirm</label>
              <input type="text" className="sp-input sp-input-danger-focus" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="DELETE" />
            </div>
            <div className="sp-modal-actions">
              <button className="sp-btn sp-btn-danger" onClick={handleDelete} disabled={isUpdating || confirmation !== 'DELETE'}>
                {isUpdating ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button className="sp-btn sp-btn-ghost" onClick={() => { setShowDeleteModal(false); setPassword(''); setConfirmation(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={broadcastError || broadcastSuccess || ''}
        variant={broadcastError ? 'error' : 'success'}
        isVisible={!!(broadcastError || broadcastSuccess)}
        onClose={() => dispatch(clearAnnouncementMessages())}
      />
    </Layout>
  );
};
