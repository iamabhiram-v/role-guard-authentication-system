import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import {
  fetchNotificationHistory,
  markAsRead,
  markAllAsRead,
  setNotificationFilter,
  setNotificationPage,
} from '../store/slices/NotificationSlice';
import '../styles/notification-center.css';

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

function fullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const AnnouncementIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V4l-3 5H5a2 2 0 0 0-2 2Z" />
    <path d="M14 8.5a4 4 0 0 1 0 7M17.5 6a8 8 0 0 1 0 12" />
  </svg>
);

const InviteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const BellIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const InboxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const UnreadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4l2.5 2.5" />
  </svg>
);

const SearchIcon = () => (
  <svg className="nc-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function getNotificationVisual(title: string): { icon: React.ReactNode; gradient: string; badgeColor: string; label: string } {
  const t = title.toLowerCase();
  if (t.includes('📣') || t.includes('announcement')) {
    return { icon: <AnnouncementIcon />, gradient: 'linear-gradient(135deg, #fb923c, #ea580c)', badgeColor: '#fb923c', label: 'Announcement' };
  }
  if (t.includes('invite') || t.includes('workspace')) {
    return { icon: <InviteIcon />, gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)', badgeColor: '#60a5fa', label: 'Invite' };
  }
  if (t.includes('fail') || t.includes('error')) {
    return { icon: <AlertIcon />, gradient: 'linear-gradient(135deg, #f87171, #dc2626)', badgeColor: '#f87171', label: 'Alert' };
  }
  return { icon: <BellIcon />, gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)', badgeColor: '#a78bfa', label: 'General' };
}

function groupByDate<T extends { created_at: string }>(items: T[]): { label: string; items: T[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, T[]> = { Today: [], Yesterday: [], Earlier: [] };

  items.forEach((item) => {
    const d = new Date(item.created_at);
    const dOnly = new Date(d);
    dOnly.setHours(0, 0, 0, 0);
    if (dOnly.getTime() === today.getTime()) groups.Today.push(item);
    else if (dOnly.getTime() === yesterday.getTime()) groups.Yesterday.push(item);
    else groups.Earlier.push(item);
  });

  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }));
}

const SkeletonRow: React.FC = () => (
  <div className="nc-skeleton-row">
    <div className="nc-skeleton-avatar" />
    <div style={{ flex: 1 }}>
      <div className="nc-skeleton-line short" />
      <div className="nc-skeleton-line long" />
    </div>
  </div>
);

export const NotificationCenterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, unreadCount, pagination, filter, isLoading } = useSelector(
    (state: RootState) => state.notifications
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchNotificationHistory({ filter, page: pagination.page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filter, pagination.page]);

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    if (newFilter === filter) return;
    dispatch(setNotificationFilter(newFilter));
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    dispatch(setNotificationPage(page));
  };

  const handleItemClick = (id: string, isRead: boolean) => {
    if (!isRead) dispatch(markAsRead(id));
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
  }, [items, search]);

  const grouped = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  return (
    <Layout title="Notification Center">
      <div className="nc-container">
        <p className="nc-subtitle">Everything sent to your account, in one place.</p>

        <div className="nc-stats-row">
          <div className="nc-stat-card" style={{ '--nc-accent': '#60a5fa' } as React.CSSProperties}>
            <div className="nc-stat-icon">
              <InboxIcon />
            </div>
            <div className="nc-stat-text">
              <span className="nc-stat-label">Total</span>
              <span className="nc-stat-value">{pagination.total}</span>
            </div>
          </div>
          <div className="nc-stat-card" style={{ '--nc-accent': '#7c3aed' } as React.CSSProperties}>
            <div className="nc-stat-icon">
              <UnreadIcon />
            </div>
            <div className="nc-stat-text">
              <span className="nc-stat-label">Unread</span>
              <span className="nc-stat-value">{unreadCount}</span>
            </div>
          </div>
        </div>

        <div className="nc-toolbar">
          <div className="nc-search-wrap">
            <SearchIcon />
            <input
              className="nc-search-input"
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="nc-segmented">
            <button className={`nc-segmented-btn${filter === 'all' ? ' active' : ''}`} onClick={() => handleFilterChange('all')}>
              All
            </button>
            <button className={`nc-segmented-btn${filter === 'unread' ? ' active' : ''}`} onClick={() => handleFilterChange('unread')}>
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          </div>

          {unreadCount > 0 && (
            <button className="nc-mark-all-btn" onClick={() => dispatch(markAllAsRead())}>
              <CheckIcon />
              Mark all read
            </button>
          )}
        </div>

        <div className="nc-panel">
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : grouped.length === 0 ? (
            <div className="nc-empty-state">
              <div className="nc-empty-icon">
                <div className="nc-empty-icon-ring">
                  <BellIcon size={22} />
                </div>
              </div>
              <p className="nc-empty-title">
                {search ? 'No matches found' : filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
              </p>
              <p className="nc-empty-subtitle">
                {search
                  ? 'Try a different search term.'
                  : filter === 'unread'
                  ? 'New notifications will show up here.'
                  : "You'll see workspace invites, job alerts, and announcements here."}
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <div className="nc-group-label">{group.label}</div>
                {group.items.map((n) => {
                  const { icon, gradient, badgeColor, label } = getNotificationVisual(n.title);
                  return (
                    <div
                      key={n.id}
                      className={`nc-row${!n.is_read ? ' unread' : ''}`}
                      onClick={() => handleItemClick(n.id, n.is_read)}
                      title={fullTimestamp(n.created_at)}
                    >
                      <div className="nc-avatar" style={{ background: gradient }}>
                        {icon}
                      </div>

                      <div className="nc-row-body">
                        <div className="nc-row-top">
                          <span className="nc-row-title">{n.title}</span>
                          <span
                            className="nc-row-badge"
                            style={{ color: badgeColor, borderColor: `${badgeColor}44`, background: `${badgeColor}14` }}
                          >
                            {label}
                          </span>
                          {!n.is_read && <span className="nc-row-dot" style={{ background: badgeColor, color: badgeColor }} />}
                        </div>
                        <div className="nc-row-message">{n.message}</div>
                        <div className="nc-row-time">{timeAgo(n.created_at)}</div>
                      </div>

                      <div className="nc-row-actions">
                        {!n.is_read && (
                          <button
                            className="nc-mark-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(markAsRead(n.id));
                            }}
                            aria-label="Mark as read"
                          >
                            <CheckIcon size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="nc-pagination">
            <button className="nc-page-btn" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1}>
              ← Prev
            </button>
            <span className="nc-pagination-info">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button className="nc-page-btn" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              Next →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};