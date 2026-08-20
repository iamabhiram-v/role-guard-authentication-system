import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const DashboardIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg {...iconProps}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const ServiceStatusIcon = () => (
  <svg {...iconProps}>
    <path d="M12 2a10 10 0 1 0 10 10" />
    <path d="M12 2v10l7 4" />
  </svg>
);

const ProfileIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

const WorkspacesIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 4v16" />
  </svg>
);

const SettingsIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.12.31.32.6.58.83.26.23.47.5.6.82.12.31.19.65.19 1 0 .35-.07.69-.19 1a1.65 1.65 0 0 0-.6.82c-.26.23-.46.52-.58.83z" />
  </svg>
);

const QueueIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="18" height="4" rx="1" />
    <rect x="3" y="16" width="18" height="4" rx="1" />
  </svg>
);

const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const PaymentIcon = () => (
  <svg {...iconProps}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const BellIcon = () => (
  <svg {...iconProps}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const InboxIcon = () => (
  <svg {...iconProps}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const LogoutIcon = () => (
  <svg {...iconProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon, end: true },
  { to: '/workspaces', label: 'Workspaces', Icon: WorkspacesIcon, end: false },
  { to: '/notifications', label: 'Notification Center', Icon: InboxIcon, end: true },
  { to: '/payments', label: 'Payments', Icon: PaymentIcon, end: true },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, end: true },
  { to: '/settings/notifications', label: 'Notification Preferences', Icon: BellIcon, end: true },
  { to: '/change-password', label: 'Change Password', Icon: LockIcon, end: true },
];

// Analytics, Service Status, and Queue Monitor are admin-only — same
// privilege gate as the backend's dashboard/service-status/queue
// controllers, and matches ProtectedRoute's requiredRoles on /queue,
// so the link only appears for roles that can actually load the page.
const PRIVILEGED_ROLES = ['admin'];
const analyticsNavItem = { to: '/analytics', label: 'Analytics', Icon: AnalyticsIcon, end: true };
const serviceStatusNavItem = { to: '/service-status', label: 'Service Status', Icon: ServiceStatusIcon, end: true };
const queueNavItem = { to: '/queue', label: 'Queue Monitor', Icon: QueueIcon, end: true };

const getInitials = (name: string | undefined) => {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const canViewAnalytics = user?.role ? PRIVILEGED_ROLES.includes(user.role) : false;
  const visibleNavItems = canViewAnalytics
    ? [navItems[0], analyticsNavItem, serviceStatusNavItem, queueNavItem, ...navItems.slice(1)]
    : navItems;

  return (
    <aside
      className={`dashboard-sidebar${isOpen ? ' open' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .sb-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 0.6rem;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          text-align: left;
          background: none;
          border: none;
          width: 100%;
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          margin-bottom: 0.15rem;
        }
        .sb-nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.95);
        }
        .sb-nav-item.active {
          background: linear-gradient(135deg, rgba(124,58,237,0.35), rgba(59,130,246,0.25));
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(124,58,237,0.4);
        }
        .sb-nav-item svg {
          flex-shrink: 0;
        }
        .sb-logout-item {
          color: rgba(255,255,255,0.65);
        }
        .sb-logout-item:hover {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.25rem' }}>
          <div
            style={{
              width: '2.2rem',
              height: '2.2rem',
              borderRadius: '0.6rem',
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#fff',
              fontSize: '1rem',
              flexShrink: 0,
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.01em' }}>
            RoleGuard
          </span>
        </div>

        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            padding: '0.3rem',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.35)',
          padding: '0 0.85rem',
          marginBottom: '0.5rem',
        }}
      >
        MAIN
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {visibleNavItems.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => `sb-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem',
          padding: '0.75rem',
          borderRadius: '0.7rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            width: '2.1rem',
            height: '2.1rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8rem',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {getInitials(user?.username)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.username || 'User'}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.45)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email || 'No email'}
          </div>
        </div>
      </div>

      <button
        className="sb-nav-item sb-logout-item"
        onClick={handleLogout}
        style={{ marginTop: '1.25rem' }}
      >
        <LogoutIcon />
        <span>Logout</span>
      </button>
    </aside>
  );
};