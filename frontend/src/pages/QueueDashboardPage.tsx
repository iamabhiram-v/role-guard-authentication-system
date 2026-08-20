import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchJobs, fetchStats, fetchThroughput, fetchLatencyStats, fetchWorkerHealth, retryJob, retryJobs, holdJob, releaseJob, setFilters, pauseQueue, resumeQueue } from '../store/slices/queueSlice';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import { CreateJobPanel } from '../components/CreateJobPanel';
import { apiClient } from '../services/api';
import '../styles/queue.css';

type SortKey = 'created_at' | 'attempts';
type SortDir = 'asc' | 'desc';

const STUCK_THRESHOLD_MS = 3 * 60 * 1000;
const FAILURE_RATE_THRESHOLD = 0.15;

const PauseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const ProcessingPulse = () => <span className="qm-pulse-dot" />;

const EmailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PdfIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const SortIcon: React.FC<{ active: boolean; dir: SortDir }> = ({ active, dir }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ marginLeft: '0.3rem', opacity: active ? 1 : 0.3, transform: active && dir === 'asc' ? 'rotate(180deg)' : 'none' }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const WarningIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SkullIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" />
    <path d="M9 16h6M8 20v-2M16 20v-2M12 3a8 8 0 0 0-8 8v5a2 2 0 0 0 2 2h1v-3M20 16v-5a8 8 0 0 0-8-8" />
  </svg>
);

const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const LayersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6M9 9l6 6" />
  </svg>
);

const TargetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

function fullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

