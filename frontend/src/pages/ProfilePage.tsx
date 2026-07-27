import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchProfile, updateProfile, clearSuccessMessage } from '../store/slices/profileSlice';
import { Layout } from '../components/Layout';
import styles from '../styles/profile.module.css';

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
    <rect x="8.5" y="8.5" width="11" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5.5 15.5h-1a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
const DotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IdCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="9" cy="11.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6.5 15.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2M14 10h4M14 13h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L16 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 11v5.5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="8" cy="15" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10.5 12.5 18 5M18 5v3.5M18 5h-3.5M14.5 8.5l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ROLE_META: Record<string, { label: string; description: string }> = {
  admin: { label: 'Administrator', description: 'Full access to users, roles, and system settings.' },
  manager: { label: 'Manager', description: 'Can manage team members and assigned workspaces.' },
  user: { label: 'Standard User', description: 'Access to your own profile and assigned workspaces.' },
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const formatLastLogin = (iso?: string) => {
  if (!iso) return '—';
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
};

export const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { profile, isLoading, isUpdating, error, successMessage } = useSelector(
    (state: RootState) => state.profile
  );

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    bio: '',
    phone: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        fullName: profile.full_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (successMessage) {
      setIsEditing(false);
      const timer = setTimeout(() => dispatch(clearSuccessMessage()), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(updateProfile(formData));
  };

  const handleCopyId = () => {
    if (!profile?.username) return;
    navigator.clipboard.writeText(profile.username).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (isLoading && !profile) {
    return (
      <Layout title="Profile">
        <div className={styles.loading}>Loading profile...</div>
      </Layout>
    );
  }

  const role = (profile?.role || 'user').toLowerCase();
  const roleMeta = ROLE_META[role] || { label: role, description: 'Access level assigned by an administrator.' };
  const displayName = profile?.full_name || profile?.username || 'Unnamed';
  const initial = (profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase();
  const memberSince = formatDate(profile?.created_at);
  const lastLogin = formatLastLogin(profile?.last_login);
  const isActive = profile?.is_active !== false;

  const tierClass = role === 'admin' ? styles.tierAdmin : role === 'manager' ? styles.tierManager : '';

  return (
    <Layout title="Profile">
      <div className={styles.page}>
        {/* ID header card */}
        <div className={`${styles.idCard} ${tierClass}`}>
          <div className={styles.idCardStripe} />
          <div className={styles.idCardSheen} />

          <div className={styles.idCardTop}>
            <div className={styles.idCardAvatarWrap}>
              <div className={styles.idCardChip} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className={styles.idCardAvatar}>{initial}</div>
            </div>

            <div className={styles.idCardIdentity}>
              <p className={styles.idCardEyebrow}>RoleGuard Access ID</p>
              <div className={styles.idCardNameRow}>
                <h1>{displayName}</h1>
                <span className={styles.clearanceTag}>
                  <span className={styles.clearanceDot} />
                  {role}
                </span>
              </div>
              <p className={styles.idCardHandle}>
                @{profile?.username} <span className={styles.idCardDot}>&middot;</span> {profile?.email}
              </p>
            </div>

            {!isEditing && (
              <button className={styles.btnEdit} onClick={() => setIsEditing(true)}>
                <EditIcon /> Edit Profile
              </button>
            )}
          </div>

          {successMessage && <div className={`${styles.alert} ${styles.alertSuccess}`}>{successMessage}</div>}
          {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

          <div className={styles.idCardDivider} />

          {!isEditing && (
            <div className={styles.statRow}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Access ID</span>
                <span className={`${styles.statValue} ${styles.mono}`}>
                  {profile?.username}
                  <button className={styles.copyBtn} onClick={handleCopyId} aria-label="Copy access ID" type="button">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Account status</span>
                <span className={`${styles.statValue} ${isActive ? styles.good : styles.muted}`}>
                  <DotIcon /> {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Member since</span>
                <span className={styles.statValue}>
                  <CalendarIcon /> {memberSince}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Last login</span>
                <span className={styles.statValue}>
                  <ClockIcon /> {lastLogin}
                </span>
              </div>
            </div>
          )}

          {isEditing && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input name="username" value={formData.username} onChange={handleChange} className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input name="fullName" value={formData.fullName} onChange={handleChange} className={styles.formInput} placeholder="Not set" />
                </div>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} className={styles.formInput} placeholder="Not provided" />
                </div>
                <div className={`${styles.formGroup} ${styles.formFull}`}>
                  <label>Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} className={styles.formInput} rows={3} placeholder="Say something about yourself" />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.btnSave} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className={styles.btnCancel} onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {!isEditing && (
          <div className={styles.grid}>
            {/* Personal Information */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardIcon}><UserIcon /></div>
                <h3>Personal Information</h3>
              </div>

              <div className={styles.rows}>
                <div className={styles.row}>
                  <span className={styles.rowIcon}><UserIcon /></span>
                  <span className={styles.rowLabel}>Username</span>
                  <span className={styles.rowValue}>{profile?.username}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowIcon}><IdCardIcon /></span>
                  <span className={styles.rowLabel}>Full Name</span>
                  <span className={`${styles.rowValue} ${!profile?.full_name ? styles.empty : ''}`}>
                    {profile?.full_name || 'Not set'}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowIcon}><MailIcon /></span>
                  <span className={styles.rowLabel}>Email</span>
                  <span className={styles.rowValue}>{profile?.email}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowIcon}><PhoneIcon /></span>
                  <span className={styles.rowLabel}>Phone</span>
                  <span className={`${styles.rowValue} ${!profile?.phone ? styles.empty : ''}`}>
                    {profile?.phone || 'Not provided'}
                  </span>
                </div>
                <div className={`${styles.row} ${styles.rowLast}`}>
                  <span className={styles.rowIcon}><InfoIcon /></span>
                  <span className={styles.rowLabel}>Bio</span>
                  <span className={`${styles.rowValue} ${!profile?.bio ? styles.empty : ''}`}>
                    {profile?.bio || 'No bio added yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security & Access */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardIcon}><ShieldIcon /></div>
                <h3>Security & Access</h3>
              </div>

              <div className={styles.roleSummary}>
                <span className={`${styles.roleChip} ${role === 'admin' ? styles.roleChipAdmin : role === 'manager' ? styles.roleChipManager : ''}`}>
                  {role}
                </span>
                <p>{roleMeta.description}</p>
              </div>

              <div className={styles.rows}>
                <div className={styles.row}>
                  <span className={styles.rowIcon}><LockIcon /></span>
                  <span className={styles.rowLabel}>Password</span>
                  <a href="/change-password" className={styles.rowAction}>Change</a>
                </div>
                <div className={`${styles.row} ${styles.rowLast}`}>
                  <span className={styles.rowIcon}><KeyIcon /></span>
                  <span className={styles.rowLabel}>Two-factor auth</span>
                  <span className={`${styles.rowValue} ${styles.muted}`}>Not enabled</span>
                </div>
              </div>

              <a href="/settings" className={styles.settingsLink}>
                Manage security settings <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};