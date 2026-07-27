import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { deleteAccount, fetchProfile } from '../store/slices/profileSlice';
import { Layout } from '../components/Layout';
import '../styles/SettingsPage.css';

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="19" height="19">
    <path
      d="M12 3.5 19 6v5.5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-2.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path
      d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <rect x="5" y="10.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="19" height="19">
    <path d="M12 3.5 21 19.5H3L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path
      d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="m8.5 12.5 2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <rect x="4" y="5.5" width="16" height="15" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    width="16"
    height="16"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
  >
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const formatMemberSince = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : null;

const formatLastLogin = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
};

export const SettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { profile, isUpdating, error } = useSelector((state: RootState) => state.profile);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [dangerOpen, setDangerOpen] = useState(true);

  // This page shows account stats (member since / last login), so make sure
  // profile data is loaded even if the user lands here directly.
  useEffect(() => {
    if (!profile) {
      dispatch(fetchProfile());
    }
  }, [profile, dispatch]);

  const memberSince = formatMemberSince(profile?.created_at);
  const lastLogin = formatLastLogin(profile?.last_login);

  const handleDelete = async () => {
    const result = await dispatch(deleteAccount({ password, confirmation }));
    if (deleteAccount.fulfilled.match(result)) {
      navigate('/login');
    }
  };

  return (
    <Layout title="Settings">
      <p className="settings-breadcrumb">Settings / Account &amp; Security</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Stats header card */}
        <div className="settings-card stats-card">
          <div className="settings-head-left">
            <div className="settings-icon settings-icon-account" aria-hidden="true">
              <ShieldIcon />
            </div>
            <div>
              <h3>Account &amp; Security</h3>
              <p>Manage your account preferences and security settings to keep your account safe.</p>
            </div>
          </div>

          <div className="stats-row">
            {memberSince && (
              <div className="stat-item">
                <span className="stat-icon stat-icon-neutral" aria-hidden="true">
                  <CalendarIcon />
                </span>
                <span className="stat-text">
                  <em>Member since</em>
                  <strong>{memberSince}</strong>
                </span>
              </div>
            )}

            {lastLogin && (
              <div className="stat-item">
                <span className="stat-icon stat-icon-neutral" aria-hidden="true">
                  <ClockIcon />
                </span>
                <span className="stat-text">
                  <em>Last login</em>
                  <strong>{lastLogin}</strong>
                </span>
              </div>
            )}

            <div className="stat-item">
              <span className="stat-icon stat-icon-good" aria-hidden="true">
                <CheckCircleIcon />
              </span>
              <span className="stat-text">
                <em>Account status</em>
                <strong className="stat-good">All good</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Account actions */}
        <div className="settings-card">
          <div className="settings-card-head">
            <div className="settings-head-left">
              <div className="settings-icon settings-icon-account" aria-hidden="true">
                <ShieldIcon />
              </div>
              <h3>Account</h3>
            </div>
          </div>

          <div className="settings-links">
            <button className="settings-link-row" onClick={() => navigate('/profile')}>
              <span className="settings-link-left">
                <span className="settings-row-icon settings-row-icon-account" aria-hidden="true">
                  <EditIcon />
                </span>
                <span className="settings-link-text">
                  <strong>Edit profile details</strong>
                  <em>Update your personal information and profile settings</em>
                </span>
              </span>
              <ChevronIcon open={false} />
            </button>
            <button className="settings-link-row" onClick={() => navigate('/change-password')}>
              <span className="settings-link-left">
                <span className="settings-row-icon settings-row-icon-lock" aria-hidden="true">
                  <LockIcon />
                </span>
                <span className="settings-link-text">
                  <strong>Change password</strong>
                  <em>Update your password to keep your account secure</em>
                </span>
              </span>
              <ChevronIcon open={false} />
            </button>
          </div>
        </div>

        {/* Danger zone — collapsible */}
        <div className="settings-card danger">
          <button
            className="settings-card-head settings-danger-toggle"
            onClick={() => setDangerOpen((v) => !v)}
            aria-expanded={dangerOpen}
          >
            <div className="settings-head-left">
              <div className="settings-icon settings-icon-danger" aria-hidden="true">
                <WarningIcon />
              </div>
              <div>
                <h3>Danger zone</h3>
                <p>Irreversible and permanent actions.</p>
              </div>
            </div>
            <ChevronIcon open={dangerOpen} />
          </button>

          {dangerOpen && (
            <div className="danger-row">
              <span className="settings-row-icon settings-row-icon-trash" aria-hidden="true">
                <TrashIcon />
              </span>
              <div className="danger-row-text">
                <strong>Delete account</strong>
                <p>Permanently delete your account and all associated data.</p>
                <span className="danger-row-warning">This action cannot be undone.</span>
              </div>
              <button className="btn-danger-outline" onClick={() => setShowDeleteModal(true)}>
                Delete account <TrashIcon />
              </button>
            </div>
          )}
        </div>

        {/* Security features — honestly labeled as not built yet */}
        <div className="settings-card coming-soon-card">
          <div className="settings-head-left">
            <div className="settings-icon settings-icon-account" aria-hidden="true">
              <ShieldIcon />
            </div>
            <div>
              <h3>
                Security features <span className="coming-soon-tag">Coming soon</span>
              </h3>
              <p>Two-factor authentication, session management, and account recovery.</p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content danger-modal">
            <div className="settings-icon settings-icon-danger modal-danger-icon" aria-hidden="true">
              <WarningIcon />
            </div>
            <h2>Delete account</h2>
            <p>
              This will permanently delete your account. Type <strong>DELETE</strong> to confirm.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Type DELETE to confirm</label>
              <input
                type="text"
                className="form-input"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            <div className="form-actions">
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={isUpdating || confirmation !== 'DELETE'}
              >
                {isUpdating ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPassword('');
                  setConfirmation('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};