function shortJobId(uuid: string, type: string): string {
  const prefix = type === 'email' ? 'EML' : 'NTF';
  return `${prefix}-${uuid.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function exportPdf(
  jobs: { id: string; type: string; status: string; attempts: number; max_attempts: number; created_at: string; error?: string | null }[],
  stats: QueueOverviewStats,
  latency: { p50: number | null; avg: number | null; p95: number | null; sampleSize: number }
) {
  const ts = new Date().toLocaleString();
  const total = stats.pending + stats.processing + stats.completed + stats.failed;
  const successRate = stats.completed + stats.failed === 0 ? '—' : `${Math.round((stats.completed / (stats.completed + stats.failed)) * 100)}%`;

  const rows = jobs
    .map(
      (j) => `<tr>
        <td>${shortJobId(j.id, j.type)}</td>
        <td>${j.type}</td>
        <td>${j.status}</td>
        <td>${j.attempts}/${j.max_attempts}</td>
        <td>${new Date(j.created_at).toLocaleString()}</td>
        <td>${j.error || '—'}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Queue Report — ${ts}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 11px; margin-bottom: 20px; }
    .stats { display: flex; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat { text-align: center; padding: 10px 16px; border: 1px solid #ddd; border-radius: 6px; }
    .stat-val { font-size: 22px; font-weight: 700; }
    .stat-lbl { font-size: 10px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; border-bottom: 2px solid #ddd; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:last-child td { border-bottom: none; }
    .latency { margin-bottom: 20px; font-size: 12px; color: #333; }
    @media print { body { margin: 0; } }
  </style></head><body>
  <h1>Queue Monitoring Report</h1>
  <div class="sub">Exported on ${ts} &nbsp;·&nbsp; ${jobs.length} job(s) shown</div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${total}</div><div class="stat-lbl">Total</div></div>
    <div class="stat"><div class="stat-val">${stats.pending}</div><div class="stat-lbl">Pending</div></div>
    <div class="stat"><div class="stat-val">${stats.processing}</div><div class="stat-lbl">Processing</div></div>
    <div class="stat"><div class="stat-val">${stats.completed}</div><div class="stat-lbl">Completed</div></div>
    <div class="stat"><div class="stat-val">${stats.failed}</div><div class="stat-lbl">Failed</div></div>
    <div class="stat"><div class="stat-val">${successRate}</div><div class="stat-lbl">Success Rate</div></div>
  </div>
  ${latency.sampleSize > 0 ? `<div class="latency">Processing time (last 24h) &nbsp;·&nbsp; P50: ${formatDuration(latency.p50)} &nbsp;·&nbsp; Avg: ${formatDuration(latency.avg)} &nbsp;·&nbsp; P95: ${formatDuration(latency.p95)} &nbsp;·&nbsp; (${latency.sampleSize} jobs)</div>` : ''}
  <table>
    <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Attempts</th><th>Created</th><th>Error</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function downloadCsv(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function isStuck(job: { status: string; started_at?: string | null }): boolean {
  if (job.status !== 'processing' || !job.started_at) return false;
  return Date.now() - new Date(job.started_at).getTime() > STUCK_THRESHOLD_MS;
}

function isDeadLetter(job: { status: string; attempts: number; max_attempts: number }): boolean {
  return job.status === 'failed' && job.attempts >= job.max_attempts;
}

interface ExportableJob {
  id: string;
  type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  error?: string | null;
}

// Export CSV/PDF must include every job matching the current filters, not
// just the current page — the backend's /queue/jobs endpoint hardcodes
// limit=10 (queue.controller.ts), so exporting used to silently only
// include whatever 10 rows happened to be on screen. This pages through
// the full result set client-side using the same endpoint the table uses.
async function fetchAllJobsForExport(filters: { status?: string; type?: string }): Promise<ExportableJob[]> {
  const all: ExportableJob[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);
    params.set('page', String(page));

    const res = await apiClient.get<{ data: ExportableJob[]; pagination: { totalPages: number } }>(
      `/queue/jobs?${params.toString()}`
    );
    all.push(...res.data.data);
    totalPages = res.data.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);

  return all;
}

interface ThroughputPoint {
  hour: string;
  completed: number;
  failed: number;
}

// Builds a full 24-hour timeline (hourly buckets), merging in whatever
// sparse data the API returned, so the chart always shows a real
// multi-bar timeline instead of collapsing into a single giant block
// when there's only 1-2 data points.
function buildHourlyTimeline(data: ThroughputPoint[]): ThroughputPoint[] {
  const byHour = new Map<string, { completed: number; failed: number }>();
  data.forEach((d) => {
    const key = new Date(d.hour);
    key.setMinutes(0, 0, 0);
    const k = key.toISOString();
    const existing = byHour.get(k) || { completed: 0, failed: 0 };
    byHour.set(k, { completed: existing.completed + d.completed, failed: existing.failed + d.failed });
  });

  const now = new Date();
  now.setMinutes(0, 0, 0);

  const timeline: ThroughputPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const slot = new Date(now.getTime() - i * 60 * 60 * 1000);
    const k = slot.toISOString();
    const bucket = byHour.get(k);
    timeline.push({ hour: k, completed: bucket?.completed ?? 0, failed: bucket?.failed ?? 0 });
  }
  return timeline;
}

const ThroughputChart: React.FC<{ data: ThroughputPoint[] }> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const timeline = useMemo(() => buildHourlyTimeline(data), [data]);

  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  const totalFailed = data.reduce((s, d) => s + d.failed, 0);
  const successRate = totalCompleted + totalFailed === 0 ? 100 : Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100);

  if (totalCompleted + totalFailed === 0) {
    const emptyTimeline = buildHourlyTimeline([]);
    return (
      <div className="qm-chart-card">
        <div className="qm-chart-header">
          <div>
            <span className="qm-chart-title">Throughput</span>
            <span className="qm-chart-subtitle">Last 24 hours</span>
          </div>
        </div>
        <div className="qm-chart-empty">
          <div className="qm-chart-empty-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="20" x2="4" y2="10" />
              <line x1="10" y1="20" x2="10" y2="4" />
              <line x1="16" y1="20" x2="16" y2="14" />
              <line x1="2" y1="20" x2="22" y2="20" />
            </svg>
          </div>
          <span className="qm-chart-empty-title">No activity yet</span>
          <span className="qm-chart-empty-sub">Job completions and failures will appear here as they happen.</span>
        </div>
        <div className="qm-chart-xaxis">
          {emptyTimeline
            .filter((_, i) => i % 3 === 0 || i === emptyTimeline.length - 1)
            .map((d) => (
              <span key={d.hour}>{new Date(d.hour).toLocaleTimeString(undefined, { hour: 'numeric' })}</span>
            ))}
        </div>
      </div>
    );
  }

  const width = 1000;
  const height = 220;
  const padding = { top: 18, right: 16, bottom: 30, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...timeline.map((d) => Math.max(d.completed, d.failed)));
  const groupWidth = chartW / timeline.length;
  const barGap = Math.max(1.5, Math.min(4, groupWidth * 0.1));
  const barWidth = Math.max(3, (groupWidth - barGap * 3) / 2);

  const heightFor = (val: number) => (val / maxVal) * chartH;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="qm-chart-card">
      <div className="qm-chart-header">
        <div>
          <span className="qm-chart-title">Throughput</span>
          <span className="qm-chart-subtitle">Last 24 hours</span>
        </div>
        <div className="qm-chart-summary">
          <div className="qm-chart-metric">
            <span className="qm-chart-metric-value" style={{ color: '#34d399' }}>{totalCompleted}</span>
            <span className="qm-chart-metric-label">Completed</span>
          </div>
          <div className="qm-chart-metric">
            <span className="qm-chart-metric-value" style={{ color: '#f87171' }}>{totalFailed}</span>
            <span className="qm-chart-metric-label">Failed</span>
          </div>
          <div className="qm-chart-metric">
            <span className="qm-chart-metric-value">{successRate}%</span>
            <span className="qm-chart-metric-label">Success rate (24h)</span>
          </div>
        </div>
      </div>

      <div className="qm-chart-svg-wrap" style={{ height: '190px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="qm-chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="qmBarCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="qmBarFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <filter id="qmBarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {gridLines.map((g) => (
            <line
              key={g}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + chartH * (1 - g)}
              y2={padding.top + chartH * (1 - g)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray={g === 0 ? '0' : '3,4'}
            />
          ))}

          {timeline.map((d, i) => {
            const groupX = padding.left + i * groupWidth;
            const cH = heightFor(d.completed);
            const fH = heightFor(d.failed);
            const centerOffset = (groupWidth - (barWidth * 2 + barGap)) / 2;
            const cX = groupX + centerOffset;
            const fX = cX + barWidth + barGap;
            const baseY = padding.top + chartH;
            const isHover = hoverIdx === i;
            const cBarH = Math.max(cH, d.completed > 0 ? 3 : 0);
            const fBarH = Math.max(fH, d.failed > 0 ? 3 : 0);

            return (
              <g key={d.hour}>
                <rect
                  x={groupX}
                  y={padding.top}
                  width={groupWidth}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
                {isHover && (
                  <rect
                    x={groupX}
                    y={padding.top}
                    width={groupWidth}
                    height={chartH}
                    fill="rgba(255,255,255,0.035)"
                    pointerEvents="none"
                  />
                )}
                <rect
                  x={cX}
                  y={mounted ? baseY - cBarH : baseY}
                  width={barWidth}
                  height={mounted ? cBarH : 0}
                  rx={Math.min(2.5, barWidth / 3)}
                  fill="url(#qmBarCompleted)"
                  opacity={isHover ? 1 : 0.92}
                  filter={isHover && d.completed > 0 ? 'url(#qmBarGlow)' : undefined}
                  pointerEvents="none"
                  style={{ transition: `height 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.012}s, y 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.012}s, opacity 0.15s ease` }}
                />
                <rect
                  x={fX}
                  y={mounted ? baseY - fBarH : baseY}
                  width={barWidth}
                  height={mounted ? fBarH : 0}
                  rx={Math.min(2.5, barWidth / 3)}
                  fill="url(#qmBarFailed)"
                  opacity={isHover ? 1 : 0.92}
                  filter={isHover && d.failed > 0 ? 'url(#qmBarGlow)' : undefined}
                  pointerEvents="none"
                  style={{ transition: `height 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.012}s, y 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.012}s, opacity 0.15s ease` }}
                />
              </g>
            );
          })}

          <line x1={padding.left} x2={width - padding.right} y1={padding.top + chartH} y2={padding.top + chartH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>

        {hoverIdx !== null && (
          <div
            className="qm-chart-tooltip"
            style={{
              left: `${Math.min(Math.max(((padding.left + (hoverIdx + 0.5) * groupWidth) / width) * 100, 8), 92)}%`,
              pointerEvents: 'none',
            }}
          >
            <div className="qm-tooltip-time">
              {new Date(timeline[hoverIdx].hour).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="qm-tooltip-row"><span className="qm-legend-dot" style={{ background: '#4ade80' }} /> Completed: {timeline[hoverIdx].completed}</div>
            <div className="qm-tooltip-row"><span className="qm-legend-dot" style={{ background: '#fb7185' }} /> Failed: {timeline[hoverIdx].failed}</div>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', height: '22px', marginTop: '2px' }}>
        {timeline.map((d, i) => {
          if (i % 3 !== 0 && i !== timeline.length - 1) return null;
          const leftPct = ((padding.left + i * groupWidth + groupWidth / 2) / width) * 100;
          return (
            <span
              key={d.hour}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                transform: 'translateX(-50%)',
                fontSize: '0.7rem',
                color: 'rgba(245,246,248,0.38)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {new Date(d.hour).toLocaleTimeString(undefined, { hour: 'numeric' })}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const FailureRateAlert: React.FC<{ stats: { completed: number; failed: number } }> = ({ stats }) => {
  const total = stats.completed + stats.failed;
  if (total < 5) return null;
  const rate = stats.failed / total;
  if (rate < FAILURE_RATE_THRESHOLD) return null;

  return (
    <div className="qm-alert critical">
      <WarningIcon /> Elevated failure rate detected — {Math.round(rate * 100)}% of recent jobs failed
    </div>
  );
};

const LatencyCard: React.FC<{ latency: { p50: number | null; p95: number | null; avg: number | null; sampleSize: number } }> = ({ latency }) => {
  if (latency.sampleSize === 0) return null;

  return (
    <div className="qm-latency-card">
      <span className="qm-latency-title">Processing time (last 24h)</span>
      <div className="qm-latency-metrics">
        <div className="qm-latency-metric">
          <span className="qm-latency-value">{formatDuration(latency.p50)}</span>
          <span className="qm-latency-label">P50 (median)</span>
        </div>
        <div className="qm-latency-metric">
          <span className="qm-latency-value">{formatDuration(latency.avg)}</span>
          <span className="qm-latency-label">Average</span>
        </div>
        <div className="qm-latency-metric">
          <span className="qm-latency-value warn">{formatDuration(latency.p95)}</span>
          <span className="qm-latency-label">P95</span>
        </div>
      </div>
      <span className="qm-latency-sample">Based on {latency.sampleSize} completed job{latency.sampleSize !== 1 ? 's' : ''}</span>
    </div>
  );
};

interface QueueOverviewStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

// All-time counts across every job status, straight from queueService.getStats().
// Distinct on purpose from ThroughputChart's Completed/Failed/Success Rate,
// which are scoped to the last 24 hours only — mixing the two together
// under one label was the source of "where's the total job count" confusion.
const QueueOverview: React.FC<{ stats: QueueOverviewStats }> = ({ stats }) => {
  const total = stats.pending + stats.processing + stats.completed + stats.failed;
  const successRate = stats.completed + stats.failed === 0 ? null : Math.round((stats.completed / (stats.completed + stats.failed)) * 100);

  const tiles = [
    { label: 'Total Jobs', value: total, icon: <LayersIcon />, accent: '#a855f7' },
    { label: 'Pending', value: stats.pending, icon: <ClockIcon />, accent: '#f59e0b' },
    { label: 'Processing', value: stats.processing, icon: <ClockIcon />, accent: '#06b6d4' },
    { label: 'Completed', value: stats.completed, icon: <CheckCircleIcon />, accent: '#22c55e' },
    { label: 'Failed', value: stats.failed, icon: <XCircleIcon />, accent: '#ef4444' },
    { label: 'Success Rate (all-time)', value: successRate === null ? '—' : `${successRate}%`, icon: <TargetIcon />, accent: '#4ade80' },
  ];

  return (
    <div className="qm-overview-grid">
      {tiles.map((t) => (
        <div key={t.label} className="qm-overview-tile" style={{ ['--tile-accent' as any]: t.accent }}>
          <div className="qm-overview-icon">{t.icon}</div>
          <div className="qm-overview-text">
            <span className="qm-overview-value">{t.value}</span>
            <span className="qm-overview-label">{t.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const QueueDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { jobs, stats, throughput, latency, pagination, filters, isLoading, lastUpdated, isPaused, isTogglingPause } = useSelector(
    (state: RootState) => state.queue
  );
  const { user } = useSelector((state: RootState) => state.auth);
  const canRetry = user?.role === 'admin';
  const canControlQueue = user?.role === 'admin';

  const [showForm, setShowForm] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    dispatch(fetchJobs(filters));
    dispatch(fetchStats());
    dispatch(fetchThroughput());
    dispatch(fetchLatencyStats());
    dispatch(fetchWorkerHealth());

    const interval = setInterval(() => {
      dispatch(fetchJobs(filters));
      dispatch(fetchStats());
      dispatch(fetchThroughput());
      dispatch(fetchLatencyStats());
      dispatch(fetchWorkerHealth());
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters.status, filters.type, filters.page]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const displayedJobs = useMemo(() => {
    let result = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.id.toLowerCase().includes(q) ||
          shortJobId(j.id, j.type).toLowerCase().includes(q) ||
          (j.error || '').toLowerCase().includes(q) ||
          JSON.stringify(j.payload || {}).toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const av = sortKey === 'attempts' ? a.attempts : new Date(a.created_at).getTime();
      const bv = sortKey === 'attempts' ? b.attempts : new Date(b.created_at).getTime();
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [jobs, search, sortKey, sortDir]);

  const failedSelected = useMemo(() => jobs.filter((j) => selected.has(j.id) && j.status === 'failed'), [jobs, selected]);
  const stuckCount = useMemo(() => jobs.filter(isStuck).length, [jobs]);
  const deadLetterCount = useMemo(() => jobs.filter(isDeadLetter).length, [jobs]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleRetry = (jobId: string) => {
    dispatch(retryJob(jobId)).then((res) => {
      if (retryJob.rejected.match(res)) {
        setToast({ msg: (res.payload as string) || 'Failed to retry job', variant: 'error' });
        return;
      }
      dispatch(fetchJobs(filters));
      dispatch(fetchStats());
    });
  };

  // Per-job hold — distinct from the whole-queue Pause button above. This
  // holds back one specific pending job (e.g. a suspicious payload under
  // review) while everything else keeps processing normally.
  const handleHoldToggle = (jobId: string, currentlyHeld: boolean) => {
    const action = currentlyHeld ? releaseJob(jobId) : holdJob(jobId);
    dispatch(action).then((res: any) => {
      if (res.error) {
        setToast({ msg: (res.payload as string) || 'Failed to update job', variant: 'error' });
        return;
      }
      dispatch(fetchJobs(filters));
    });
  };

  const handleTogglePause = () => {
    const action = isPaused ? resumeQueue() : pauseQueue();
    dispatch(action).then((res: any) => {
      if (res.error) {
        setToast({ msg: (res.payload as string) || 'Failed to update queue state', variant: 'error' });
      } else {
        setToast({ msg: isPaused ? 'Queue resumed' : 'Queue paused — no new jobs will be picked up', variant: 'success' });
        dispatch(fetchWorkerHealth());
      }
    });
  };

  const handleBulkRetry = async () => {
    if (failedSelected.length === 0) return;
    setIsBulkRetrying(true);
    const result = await dispatch(retryJobs(failedSelected.map((j) => j.id)));
    setIsBulkRetrying(false);
    setSelected(new Set());
    dispatch(fetchJobs(filters));
    dispatch(fetchStats());
    if (retryJobs.fulfilled.match(result)) setToast({ msg: `Re-queued ${result.payload.succeeded} job(s)`, variant: 'success' });
  };

  const applySearch = (list: ExportableJob[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (j) =>
        j.id.toLowerCase().includes(q) ||
        shortJobId(j.id, j.type).toLowerCase().includes(q) ||
        (j.error || '').toLowerCase().includes(q)
    );
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const all = applySearch(await fetchAllJobsForExport(filters));
      downloadCsv(
        all.map((j) => ({ id: j.id, type: j.type, status: j.status, attempts: `${j.attempts}/${j.max_attempts}`, created_at: j.created_at, error: j.error || '' })),
        `queue-jobs-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch {
      setToast({ msg: 'Failed to export CSV', variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const all = applySearch(await fetchAllJobsForExport(filters));
      exportPdf(all, stats, latency);
    } catch {
      setToast({ msg: 'Failed to export PDF', variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSelectAll = () => setSelected(selected.size === displayedJobs.length ? new Set() : new Set(displayedJobs.map((j) => j.id)));
  const toggleSelectOne = (id: string) => { const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 1200); });
  };

  const handleStatusFilter = (status: string) => dispatch(setFilters({ status: status || undefined, page: 1 }));
  const handleTypeFilter = (type: string) => dispatch(setFilters({ type: type || undefined, page: 1 }));
  const goToPage = (page: number) => dispatch(setFilters({ page }));

  return (
    <Layout title="Queue Monitoring">
      <div className="queue-page">
        <FailureRateAlert stats={stats} />

        <div className="qm-topbar">
          <div className="qm-live-indicator">
            <span className="qm-live-dot" style={isPaused ? { background: '#f59e0b' } : undefined} />
            {isPaused
              ? 'Paused · Not picking up new jobs'
              : `Live · Updated ${secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}`}
          </div>
          <div className="qm-action-group">
            {canControlQueue && (
              <button
                className="qm-action-btn qm-action-secondary"
                onClick={handleTogglePause}
                disabled={isTogglingPause}
                title={isPaused ? 'Resume processing new jobs' : 'Stop the worker from picking up new jobs'}
              >
                <span className="qm-action-icon">{isPaused ? <PlayIcon /> : <PauseIcon />}</span>
                {isTogglingPause ? 'Working...' : isPaused ? 'Resume Queue' : 'Pause Queue'}
              </button>
            )}
            <button className="qm-action-btn qm-action-secondary" onClick={handleExportCsv} disabled={isExporting}>
              <span className="qm-action-icon"><DownloadIcon /></span>
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button className="qm-action-btn qm-action-secondary" onClick={handleExportPdf} disabled={isExporting}>
              <span className="qm-action-icon"><PdfIcon /></span>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
            <button className="qm-action-btn qm-action-primary" onClick={() => setShowForm((v) => !v)}>
              <span className="qm-action-icon">{showForm ? '✕' : '+'}</span>
              {showForm ? 'Cancel' : 'Create Job'}
            </button>
          </div>
        </div>

        {isPaused && (
          <div className="qm-alert stuck" style={{ marginBottom: '1rem' }}>
            <WarningIcon /> Queue is paused — pending jobs will stay queued until an admin resumes processing.
          </div>
        )}

        {(stuckCount > 0 || deadLetterCount > 0) && (
          <div className="qm-alert-row">
            {stuckCount > 0 && (
              <div className="qm-alert stuck">
                <WarningIcon /> {stuckCount} job{stuckCount > 1 ? 's' : ''} possibly stuck in processing
              </div>
            )}
            {deadLetterCount > 0 && (
              <div className="qm-alert dead">
                <SkullIcon /> {deadLetterCount} job{deadLetterCount > 1 ? 's' : ''} in dead letter queue
              </div>
            )}
          </div>
        )}

        {showForm && (
          <CreateJobPanel
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              dispatch(fetchJobs(filters));
              dispatch(fetchStats());
            }}
          />
        )}

        <QueueOverview stats={stats} />

        <ThroughputChart data={throughput} />

        <LatencyCard latency={latency} />

        <div className="qm-filter-row">
          <div className="qm-search-wrap">
            <SearchIcon />
            <input className="qm-search-input" type="text" placeholder="Search ID, error, payload..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="qm-select" value={filters.status || ''} onChange={(e) => handleStatusFilter(e.target.value)}>
            <option value="" style={{ background: '#16161f', color: '#fff' }}>All statuses</option>
            <option value="pending" style={{ background: '#16161f', color: '#fff' }}>Pending</option>
            <option value="processing" style={{ background: '#16161f', color: '#fff' }}>Processing</option>
            <option value="completed" style={{ background: '#16161f', color: '#fff' }}>Completed</option>
            <option value="failed" style={{ background: '#16161f', color: '#fff' }}>Failed</option>
          </select>
          <select className="qm-select" value={filters.type || ''} onChange={(e) => handleTypeFilter(e.target.value)}>
            <option value="" style={{ background: '#16161f', color: '#fff' }}>All types</option>
            <option value="email" style={{ background: '#16161f', color: '#fff' }}>Email</option>
            <option value="notification" style={{ background: '#16161f', color: '#fff' }}>Notification</option>
          </select>
          {(filters.status || filters.type) && (
            <button className="qm-clear-filters" onClick={() => dispatch(setFilters({ status: undefined, type: undefined, page: 1 }))}>Clear filters</button>
          )}
        </div>

        {selected.size > 0 && (
          <div className="qm-bulk-bar">
            <span>{selected.size} selected</span>
            {canRetry ? (
              <button className="btn-retry" onClick={handleBulkRetry} disabled={failedSelected.length === 0 || isBulkRetrying}>
                {isBulkRetrying ? 'Retrying...' : `Retry ${failedSelected.length} failed`}
              </button>
            ) : (
              <span className="qm-role-note">Only admins can retry jobs</span>
            )}
            <button className="qm-link-btn" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}

        <div className="jobs-table-wrapper">
          {isLoading ? (
            <p className="loading-text">Loading jobs...</p>
          ) : displayedJobs.length === 0 ? (
            <p className="loading-text">No jobs match these filters.</p>
          ) : (
            <table className="jobs-table">
              <thead>
                <tr>
                  <th style={{ width: '2rem' }}><input type="checkbox" checked={selected.size === displayedJobs.length} onChange={toggleSelectAll} /></th>
                  <th style={{ width: '1.5rem' }} />
                  <th>Type</th>
                  <th>Status</th>
                  <th className="qm-sortable" onClick={() => handleSort('attempts')}>Attempts <SortIcon active={sortKey === 'attempts'} dir={sortDir} /></th>
                  <th className="qm-sortable" onClick={() => handleSort('created_at')}>Created <SortIcon active={sortKey === 'created_at'} dir={sortDir} /></th>
                  <th>Error</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedJobs.map((job) => {
                  const stuck = isStuck(job);
                  const deadLetter = isDeadLetter(job);
                  return (
                    <React.Fragment key={job.id}>
                      <tr className="qm-row" onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}>
                        <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelectOne(job.id)} /></td>
                        <td><ChevronIcon open={expandedId === job.id} /></td>
                        <td><span className="qm-type-cell">{job.type === 'email' ? <EmailIcon /> : <BellIcon />}{job.type}</span></td>
                        <td>
                          <span className={`status-badge ${job.status}`}>
                            {job.status === 'processing' && <ProcessingPulse />}
                            {job.status}
                          </span>
                          {stuck && <span className="qm-mini-badge stuck" title="Processing longer than expected"><WarningIcon /> Stuck</span>}
                          {deadLetter && <span className="qm-mini-badge dead" title="Exhausted all retry attempts"><SkullIcon /> DLQ</span>}
                          {job.is_held && <span className="qm-mini-badge stuck" title="Held — worker will skip this job until released"><PauseIcon /> Held</span>}
                        </td>
                        <td>{job.attempts}/{job.max_attempts}</td>
                        <td title={fullTimestamp(job.created_at)}>{new Date(job.created_at).toLocaleString()}</td>
                        <td className="error-cell">{job.error || '-'}</td>
                        <td onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '0.4rem' }}>
                          {job.status === 'failed' && canRetry && (
                            <button className="btn-retry" onClick={() => handleRetry(job.id)}>Retry</button>
                          )}
                          {job.status === 'pending' && canRetry && (
                            <button
                              className="btn-retry"
                              onClick={() => handleHoldToggle(job.id, !!job.is_held)}
                              title={job.is_held ? 'Let the worker pick this job up again' : 'Skip this job until released'}
                            >
                              {job.is_held ? 'Release' : 'Hold'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === job.id && (
                        <tr className="qm-expand-row">
                          <td colSpan={8}>
                            <div className="qm-expand-content">
                              <div className="qm-expand-field">
                                <span className="qm-expand-label">Job ID</span>
                                <span className="qm-expand-value">
                                  <span className="qm-mono" title={`Full ID: ${job.id} (click to copy)`} onClick={(e) => handleCopyId(job.id, e)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    {shortJobId(job.id, job.type)}
                                  </span>
                                  <button className="qm-copy-btn" onClick={(e) => handleCopyId(job.id, e)}>{copiedId === job.id ? '✓' : <CopyIcon />}</button>
                                </span>
                              </div>
                              <div className="qm-expand-field"><span className="qm-expand-label">Created</span><span className="qm-expand-value">{fullTimestamp(job.created_at)}</span></div>
                              {job.started_at && <div className="qm-expand-field"><span className="qm-expand-label">Started</span><span className="qm-expand-value">{fullTimestamp(job.started_at)}</span></div>}
                              {job.completed_at && <div className="qm-expand-field"><span className="qm-expand-label">Completed</span><span className="qm-expand-value">{fullTimestamp(job.completed_at)}</span></div>}
                              {job.payload && <div className="qm-expand-field full"><span className="qm-expand-label">Payload</span><pre className="qm-expand-payload">{JSON.stringify(job.payload, null, 2)}</pre></div>}
                              {job.error && <div className="qm-expand-field full"><span className="qm-expand-label">Full error</span><pre className="qm-expand-payload qm-expand-error">{job.error}</pre></div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="qm-pagination">
            <button className="qm-select" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>← Prev</button>
            <span className="qm-pagination-info">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <button className="qm-select" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Next →</button>
          </div>
        )}
      </div>

      <Toast message={toast?.msg || ''} variant={toast?.variant || 'success'} isVisible={!!toast} onClose={() => setToast(null)} />
    </Layout>
  );
};