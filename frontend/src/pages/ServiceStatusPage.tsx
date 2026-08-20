import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import { fetchServiceStatus, ServiceHealth } from '../store/slices/serviceStatusSlice';
import './ServiceStatusPage.css';

const POLL_INTERVAL_MS = 15000;

const SERVICE_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  email: {
    label: 'Email',
    description: 'SMTP delivery for login codes, alerts, and invites',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" />
        <path d="m4.5 7 7.5 6 7.5-6" />
      </svg>
    ),
  },
  sms: {
    label: 'SMS',
    description: 'Text message delivery via Twilio',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  storage: {
    label: 'Cloud Storage',
    description: 'File uploads via Cloudflare R2',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
        <path d="M3 12a9 3 0 0 0 18 0" />
      </svg>
    ),
  },
  payments: {
    label: 'Payments',
    description: 'Payment processing via Stripe',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  oauth: {
    label: 'OAuth',
    description: 'Third-party sign-in via Google',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Operational', color: '#22c55e' },
  degraded: { label: 'Degraded', color: '#f59e0b' },
  down: { label: 'Down', color: '#ef4444' },
  unknown: { label: 'Unknown', color: '#6b7280' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const ServiceStatusPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { services, isLoading, error, lastFetchedAt } = useSelector((state: RootState) => state.serviceStatus);

  useEffect(() => {
    dispatch(fetchServiceStatus());
    const interval = setInterval(() => dispatch(fetchServiceStatus()), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [dispatch]);

  const overallStatus: 'healthy' | 'degraded' | 'down' | 'unknown' =
    services.length === 0
      ? 'unknown'
      : services.some((s: ServiceHealth) => s.status === 'down')
      ? 'down'
      : services.some((s: ServiceHealth) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const overallMeta = STATUS_META[overallStatus];

  return (
    <Layout title="Service Status">
      <div className="ss-container">
        <div className="ss-banner" style={{ borderColor: `${overallMeta.color}44` }}>
          <span className="ss-banner-dot" style={{ background: overallMeta.color, boxShadow: `0 0 12px 2px ${overallMeta.color}66` }} />
          <div>
            <div className="ss-banner-title">
              {overallStatus === 'healthy' ? 'All systems operational' : `Some systems ${overallMeta.label.toLowerCase()}`}
            </div>
            <div className="ss-banner-sub">
              {lastFetchedAt ? `Last checked ${timeAgo(lastFetchedAt)}` : 'Checking...'} · Auto-refreshes every 15s
            </div>
          </div>
        </div>

        {isLoading && services.length === 0 ? (
          <div className="ss-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ss-card ss-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="ss-error">{error}</div>
        ) : services.length === 0 ? (
          <div className="ss-empty">
            No services have reported status yet. Trigger an email, SMS, or file upload to register their health.
          </div>
        ) : (
          <div className="ss-grid">
            {services.map((service: ServiceHealth) => {
              const meta = SERVICE_META[service.name] || {
                label: service.name,
                description: 'External service integration',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                ),
              };
              const statusMeta = STATUS_META[service.status] || STATUS_META.unknown;

              return (
                <div key={service.name} className="ss-card" style={{ ['--ss-color' as any]: statusMeta.color }}>
                  <div className="ss-card-top">
                    <div className="ss-card-icon">{meta.icon}</div>
                    <div className="ss-card-status">
                      <span className="ss-status-dot" />
                      {statusMeta.label}
                    </div>
                  </div>

                  <div className="ss-card-label">{meta.label}</div>
                  <div className="ss-card-desc">{meta.description}</div>

                  <div className="ss-card-meta">
                    <div className="ss-meta-row">
                      <span>Last success</span>
                      <span>{timeAgo(service.lastSuccessAt)}</span>
                    </div>
                    <div className="ss-meta-row">
                      <span>Last checked</span>
                      <span>{timeAgo(service.lastCheckedAt)}</span>
                    </div>
                    {service.consecutiveFailures > 0 && (
                      <div className="ss-meta-row ss-meta-warn">
                        <span>Consecutive failures</span>
                        <span>{service.consecutiveFailures}</span>
                      </div>
                    )}
                  </div>

                  {service.lastErrorMessage && service.status !== 'healthy' && (
                    <div className="ss-card-error">{service.lastErrorMessage}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};