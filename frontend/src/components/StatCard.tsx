import React from 'react';
import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean } | null;
  delay?: number;
  alert?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, accent, icon, trend, delay = 0, alert = false }) => {
  return (
    <div
      className={`sc-shell fade-up${alert ? ' sc-alert' : ''}`}
      style={{ animationDelay: `${delay}ms`, ['--accent' as any]: accent }}
    >
      <div className="sc-border-spin" aria-hidden="true" />
      <div className="sc-card">
        <div className="sc-icon">{icon}</div>
        <div className="sc-value">{value}</div>
        <div className="sc-label-row">
          <span className="sc-label">{label}</span>
          {trend && (
            <span className={`sc-trend ${trend.positive ? 'sc-trend-up' : 'sc-trend-down'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};