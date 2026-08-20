import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { changePassword, clearSuccessMessage, clearProfileError } from '../store/slices/profileSlice';
import { Layout } from '../components/Layout';
import '../styles/ChangePasswordPage.css';

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
    <rect x="5" y="10.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M12 3.5 19 6v5.5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-2.5Z"
      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const SuccessIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const requirementChecks = (pw: string) => [
  { label: 'At least 8 characters',  met: pw.length >= 8 },
  { label: 'One uppercase letter',    met: /[A-Z]/.test(pw) },
  { label: 'One lowercase letter',    met: /[a-z]/.test(pw) },
  { label: 'One digit',               met: /[0-9]/.test(pw) },
  { label: 'One special character',   met: /[!@#$%^&*]/.test(pw) },
];

const strengthConfig = (met: number, total: number) => {
  if (met === 0)             return { label: '',       color: 'rgba(255,255,255,0.1)', width: '0%' };
  const r = met / total;
  if (r <= 0.4)              return { label: 'Weak',   color: '#f87171', width: '25%' };
  if (r < 1)                 return { label: 'Good',   color: '#fbbf24', width: `${Math.round(r * 100)}%` };
  return                            { label: 'Strong', color: '#4ade80', width: '100%' };
};

interface FieldProps {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string; placeholder?: string;
  extraClass?: string;
}
const PasswordField: React.FC<FieldProps> = ({ label, name, value, onChange, error, placeholder, extraClass }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="cp-form-group">
      <label htmlFor={name}>{label}</label>
      <div className="cp-input-wrap">
        <span className="cp-input-icon"><LockIcon /></span>
        <input
          id={name} type={visible ? 'text' : 'password'}
          name={name} value={value} onChange={onChange}
          className={`cp-input${error ? ' has-error' : ''}${extraClass ? ' ' + extraClass : ''}`}
          placeholder={placeholder} autoComplete="off"
        />
        <button type="button" className="cp-eye-btn" onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide' : 'Show'} tabIndex={-1}>
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <span className="cp-error-text">{error}</span>}
    </div>
  );
};

const ScoreRing: React.FC<{ met: number; total: number }> = ({ met, total }) => {
  const r = 18, circ = 2 * Math.PI * r;
  const { color } = strengthConfig(met, total);
  return (
    <div className="cp-score-ring" aria-label={`${met} of ${total} requirements met`}>
      <svg viewBox="0 0 40 40" width="48" height="48">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - met / total)}
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.35s ease' }} />
      </svg>
      <span className="cp-score-count" style={{ color }}>{met}/{total}</span>
    </div>
  );
};

export const ChangePasswordPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isUpdating, error, successMessage } = useSelector((s: RootState) => s.profile);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reqs     = useMemo(() => requirementChecks(form.newPassword), [form.newPassword]);
  const metCount = reqs.filter(r => r.met).length;
  const allMet   = metCount === reqs.length;
  const strength = strengthConfig(metCount, reqs.length);
  const matches  = form.confirmPassword.length > 0 && form.newPassword === form.confirmPassword;

  useEffect(() => () => { dispatch(clearProfileError()); dispatch(clearSuccessMessage()); }, [dispatch]);
  useEffect(() => { if (successMessage) setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }, [successMessage]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.currentPassword) e.currentPassword = 'Required';
    if (!allMet)               e.newPassword = 'Password does not meet all requirements';
    if (!matches && form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.confirmPassword) e.confirmPassword = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) dispatch(changePassword(form)); };

  return (
    <Layout title="Change Password">
      {/* Hero */}
      <div className="cp-hero">
        <div className="cp-hero-icon"><LockIcon size={20} /></div>
        <div className="cp-hero-text">
          <h2>Change Password</h2>
          <p>Update your credentials to keep your account secure.</p>
        </div>
        <div className="cp-hero-badge"><ShieldIcon /> </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="cp-alert cp-alert-success">
          <SuccessIcon />{successMessage}
        </div>
      )}
      {error && (
        <div className="cp-alert cp-alert-error">
          <AlertIcon />{error}
        </div>
      )}

      <div className="cp-layout">
        {/* ── Form card ── */}
        <div className="cp-card cp-card-main">
          <div className="cp-section-label">Credentials <span /></div>
          <form onSubmit={handleSubmit} className="cp-form">
            <PasswordField label="Current Password" name="currentPassword"
              value={form.currentPassword} onChange={handleChange}
              error={errors.currentPassword} placeholder="Enter your current password" />

            <div>
              <PasswordField label="New Password" name="newPassword"
                value={form.newPassword} onChange={handleChange}
                error={errors.newPassword} placeholder="Enter your new password" />
              {form.newPassword.length > 0 && (
                <div className="cp-strength-wrap">
                  <div className="cp-strength-bar-track">
                    <div className="cp-strength-bar-fill"
                      style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <div className="cp-strength-label-row">
                    <span className="cp-strength-text" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                    <span className="cp-strength-hint">{metCount}/{reqs.length} requirements</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <PasswordField label="Confirm New Password" name="confirmPassword"
                value={form.confirmPassword} onChange={handleChange}
                error={errors.confirmPassword} placeholder="Confirm your new password"
                extraClass={matches ? 'is-valid' : ''} />
              {form.confirmPassword.length > 0 && (
                <p className={`cp-match${matches ? ' match' : ' no-match'}`}>
                  {matches ? <><CheckIcon /> Passwords match</> : 'Passwords do not match yet'}
                </p>
              )}
            </div>

            <button type="submit" className="cp-submit" disabled={isUpdating}>
              <LockIcon size={15} />
              {isUpdating ? 'Updating password…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ── Sidebar ── */}
        <div className="cp-sidebar">
          {/* Requirements */}
          <div className="cp-card">
            <div className="cp-score-row">
              <div className="cp-section-label" style={{ margin: 0 }}>Requirements <span /></div>
              <ScoreRing met={metCount} total={reqs.length} />
            </div>
            <div className="cp-divider" />
            <ul className="cp-reqs">
              {reqs.map(req => (
                <li key={req.label} className={req.met ? 'met' : ''}>
                  <span className="cp-req-icon" aria-hidden="true">
                    {req.met ? <CheckIcon size={10} /> : <span className="cp-req-dot" />}
                  </span>
                  {req.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Security tip */}
          <div className="cp-card">
            <div className="cp-tip-head">
              <span className="cp-tip-icon"><ShieldIcon /></span>
              <p className="cp-tip-eyebrow">Security tip</p>
            </div>
            <p className="cp-tip-body">
              Avoid using personal information, common words, or sequential numbers in your password.
            </p>
          </div>

          {/* Examples */}
          <div className="cp-card">
            <div className="cp-tip-head">
              <span className="cp-tip-icon"><ShieldIcon /></span>
              <p className="cp-tip-eyebrow">Strong password examples</p>
            </div>
            <ul className="cp-examples">
              <li><CheckIcon size={11} /> Tr@vel2025!Plan</li>
              <li><CheckIcon size={11} /> Str0ng#Passw0rd9</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="cp-footnote">
        <div className="cp-footnote-icon"><LockIcon size={15} /></div>
        <p className="cp-footnote-text">
          <strong>Industry-standard encryption.</strong> Your password is hashed with bcrypt and never stored in plain text.
        </p>
      </div>
    </Layout>
  );
};
