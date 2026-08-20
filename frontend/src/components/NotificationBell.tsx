import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } from '../store/slices/NotificationSlice';

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const NotificationBell: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, unreadCount } = useSelector((state: RootState) => state.notifications);
  const { isInitialized } = useSelector((state: RootState) => state.auth);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInitialized) return;

    dispatch(fetchUnreadCount());
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch, isInitialized]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open) {
      dispatch(fetchNotifications());
    }
    setOpen((v) => !v);
  };

  const handleItemClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      dispatch(markAsRead(id));
    }
  };

  const handleViewAllClick = () => {
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.6rem',
          width: '2.4rem',
          height: '2.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              minWidth: '1.1rem',
              height: '1.1rem',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 0.3rem',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '340px',
            maxHeight: '420px',
            overflowY: 'auto',
            background: '#12121e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.9rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => dispatch(markAllAsRead())}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a78bfa',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              No notifications yet.
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n.id, n.is_read)}
                style={{
                  padding: '0.8rem 1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  background: n.is_read ? 'transparent' : 'rgba(124,58,237,0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  {!n.is_read && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', marginTop: '0.4rem', flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                      {n.title}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                      {n.message}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <div style={{ padding: '0.7rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <a href="/notifications" onClick={handleViewAllClick} style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};