import React, { useMemo, useState, useEffect, useRef } from 'react';
import { TimelinePoint } from '../store/slices/dashboardSlice';
import './AnalyticsChart.css';

interface AnalyticsChartProps {
  data: TimelinePoint[];
}

const SERIES: { key: keyof TimelinePoint; label: string; color: string }[] = [
  { key: 'workspacesCreated', label: 'Workspaces', color: '#a855f7' },
  { key: 'membersJoined', label: 'Members', color: '#06b6d4' },
  { key: 'invitesSent', label: 'Invites', color: '#f59e0b' },
  { key: 'jobsCompleted', label: 'Jobs', color: '#22c55e' },
];

const WIDTH = 760;
const HEIGHT = 260;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 20;
const PAD_B = 34;

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [drawn, setDrawn] = useState(false);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});

  useEffect(() => {
    setDrawn(false);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(t);
  }, [data]);

  const totalActivity = SERIES.reduce(
    (sum, s) => sum + data.reduce((a, d) => a + Number(d[s.key] as number), 0),
    0
  );

  // A series with zero activity across the ENTIRE visible range renders
  // as a flat line pinned to the baseline. When multiple such series
  // overlap at that same zero position, their strokes stack and alternate
  // in draw order, producing a fragmented multi-color line instead of one
  // clean baseline. Excluding fully-zero series from line/area rendering
  // fixes that — they still show correctly in the legend as "0" and dim.
  const seriesHasData = (key: keyof TimelinePoint) => data.some((d) => Number(d[key] as number) > 0);

  const visibleSeries = SERIES.filter((s) => !hidden.has(s.key as string) && seriesHasData(s.key));

  const peakIdx = useMemo(() => {
    let best = 0;
    let bestVal = -1;
    data.forEach((d, i) => {
      const sum = visibleSeries.reduce((a, s) => a + Number(d[s.key] as number), 0);
      if (sum > bestVal) {
        bestVal = sum;
        best = i;
      }
    });
    return bestVal > 0 ? best : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hidden]);

  if (data.length === 0 || totalActivity === 0) {
    return (
      <div className="ac-empty">
        <span className="ac-empty-icon">◈</span>
        No activity data for this range
      </div>
    );
  }

  const seriesMax = Object.fromEntries(
    SERIES.map((s) => [s.key, Math.max(1, ...data.map((d) => Number(d[s.key] as number)))])
  ) as Record<string, number>;

  const xStep = (WIDTH - PAD_L - PAD_R) / Math.max(1, data.length - 1);
  const chartH = HEIGHT - PAD_T - PAD_B;

  const yFor = (key: keyof TimelinePoint, val: number) =>
    PAD_T + chartH - (val / seriesMax[key as string]) * chartH;

  const xFor = (i: number) => PAD_L + i * xStep;

  const lineFor = (key: keyof TimelinePoint) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(key, Number(d[key] as number))}`).join(' ');

  const areaFor = (key: keyof TimelinePoint) => {
    const line = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(key, Number(d[key] as number))}`)
      .join(' ');
    return `${line} L ${xFor(data.length - 1)} ${PAD_T + chartH} L ${xFor(0)} ${PAD_T + chartH} Z`;
  };

  const labelEvery = Math.max(1, Math.floor(data.length / 6));

  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="ac-container">
      <div className="ac-legend">
        {SERIES.map((s) => {
          const isHidden = hidden.has(s.key as string);
          const total = data.reduce((a, d) => a + Number(d[s.key] as number), 0);
          return (
            <button
              key={s.key}
              className={`ac-legend-item ${isHidden ? 'ac-legend-item-off' : ''}`}
              onClick={() => toggleSeries(s.key as string)}
              type="button"
            >
              <span
                className="ac-legend-dot"
                style={{ background: isHidden ? 'rgba(255,255,255,0.2)' : s.color, boxShadow: isHidden ? 'none' : `0 0 6px ${s.color}` }}
              />
              {s.label}
              <span className="ac-legend-total">{total}</span>
            </button>
          );
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="ac-svg" preserveAspectRatio="none">
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`ac-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD_L}
              x2={WIDTH - PAD_R}
              y1={PAD_T + chartH * (1 - f)}
              y2={PAD_T + chartH * (1 - f)}
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="1"
            />
          ))}
          <line x1={PAD_L} x2={WIDTH - PAD_R} y1={PAD_T + chartH} y2={PAD_T + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {data.map((d, i) => (
            <rect
              key={`hit-${d.date}`}
              x={xFor(i) - xStep / 2}
              y={0}
              width={xStep}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}

          {hoverIdx !== null && (
            <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={PAD_T} y2={PAD_T + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          )}

          {visibleSeries.map((s) => (
            <path key={`area-${s.key}`} d={areaFor(s.key)} fill={`url(#ac-grad-${s.key})`} opacity={drawn ? 1 : 0} style={{ transition: 'opacity 0.6s ease 0.3s' }} />
          ))}

          {visibleSeries.map((s) => {
            const d = lineFor(s.key);
            return (
              <path
                key={s.key}
                ref={(el) => { pathRefs.current[s.key as string] = el; }}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${s.color}77)`,
                  strokeDasharray: 2000,
                  strokeDashoffset: drawn ? 0 : 2000,
                  transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            );
          })}

          {visibleSeries.map((s) =>
            data.map((d, i) => {
              const val = Number(d[s.key] as number);
              if (val === 0 && hoverIdx !== i) return null;
              return (
                <circle
                  key={`${s.key}-${i}`}
                  cx={xFor(i)}
                  cy={yFor(s.key, val)}
                  r={hoverIdx === i ? 4.5 : 2.5}
                  fill={s.color}
                  opacity={drawn ? 1 : 0}
                  style={{ transition: 'r 0.15s ease, opacity 0.4s ease 0.9s' }}
                />
              );
            })
          )}

          {peakIdx !== null && (
            <g style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.4s ease 1s' }}>
              <line x1={xFor(peakIdx)} x2={xFor(peakIdx)} y1={PAD_T - 8} y2={PAD_T - 2} stroke="#e9d5ff" strokeWidth="1.5" />
              <text x={xFor(peakIdx)} y={PAD_T - 11} textAnchor="middle" fontSize="9" fontWeight="700" fill="#e9d5ff" letterSpacing="0.5">
                PEAK
              </text>
            </g>
          )}
        </svg>

        {hoverIdx !== null && (
          <div
            className="ac-tooltip"
            style={{ left: `${Math.min(Math.max((hoverIdx / (data.length - 1 || 1)) * 100, 12), 88)}%` }}
          >
            <div className="ac-tooltip-date">
              {new Date(data[hoverIdx].date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {SERIES.map((s) => (
              <div key={s.key} className={`ac-tooltip-row ${hidden.has(s.key as string) ? 'ac-tooltip-row-off' : ''}`}>
                <span className="ac-tooltip-dot" style={{ background: s.color }} />
                <span className="ac-tooltip-label">{s.label}</span>
                <span className="ac-tooltip-value">{Number(data[hoverIdx][s.key] as number)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ac-xlabels">
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <span
              key={d.date}
              className="ac-xlabel"
              style={{
                left: `${(i / (data.length - 1 || 1)) * 100}%`,
                transform: i === data.length - 1 ? 'translateX(-100%)' : i === 0 ? 'none' : 'translateX(-50%)',
              }}
            >
              {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
};