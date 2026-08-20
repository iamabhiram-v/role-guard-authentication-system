import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import { fetchPreferences, updatePreference, clearPreferencesMessages } from '../store/slices/notificationPreferencesSlice';
import { fetchPushStatus, enablePush, disablePush, clearPushMessages } from '../store/slices/pushSubscriptionSlice';

const CHANNEL_COLOR = {
  mail: { fg: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.4)' },
  app: { fg: '#a78bfa', bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.45)' },
};

const CATEGORY_META: Record<string, { label: string; description: string; icon: JSX.Element }> = {
  workspace_invite: {
    label: 'Workspace Invites',
    description: 'When someone invites you to a workspace.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  job_failure: {
    label: 'Job Failures',
    description: 'When a background job (email/notification) fails.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  broadcast: {
    label: 'Announcements',
    description: 'System-wide announcements from admins.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a2 2 0 0 1-3.8-1.2" />
      </svg>
    ),
  },
  general: {
    label: 'General',
    description: 'Everything else not covered above.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
  color: string;
}> = ({ checked, onChange, disabled, label, color }) => {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? 'np-toggle-on' : ''}
      style={{
        width: '38px',
        height: '21px',
        borderRadius: '999px',
        border: 'none',
        background: checked ? color : 'rgba(255,255,255,0.14)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.2s ease',
        flexShrink: 0,
        padding: 0,
        // @ts-ignore custom property for the glow keyframe
        '--toggle-color': color,
      } as React.CSSProperties}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${color}`;
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '19px' : '2px',
          width: '17px',
          height: '17px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </button>
  );
};

export const NotificationPreferencesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, isSaving, error, successMessage } = useSelector(
    (state: RootState) => state.notificationPreferences
  );
  const {
    isSubscribed,
    isLoading: isPushLoading,
    isToggling: isPushToggling,
    error: pushError,
    successMessage: pushSuccessMessage,
  } = useSelector((state: RootState) => state.pushSubscription);

  useEffect(() => {
    dispatch(fetchPreferences());
    dispatch(fetchPushStatus());
  }, [dispatch]);

  // Clear any lingering toast state on unmount so navigating away mid-toast
  // and coming back doesn't resurrect a stale message.
  useEffect(() => {
    return () => {
      dispatch(clearPreferencesMessages());
      dispatch(clearPushMessages());
    };
  }, [dispatch]);

  const handleToggle = (category: string, field: 'email_enabled' | 'in_app_enabled', current: boolean) => {
    dispatch(updatePreference({ category, updates: { [field]: !current } }));
  };

  const handlePushToggle = () => {
    if (isSubscribed) {
      dispatch(disablePush());
    } else {
      dispatch(enablePush());
    }
  };

  return (
    <Layout title="Notification Preferences">
      <style>{`
        @property --np-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes npRotateGlow { to { --np-angle: 360deg; } }
        @keyframes npFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes npTogglePulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--toggle-color); }
          50% { box-shadow: 0 0 8px 1px var(--toggle-color); }
        }
        @keyframes npIconPop {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .np-fade { animation: npFadeUp 0.35s ease both; }

        .np-glow-card {
          position: relative;
          overflow: hidden;
        }
        .np-glow-card::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: conic-gradient(from var(--np-angle, 0deg),
            transparent 0%,
            rgba(56,189,248,0.55) 12%,
            transparent 26%,
            transparent 55%,
            rgba(167,139,250,0.55) 70%,
            transparent 85%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          animation: npRotateGlow 8s linear infinite;
          pointer-events: none;
        }

        .np-row {
          transition: background 0.15s ease, padding-left 0.15s ease, border-left-color 0.15s ease;
          border-left: 2px solid transparent;
        }
        .np-row:hover {
          background: rgba(255,255,255,0.025);
          padding-left: 1.55rem;
          border-left-color: rgba(167,139,250,0.5);
        }

        .np-icon-badge {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease;
        }
        .np-row:hover .np-icon-badge {
          transform: scale(1.08) rotate(-4deg);
          border-color: rgba(167,139,250,0.5);
        }

        .np-toggle-on {
          animation: npTogglePulse 2.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .np-fade, .np-glow-card::before, .np-toggle-on { animation: none !important; }
          .np-row, .np-icon-badge { transition: none; }
        }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p className="np-fade" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
          Choose how you'd like to be notified for each type of activity.
        </p>

        {/* Legend */}
        <div className="np-fade" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', animationDelay: '0.03s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: CHANNEL_COLOR.mail.fg, display: 'block' }} />
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Email</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: CHANNEL_COLOR.app.fg, display: 'block' }} />
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>In-App</span>
          </div>
        </div>

        {/* Push notifications */}
        <div
          className="np-fade np-glow-card"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '14px',
            padding: '1.2rem 1.4rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            animationDelay: '0.06s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem', minWidth: 0 }}>
            <div
              className="np-icon-badge"
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.7rem',
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#38bdf8',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                <path d="M18 8a6 6 0 0 0-9.33-5" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                Push Notifications
              </div>
              <div style={{ fontSize: '0.8rem', color: isSubscribed ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                {isSubscribed ? 'Enabled on this device' : 'Not enabled on this device'}
              </div>
            </div>
          </div>
          <Toggle
            checked={isSubscribed}
            disabled={isPushLoading || isPushToggling}
            onChange={handlePushToggle}
            label="Toggle push notifications"
            color="#38bdf8"
          />
        </div>

        {/* Preferences list */}
        {isLoading ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>Loading preferences...</p>
        ) : (
          <div
            className="np-fade np-glow-card"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '14px',
              overflow: 'hidden',
              animationDelay: '0.1s',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 70px',
                alignItems: 'center',
                padding: '0.9rem 1.4rem',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Category
              </span>
              <span style={{ fontSize: '0.72rem', color: CHANNEL_COLOR.mail.fg, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>
                Email
              </span>
              <span style={{ fontSize: '0.72rem', color: CHANNEL_COLOR.app.fg, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>
                In-App
              </span>
            </div>

            {items.map((pref, idx) => {
              const meta = CATEGORY_META[pref.category] || {
                label: pref.category,
                description: '',
                icon: null,
              };
              const isLast = idx === items.length - 1;

              return (
                <div
                  key={pref.category}
                  className="np-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 70px',
                    alignItems: 'center',
                    padding: '1.1rem 1.4rem',
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                    <div
                      className="np-icon-badge"
                      style={{
                        width: '2.2rem',
                        height: '2.2rem',
                        borderRadius: '0.6rem',
                        background: 'rgba(167,139,250,0.1)',
                        border: '1px solid rgba(167,139,250,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#a78bfa',
                        animation: 'npIconPop 0.3s ease both',
                        animationDelay: `${0.12 + idx * 0.04}s`,
                      }}
                    >
                      {meta.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                        {meta.label}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {meta.description}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Toggle
                      checked={pref.email_enabled}
                      disabled={isSaving}
                      onChange={() => handleToggle(pref.category, 'email_enabled', pref.email_enabled)}
                      label={`Toggle email for ${meta.label}`}
                      color={CHANNEL_COLOR.mail.fg}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Toggle
                      checked={pref.in_app_enabled}
                      disabled={isSaving}
                      onChange={() => handleToggle(pref.category, 'in_app_enabled', pref.in_app_enabled)}
                      label={`Toggle in-app for ${meta.label}`}
                      color={CHANNEL_COLOR.app.fg}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Toast
        message={error || successMessage || pushError || pushSuccessMessage || ''}
        variant={error || pushError ? 'error' : 'success'}
        isVisible={!!(error || successMessage || pushError || pushSuccessMessage)}
        duration={2500}
        onClose={() => {
          dispatch(clearPreferencesMessages());
          dispatch(clearPushMessages());
        }}
      />
    </Layout>
  );
};