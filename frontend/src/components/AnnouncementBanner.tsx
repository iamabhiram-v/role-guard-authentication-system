import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchActiveAnnouncement, dismissAnnouncement } from '../store/slices/announcementSlice';

export const AnnouncementBanner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { active } = useSelector((state: RootState) => state.announcements);

  useEffect(() => {
    dispatch(fetchActiveAnnouncement());
  }, [dispatch]);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '0.6rem 1rem 0.6rem 1.1rem',
        marginBottom: '1.25rem',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: 'linear-gradient(180deg, #a78bfa, #60a5fa)',
        }}
      />

      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          background: 'rgba(167,139,250,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.6rem',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            color: '#a78bfa',
            fontSize: '0.62rem',
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          Announcement
        </span>
        <span
          style={{
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.82rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {active.title}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {active.message}
        </span>
      </div>

      <button
        onClick={() => dispatch(dismissAnnouncement(active.id))}
        aria-label="Dismiss announcement"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderRadius: '6px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
};