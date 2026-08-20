import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { AnnouncementBanner } from './AnnouncementBanner';
import '../styles/dashboard.css';

interface LayoutProps {
  title: string;
  children: React.ReactNode;
}

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell" style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main
        className="dashboard-main"
        style={{ height: '100vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon />
              </button>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{title}</h1>
            </div>
            <NotificationBell />
          </div>

          <AnnouncementBanner />
        </div>

        {children}
      </main>
    </div>
  );
};