import { dashboardRepository, workspaceRepository } from '../repositories';
import { cacheGet, cacheSet } from '../utils/cache';
import { queueService } from './queue.service';
import PDFDocument from 'pdfkit';

const CACHE_TTL_SECONDS = 60;

export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalMembers: number;
  pendingInvites: number;
  jobsProcessed: number;
  jobsFailed: number;
  notificationsSent: number;
  rangeDays: number;
}

export interface TimelinePoint {
  date: string;
  workspacesCreated: number;
  membersJoined: number;
  invitesSent: number;
  jobsCompleted: number;
}

export interface SummaryMetric {
  key: string;
  current: number;
  previous: number;
  changePct: number | null;
  isNew: boolean;
}

export interface SummaryReport {
  rangeDays: number;
  metrics: SummaryMetric[];
}

const rangeToDays = (range?: string): number => {
  const parsed = Number(range);
  if (parsed === 7 || parsed === 30 || parsed === 90) return parsed;
  return 30;
};

const pctChange = (
  curr: number,
  prev: number
): { changePct: number | null; isNew: boolean } => {
  if (prev === 0) return { changePct: null, isNew: curr > 0 };
  return { changePct: Math.round(((curr - prev) / prev) * 100), isNew: false };
};

export const dashboardService = {
  async getOverview(rangeParam?: string): Promise<DashboardOverview> {
    const days = rangeToDays(rangeParam);
    const cacheKey = `dashboard:overview:${days}`;
    const cached = cacheGet<DashboardOverview>(cacheKey);
    if (cached) return cached;

    const [userCounts, workspaces, members, invites, queueStats, notifications] =
      await Promise.all([
        dashboardRepository.getUserCounts(),
        dashboardRepository.getWorkspaceCount(),
        dashboardRepository.getMemberCount(),
        dashboardRepository.getPendingInviteCount(),
        queueService.getStats(),
        dashboardRepository.getNotificationCountByPeriod(days),
      ]);

    const overview: DashboardOverview = {
      totalUsers:        userCounts.total,
      activeUsers:       userCounts.active,
      totalWorkspaces:   workspaces,
      totalMembers:      members,
      pendingInvites:    invites,
      jobsProcessed:     queueStats?.completed ?? 0,
      jobsFailed:        queueStats?.failed ?? 0,
      notificationsSent: notifications,
      rangeDays:         days,
    };

    cacheSet(cacheKey, overview, CACHE_TTL_SECONDS);
    return overview;
  },

  async getActivityTimeline(rangeParam?: string): Promise<TimelinePoint[]> {
    const days = rangeToDays(rangeParam);
    const cacheKey = `dashboard:timeline:${days}`;
    const cached = cacheGet<TimelinePoint[]>(cacheKey);
    if (cached) return cached;

    const timeline = await dashboardRepository.getActivityTimeline(days) as TimelinePoint[];
    cacheSet(cacheKey, timeline, CACHE_TTL_SECONDS);
    return timeline;
  },

  async getTopWorkspaces(limit = 5) {
    const cacheKey = `dashboard:top-workspaces:${limit}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const rows = await workspaceRepository.getTopByMemberCount(limit);
    cacheSet(cacheKey, rows, CACHE_TTL_SECONDS);
    return rows;
  },

  async getSummaryReport(rangeParam?: string): Promise<SummaryReport> {
    const days = rangeToDays(rangeParam);
    const cacheKey = `dashboard:summary:${days}`;
    const cached = cacheGet<SummaryReport>(cacheKey);
    if (cached) return cached;

    const { current, previous } = await dashboardRepository.getSummaryCurrentAndPrevious(days);

    const keys = ['workspaces', 'members', 'invites', 'jobs_completed', 'jobs_failed', 'notifications'] as const;

    const summary: SummaryReport = {
      rangeDays: days,
      metrics: keys.map((key) => {
        const { changePct, isNew } = pctChange(current[key], previous[key]);
        return { key, current: current[key], previous: previous[key], changePct, isNew };
      }),
    };

    cacheSet(cacheKey, summary, CACHE_TTL_SECONDS);
    return summary;
  },

  async exportReportCsv(rangeParam?: string): Promise<string> {
    const [overview, timeline, summary] = await Promise.all([
      this.getOverview(rangeParam),
      this.getActivityTimeline(rangeParam),
      this.getSummaryReport(rangeParam),
    ]);

    const generatedAt = new Date().toISOString();
    const lines: string[] = [];

    lines.push('RoleGuard Analytics Report');
    lines.push(`Generated At,${generatedAt}`);
    lines.push(`Report Period,Last ${overview.rangeDays} days`);
    lines.push('');
    lines.push('OVERVIEW');
    lines.push('Metric,Value');
    lines.push(`Total Users,${overview.totalUsers}`);
    lines.push(`Active Users,${overview.activeUsers}`);
    lines.push(`Total Workspaces,${overview.totalWorkspaces}`);
    lines.push(`Total Members,${overview.totalMembers}`);
    lines.push(`Pending Invites,${overview.pendingInvites}`);
    lines.push(`Jobs Processed,${overview.jobsProcessed}`);
    lines.push(`Jobs Failed,${overview.jobsFailed}`);
    lines.push(`Notifications Sent,${overview.notificationsSent}`);
    lines.push('');
    lines.push('SUMMARY (Current Period vs. Previous Period)');
    lines.push('Metric,Current,Previous,Change (%)');
    summary.metrics.forEach((m) => {
      const change = m.isNew ? 'New' : m.changePct === null ? '—' : `${m.changePct > 0 ? '+' : ''}${m.changePct}%`;
      lines.push(`${m.key},${m.current},${m.previous},${change}`);
    });
    lines.push('');
    lines.push('DAILY ACTIVITY');
    lines.push('Date,Workspaces Created,Members Joined,Invites Sent,Jobs Completed');
    timeline.forEach((t) => {
      lines.push(`${t.date},${t.workspacesCreated},${t.membersJoined},${t.invitesSent},${t.jobsCompleted}`);
    });

    return lines.join('\n');
  },

  async exportReportJson(rangeParam?: string) {
    const [overview, timeline, summary] = await Promise.all([
      this.getOverview(rangeParam),
      this.getActivityTimeline(rangeParam),
      this.getSummaryReport(rangeParam),
    ]);
    return {
      report: {
        name:        'RoleGuard Analytics Report',
        version:     '1.0',
        generatedAt: new Date().toISOString(),
        periodDays:  overview.rangeDays,
      },
      overview,
      summary,
      dailyActivity: timeline,
    };
  },

  async exportReportPdf(rangeParam?: string): Promise<Buffer> {
    const [overview, timeline, summary] = await Promise.all([
      this.getOverview(rangeParam),
      this.getActivityTimeline(rangeParam),
      this.getSummaryReport(rangeParam),
    ]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const PAGE_WIDTH = 545;
    const LEFT = 50;
    const generatedAt = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e').text('RoleGuard Analytics Report', LEFT, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Generated ${generatedAt}  •  Period: Last ${overview.rangeDays} days`, LEFT, 78);
    doc.strokeColor('#7c3aed').lineWidth(2).moveTo(LEFT, 100).lineTo(PAGE_WIDTH, 100).stroke();

    let y = 120;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('Overview', LEFT, y);
    y += 26;

    const overviewRows: [string, string | number][] = [
      ['Total Users',        overview.totalUsers],
      ['Active Users',       overview.activeUsers],
      ['Total Workspaces',   overview.totalWorkspaces],
      ['Total Members',      overview.totalMembers],
      ['Pending Invites',    overview.pendingInvites],
      ['Jobs Processed',     overview.jobsProcessed],
      ['Jobs Failed',        overview.jobsFailed],
      ['Notifications Sent', overview.notificationsSent],
    ];

    const colWidth = 247;
    overviewRows.forEach(([label, value], i) => {
      const col  = i % 2;
      const row  = Math.floor(i / 2);
      const x    = LEFT + col * colWidth;
      const rowY = y + row * 24;
      doc.fontSize(10).font('Helvetica').fillColor('#666666').text(label, x, rowY, { width: 150, lineBreak: false });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text(String(value), x + 155, rowY, { width: 90, lineBreak: false });
    });
    y += Math.ceil(overviewRows.length / 2) * 24 + 25;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('Summary — Current vs. Previous Period', LEFT, y);
    y += 26;

    const metricLabels: Record<string, string> = {
      workspaces:     'Workspaces Created',
      members:        'Members Joined',
      invites:        'Invites Sent',
      jobs_completed: 'Jobs Completed',
      jobs_failed:    'Jobs Failed',
      notifications:  'Notifications Sent',
    };

    const sumCol = { metric: LEFT, current: 280, previous: 360, change: 450 };
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666');
    doc.text('Metric',   sumCol.metric,   y, { width: 220, lineBreak: false });
    doc.text('Current',  sumCol.current,  y, { width: 70,  align: 'right', lineBreak: false });
    doc.text('Previous', sumCol.previous, y, { width: 80,  align: 'right', lineBreak: false });
    doc.text('Change',   sumCol.change,   y, { width: 95,  align: 'right', lineBreak: false });
    y += 14;
    doc.moveTo(LEFT, y).lineTo(PAGE_WIDTH, y).strokeColor('#dddddd').lineWidth(1).stroke();
    y += 10;

    summary.metrics.forEach((m) => {
      const change      = m.isNew ? 'New' : m.changePct === null ? '—' : `${m.changePct > 0 ? '+' : ''}${m.changePct}%`;
      const changeColor = m.isNew ? '#a855f7' : m.changePct === null ? '#666666' : m.changePct >= 0 ? '#22c55e' : '#ef4444';
      doc.fontSize(10).font('Helvetica').fillColor('#1a1a2e').text(metricLabels[m.key] || m.key, sumCol.metric, y, { width: 220, lineBreak: false });
      doc.fillColor('#333333').text(String(m.current),  sumCol.current,  y, { width: 70, align: 'right', lineBreak: false });
      doc.fillColor('#888888').text(String(m.previous), sumCol.previous, y, { width: 80, align: 'right', lineBreak: false });
      doc.font('Helvetica-Bold').fillColor(changeColor).text(change, sumCol.change, y, { width: 95, align: 'right', lineBreak: false });
      y += 22;
    });
    y += 15;

    const ensureSpace = (needed: number) => {
      if (y + needed > 780) { doc.addPage(); y = 50; }
    };

    ensureSpace(40);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('Daily Activity', LEFT, y);
    y += 26;

    const dCol = { date: LEFT, ws: 190, mem: 280, inv: 370, jobs: 460 };

    const drawDailyHeader = () => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666');
      doc.text('Date',       dCol.date, y, { width: 100, lineBreak: false });
      doc.text('Workspaces', dCol.ws,   y, { width: 80,  align: 'right', lineBreak: false });
      doc.text('Members',    dCol.mem,  y, { width: 80,  align: 'right', lineBreak: false });
      doc.text('Invites',    dCol.inv,  y, { width: 80,  align: 'right', lineBreak: false });
      doc.text('Jobs',       dCol.jobs, y, { width: 85,  align: 'right', lineBreak: false });
      y += 14;
      doc.moveTo(LEFT, y).lineTo(PAGE_WIDTH, y).strokeColor('#dddddd').lineWidth(1).stroke();
      y += 10;
    };

    drawDailyHeader();

    timeline.forEach((t, i) => {
      ensureSpace(20);
      if (y === 50) drawDailyHeader();
      if (i % 2 === 1) doc.rect(LEFT, y - 3, PAGE_WIDTH - LEFT, 18).fill('#f7f7fb');
      doc.fontSize(9).font('Helvetica').fillColor('#333333');
      doc.text(t.date,                      dCol.date, y, { width: 100, lineBreak: false });
      doc.text(String(t.workspacesCreated), dCol.ws,   y, { width: 80,  align: 'right', lineBreak: false });
      doc.text(String(t.membersJoined),     dCol.mem,  y, { width: 80,  align: 'right', lineBreak: false });
      doc.text(String(t.invitesSent),       dCol.inv,  y, { width: 80,  align: 'right', lineBreak: false });
      doc.text(String(t.jobsCompleted),     dCol.jobs, y, { width: 85,  align: 'right', lineBreak: false });
      y += 18;
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  },
};