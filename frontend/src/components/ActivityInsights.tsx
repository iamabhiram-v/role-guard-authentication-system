import React, { useMemo } from 'react';
import { TimelinePoint } from '../store/slices/dashboardSlice';
import './ActivityInsights.css';

interface ActivityInsightsProps {
  data: TimelinePoint[];
}

const KEYS: (keyof TimelinePoint)[] = ['workspacesCreated', 'membersJoined', 'invitesSent', 'jobsCompleted'];

type TrendState = 'new' | 'up' | 'down' | 'flat' | 'none';

export const ActivityInsights: React.FC<ActivityInsightsProps> = ({ data }) => {
  const insights = useMemo(() => {
    if (data.length === 0) return null;

    const dailyTotals = data.map((d) => ({
      date: d.date,
      total: KEYS.reduce((a, k) => a + Number(d[k] as number), 0),
    }));

    const grandTotal = dailyTotals.reduce((a, d) => a + d.total, 0);
    const avgPerDay = grandTotal / data.length;

    const busiest = dailyTotals.reduce((best, cur) => (cur.total > best.total ? cur : best), dailyTotals[0]);

    const half = Math.floor(data.length / 2);
    const firstHalf = dailyTotals.slice(0, half).reduce((a, d) => a + d.total, 0);
    const secondHalf = dailyTotals.slice(half).reduce((a, d) => a + d.total, 0);

    const isNewTrend = firstHalf === 0 && secondHalf > 0;
    const trendPct = firstHalf === 0 ? null : Math.round(((secondHalf - firstHalf) / firstHalf) * 100);

    // Single source of truth for trend state — avoids the "0% rendered
    // as positive" and "new spike rendered as neutral" bugs that come
    // from re-deriving color from raw numbers in multiple places.
    let trendState: TrendState;
    if (isNewTrend) trendState = 'new';
    else if (trendPct === null) trendState = 'none';
    else if (trendPct === 0) trendState = 'flat';
    else if (trendPct > 0) trendState = 'up';
    else trendState = 'down';

    const activeDays = dailyTotals.filter((d) => d.total > 0).length;

    return { grandTotal, avgPerDay, busiest, trendPct, trendState, activeDays, totalDays: data.length };
  }, [data]);

  if (!insights || insights.grandTotal === 0) return null;

  const trendIcon = { new: '✦', up: '↑', down: '↓', flat: '→', none: '→' }[insights.trendState];
  const trendLabel =
    insights.trendState === 'new'
      ? 'New'
      : insights.trendState === 'flat'
      ? '0%'
      : insights.trendPct === null
      ? '—'
      : `${Math.abs(insights.trendPct)}%`;
  const trendIconClass = { new: 'ai-icon-new', up: 'ai-icon-up', down: 'ai-icon-down', flat: '', none: '' }[
    insights.trendState
  ];
  const trendValueClass = { new: 'ai-value-new', up: 'ai-value-up', down: 'ai-value-down', flat: '', none: '' }[
    insights.trendState
  ];

  return (
    <div className="ai-strip">
      <div className="ai-item">
        <span className="ai-icon">⚡</span>
        <div className="ai-text">
          <span className="ai-value">{insights.grandTotal}</span>
          <span className="ai-label">total events</span>
        </div>
      </div>
      <div className="ai-divider" />
      <div className="ai-item">
        <span className="ai-icon">◈</span>
        <div className="ai-text">
          <span className="ai-value">
            {new Date(insights.busiest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <span className="ai-label">busiest day · {insights.busiest.total} events</span>
        </div>
      </div>
      <div className="ai-divider" />
      <div className="ai-item">
        <span className="ai-icon">◎</span>
        <div className="ai-text">
          <span className="ai-value">{insights.avgPerDay.toFixed(1)}</span>
          <span className="ai-label">avg events / day</span>
        </div>
      </div>
      <div className="ai-divider" />
      <div className="ai-item">
        <span className={`ai-icon ${trendIconClass}`}>{trendIcon}</span>
        <div className="ai-text">
          <span className={`ai-value ${trendValueClass}`}>{trendLabel}</span>
          <span className="ai-label">vs first half of range</span>
        </div>
      </div>
      <div className="ai-divider" />
      <div className="ai-item">
        <span className="ai-icon">✓</span>
        <div className="ai-text">
          <span className="ai-value">
            {insights.activeDays}/{insights.totalDays}
          </span>
          <span className="ai-label">active days</span>
        </div>
      </div>
    </div>
  );
};