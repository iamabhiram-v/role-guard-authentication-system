import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import { StatCard } from '../components/StatCard';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { ActivityInsights } from '../components/ActivityInsights';
import { ReportsSection } from '../components/ReportsSection';
import {
  fetchOverview,
  fetchTimeline,
  fetchTopWorkspaces,
  fetchSummary,
  exportReport,
  exportReportJson,
  exportReportPdf,
  setDashboardRange,
  clearDashboardError,
} from '../store/slices/dashboardSlice';
import '../styles/analytics-dashboard.css';

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M2.5 19c0-2.5 2.4-4.3 5.5-4.3s5.5 1.8 5.5 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M15 8a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M17 14.3c2.2.4 3.8 1.8 3.8 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const WorkspaceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 9h18M9 4v16" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M12 3v13m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RANGE_OPTIONS: { value: '7' | '30' | '90'; label: string }[] = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
];

export const AnalyticsDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    overview,
    timeline,
    topWorkspaces,
    summary,
    isSummaryLoading,
    range,
    isLoading,
    isExporting,
    error,
  } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchOverview(range));
    dispatch(fetchTimeline(range));
    dispatch(fetchTopWorkspaces());
    dispatch(fetchSummary(range));
    return () => {
      dispatch(clearDashboardError());
    };
  }, [dispatch, range]);

  const handleRangeChange = (value: '7' | '30' | '90') => {
    dispatch(setDashboardRange(value));
  };

  const handleExportCsv = () => {
    dispatch(exportReport(range));
  };

  const handleExportJson = () => {
    dispatch(exportReportJson(range));
  };

  const handleExportPdf = () => {
    dispatch(exportReportPdf(range));
  };

  return (
    <Layout title="Analytics Dashboard">
      <div className="ad-toolbar">
        <div className="ad-range-group">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`ad-range-btn ${range === opt.value ? 'active' : ''}`}
              onClick={() => handleRangeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ad-export-group">
          <button className="ad-export-btn" onClick={handleExportPdf} disabled={isExporting}>
            <DownloadIcon />
            {isExporting ? 'Exporting...' : 'PDF'}
          </button>
          <button className="ad-export-btn ad-export-btn-secondary" onClick={handleExportCsv} disabled={isExporting}>
            <DownloadIcon />
            CSV
          </button>
          <button className="ad-export-btn ad-export-btn-secondary" onClick={handleExportJson} disabled={isExporting}>
            <DownloadIcon />
            JSON
          </button>
        </div>
      </div>

      {isLoading && !overview ? (
        <div className="ad-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="ad-card-skeleton" />
          ))}
        </div>
      ) : (
        <div className="ad-cards-grid">
          <StatCard
            label="Total Users"
            value={overview?.totalUsers ?? 0}
            accent="#3b82f6"
            icon={<UsersIcon />}
            delay={0}
          />
          <StatCard
            label="Active Users"
            value={overview?.activeUsers ?? 0}
            accent="#22c55e"
            icon={<CheckIcon />}
            delay={50}
          />
          <StatCard
            label="Workspaces"
            value={overview?.totalWorkspaces ?? 0}
            accent="#a855f7"
            icon={<WorkspaceIcon />}
            delay={100}
          />
          <StatCard
            label="Total Members"
            value={overview?.totalMembers ?? 0}
            accent="#06b6d4"
            icon={<UsersIcon />}
            delay={150}
          />
          <StatCard
            label="Pending Invites"
            value={overview?.pendingInvites ?? 0}
            accent="#f59e0b"
            icon={<MailIcon />}
            delay={200}
          />
          <StatCard
            label="Jobs Processed"
            value={overview?.jobsProcessed ?? 0}
            accent="#22c55e"
            icon={<CheckIcon />}
            delay={250}
          />
          <StatCard
            label="Jobs Failed"
            value={overview?.jobsFailed ?? 0}
            accent="#ef4444"
            icon={<AlertIcon />}
            delay={300}
            alert={(overview?.jobsFailed ?? 0) > 0}
          />
          <StatCard
            label="Notifications Sent"
            value={overview?.notificationsSent ?? 0}
            accent="#a78bfa"
            icon={<BellIcon />}
            delay={350}
          />
        </div>
      )}

      <ActivityInsights data={timeline} />

      <div className="ad-main-grid">
        <div className="ad-chart-shell">
          <div className="ad-chart-border-spin" aria-hidden="true" />
          <div className="ad-chart-card">
            <div className="ad-section-title">Activity Timeline</div>
            <AnalyticsChart data={timeline} />
          </div>
        </div>

        <div className="ad-side-shell">
          <div className="ad-side-border-spin" aria-hidden="true" />
          <div className="ad-side-card">
            <div className="ad-section-title">Top Workspaces</div>
            {topWorkspaces.length === 0 ? (
              <div className="ad-side-empty">No workspaces yet</div>
            ) : (
              <>
                <div className="ad-top-list">
                  {topWorkspaces.map((ws, i) => (
                    <div key={ws.id} className="ad-top-row" style={{ animationDelay: `${i * 60}ms` }}>
                      <span className="ad-top-rank">#{i + 1}</span>
                      <div className="ad-top-meta">
                        <span className="ad-top-name">{ws.name}</span>
                        <span className="ad-top-count">{ws.member_count} member{ws.member_count === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {topWorkspaces.length < 3 && (
                  <div className="ad-side-footer">
                    <span className="ad-side-footer-icon">＋</span>
                    <span>Create more workspaces to populate this ranking</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ReportsSection summary={summary} isLoading={isSummaryLoading} rangeDays={overview?.rangeDays ?? Number(range)} />

      <Toast
        message={error || ''}
        variant="error"
        isVisible={!!error}
        onClose={() => dispatch(clearDashboardError())}
      />
    </Layout>
  );
};